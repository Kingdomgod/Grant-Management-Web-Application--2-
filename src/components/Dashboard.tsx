import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { DollarSign, FileText, CheckCircle, Clock, XCircle, TrendingUp } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { formatCurrency } from '../utils/formatCurrency';

interface DashboardProps {
  user: any;
  accessToken: string;
}

interface Stats {
  activeGrants?: number;
  totalGrants?: number;
  availableGrants?: number;
  totalApplications: number;
  pendingApplications: number;
  underReviewApplications: number;
  awardedApplications: number;
  rejectedApplications: number;
  totalFunding?: number;
  awardedFunding?: number;
  availableFunding?: number;
}

export function Dashboard({ user, accessToken }: DashboardProps) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-f6f51aa6/dashboard/stats`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      const result = await response.json();
      if (result.stats) {
        setStats(result.stats);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center text-muted-foreground">
        Failed to load dashboard statistics
      </div>
    );
  }

  // Role-specific dashboard
  if (user.role === 'admin' || user.role === 'grantor') {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="bg-card elevation-2 rounded-lg p-6 md-transition-standard">
          <h2 className="normal-case">Dashboard Overview</h2>
          <p className="text-muted-foreground normal-case mt-2">
            Welcome back, {user.name}. Here's what's happening with your grants.
          </p>
          <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground elevation-1 text-sm normal-case">
            <span>Role:</span>
            <span className="capitalize">{user.role}</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card className="md-transition-decelerated hover:scale-105">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm normal-case">Active Grants</CardTitle>
              <div className="p-2 bg-primary/10 rounded-full">
                <FileText className="h-5 w-5 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl">{stats.activeGrants}</div>
              <p className="text-xs text-muted-foreground mt-1 normal-case">
                {stats.totalGrants} total grants
              </p>
            </CardContent>
          </Card>

          <Card className="md-transition-decelerated hover:scale-105">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm normal-case">Total Applications</CardTitle>
              <div className="p-2 bg-[var(--md-secondary-500)]/10 rounded-full">
                <TrendingUp className="h-5 w-5" style={{ color: 'var(--md-secondary-500)' }} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl">{stats.totalApplications}</div>
              <p className="text-xs text-muted-foreground mt-1 normal-case">
                {stats.pendingApplications} pending review
              </p>
            </CardContent>
          </Card>

          <Card className="md-transition-decelerated hover:scale-105">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm normal-case">Total Funding</CardTitle>
              <div className="p-2 bg-[var(--md-success-500)]/10 rounded-full">
                <DollarSign className="h-5 w-5" style={{ color: 'var(--md-success-500)' }} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl">{formatCurrency(stats.totalFunding || 0)}</div>
              <p className="text-xs text-muted-foreground mt-1 normal-case">
                Across all grants
              </p>
            </CardContent>
          </Card>

          <Card className="md-transition-decelerated hover:scale-105">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm normal-case">Awarded</CardTitle>
              <div className="p-2 bg-[var(--md-warning-500)]/10 rounded-full">
                <CheckCircle className="h-5 w-5" style={{ color: 'var(--md-warning-500)' }} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl">{formatCurrency(stats.awardedFunding || 0)}</div>
              <p className="text-xs text-muted-foreground mt-1 normal-case">
                {stats.awardedApplications} applications
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Application Status Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="normal-case">Application Status</CardTitle>
            <CardDescription className="normal-case">Current state of all applications</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded bg-[var(--md-warning-500)]/10 md-transition-standard hover:bg-[var(--md-warning-500)]/20">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[var(--md-warning-500)] rounded-full">
                    <Clock className="h-4 w-4 text-white" />
                  </div>
                  <span className="normal-case">Pending Review</span>
                </div>
                <span className="text-lg">{stats.pendingApplications}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded bg-primary/10 md-transition-standard hover:bg-primary/20">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary rounded-full">
                    <FileText className="h-4 w-4 text-white" />
                  </div>
                  <span className="normal-case">Under Review</span>
                </div>
                <span className="text-lg">{stats.underReviewApplications}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded bg-[var(--md-success-500)]/10 md-transition-standard hover:bg-[var(--md-success-500)]/20">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[var(--md-success-500)] rounded-full">
                    <CheckCircle className="h-4 w-4 text-white" />
                  </div>
                  <span className="normal-case">Awarded</span>
                </div>
                <span className="text-lg">{stats.awardedApplications}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded bg-[var(--md-error-500)]/10 md-transition-standard hover:bg-[var(--md-error-500)]/20">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[var(--md-error-500)] rounded-full">
                    <XCircle className="h-4 w-4 text-white" />
                  </div>
                  <span className="normal-case">Rejected</span>
                </div>
                <span className="text-lg">{stats.rejectedApplications}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Financial Overview */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="normal-case">Funding Overview</CardTitle>
              <CardDescription className="normal-case">Budget allocation</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-2 rounded md-transition-standard hover:bg-accent">
                  <span className="text-muted-foreground normal-case">Total Budget:</span>
                  <span>{formatCurrency(stats.totalFunding || 0)}</span>
                </div>
                <div className="flex justify-between items-center p-2 rounded md-transition-standard hover:bg-accent">
                  <span className="text-muted-foreground normal-case">Awarded:</span>
                  <span style={{ color: 'var(--md-success-500)' }}>{formatCurrency(stats.awardedFunding || 0)}</span>
                </div>
                <div className="flex justify-between items-center p-2 rounded md-transition-standard hover:bg-accent">
                  <span className="text-muted-foreground normal-case">Available:</span>
                  <span className="text-primary">{formatCurrency(stats.availableFunding || 0)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="normal-case">Quick Stats</CardTitle>
              <CardDescription className="normal-case">Key metrics at a glance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-2 rounded md-transition-standard hover:bg-accent">
                  <span className="text-muted-foreground normal-case">Approval Rate:</span>
                  <span>
                    {stats.totalApplications > 0
                      ? Math.round((stats.awardedApplications / stats.totalApplications) * 100)
                      : 0}%
                  </span>
                </div>
                <div className="flex justify-between items-center p-2 rounded md-transition-standard hover:bg-accent">
                  <span className="text-muted-foreground normal-case">Avg. per Grant:</span>
                  <span className="normal-case">
                    {stats.activeGrants
                      ? Math.round(stats.totalApplications / stats.activeGrants)
                      : 0} applications
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Grantee dashboard
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-card elevation-2 rounded-lg p-6 md-transition-standard">
        <h2 className="normal-case">My Dashboard</h2>
        <p className="text-muted-foreground normal-case mt-2">
          Welcome back, {user.name}. Track your grant applications here.
        </p>
        <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground elevation-1 text-sm normal-case">
          <span>Role:</span>
          <span className="capitalize">{user.role}</span>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="md-transition-decelerated hover:scale-105">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm normal-case">Available Grants</CardTitle>
            <div className="p-2 bg-primary/10 rounded-full">
              <FileText className="h-5 w-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl">{stats.availableGrants}</div>
            <p className="text-xs text-muted-foreground mt-1 normal-case">
              Currently accepting applications
            </p>
          </CardContent>
        </Card>

        <Card className="md-transition-decelerated hover:scale-105">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm normal-case">My Applications</CardTitle>
            <div className="p-2 bg-[var(--md-secondary-500)]/10 rounded-full">
              <TrendingUp className="h-5 w-5" style={{ color: 'var(--md-secondary-500)' }} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl">{stats.totalApplications}</div>
            <p className="text-xs text-muted-foreground mt-1 normal-case">
              {stats.pendingApplications} pending
            </p>
          </CardContent>
        </Card>

        <Card className="md-transition-decelerated hover:scale-105">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm normal-case">Awarded</CardTitle>
            <div className="p-2 bg-[var(--md-success-500)]/10 rounded-full">
              <CheckCircle className="h-5 w-5" style={{ color: 'var(--md-success-500)' }} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl">{stats.awardedApplications}</div>
            <p className="text-xs text-muted-foreground mt-1 normal-case">
              Successful applications
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="normal-case">Application Status</CardTitle>
          <CardDescription className="normal-case">Track your submissions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded bg-[var(--md-warning-500)]/10 md-transition-standard hover:bg-[var(--md-warning-500)]/20">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[var(--md-warning-500)] rounded-full">
                  <Clock className="h-4 w-4 text-white" />
                </div>
                <span className="normal-case">Pending Review</span>
              </div>
              <span className="text-lg">{stats.pendingApplications}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded bg-primary/10 md-transition-standard hover:bg-primary/20">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary rounded-full">
                  <FileText className="h-4 w-4 text-white" />
                </div>
                <span className="normal-case">Under Review</span>
              </div>
              <span className="text-lg">{stats.underReviewApplications}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded bg-[var(--md-success-500)]/10 md-transition-standard hover:bg-[var(--md-success-500)]/20">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[var(--md-success-500)] rounded-full">
                  <CheckCircle className="h-4 w-4 text-white" />
                </div>
                <span className="normal-case">Awarded</span>
              </div>
              <span className="text-lg">{stats.awardedApplications}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded bg-[var(--md-error-500)]/10 md-transition-standard hover:bg-[var(--md-error-500)]/20">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[var(--md-error-500)] rounded-full">
                  <XCircle className="h-4 w-4 text-white" />
                </div>
                <span className="normal-case">Rejected</span>
              </div>
              <span className="text-lg">{stats.rejectedApplications}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
