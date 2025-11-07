import { useState, useEffect } from 'react';
import { AuthPage } from './components/AuthPage';
import { Dashboard } from './components/Dashboard';
import { GrantsList } from './components/GrantsList';
import { GrantForm } from './components/GrantForm';
import { ApplicationForm } from './components/ApplicationForm';
import { ApplicationsList } from './components/ApplicationsList';
import { ApplicationReview } from './components/ApplicationReview';
import { AuditLogs } from './components/AuditLogs';
import { SecureDocumentUpload } from './components/SecureDocumentUpload';
import { AuditLogsViewer } from './components/AuditLogsViewer';
import { SecurityTestingDashboard } from './components/SecurityTestingDashboard';
import { ResetPasswordForm } from './components/ResetPasswordForm';
import { Button } from './components/ui/button';
import { Toaster } from './components/ui/sonner';
import { toast } from 'sonner';
import { cn } from './components/ui/utils';
import NotificationBell from './components/NotificationBell';
import { useNotifications } from './contexts/NotificationContext';
import { 
  LayoutDashboard, 
  FileText, 
  Send, 
  Shield, 
  LogOut,
  Menu,
  X,
  Lock,
  FileLock,
  Bug
} from 'lucide-react';

type View =
  | 'dashboard'
  | 'grants'
  | 'applications'
  | 'audit-logs'
  | 'create-grant'
  | 'apply-grant'
  | 'review-application'
  | 'secure-upload'
  | 'audit-compliance'
  | 'security-testing';

export default function App() {
  const { addNotification } = useNotifications();
  const [user, setUser] = useState<any>(null);
  const [accessToken, setAccessToken] = useState<string>('');
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [selectedGrant, setSelectedGrant] = useState<any>(null);
  const [selectedApplication, setSelectedApplication] = useState<any>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  useEffect(() => {
    checkSession();
    checkPasswordReset();
  }, []);

  const checkSession = async () => {
    try {
      const { getSupabaseClient } = await import('./utils/supabase/client');
      const { projectId } = await import('./utils/supabase/info');
      
      const supabase = getSupabaseClient();

      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-f6f51aa6/session`,
          {
            headers: {
              'Authorization': `Bearer ${session.access_token}`
            }
          }
        );

        const result = await response.json();
        
        if (result.user) {
          setUser(result.user);
          setAccessToken(session.access_token);
        }
      }
    } catch (error) {
      console.error('Session check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkPasswordReset = () => {
    // Check if URL contains password reset parameters
    const params = new URLSearchParams(window.location.search);
    const isReset = params.get('reset_password') === 'true';
    
    // Also check for hash-based parameters (Supabase sometimes uses hash)
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const hasResetToken = hashParams.get('type') === 'recovery' || isReset;
    
    if (hasResetToken) {
      setIsResettingPassword(true);
    }
  };

  const handlePasswordResetSuccess = async () => {
    // Clear URL parameters
    window.history.replaceState({}, document.title, window.location.pathname);
    setIsResettingPassword(false);
    
    toast.success('Password reset successfully! Please sign in with your new password.');
    
    // Sign out the user so they can sign in with new password
    try {
      const { getSupabaseClient } = await import('./utils/supabase/client');
      const supabase = getSupabaseClient();
      await supabase.auth.signOut();
      setUser(null);
      setAccessToken('');
    } catch (error) {
      console.error('Error signing out after password reset:', error);
    }
  };

  const handlePasswordResetCancel = () => {
    // Clear URL parameters
    window.history.replaceState({}, document.title, window.location.pathname);
    setIsResettingPassword(false);
  };

  const handleAuthSuccess = (authUser: any, token: string) => {
    setUser(authUser);
    setAccessToken(token);
    toast.success('Welcome to the Grant Management System!');
    // Notify user on successful sign in
    try { addNotification({ title: 'Signed in', message: `Welcome back, ${authUser.name}` , type: 'success'}); } catch {}
  };

  const handleLogout = async () => {
    try {
      const { getSupabaseClient } = await import('./utils/supabase/client');
      
      const supabase = getSupabaseClient();

      await supabase.auth.signOut();
      setUser(null);
      setAccessToken('');
      setCurrentView('dashboard');
      toast.success('Logged out successfully');
  try { addNotification({ title: 'Signed out', message: 'You have been signed out', type: 'info' }); } catch {}
    } catch (error) {
      console.error('Logout failed:', error);
      toast.error('Failed to logout');
    }
  };

  const handleApplyToGrant = (grant: any) => {
    setSelectedGrant(grant);
    setCurrentView('apply-grant');
    setMobileMenuOpen(false);
  };

  const handleReviewApplication = (application: any) => {
    setSelectedApplication(application);
    setCurrentView('review-application');
    setMobileMenuOpen(false);
  };

  const handleCreateGrant = () => {
    setCurrentView('create-grant');
    setMobileMenuOpen(false);
  };

  const handleGrantCreated = () => {
    setCurrentView('grants');
    toast.success('Grant created successfully!');
  };

  const handleApplicationSubmitted = () => {
    setCurrentView('applications');
    toast.success('Application submitted successfully!');
  };

  const handleReviewSubmitted = () => {
    setCurrentView('applications');
    toast.success('Review submitted successfully!');
  };

  const navigateTo = (view: View) => {
    setCurrentView(view);
    setMobileMenuOpen(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show password reset form if user is resetting password
  if (isResettingPassword) {
    return (
      <>
        <Toaster position="top-right" />
        <ResetPasswordForm
          onSuccess={handlePasswordResetSuccess}
          onCancel={handlePasswordResetCancel}
        />
      </>
    );
  }

  if (!user) {
    return <AuthPage onAuthSuccess={handleAuthSuccess} />;
  }

  const menuItems = [
    { id: 'dashboard' as View, label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'grantor', 'grantee'] },
    { id: 'grants' as View, label: 'Grants', icon: FileText, roles: ['admin', 'grantor', 'grantee'] },
    { id: 'applications' as View, label: 'Applications', icon: Send, roles: ['admin', 'grantor', 'grantee'] },
    { id: 'audit-logs' as View, label: 'Audit Logs', icon: Shield, roles: ['admin'] },
    { id: 'secure-upload' as View, label: 'Secure Upload', icon: FileLock, roles: ['admin', 'grantor', 'grantee'] },
    { id: 'audit-compliance' as View, label: 'Audit & Compliance', icon: Lock, roles: ['admin'] },
    { id: 'security-testing' as View, label: 'Security Testing', icon: Bug, roles: ['admin'] },
  ];

  const visibleMenuItems = menuItems.filter(item => item.roles.includes(user.role));

  return (
    <div className="min-h-screen bg-background">
      <Toaster position="top-right" />
      
      {/* Header */}
      <header className="bg-primary text-primary-foreground elevation-4 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="bg-white/20 backdrop-blur-sm p-2 rounded">
                <Shield className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-lg normal-case">Grant Management</h1>
                <p className="text-xs opacity-90 hidden sm:block normal-case">
                  Government Portal
                </p>
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav aria-label="Main navigation" className="hidden md:flex items-center gap-2">
              {visibleMenuItems.map((item) => (
                <Button
                  key={item.id}
                  variant={currentView === item.id ? 'secondary' : 'ghost'}
                  onClick={() => navigateTo(item.id)}
                  aria-current={currentView === item.id ? 'page' : undefined}
                  className={cn(
                    "flex items-center gap-2",
                    currentView === item.id 
                      ? "bg-white/20 text-white hover:bg-white/30" 
                      : "text-white/90 hover:bg-white/10"
                  )}
                >
                  <item.icon className="h-4 w-4" aria-hidden />
                  <span className="sr-only md:not-sr-only">{item.label}</span>
                </Button>
              ))}
            </nav>

            {/* User Menu / Actions */}
            <div className="flex items-center gap-3">
              <NotificationBell />
              <div className="hidden sm:block text-right">
                <p className="text-sm normal-case">{user.name}</p>
                <p className="text-xs opacity-80 capitalize normal-case">{user.role}</p>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleLogout}
                className="text-white hover:bg-white/10 border-2 border-white/30"
                aria-label="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </Button>

              {/* Mobile menu button */}
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden text-white hover:bg-white/10 border-2 border-white/30"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-expanded={mobileMenuOpen}
                aria-controls="mobile-menu"
              >
                {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <nav id="mobile-menu" className="md:hidden py-4 border-t border-white/20">
              <div className="space-y-2">
                {visibleMenuItems.map((item) => (
                  <Button
                    key={item.id}
                    variant={currentView === item.id ? 'secondary' : 'ghost'}
                    onClick={() => navigateTo(item.id)}
                    aria-current={currentView === item.id ? 'page' : undefined}
                    className={cn(
                      "w-full flex items-center justify-start gap-2",
                      currentView === item.id 
                        ? "bg-white/20 text-white hover:bg-white/30" 
                        : "text-white/90 hover:bg-white/10"
                    )}
                  >
                    <item.icon className="h-4 w-4" aria-hidden />
                    <span>{item.label}</span>
                  </Button>
                ))}
              </div>
            </nav>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md-spacing-3">
          {currentView === 'dashboard' && (
            <Dashboard user={user} accessToken={accessToken} />
          )}

          {currentView === 'grants' && (
            <GrantsList
              user={user}
              accessToken={accessToken}
              onApply={handleApplyToGrant}
              onCreateGrant={user.role === 'admin' || user.role === 'grantor' ? handleCreateGrant : undefined}
            />
          )}

          {currentView === 'create-grant' && (user.role === 'admin' || user.role === 'grantor') && (
            <GrantForm
              accessToken={accessToken}
              onSuccess={handleGrantCreated}
              onCancel={() => navigateTo('grants')}
            />
          )}

          {currentView === 'apply-grant' && selectedGrant && (
            <ApplicationForm
              grant={selectedGrant}
              accessToken={accessToken}
              onSuccess={handleApplicationSubmitted}
              onCancel={() => navigateTo('grants')}
            />
          )}

          {currentView === 'applications' && (
            <ApplicationsList
              user={user}
              accessToken={accessToken}
              onReview={user.role === 'admin' || user.role === 'grantor' ? handleReviewApplication : undefined}
            />
          )}

          {currentView === 'review-application' && selectedApplication && (
            <ApplicationReview
              application={selectedApplication}
              accessToken={accessToken}
              onSuccess={handleReviewSubmitted}
              onCancel={() => navigateTo('applications')}
            />
          )}

          {currentView === 'audit-logs' && user.role === 'admin' && (
            <AuditLogs accessToken={accessToken} />
          )}

          {currentView === 'secure-upload' && (
            <SecureDocumentUpload
              bucketId="documents"
              filePath={`uploads/${user.id}/${Date.now()}`}
              onSuccess={(url) => {
                toast.success('Document uploaded securely!');
                try { addNotification({ title: 'Upload complete', message: `Document uploaded: ${url}`, type: 'success' }); } catch {}
                setCurrentView('dashboard');
              }}
              onError={(error) => {
                toast.error(`Upload failed: ${error.message}`);
              }}
            />
          )}

          {currentView === 'audit-compliance' && user.role === 'admin' && (
            <AuditLogsViewer
              // Example: add callback for export
              onExport={() => {
                toast.success('Audit logs exported!');
                try { addNotification({ title: 'Audit export', message: 'Audit logs export completed', type: 'info' }); } catch {}
              }}
            />
          )}

          {currentView === 'security-testing' && user.role === 'admin' && (
            <SecurityTestingDashboard
              onComplete={() => {
                toast.success('Security tests completed!');
                try { addNotification({ title: 'Security tests', message: 'Security testing completed', type: 'info' }); } catch {}
                setCurrentView('dashboard');
              }}
              onExport={() => {
                toast.success('Security report exported!');
                try { addNotification({ title: 'Security export', message: 'Security report exported', type: 'info' }); } catch {}
              }}
            />
          )}
      </main>

      {/* Footer */}
      <footer className="bg-card elevation-2 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center text-sm text-muted-foreground">
            <p className="normal-case">© 2024 Government Grant Management System</p>
            <p className="mt-1 normal-case">
              Compliant with data privacy regulations • Secure role-based access control
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
