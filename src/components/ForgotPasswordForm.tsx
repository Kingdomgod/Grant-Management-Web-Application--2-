import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Shield, ArrowLeft, Mail, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';

/**
 * ForgotPasswordForm Component
 * 
 * Provides secure password reset functionality using Supabase Auth.
 * 
 * IMPORTANT: Email Configuration Required
 * -----------------------------------------
 * For password reset emails to be sent, you must configure email settings in Supabase:
 * 1. Go to your Supabase project dashboard
 * 2. Navigate to Authentication > Email Templates
 * 3. Configure the "Reset Password" email template
 * 4. Set up SMTP settings in Authentication > Settings > SMTP Settings
 * 
 * Without email configuration, the reset flow will still work in development mode
 * where Supabase may log the reset link to the console, but emails won't be sent
 * in production.
 * 
 * Security Features:
 * - Time-limited reset tokens (1 hour expiration)
 * - One-time use tokens
 * - Generic success messages (doesn't reveal if email exists)
 * - Secure token generation via Supabase
 */

interface ForgotPasswordFormProps {
  onBack: () => void;
}

export function ForgotPasswordForm({ onBack }: ForgotPasswordFormProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { getSupabaseClient } = await import('../utils/supabase/client');
      const supabase = getSupabaseClient();

      // Get the current origin for the redirect URL
      const redirectUrl = `${window.location.origin}?reset_password=true`;

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });

      if (resetError) {
        throw new Error(resetError.message);
      }

      // Always show success message (don't reveal if email exists for security)
      setSuccess(true);
    } catch (err: any) {
      console.error('Password reset request error:', err);
      // For security, show generic message instead of specific error
      setSuccess(true);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <div className="flex items-center justify-center mb-4">
              <div className="bg-green-500 text-white p-3 rounded-full">
                <CheckCircle className="h-8 w-8" />
              </div>
            </div>
            <CardTitle className="text-center">
              Check Your Email
            </CardTitle>
            <CardDescription className="text-center">
              Password reset instructions sent
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <Mail className="h-4 w-4" />
              <AlertDescription>
                If an account exists with <strong>{email}</strong>, you will receive a password reset link shortly. Please check your inbox and spam folder.
              </AlertDescription>
            </Alert>

            <div className="bg-blue-50 border border-blue-200 rounded-md p-4 text-sm">
              <p className="mb-2">The reset link will:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Expire after 1 hour for security</li>
                <li>Only work once</li>
                <li>Redirect you to reset your password</li>
              </ul>
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={onBack}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-primary text-primary-foreground p-3 rounded-lg">
              <Shield className="h-8 w-8" />
            </div>
          </div>
          <CardTitle className="text-center">
            Reset Your Password
          </CardTitle>
          <CardDescription className="text-center">
            Enter your email address and we'll send you a reset link
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                Enter the email address associated with your account
              </p>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Sending Reset Link...' : 'Send Reset Link'}
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={onBack}
              disabled={loading}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Sign In
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
