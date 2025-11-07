import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Calendar, FileText, Search, Eye } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface ApplicationsListProps {
  user: any;
  accessToken: string;
  onReview?: (application: any) => void;
}

export function ApplicationsList({ user, accessToken, onReview }: ApplicationsListProps) {
  const [applications, setApplications] = useState<any[]>([]);
  const [filteredApplications, setFilteredApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchApplications();
  }, []);

  useEffect(() => {
    filterApplications();
  }, [applications, searchTerm, statusFilter]);

  const fetchApplications = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-f6f51aa6/applications`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      const result = await response.json();
      if (result.applications) {
        setApplications(result.applications);
      }
    } catch (error) {
      console.error('Failed to fetch applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterApplications = () => {
    let filtered = applications;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (app) =>
          app.projectTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
          app.grantTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
          app.applicantName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter((app) => app.status === statusFilter);
    }

    setFilteredApplications(filtered);
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'under_review':
        return 'default';
      case 'awarded':
        return 'success';
      case 'rejected':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const formatStatus = (status: string) => {
    return status.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="normal-case">
          {user.role === 'grantee' ? 'My Applications' : 'All Applications'}
        </h2>
        <p className="text-muted-foreground normal-case mt-1">
          {user.role === 'grantee' 
            ? 'Track the status of your grant applications'
            : 'Review and manage grant applications'}
        </p>
      </div>

      {/* Filters */}
      <Card className="elevation-1">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search applications..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="under_review">Under Review</SelectItem>
                <SelectItem value="awarded">Awarded</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Applications List */}
      {filteredApplications.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="p-4 bg-muted rounded-full mb-4">
              <FileText className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="normal-case">No applications found</h3>
            <p className="text-muted-foreground text-center normal-case mt-2">
              {searchTerm || statusFilter !== 'all'
                ? 'Try adjusting your filters'
                : user.role === 'grantee'
                ? 'You haven\'t submitted any applications yet'
                : 'No applications have been submitted'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredApplications.map((application, index) => (
            <Card 
              key={application.id}
              className="md-transition-decelerated hover:elevation-4"
              style={{ animationDelay: `${index * 30}ms` }}
            >
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <CardTitle className="normal-case">{application.projectTitle}</CardTitle>
                    <CardDescription className="normal-case mt-1">
                      For: {application.grantTitle}
                    </CardDescription>
                  </div>
                  <Badge variant={getStatusVariant(application.status) as any}>
                    {formatStatus(application.status)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(user.role === 'admin' || user.role === 'grantor') && (
                      <div className="p-3 bg-accent/30 rounded">
                        <span className="text-muted-foreground text-sm normal-case">Applicant: </span>
                        <span className="normal-case">{application.applicantName}</span>
                      </div>
                    )}
                    <div className="p-3 bg-accent/30 rounded">
                      <span className="text-muted-foreground text-sm normal-case">Submitted: </span>
                      <span className="normal-case">{formatDate(application.submittedAt)}</span>
                    </div>
                    <div className="p-3 bg-accent/30 rounded">
                      <span className="text-muted-foreground text-sm normal-case">Organization: </span>
                      <span className="normal-case">{application.applicantOrganization || 'N/A'}</span>
                    </div>
                    <div className="p-3 bg-accent/30 rounded">
                      <span className="text-muted-foreground text-sm normal-case">Timeline: </span>
                      <span className="normal-case">{application.timeline}</span>
                    </div>
                  </div>

                  <div className="p-4 bg-muted/30 rounded">
                    <p className="text-sm text-muted-foreground mb-2 normal-case">Project Description:</p>
                    <p className="text-sm line-clamp-2 normal-case">{application.projectDescription}</p>
                  </div>

                  {application.score !== null && application.score !== undefined && (
                    <div className="bg-primary/10 border-2 border-primary/30 rounded p-4 elevation-1">
                      <div className="flex items-center justify-between">
                        <span className="normal-case">Review Score:</span>
                        <span className="text-2xl text-primary">{application.score}/100</span>
                      </div>
                      {application.reviewComments && application.reviewComments.length > 0 && (
                        <p className="text-sm text-muted-foreground mt-3 normal-case">
                          {application.reviewComments[application.reviewComments.length - 1]}
                        </p>
                      )}
                    </div>
                  )}

                  {application.reviewedBy && (
                    <p className="text-sm text-muted-foreground normal-case">
                      Reviewed by: {application.reviewedByName} on {formatDate(application.reviewedAt)}
                    </p>
                  )}

                  {(user.role === 'admin' || user.role === 'grantor') && onReview && (
                    <Button 
                      onClick={() => onReview(application)}
                      variant="outline"
                      size="sm"
                      className="mt-2"
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      Review Application
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
