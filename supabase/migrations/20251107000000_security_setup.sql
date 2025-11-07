/* Create extension for cryptographic functions */
create extension if not exists "pgcrypto";

/* RBAC Tables */
create type user_role as enum ('admin', 'grantor', 'grantee');

create table user_roles (
    user_id uuid references auth.users,
    role user_role not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    primary key (user_id)
);

create table role_permissions (
    id uuid default gen_random_uuid() primary key,
    role user_role not null,
    resource text not null,
    action text not null,
    conditions jsonb,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

/* Audit Logging */
create type audit_action as enum (
    'create',
    'read',
    'update',
    'delete',
    'login',
    'logout',
    'export',
    'approve',
    'reject'
);

create table audit_logs (
    id uuid default gen_random_uuid() primary key,
    timestamp timestamp with time zone default timezone('utc'::text, now()) not null,
    user_id uuid references auth.users,
    action audit_action not null,
    resource jsonb not null,
    metadata jsonb not null,
    status text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

/* Security Monitoring */
create table activity_logs (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users,
    action text not null,
    metadata jsonb,
    timestamp timestamp with time zone default timezone('utc'::text, now()) not null
);

create table failed_logins (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users,
    ip text not null,
    timestamp timestamp with time zone default timezone('utc'::text, now()) not null
);

create table security_alerts (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users,
    type text not null,
    details jsonb not null,
    status text default 'pending',
    resolved_at timestamp with time zone,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

/* Document Security */
create table documents (
    id uuid default gen_random_uuid() primary key,
    filename text not null,
    mime_type text not null,
    size bigint not null,
    hash text not null,
    encrypted_key text,
    storage_path text not null,
    user_id uuid references auth.users not null,
    program_id uuid references programs,
    metadata jsonb,
    scan_status text default 'pending',
    scan_result jsonb,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table document_versions (
    id uuid default gen_random_uuid() primary key,
    document_id uuid references documents not null,
    version_number integer not null,
    storage_path text not null,
    size bigint not null,
    hash text not null,
    created_by uuid references auth.users not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

/* Security Testing */
create table security_test_results (
    id uuid default gen_random_uuid() primary key,
    test_id text not null,
    type text not null,
    name text not null,
    status text not null,
    details jsonb not null,
    timestamp timestamp with time zone default timezone('utc'::text, now()) not null
);

/* Functions */
create or replace function check_document_access(doc_id uuid, user_id uuid)
returns boolean as $$
begin
    return exists (
        select 1
        from documents d
        join user_roles ur on ur.user_id = $2
        where d.id = $1
        and (
            ur.role = 'admin'
            or (ur.role = 'grantor' and d.program_id in (
                select id from programs where granter_id = $2
            ))
            or (ur.role = 'grantee' and d.user_id = $2)
        )
    );
end;
$$ language plpgsql security definer;

/* Policies */

-- RBAC policies
alter table documents enable row level security;

create policy "Document access based on role"
    on documents for all
    using (
        case 
            when auth.role() = 'admin' then true
            when auth.role() = 'grantor' then program_id in (
                select id from programs where granter_id = auth.uid()
            )
            else user_id = auth.uid()
        end
    );

-- Audit log policies
alter table audit_logs enable row level security;

create policy "Admins can read all audit logs"
    on audit_logs for select
    to authenticated
    using (
        exists (
            select 1 from user_roles
            where user_id = auth.uid()
            and role = 'admin'
        )
    );

create policy "Users can read their own audit logs"
    on audit_logs for select
    to authenticated
    using (
        user_id = auth.uid()
    );

-- Document version policies
alter table document_versions enable row level security;

create policy "Document version access follows document access"
    on document_versions for all
    using (
        check_document_access(document_id, auth.uid())
    );

/* Triggers */

-- Audit logging trigger
create or replace function audit_log_changes()
returns trigger as $$
begin
    insert into audit_logs (
        user_id,
        action,
        resource,
        metadata,
        status
    ) values (
        auth.uid(),
        case
            when tg_op = 'INSERT' then 'create'
            when tg_op = 'UPDATE' then 'update'
            when tg_op = 'DELETE' then 'delete'
        end,
        jsonb_build_object(
            'table', tg_table_name,
            'id', coalesce(new.id, old.id)
        ),
        jsonb_build_object(
            'old_data', to_jsonb(old),
            'new_data', to_jsonb(new)
        ),
        'success'
    );
    return coalesce(new, old);
end;
$$ language plpgsql security definer;

-- Document versioning trigger
create or replace function create_document_version()
returns trigger as $$
begin
    if (tg_op = 'UPDATE' and old.hash != new.hash) then
        insert into document_versions (
            document_id,
            version_number,
            storage_path,
            size,
            hash,
            created_by
        )
        select
            new.id,
            coalesce(
                (
                    select max(version_number) + 1
                    from document_versions
                    where document_id = new.id
                ),
                1
            ),
            new.storage_path,
            new.size,
            new.hash,
            auth.uid();
    end if;
    return new;
end;
$$ language plpgsql security definer;

-- Create triggers
create trigger audit_documents
    after insert or update or delete on documents
    for each row execute function audit_log_changes();

create trigger version_documents
    after update on documents
    for each row execute function create_document_version();