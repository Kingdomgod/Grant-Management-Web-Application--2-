import { Hono } from 'npm:hono';
import { cors } from 'npm:hono/cors';
import { logger } from 'npm:hono/logger';
import { createClient } from 'npm:@supabase/supabase-js@2.39.3';
import * as kv from './kv_store.tsx';

const app = new Hono();

// Middleware
app.use('*', cors());
app.use('*', logger(console.log));

// Initialize Supabase client
const getSupabaseClient = () => {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
};

// Helper function to generate unique IDs
const generateId = () => crypto.randomUUID();

// Helper function to get current user from auth token
const getCurrentUser = async (request: Request) => {
  const accessToken = request.headers.get('Authorization')?.split(' ')[1];
  if (!accessToken) {
    console.log('getCurrentUser: No access token in request');
    return null;
  }

  const supabase = getSupabaseClient();
  const { data: { user }, error } = await supabase.auth.getUser(accessToken);
  
  if (error) {
    console.log('getCurrentUser: Supabase auth error:', error.message);
    return null;
  }
  
  if (!user) {
    console.log('getCurrentUser: No user returned from Supabase');
    return null;
  }

  console.log('getCurrentUser: Supabase user found:', user.id);

  // Get user profile from KV store
  const userProfile = await kv.get(`user:${user.id}`);
  
  if (!userProfile) {
    console.log('getCurrentUser: No user profile in KV store for user:', user.id);
    return null;
  }
  
  console.log('getCurrentUser: User profile found:', { id: user.id, role: userProfile.role, email: userProfile.email });
  return { ...userProfile, id: user.id };
};

// Helper function to log audit entries
const logAudit = async (userId: string, action: string, details: any) => {
  const timestamp = Date.now();
  const auditEntry = {
    userId,
    action,
    details,
    timestamp,
    id: generateId()
  };
  await kv.set(`audit:${timestamp}:${generateId()}`, auditEntry);
};

// ========== AUTHENTICATION ENDPOINTS ==========

// Sign up
app.post('/make-server-f6f51aa6/signup', async (c) => {
  try {
    const { email, password, name, role, organization, phone } = await c.req.json();

    if (!email || !password || !name || !role) {
      return c.json({ error: 'Missing required fields during signup: email, password, name, and role are required' }, 400);
    }

    const supabase = getSupabaseClient();
    
    // Create user with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm since email server not configured
      user_metadata: { name }
    });

    if (authError) {
      console.log('Signup error:', authError);
      return c.json({ error: `Failed to create user account: ${authError.message}` }, 400);
    }

    if (!authData.user) {
      return c.json({ error: 'User creation failed - no user data returned' }, 500);
    }

    // Store user profile in KV
    const userProfile = {
      id: authData.user.id,
      email,
      name,
      role, // 'admin', 'grantor', or 'grantee'
      organization: organization || '',
      phone: phone || '',
      createdAt: Date.now()
    };

    await kv.set(`user:${authData.user.id}`, userProfile);
    
    // Log audit entry
    await logAudit(authData.user.id, 'user_signup', { email, role });

    return c.json({ 
      success: true, 
      user: userProfile,
      message: 'Account created successfully' 
    });
  } catch (error) {
    console.log('Signup error:', error);
    return c.json({ error: `Signup failed: ${error.message}` }, 500);
  }
});

// Get current session
app.get('/make-server-f6f51aa6/session', async (c) => {
  try {
    const user = await getCurrentUser(c.req.raw);
    
    if (!user) {
      return c.json({ user: null });
    }

    return c.json({ user });
  } catch (error) {
    console.log('Session error:', error);
    return c.json({ error: `Session check failed: ${error.message}` }, 500);
  }
});

// ========== GRANT ENDPOINTS ==========

// Create grant (Admin/Grantor only)
app.post('/make-server-f6f51aa6/grants', async (c) => {
  try {
    console.log('=== CREATE GRANT REQUEST ===');
    const user = await getCurrentUser(c.req.raw);
    console.log('Current user:', user ? { id: user.id, role: user.role, name: user.name } : 'No user');
    
    if (!user || (user.role !== 'admin' && user.role !== 'grantor')) {
      console.log('Authorization failed - user role:', user?.role);
      return c.json({ error: 'Unauthorized: Only admins and grantors can create grants' }, 401);
    }

    const grantData = await c.req.json();
    console.log('Grant data received:', grantData);
    
    const grantId = generateId();
    console.log('Generated grant ID:', grantId);
    
    const grant = {
      id: grantId,
      ...grantData,
      createdBy: user.id,
      createdByName: user.name,
      createdAt: Date.now(),
      status: 'active', // active, closed
      applicationCount: 0
    };
    
    console.log('Grant object to save:', grant);

    await kv.set(`grant:${grantId}`, grant);
    console.log('Grant saved to KV store');
    
    await logAudit(user.id, 'grant_created', { grantId, title: grant.title });
    console.log('Audit log created');

    return c.json({ success: true, grant });
  } catch (error) {
    console.log('Create grant error - full details:', error);
    console.log('Error message:', error.message);
    console.log('Error stack:', error.stack);
    return c.json({ error: `Failed to create grant: ${error.message}` }, 500);
  }
});

// Get all grants
app.get('/make-server-f6f51aa6/grants', async (c) => {
  try {
    const grants = await kv.getByPrefix('grant:');
    
    // Sort by created date, newest first
    const sortedGrants = grants.sort((a, b) => b.createdAt - a.createdAt);
    
    return c.json({ grants: sortedGrants });
  } catch (error) {
    console.log('Get grants error:', error);
    return c.json({ error: `Failed to fetch grants: ${error.message}` }, 500);
  }
});

// Get single grant
app.get('/make-server-f6f51aa6/grants/:id', async (c) => {
  try {
    const grantId = c.req.param('id');
    const grant = await kv.get(`grant:${grantId}`);
    
    if (!grant) {
      return c.json({ error: 'Grant not found' }, 404);
    }

    return c.json({ grant });
  } catch (error) {
    console.log('Get grant error:', error);
    return c.json({ error: `Failed to fetch grant: ${error.message}` }, 500);
  }
});

// Update grant
app.put('/make-server-f6f51aa6/grants/:id', async (c) => {
  try {
    const user = await getCurrentUser(c.req.raw);
    
    if (!user || (user.role !== 'admin' && user.role !== 'grantor')) {
      return c.json({ error: 'Unauthorized: Only admins and grantors can update grants' }, 401);
    }

    const grantId = c.req.param('id');
    const existingGrant = await kv.get(`grant:${grantId}`);
    
    if (!existingGrant) {
      return c.json({ error: 'Grant not found' }, 404);
    }

    const updates = await c.req.json();
    const updatedGrant = {
      ...existingGrant,
      ...updates,
      updatedAt: Date.now(),
      updatedBy: user.id
    };

    await kv.set(`grant:${grantId}`, updatedGrant);
    await logAudit(user.id, 'grant_updated', { grantId, updates });

    return c.json({ success: true, grant: updatedGrant });
  } catch (error) {
    console.log('Update grant error:', error);
    return c.json({ error: `Failed to update grant: ${error.message}` }, 500);
  }
});

// ========== APPLICATION ENDPOINTS ==========

// Submit application (Grantee only)
app.post('/make-server-f6f51aa6/applications', async (c) => {
  try {
    const user = await getCurrentUser(c.req.raw);
    
    if (!user || user.role !== 'grantee') {
      return c.json({ error: 'Unauthorized: Only grantees can submit applications' }, 401);
    }

    const applicationData = await c.req.json();
    const applicationId = generateId();
    
    const application = {
      id: applicationId,
      ...applicationData,
      applicantId: user.id,
      applicantName: user.name,
      applicantEmail: user.email,
      applicantOrganization: user.organization,
      applicantPhone: user.phone,
      submittedAt: Date.now(),
      status: 'pending', // pending, under_review, awarded, rejected
      score: null,
      reviewComments: []
    };

    await kv.set(`application:${applicationId}`, application);

    // Increment application count on grant
    const grant = await kv.get(`grant:${applicationData.grantId}`);
    if (grant) {
      grant.applicationCount = (grant.applicationCount || 0) + 1;
      await kv.set(`grant:${applicationData.grantId}`, grant);
    }

    await logAudit(user.id, 'application_submitted', { 
      applicationId, 
      grantId: applicationData.grantId 
    });

    return c.json({ success: true, application });
  } catch (error) {
    console.log('Submit application error:', error);
    return c.json({ error: `Failed to submit application: ${error.message}` }, 500);
  }
});

// Get all applications (filtered by role)
app.get('/make-server-f6f51aa6/applications', async (c) => {
  try {
    const user = await getCurrentUser(c.req.raw);
    
    if (!user) {
      return c.json({ error: 'Unauthorized: Please log in' }, 401);
    }

    const allApplications = await kv.getByPrefix('application:');
    
    let applications = allApplications;
    
    // Filter based on role
    if (user.role === 'grantee') {
      // Grantees only see their own applications
      applications = allApplications.filter(app => app.applicantId === user.id);
    }
    // Admins and grantors see all applications

    // Sort by submitted date, newest first
    const sortedApplications = applications.sort((a, b) => b.submittedAt - a.submittedAt);
    
    return c.json({ applications: sortedApplications });
  } catch (error) {
    console.log('Get applications error:', error);
    return c.json({ error: `Failed to fetch applications: ${error.message}` }, 500);
  }
});

// Get single application
app.get('/make-server-f6f51aa6/applications/:id', async (c) => {
  try {
    const user = await getCurrentUser(c.req.raw);
    
    if (!user) {
      return c.json({ error: 'Unauthorized: Please log in' }, 401);
    }

    const applicationId = c.req.param('id');
    const application = await kv.get(`application:${applicationId}`);
    
    if (!application) {
      return c.json({ error: 'Application not found' }, 404);
    }

    // Check access permissions
    if (user.role === 'grantee' && application.applicantId !== user.id) {
      return c.json({ error: 'Unauthorized: You can only view your own applications' }, 403);
    }

    return c.json({ application });
  } catch (error) {
    console.log('Get application error:', error);
    return c.json({ error: `Failed to fetch application: ${error.message}` }, 500);
  }
});

// Update application status and score (Admin/Grantor only)
app.put('/make-server-f6f51aa6/applications/:id', async (c) => {
  try {
    const user = await getCurrentUser(c.req.raw);
    
    if (!user || (user.role !== 'admin' && user.role !== 'grantor')) {
      return c.json({ error: 'Unauthorized: Only admins and grantors can update applications' }, 401);
    }

    const applicationId = c.req.param('id');
    const existingApplication = await kv.get(`application:${applicationId}`);
    
    if (!existingApplication) {
      return c.json({ error: 'Application not found' }, 404);
    }

    const updates = await c.req.json();
    const updatedApplication = {
      ...existingApplication,
      ...updates,
      reviewedAt: Date.now(),
      reviewedBy: user.id,
      reviewedByName: user.name
    };

    await kv.set(`application:${applicationId}`, updatedApplication);
    await logAudit(user.id, 'application_reviewed', { 
      applicationId, 
      status: updates.status,
      score: updates.score 
    });

    return c.json({ success: true, application: updatedApplication });
  } catch (error) {
    console.log('Update application error:', error);
    return c.json({ error: `Failed to update application: ${error.message}` }, 500);
  }
});

// ========== DASHBOARD/ANALYTICS ENDPOINTS ==========

// Get dashboard statistics
app.get('/make-server-f6f51aa6/dashboard/stats', async (c) => {
  try {
    const user = await getCurrentUser(c.req.raw);
    
    if (!user) {
      return c.json({ error: 'Unauthorized: Please log in' }, 401);
    }

    const grants = await kv.getByPrefix('grant:');
    const applications = await kv.getByPrefix('application:');

    let stats: any = {};

    if (user.role === 'admin' || user.role === 'grantor') {
      const activeGrants = grants.filter(g => g.status === 'active').length;
      const totalApplications = applications.length;
      const pendingApplications = applications.filter(a => a.status === 'pending').length;
      const underReviewApplications = applications.filter(a => a.status === 'under_review').length;
      const awardedApplications = applications.filter(a => a.status === 'awarded').length;
      const rejectedApplications = applications.filter(a => a.status === 'rejected').length;

      const totalFunding = grants.reduce((sum, g) => sum + (parseFloat(g.fundingAmount) || 0), 0);
      const awardedFunding = applications
        .filter(a => a.status === 'awarded')
        .reduce((sum, a) => {
          const grant = grants.find(g => g.id === a.grantId);
          return sum + (grant ? parseFloat(grant.fundingAmount) || 0 : 0);
        }, 0);

      stats = {
        activeGrants,
        totalGrants: grants.length,
        totalApplications,
        pendingApplications,
        underReviewApplications,
        awardedApplications,
        rejectedApplications,
        totalFunding,
        awardedFunding,
        availableFunding: totalFunding - awardedFunding
      };
    } else if (user.role === 'grantee') {
      const myApplications = applications.filter(a => a.applicantId === user.id);
      const pendingApplications = myApplications.filter(a => a.status === 'pending').length;
      const underReviewApplications = myApplications.filter(a => a.status === 'under_review').length;
      const awardedApplications = myApplications.filter(a => a.status === 'awarded').length;
      const rejectedApplications = myApplications.filter(a => a.status === 'rejected').length;

      stats = {
        availableGrants: grants.filter(g => g.status === 'active').length,
        totalApplications: myApplications.length,
        pendingApplications,
        underReviewApplications,
        awardedApplications,
        rejectedApplications
      };
    }

    return c.json({ stats });
  } catch (error) {
    console.log('Dashboard stats error:', error);
    return c.json({ error: `Failed to fetch dashboard stats: ${error.message}` }, 500);
  }
});

// Get recent activity
app.get('/make-server-f6f51aa6/dashboard/activity', async (c) => {
  try {
    const user = await getCurrentUser(c.req.raw);
    
    if (!user) {
      return c.json({ error: 'Unauthorized: Please log in' }, 401);
    }

    const auditLogs = await kv.getByPrefix('audit:');
    
    // Sort by timestamp, newest first, and limit to 10
    const recentActivity = auditLogs
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 10);
    
    return c.json({ activity: recentActivity });
  } catch (error) {
    console.log('Recent activity error:', error);
    return c.json({ error: `Failed to fetch recent activity: ${error.message}` }, 500);
  }
});

// ========== AUDIT LOG ENDPOINTS ==========

// Create audit log entry
app.post('/make-server-f6f51aa6/audit-log', async (c) => {
  try {
    const user = await getCurrentUser(c.req.raw);
    
    if (!user) {
      return c.json({ error: 'Unauthorized: Please log in' }, 401);
    }

    const { action, details, status } = await c.req.json();
    
    if (!action) {
      return c.json({ error: 'Action is required for audit log' }, 400);
    }

    await logAudit(user.id, action, { ...details, status: status || 'success' });
    
    return c.json({ success: true });
  } catch (error) {
    console.log('Create audit log error:', error);
    return c.json({ error: `Failed to create audit log: ${error.message}` }, 500);
  }
});

// Get audit logs (Admin only)
app.get('/make-server-f6f51aa6/audit-logs', async (c) => {
  try {
    const user = await getCurrentUser(c.req.raw);
    
    if (!user || user.role !== 'admin') {
      return c.json({ error: 'Unauthorized: Only admins can view audit logs' }, 403);
    }

    const auditLogs = await kv.getByPrefix('audit:');
    
    // Sort by timestamp, newest first
    const sortedLogs = auditLogs.sort((a, b) => b.timestamp - a.timestamp);
    
    return c.json({ logs: sortedLogs });
  } catch (error) {
    console.log('Audit logs error:', error);
    return c.json({ error: `Failed to fetch audit logs: ${error.message}` }, 500);
  }
});

// ========== STORAGE ENDPOINTS ==========

// Initialize storage bucket for documents
const initializeBucket = async () => {
  const supabase = getSupabaseClient();
  const bucketName = 'make-f6f51aa6-grant-documents';
  
  const { data: buckets } = await supabase.storage.listBuckets();
  const bucketExists = buckets?.some(bucket => bucket.name === bucketName);
  
  if (!bucketExists) {
    await supabase.storage.createBucket(bucketName, { public: false });
    console.log('Created storage bucket:', bucketName);
  }
};

// Call on startup
initializeBucket().catch(console.error);

// Upload document
app.post('/make-server-f6f51aa6/upload', async (c) => {
  try {
    const user = await getCurrentUser(c.req.raw);
    
    if (!user) {
      return c.json({ error: 'Unauthorized: Please log in to upload documents' }, 401);
    }

    const formData = await c.req.formData();
    const file = formData.get('file') as File;
    const applicationId = formData.get('applicationId') as string;

    if (!file) {
      return c.json({ error: 'No file provided' }, 400);
    }

    const supabase = getSupabaseClient();
    const bucketName = 'make-f6f51aa6-grant-documents';
    const fileExt = file.name.split('.').pop();
    const fileName = `${applicationId}/${generateId()}.${fileExt}`;

    const arrayBuffer = await file.arrayBuffer();
    const fileData = new Uint8Array(arrayBuffer);

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(fileName, fileData, {
        contentType: file.type,
        upsert: false
      });

    if (uploadError) {
      console.log('Upload error:', uploadError);
      return c.json({ error: `File upload failed: ${uploadError.message}` }, 500);
    }

    // Generate signed URL (valid for 1 hour)
    const { data: urlData, error: urlError } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(fileName, 3600);

    if (urlError) {
      console.log('Signed URL error:', urlError);
      return c.json({ error: `Failed to create signed URL: ${urlError.message}` }, 500);
    }

    await logAudit(user.id, 'document_uploaded', { 
      fileName: file.name, 
      applicationId 
    });

    return c.json({ 
      success: true, 
      file: {
        name: file.name,
        path: fileName,
        url: urlData.signedUrl
      }
    });
  } catch (error) {
    console.log('Upload error:', error);
    return c.json({ error: `Upload failed: ${error.message}` }, 500);
  }
});

// Get signed URL for a document
app.get('/make-server-f6f51aa6/documents/:path', async (c) => {
  try {
    const user = await getCurrentUser(c.req.raw);
    
    if (!user) {
      return c.json({ error: 'Unauthorized: Please log in' }, 401);
    }

    const path = c.req.param('path');
    const supabase = getSupabaseClient();
    const bucketName = 'make-f6f51aa6-grant-documents';

    const { data, error } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(path, 3600);

    if (error) {
      console.log('Signed URL error:', error);
      return c.json({ error: `Failed to get document: ${error.message}` }, 500);
    }

    return c.json({ url: data.signedUrl });
  } catch (error) {
    console.log('Get document error:', error);
    return c.json({ error: `Failed to fetch document: ${error.message}` }, 500);
  }
});

// Start server
Deno.serve(app.fetch);
