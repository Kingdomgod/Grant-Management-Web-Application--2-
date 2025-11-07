import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Shield, Building2 } from 'lucide-react';
import { ForgotPasswordForm } from './ForgotPasswordForm';

interface AuthPageProps {
  onAuthSuccess: (user: any, token: string) => void;
}

export function AuthPage({ onAuthSuccess }: AuthPageProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    role: 'grantee',
    organization: '',
    phone: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        // Login with Supabase
        const { getSupabaseClient } = await import('../utils/supabase/client');
        const { projectId } = await import('../utils/supabase/info');
        
        const supabase = getSupabaseClient();

        const { data, error: loginError } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password
        });

        if (loginError) {
          throw new Error(loginError.message);
        }

        if (!data.session) {
          throw new Error('No session returned from login');
        }

        // Get user profile from server
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-f6f51aa6/session`,
          {
            headers: {
              'Authorization': `Bearer ${data.session.access_token}`
            }
          }
        );

        const result = await response.json();
        
        if (result.user) {
          onAuthSuccess(result.user, data.session.access_token);
        } else {
          throw new Error('Failed to fetch user profile');
        }
      } else {
        // Signup
        const { projectId, publicAnonKey } = await import('../utils/supabase/info');
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-f6f51aa6/signup`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${publicAnonKey}`
            },
            body: JSON.stringify(formData)
          }
        );

        const result = await response.json();

        if (!response.ok || result.error) {
          throw new Error(result.error || 'Signup failed');
        }

        // Auto-login after signup
        const { getSupabaseClient } = await import('../utils/supabase/client');
        
        const supabase = getSupabaseClient();

        const { data, error: loginError } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password
        });

        if (loginError || !data.session) {
          throw new Error('Account created but login failed. Please try logging in.');
        }

        onAuthSuccess(result.user, data.session.access_token);
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  // Show forgot password form if requested
  if (showForgotPassword) {
    return (
      <ForgotPasswordForm
        onBack={() => {
          setShowForgotPassword(false);
          setError('');
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md elevation-6 animate-in zoom-in duration-500">
        <CardHeader className="space-y-1 text-center">
          <div className="flex items-center justify-center mb-6">
            <div className="bg-primary text-primary-foreground p-4 rounded-full elevation-3">
              <Shield className="h-10 w-10" />
            </div>
          </div>
          <CardTitle className="text-center normal-case text-2xl">
            Government Grant Management System
          </CardTitle>
          <CardDescription className="text-center normal-case mt-2">
            {isLogin ? 'Sign in to your account' : 'Create a new account'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="John Doe"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value) => setFormData({ ...formData, role: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="grantee">Grantee (Apply for grants)</SelectItem>
                      <SelectItem value="grantor">Grantor (Review applications)</SelectItem>
                      <SelectItem value="admin">Admin (Full access)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="organization">Organization</Label>
                  <Input
                    id="organization"
                    type="text"
                    placeholder="Organization name"
                    value={formData.organization}
                    onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+1 (555) 000-0000"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                {isLogin && (
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-xs text-primary hover:underline"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
              />
            </div>

            {error && (
              <div className="bg-destructive/10 text-destructive p-4 rounded elevation-1 normal-case">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? 'Please wait...' : isLogin ? 'Sign In' : 'Create Account'}
            </Button>

            <div className="text-center mt-4">
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError('');
                }}
                className="text-primary hover:underline md-transition-standard normal-case"
              >
                {isLogin
                  ? "Don't have an account? Sign up"
                  : 'Already have an account? Sign in'}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
