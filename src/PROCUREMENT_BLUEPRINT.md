# Government Grant Management System
## Procurement-Ready Implementation Blueprint
### North West Provincial Government

**Document Classification:** Procurement-Grade Technical Specification  
**Version:** 1.0  
**Date:** November 6, 2025  
**Target Deployment:** North West Province, South Africa  
**Compliance Scope:** POPIA, WCAG 2.1 AA, Government Security Standards

---

## Executive Summary

The **Provincial Grant Management Platform** is a secure, cloud-native web application designed to digitize and automate grant administration across North West Province departments. The system serves three distinct user groups: **Grantors** (provincial officials managing grant programs), **Grantees** (citizens, NGOs, and organizations applying for funding), and **Admins** (system oversight and governance). 

The platform delivers three critical outcomes for government:
1. **70% reduction in grant processing time** from application to award through automated eligibility checks and digital workflows
2. **Complete audit transparency** with immutable logging of every transaction for anti-corruption compliance
3. **Universal access** via mobile-first design supporting rural communities on 2G networks with offline capabilities, ensuring equitable service delivery across all 23 local municipalities

---

## System Architecture Overview

### High-Level Components

**Presentation Layer:**
- React 18 + TypeScript SPA with Material Design 3
- Progressive Web App (PWA) with offline capabilities
- Responsive design (mobile-first, 320px minimum width)
- Three role-specific portals: Grantee, Grantor, Admin

**Application Layer:**
- Hono web server on Deno runtime (Supabase Edge Functions)
- REST API with JWT authentication
- Rate limiting: 100 requests/minute per user
- Business logic services: Grant, Application, Review, Audit, Notification, Document, Eligibility, Financial

**Data Layer:**
- PostgreSQL 15+ (Supabase-managed) with row-level security
- Key-value store for grants, applications, user profiles
- Supabase Storage (S3-compatible) for documents
- AES-256 encryption at rest

**Integration Layer:**
- National Treasury LOGIS API (payment processing)
- Home Affairs HANIS API (ID verification)
- Email gateway (SendGrid/AWS SES)
- SMS gateway (Clickatell)

---

## Detailed Functional Requirements

### 1. Grant Lifecycle Management

#### 1.1 Grant Creation & Publishing (Grantor)
- Grant template library for common types (SMME, NPO, infrastructure, bursaries)
- Configurable eligibility criteria with conditional logic builder
- Document checklist configuration (required vs. optional)
- Grant status workflow: Draft → Published → Open → Closed → Awarded → Completed
- Bulk grant upload via CSV
- Grant versioning with changelog
- Public grant portal (unauthenticated read access)

#### 1.2 Application Intake (Grantee)
- Grant discovery with filters (location, sector, amount, deadline)
- Eligibility pre-screening with instant feedback
- Multi-step application wizard with auto-save every 30 seconds
- File upload with drag-and-drop, resumable uploads, virus scanning
- Offline application entry (PWA with IndexedDB storage)
- Copy from previous application feature
- Deadline countdown timer

#### 1.3 Review & Evaluation Workflow (Grantor)
- Review queue dashboard with kanban board view
- Configurable scoring rubric with weighted criteria
- Multi-reviewer workflow (blind reviews, consensus mode)
- Internal comments with @mentions and tags
- External communication to grantees (document requests, clarifications)
- Conflict of interest declaration
- SLA tracking with overdue alerts

#### 1.4 Approval & Award Process
- Multi-stage approval workflow with configurable thresholds
- Batch approval capabilities
- Automated award letter generation (digitally signed PDF)
- Email + SMS notifications to grantees
- Waitlist management with auto-promotion

#### 1.5 Disbursement & Monitoring
- Milestone-based payment schedules
- Progress reporting templates (quarterly/semi-annual)
- Site visit scheduling with GPS verification
- Non-compliance management (flags, warnings, suspensions)
- Grant closeout with completion certificates

#### 1.6 Reporting & Analytics
- Pre-built reports: pipeline, demographics, geographic distribution, budget utilization
- Custom report builder with drag-and-drop fields
- Data export (CSV, Excel, JSON, PDF)
- Executive dashboard with KPI tiles and trend charts

---

### 2. Role-Based Authentication & Registration

#### 2.1 Grantee Self-Registration
- Email/password registration with strong password requirements (min 12 chars)
- South African ID number validation (Luhn algorithm checksum)
- Organization details (name, registration number, type)
- Physical address and banking details
- POPIA consent checkbox (required)
- Email verification (future phase)
- Rate limiting: 5 registrations per IP per hour

#### 2.2 Grantor Invitation-Based Registration
- Admin invites grantors via email
- Email domain whitelist (@nwpg.gov.za)
- Invitation token expires in 7 days (one-time use)
- Pre-filled department, position, permissions
- Audit log of invitations

#### 2.3 Admin Account Creation
- Bootstrap admin via server-side script (first-run setup)
- Subsequent admins invited by existing admins
- Full permissions or granular permission assignment

#### 2.4 Login Flow
- Email/password authentication via Supabase Auth
- JWT access token (1-hour expiry)
- Refresh token (30 days if "Remember Me", else 1 day)
- Failed login lockout: 5 attempts → 15-minute lockout
- Role-based dashboard redirect

#### 2.5 Multi-Factor Authentication (Phase 2)
- SMS OTP (recommended for South Africa)
- Authenticator app (TOTP)
- Email OTP (fallback)
- Mandatory for admins, recommended for grantors, optional for grantees

#### 2.6 Session Management
- Max 3 concurrent sessions per user
- Force logout on password change, role change, or security incident
- Token refresh before expiry

#### 2.7 Password Reset
- Forgot password flow with email link
- Reset token expires in 1 hour (one-time use)
- Cannot reuse last 3 passwords
- Force logout all sessions after reset

---

### 3. User Profile & Document Management

#### 3.1 User Profile Management
- Grantee profile: personal info, organization details, banking (encrypted), BBBEE, tax clearance
- Grantor profile: employee number, department, position, digital signature
- Profile completeness indicator with progress bar
- Audit log of profile changes

#### 3.2 Document Upload & Management
- Accepted formats: PDF, JPG, PNG, DOCX, XLSX (max 10MB per file)
- Max 20 files per application
- Resumable uploads for slow connections (chunked upload with retry logic)
- Virus scanning (ClamAV or similar)
- File storage in Supabase Storage with signed URLs (1-hour expiry)
- Access control: grantees view own, grantors view assigned applications, admins view all

#### 3.3 Document Versioning
- Track document versions (superseded status)
- Keep old versions for audit trail
- Version history with download links

---

### 4. Dynamic Forms & Conditional Logic

#### 4.1 Form Builder (Grantor)
- MVP: Hard-coded form schemas in code
- Future Phase 3: Visual drag-and-drop form designer
- Field types: text, textarea, number, email, phone, date, select, radio, checkbox, file
- Validation rules: min/max length, regex patterns, custom functions

#### 4.2 Conditional Field Display
- Progressive disclosure based on user input
- Operators: ==, !=, >, <, in, not_in
- Use cases: organization type branching, funding source, project type, budget thresholds

#### 4.3 Nested Fields (Repeatable Sections)
- Budget line items with auto-calculated totals
- Team members, project milestones, previous grants, references

---

### 5. Audit Trails & Immutable Logging

#### 5.1 Audit Log Schema
- Event types: authentication, grant management, application lifecycle, document management, financial operations, system administration, compliance & security
- Comprehensive event list (50+ event types)
- Stored in kv_store with composite keys for efficient querying
- Retention: 7 years (financial), 2 years (authentication), 1 year (general), indefinite (security incidents)

#### 5.2 Audit Log Viewer (Admin)
- Date range, event type, user, resource, status filters
- Full-text search
- CSV export for compliance audits
- Real-time view with auto-refresh

#### 5.3 Tamper-Evidence (Phase 3)
- Hash chaining (blockchain-inspired)
- SHA-256 hash of entry + previous hash
- Integrity verification function

---

## Nonfunctional Requirements

### 1. Performance SLAs
- Page load time (landing): < 2 seconds (LCP < 2.5s)
- Dashboard load time: < 3 seconds
- API response time (read): < 500ms (p95)
- API response time (write): < 1 second (p95)
- Search results: < 1 second (10,000 grants)
- File upload (5MB): < 30 seconds (3G connection)
- Report generation: < 10 seconds (10,000 records)
- Database query: < 100ms (p99)
- Concurrent users: 10,000 (no degradation)

### 2. Scalability & Availability
- Autoscaling: Supabase Edge Functions auto-scale
- Multi-region deployment: Primary in Johannesburg, failover to EU
- Database replication with automatic failover
- RTO: 5 minutes, RPO: 5 minutes
- Uptime SLA: 99.9% (43.8 minutes downtime/month)
- Automated daily backups (30-day retention)
- Point-in-time recovery (7 days)

### 3. Accessibility (WCAG 2.1 AA Compliance)
- All images have alt text
- Semantic HTML5 elements
- 4.5:1 contrast ratio for normal text
- Keyboard navigation for all functionality
- Screen reader compatible (ARIA labels, roles)
- Skip to main content link
- Focus indicators visible
- No keyboard traps
- Consistent navigation
- Error identification with suggestions
- Accessibility statement at /accessibility

### 4. Internationalization & Multilingual Support
- Phase 1 (MVP): English only
- Phase 2: English + Afrikaans + Setswana
- Phase 3: Add isiZulu, isiXhosa, Sesotho
- Phase 4: All 11 South African official languages
- react-i18next library for translations
- Locale-specific date, currency, number formatting
- Professional translation for legal/financial terms

### 5. Offline & Low-Bandwidth Behavior
- PWA with service worker caching
- Offline capabilities: browse grants, fill applications (draft mode), view submitted applications
- Background sync for queued submissions
- Image compression (WebP format, lazy loading)
- Data pagination (20 items per page)
- Gzip/Brotli compression for API responses
- Resumable file uploads (tus protocol)
- Offline indicator banner

---

## Real-Time Architecture & Notifications

### 1. Push Mechanisms
- **WebSockets (Supabase Realtime):** Dashboard live updates, multi-user collaboration, chat
- **Server-Sent Events (SSE):** Progress tracking, event streams
- **Web Push API:** Deadline reminders, status changes, new opportunities

### 2. Event-Driven Architecture
- Event bus pattern with Supabase Realtime as message broker
- Event types: grant published, application submitted, application approved, document uploaded, payment requested
- Automatic side effects: email/SMS notifications, dashboard updates, audit logging

### 3. Notification Types & Delivery Channels
- **In-app notifications:** Notification center with unread badge
- **Email notifications:** Welcome, application confirmation, status changes, approval/rejection, document requests, deadline reminders, password reset
- **SMS notifications:** Critical alerts, deadline reminders, OTP for MFA
- Email provider: SendGrid (recommended)
- SMS provider: Clickatell (recommended for South Africa)
- Cost estimation: R10,000/month (~$550 USD) for 50,000 SMS

---

## Security, Privacy & Compliance

### 1. Data Classification & Storage Rules
- Public: Published grants (no encryption)
- Internal: Draft grants (at rest encryption)
- Confidential: Applications, review scores (at rest + transit encryption)
- Restricted: Banking details, ID numbers (at rest + transit + app-level encryption)

### 2. Encryption
- At rest: AES-256 (Supabase automatic)
- In transit: HTTPS only (TLS 1.3), HSTS header
- Application-level: AES-256-CBC for sensitive fields (ID numbers, banking details)
- Key management: Environment variables, 90-day rotation

### 3. Authentication & Authorization
- OAuth 2.0 / OIDC via Supabase Auth
- JWT tokens with role and permissions
- RBAC matrix with granular permissions
- Resource-level authorization (users can only edit own resources unless admin)
- Session management: 1-hour access token, 30-day refresh token (with rotation)
- Password policy: min 12 chars, complexity requirements, no reuse of last 3 passwords

### 4. POPIA Alignment (South Africa Data Protection)
- Lawful processing with explicit consent
- Purpose specification in privacy policy
- Data minimization and quality
- Security safeguards (encryption, access controls)
- Data subject rights: access, rectification, erasure, objection, portability
- Data breach notification within 72 hours
- Data retention: 7 years (financial), 2 years (rejected applications), indefinite (active profiles)
- Data residency: South Africa (Johannesburg region)
- Information Officer designated

### 5. Logging & Security Testing
- Comprehensive logging: application, access, security, change logs
- Structured JSON format
- Log storage: Supabase (short-term), AWS CloudWatch/S3 (long-term)
- Tamper-evidence: Hash chaining (Phase 3)
- Key rotation schedule: 90 days (encryption keys), 180 days (JWT signing key), annually (API keys)
- SAST: Snyk, SonarQube (run on every commit)
- DAST: OWASP ZAP, Burp Suite (weekly on staging)
- Penetration testing: Annually by external certified ethical hackers
- Bug bounty program (Phase 4)
- Security incident response plan

---

## Integration & Interoperability

### 1. National Treasury LOGIS API
- Purpose: Grant disbursement payment processing
- Phase 1 (MVP): Manual CSV export/import
- Phase 2: Batch API integration (nightly job)
- Phase 3: Real-time API integration
- Data mapping: application reference → transaction ID, grantee details → beneficiary
- Error handling: Retry 3 times with 1-hour delay, notify admin if all fail

### 2. Home Affairs HANIS API
- Purpose: South African ID number verification
- Verify ID number, full name, date of birth against Home Affairs database
- Integration during registration and application submission
- Error handling: Graceful degradation if API unavailable

### 3. Email & SMS Gateways
- Email: SendGrid (100 emails/day free, then $19.95/month for 50k)
- SMS: Clickatell (~R0.20 per SMS)
- Transactional email templates: welcome, application confirmation, status changes, approval/rejection, document requests, deadline reminders, password reset
- SMS templates: application submitted, approved, deadline reminders, OTP

---

## Operations, Governance & Procurement Readiness

### 1. Hosting Options

#### Option A: Cloud-Native (Supabase) - **RECOMMENDED**
**Rationale:** Faster deployment, automatic scaling, lower upfront cost, managed security patches.

- **Platform:** Supabase (PostgreSQL, Storage, Auth, Edge Functions)
- **Primary Region:** South Africa (Johannesburg)
- **Failover Region:** EU (Dublin) for geo-redundancy
- **CDN:** Cloudflare for static assets
- **Compliance:** ISO 27001, SOC 2 Type II (Supabase certifications)
- **Data Residency:** Guaranteed South African data residency per POPIA
- **SLA:** 99.9% uptime with financial penalties for downtime
- **Setup Time:** 2 weeks

#### Option B: On-Premise (Provincial Data Center)
**Rationale:** Full control, but requires infrastructure team and higher maintenance.

- **Infrastructure:** Provincial IT data center
- **Hardware:** 3-node PostgreSQL cluster, load balancers, storage array
- **Team Required:** 2 database admins, 1 network engineer, 1 security officer
- **Compliance:** Full control over data location
- **SLA:** Dependent on provincial IT capacity
- **Setup Time:** 3-6 months
- **Ongoing Cost:** R1.2M/year (hardware, power, personnel)

**RECOMMENDATION:** Option A (Cloud-Native) for Phase 1-2, evaluate Option B for Phase 3+ if political requirements dictate on-premise hosting.

---

### 2. CI/CD Pipeline
- GitHub Actions for automated testing and deployment
- Environments: development, staging, production
- Automated tests: unit, integration, end-to-end (Playwright)
- SAST on every commit (Snyk, SonarQube)
- DAST on staging weekly (OWASP ZAP)
- Deployment approval gates for production

---

### 3. Backup & Disaster Recovery Plan

| Metric | Target | Implementation |
|--------|--------|----------------|
| **RTO** (Recovery Time Objective) | 5 minutes | Automated failover to secondary region |
| **RPO** (Recovery Point Objective) | 5 minutes | Real-time database replication |
| **Backup Frequency** | Daily | Automated at 2:00 AM SAST |
| **Backup Retention** | 30 days (daily), 90 days (weekly) | Supabase automatic + S3 archive |
| **Disaster Recovery Drill** | Quarterly | Full restore test to staging environment |
| **Data Corruption Recovery** | Point-in-time (7 days) | PostgreSQL PITR capability |

**Disaster Scenarios Covered:**
1. Primary region failure → Automatic DNS failover to EU region (5 min)
2. Database corruption → Point-in-time restore (30 min)
3. Accidental data deletion → Restore from daily backup (1 hour)
4. Ransomware attack → Restore from offline backup (2 hours)
5. Complete Supabase failure → Migrate to AWS RDS (48 hours)

---

### 4. Patching & Maintenance Cadence

| Component | Frequency | Window | Notification |
|-----------|-----------|--------|--------------|
| **Database (PostgreSQL)** | Monthly | Sunday 2-4 AM SAST | 7 days advance |
| **Edge Functions** | Bi-weekly | Zero-downtime rolling | 3 days advance |
| **Frontend Assets** | Weekly | Zero-downtime | No notification |
| **Security Patches** | Within 48 hours | Emergency window | Immediate |
| **Dependency Updates** | Monthly | Development cycle | N/A |

**Maintenance Notifications:** Email to admins + banner on dashboard + SMS for emergency patches.

---

### 5. Service Level Agreements (SLAs)

#### System Availability
- **Uptime Target:** 99.9% (8.76 hours downtime/year, 43.8 min/month)
- **Planned Maintenance Window:** Sunday 2-4 AM SAST (excluded from uptime calculation)
- **Measurement:** Third-party uptime monitor (Pingdom)
- **Penalty:** 10% monthly credit for 99.0-99.8%, 25% for < 99.0%

#### Performance
- **Page Load (LCP):** < 2.5 seconds (95th percentile)
- **API Response:** < 500ms read, < 1s write (95th percentile)
- **Report Generation:** < 10 seconds (10,000 records)
- **Search:** < 1 second (100,000 grants)

#### Support Response Times
| Severity | Description | Response Time | Resolution Target |
|----------|-------------|---------------|-------------------|
| **Critical** | System down, data breach | 30 minutes | 4 hours |
| **High** | Major feature broken, security issue | 2 hours | 24 hours |
| **Medium** | Feature degraded, workflow impaired | 8 hours | 5 business days |
| **Low** | Cosmetic issue, feature request | 2 business days | 30 days |

---

### 6. Support Model

#### Tier 1: Self-Service
- Knowledge base with 100+ articles
- Video tutorials (15 minutes each for key workflows)
- Searchable FAQ
- Chatbot (Phase 2)
- **Availability:** 24/7

#### Tier 2: Email Support
- **Email:** support@grants.nwpg.gov.za
- **Response Time:** Per SLA table above
- **Staff:** 2 support officers (8 AM - 5 PM SAST)
- **Languages:** English, Afrikaans, Setswana (Phase 2)

#### Tier 3: Phone Support
- **Hotline:** 0800-GRANTS (0800-472687) toll-free
- **Hours:** Business hours (8 AM - 5 PM SAST, Mon-Fri)
- **Escalation Path:** Support → Technical Lead → System Admin

#### Tier 4: On-Site Support (Grantors Only)
- Dedicated account manager for provincial departments
- Quarterly on-site training sessions
- Priority escalation channel

---

### 7. Training & Knowledge Transfer

#### Initial Training (Go-Live)
- **Grantors:** 2-day workshop (16 hours total)
  - Day 1: Grant creation, eligibility configuration, review workflows
  - Day 2: Reporting, approvals, disbursement tracking, admin functions
- **Grantees:** 1-hour webinar + recorded video
  - Application process, document upload, status tracking
- **Admins:** 1-day technical training (8 hours)
  - User management, audit logs, system monitoring, troubleshooting

#### Ongoing Training
- Monthly webinars for new features
- Quarterly refresher training
- Train-the-trainer program for departmental champions

#### Knowledge Transfer Materials
- Administrator manual (150+ pages)
- User guide (30 pages, illustrated)
- API documentation (OpenAPI spec)
- Video library (20+ tutorials)
- Printable quick reference cards

---

### 8. Vendor Handover Items (If Vendor Built)

**Code & Documentation:**
- [x] Complete source code repository (GitHub)
- [x] Architecture decision records (ADRs)
- [x] Database schema documentation
- [x] API specification (OpenAPI/Swagger)
- [x] Deployment scripts and CI/CD pipeline
- [x] Environment configuration guide

**Testing Artifacts:**
- [x] Test plan with 200+ test cases
- [x] Automated test suite (unit, integration, E2E)
- [x] Penetration test report (no high/critical vulnerabilities)
- [x] Accessibility audit report (WCAG 2.1 AA compliant)
- [x] Performance test results (load testing report)

**Operational:**
- [x] Runbook for common issues
- [x] Incident response plan
- [x] Disaster recovery procedure
- [x] User training materials
- [x] Support escalation matrix

**Legal & Compliance:**
- [x] POPIA compliance report
- [x] Privacy policy and terms of service
- [x] Software license documentation
- [x] Third-party dependency list with licenses
- [x] Security attestation letter

---

### 9. Monitoring & Alerting
- **Application Monitoring:** Sentry for error tracking
- **Performance Monitoring:** Lighthouse CI, WebPageTest
- **Uptime Monitoring:** Pingdom or UptimeRobot
- **Log Aggregation:** AWS CloudWatch or Datadog
- **Alerts:** Email + SMS for critical issues (downtime, security incidents)

---

## Cost Estimation (Annual)

| Item | Cost (ZAR) | Cost (USD) |
|------|-----------|-----------|
| Supabase Pro Plan | R36,000 | $2,000 |
| Email (SendGrid) | R24,000 | $1,320 |
| SMS (Clickatell) | R120,000 | $6,600 |
| Domain & SSL | R1,800 | $100 |
| Monitoring Tools | R18,000 | $1,000 |
| Penetration Testing | R100,000 | $5,500 |
| **Total** | **R299,800** | **$16,520** |

*Note: Excludes development costs, assumes 10,000 active users*

---

## Implementation Roadmap

### Phase 1 (MVP) - 3 months
- Core grant and application management
- Grantee self-registration, grantor invitation-based registration
- Basic reporting
- English only
- Manual LOGIS integration (CSV export)

### Phase 2 - 3 months
- Multi-language support (English, Afrikaans, Setswana)
- MFA (SMS OTP)
- Batch LOGIS API integration
- Advanced reporting and analytics
- Home Affairs HANIS integration

### Phase 3 - 3 months
- Visual form builder
- Document versioning and comparison
- Hash chaining for audit logs
- Real-time LOGIS API integration
- Additional languages (isiZulu, isiXhosa, Sesotho)

### Phase 4 - 3 months
- Bug bounty program
- All 11 official languages
- Mobile app (React Native)
- Advanced analytics (predictive modeling)
- Integration with additional government systems

---

## Acceptance Criteria

### Functional
- Grantor can publish a grant in < 10 minutes
- Grantee can complete application on mobile phone (rural scenario)
- Application auto-saves without data loss
- Reviewer can complete evaluation in < 30 minutes
- Award letters generated in < 5 seconds
- Reports generate in < 10 seconds (10,000 records)

### Nonfunctional
- Page load time < 2 seconds
- API response time < 500ms (p95)
- 99.9% uptime
- WCAG 2.1 AA compliance (100% automated tests pass)
- POPIA compliance (verified by legal review)
- Security: No high/critical vulnerabilities in penetration test

### User Acceptance
- 90% user satisfaction score
- < 5% support ticket rate
- 80% task completion rate (usability testing)

---

## Appendices

### A. Glossary
- **Grantee:** Individual or organization applying for a grant
- **Grantor:** Government official managing grant programs
- **Admin:** System administrator with full permissions
- **POPIA:** Protection of Personal Information Act (South Africa)
- **WCAG:** Web Content Accessibility Guidelines
- **RBAC:** Role-Based Access Control
- **JWT:** JSON Web Token
- **PWA:** Progressive Web App
- **SLA:** Service Level Agreement
- **RTO:** Recovery Time Objective
- **RPO:** Recovery Point Objective

### B. References
- POPIA Act 4 of 2013
- WCAG 2.1 Guidelines
- OWASP Top 10 Security Risks
- South African National Treasury Regulations
- Supabase Documentation

### C. Contact Information
- **Project Owner:** North West Provincial Government
- **Technical Lead:** [To be assigned]
- **Information Officer:** information.officer@nwpg.gov.za
- **Support Email:** support@grants.nwpg.gov.za

---

**Document End**

*This blueprint is a living document and will be updated as requirements evolve. Version control maintained in Git repository.*
