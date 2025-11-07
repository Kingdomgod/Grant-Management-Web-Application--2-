import { getSupabaseClient } from './client';

export interface AuditEvent {
  timestamp: Date;
  userId: string;
  action: AuditAction;
  resource: {
    type: string;
    id: string;
  };
  metadata: {
    ip: string;
    userAgent: string;
    location?: string;
    changes?: Record<string, any>;
  };
  status: 'success' | 'failure';
}

export enum AuditAction {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  LOGIN = 'login',
  LOGOUT = 'logout',
  EXPORT = 'export',
  APPROVE = 'approve',
  REJECT = 'reject'
}

export interface POPIAConfig {
  dataRetention: {
    personalInfo: number;
    documents: number;
    auditLogs: number;
  };
  dataAccess: {
    selfService: boolean;
    exportFormat: string[];
    responseTime: number;
  };
  dataLocation: {
    primary: string;
    backup: string;
    crossBorder: boolean;
  };
}

export const popiaConfig: POPIAConfig = {
  dataRetention: {
    personalInfo: 365, // days
    documents: 730,    // days
    auditLogs: 1825    // days (5 years)
  },
  dataAccess: {
    selfService: true,
    exportFormat: ['pdf', 'csv', 'json'],
    responseTime: 72   // hours
  },
  dataLocation: {
    primary: 'za-south',
    backup: 'za-north',
    crossBorder: false
  }
};

// Log an audit event
export const logAuditEvent = async (event: Omit<AuditEvent, 'timestamp'>): Promise<void> => {
  const supabase = getSupabaseClient();
  
  try {
    const { error } = await supabase
      .from('audit_logs')
      .insert({
        ...event,
        timestamp: new Date().toISOString()
      });

    if (error) throw error;
  } catch (error) {
    console.error('Failed to log audit event:', error);
    throw error;
  }
};

// Get audit logs with filtering and pagination
export const getAuditLogs = async (
  filters: Partial<{
    userId: string;
    action: AuditAction;
    resourceType: string;
    startDate: Date;
    endDate: Date;
    status: 'success' | 'failure';
  }>,
  page: number = 1,
  pageSize: number = 50
): Promise<{ data: AuditEvent[]; total: number }> => {
  const supabase = getSupabaseClient();
  
  try {
    let query = supabase
      .from('audit_logs')
      .select('*', { count: 'exact' });

    // Apply filters
    if (filters.userId) {
      query = query.eq('userId', filters.userId);
    }
    if (filters.action) {
      query = query.eq('action', filters.action);
    }
    if (filters.resourceType) {
      query = query.eq('resource->type', filters.resourceType);
    }
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.startDate) {
      query = query.gte('timestamp', filters.startDate.toISOString());
    }
    if (filters.endDate) {
      query = query.lte('timestamp', filters.endDate.toISOString());
    }

    // Add pagination
    const start = (page - 1) * pageSize;
    query = query
      .order('timestamp', { ascending: false })
      .range(start, start + pageSize - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    return {
      data: data as AuditEvent[],
      total: count || 0
    };
  } catch (error) {
    console.error('Failed to fetch audit logs:', error);
    throw error;
  }
};

// Get user data access request
export const getUserDataRequest = async (
  userId: string,
  requestId: string
): Promise<any> => {
  const supabase = getSupabaseClient();
  
  try {
    // Get user's personal information
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError) throw userError;

    // Get user's documents
    const { data: documents, error: docsError } = await supabase
      .from('documents')
      .select('*')
      .eq('user_id', userId);

    if (docsError) throw docsError;

    // Get user's audit logs
    const { data: auditLogs, error: auditError } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('userId', userId);

    if (auditError) throw auditError;

    // Log the data access request
    await logAuditEvent({
      userId,
      action: AuditAction.EXPORT,
      resource: {
        type: 'data_request',
        id: requestId
      },
      metadata: {
        ip: window.clientInformation?.platform || 'unknown',
        userAgent: navigator.userAgent,
        changes: null
      },
      status: 'success'
    });

    return {
      personalInfo: userData,
      documents,
      auditLogs
    };
  } catch (error) {
    console.error('Failed to process data access request:', error);
    throw error;
  }
};

// Clean up expired data according to retention policy
export const cleanupExpiredData = async (): Promise<void> => {
  const supabase = getSupabaseClient();
  
  try {
    const now = new Date();

    // Calculate cutoff dates
    const personalInfoCutoff = new Date(now.getTime() - popiaConfig.dataRetention.personalInfo * 24 * 60 * 60 * 1000);
    const documentsCutoff = new Date(now.getTime() - popiaConfig.dataRetention.documents * 24 * 60 * 60 * 1000);
    const auditLogsCutoff = new Date(now.getTime() - popiaConfig.dataRetention.auditLogs * 24 * 60 * 60 * 1000);

    // Delete expired personal information
    const { error: userError } = await supabase
      .from('users')
      .delete()
      .lt('last_activity', personalInfoCutoff.toISOString());

    if (userError) throw userError;

    // Delete expired documents
    const { error: docsError } = await supabase
      .from('documents')
      .delete()
      .lt('created_at', documentsCutoff.toISOString());

    if (docsError) throw docsError;

    // Delete expired audit logs
    const { error: auditError } = await supabase
      .from('audit_logs')
      .delete()
      .lt('timestamp', auditLogsCutoff.toISOString());

    if (auditError) throw auditError;

    // Log cleanup event
    await logAuditEvent({
      userId: 'system',
      action: AuditAction.DELETE,
      resource: {
        type: 'data_cleanup',
        id: new Date().toISOString()
      },
      metadata: {
        ip: 'system',
        userAgent: 'system',
        changes: {
          personalInfoCutoff,
          documentsCutoff,
          auditLogsCutoff
        }
      },
      status: 'success'
    });
  } catch (error) {
    console.error('Failed to cleanup expired data:', error);
    throw error;
  }
};