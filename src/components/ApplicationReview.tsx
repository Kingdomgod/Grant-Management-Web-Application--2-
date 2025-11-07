import { useState } from 'react';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Slider } from './ui/slider';
import { Badge } from './ui/badge';
import { ArrowLeft, CheckCircle, XCircle, Clock } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { formatCurrency } from '../utils/formatCurrency';

interface ApplicationReviewProps {
  application: any;
  accessToken: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function ApplicationReview({ application, accessToken, onSuccess, onCancel }: ApplicationReviewProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [score, setScore] = useState(application.score || 50);
  const [comments, setComments] = useState('');
  const [status, setStatus] = useState(application.status);

  const handleSubmit = async (newStatus: string) => {
    setError('');
    setLoading(true);

    try {
      const updates = {
        status: newStatus,
        score: score,
        reviewComments: [...(application.reviewComments || []), comments]
      };

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-f6f51aa6/applications/${application.id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify(updates)
        }
      );

      const result = await response.json();

      if (!response.ok || result.error) {
        throw new Error(result.error || 'Failed to update application');
      }

      onSuccess();
    } catch (err: any) {
      console.error('Review submission error:', err);
      setError(err.message || 'Failed to submit review');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'under_review':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'awarded':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
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
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onCancel}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h2>Review Application</h2>
          <p className="text-muted-foreground">{application.projectTitle}</p>
        </div>
        <Badge className={getStatusColor(application.status)}>
          {formatStatus(application.status)}
        </Badge>
      </div>

      {/* Application Details */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Applicant Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Name</p>
              <p>{application.applicantName}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p>{application.applicantEmail}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Organization</p>
              <p>{application.applicantOrganization || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Phone</p>
              <p>{application.applicantPhone || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Submitted</p>
              <p>{formatDate(application.submittedAt)}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Grant Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Grant</p>
              <p>{application.grantTitle}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Requested Amount</p>
              <p>{formatCurrency(application.requestedAmount || 0)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Project Timeline</p>
              <p>{application.timeline}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Project Details */}
      <Card>
        <CardHeader>
          <CardTitle>Project Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4>Project Title</h4>
            <p>{application.projectTitle}</p>
          </div>
          
          <div>
            <h4>Project Description</h4>
            <p className="text-muted-foreground whitespace-pre-wrap">{application.projectDescription}</p>
          </div>

          <div>
            <h4>Organization Information</h4>
            <p className="text-muted-foreground whitespace-pre-wrap">{application.organizationInfo}</p>
          </div>

          <div>
            <h4>Team Qualifications</h4>
            <p className="text-muted-foreground whitespace-pre-wrap">{application.teamQualifications}</p>
          </div>

          <div>
            <h4>Expected Outcomes</h4>
            <p className="text-muted-foreground whitespace-pre-wrap">{application.expectedOutcomes}</p>
          </div>

          <div>
            <h4>Budget Breakdown</h4>
            <p className="text-muted-foreground whitespace-pre-wrap">{application.budgetBreakdown}</p>
          </div>

          {application.documents && application.documents.length > 0 && (
            <div>
              <h4>Supporting Documents</h4>
              <ul className="space-y-2">
                {application.documents.map((doc: any, idx: number) => (
                  <li key={idx} className="text-sm">
                    <a 
                      href={doc.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {doc.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review Section */}
      <Card>
        <CardHeader>
          <CardTitle>Evaluation</CardTitle>
          <CardDescription>Score and review this application</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Application Score</Label>
              <div className="text-2xl">{score}/100</div>
            </div>
            <Slider
              value={[score]}
              onValueChange={(value) => setScore(value[0])}
              max={100}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Poor</span>
              <span>Average</span>
              <span>Excellent</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="comments">Review Comments</Label>
            <Textarea
              id="comments"
              placeholder="Provide detailed feedback on this application..."
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={5}
            />
          </div>

          {application.reviewComments && application.reviewComments.length > 0 && (
            <div className="space-y-2">
              <Label>Previous Comments</Label>
              <div className="bg-muted p-4 rounded-lg space-y-2">
                {application.reviewComments.map((comment: string, idx: number) => (
                  <p key={idx} className="text-sm text-muted-foreground">
                    • {comment}
                  </p>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="bg-destructive/10 text-destructive p-3 rounded-md">
              {error}
            </div>
          )}

          <div className="flex gap-3 flex-wrap">
            <Button
              onClick={() => handleSubmit('awarded')}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              Award Grant
            </Button>
            <Button
              onClick={() => handleSubmit('under_review')}
              disabled={loading}
              variant="outline"
            >
              <Clock className="mr-2 h-4 w-4" />
              Mark Under Review
            </Button>
            <Button
              onClick={() => handleSubmit('rejected')}
              disabled={loading}
              variant="destructive"
            >
              <XCircle className="mr-2 h-4 w-4" />
              Reject
            </Button>
            <Button
              onClick={onCancel}
              variant="ghost"
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
