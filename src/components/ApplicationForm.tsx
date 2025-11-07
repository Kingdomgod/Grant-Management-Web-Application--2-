import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { ArrowLeft, Upload, CheckCircle, AlertCircle } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { formatCurrency } from '../utils/formatCurrency';

interface ApplicationFormProps {
  grant: any;
  accessToken: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function ApplicationForm({ grant, accessToken, onSuccess, onCancel }: ApplicationFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);
  const [eligibilityCheck, setEligibilityCheck] = useState<boolean | null>(null);
  
  const [formData, setFormData] = useState({
    grantId: grant.id,
    grantTitle: grant.title,
    projectTitle: '',
    projectDescription: '',
    requestedAmount: grant.fundingAmount,
    timeline: '',
    organizationInfo: '',
    teamQualifications: '',
    expectedOutcomes: '',
    budgetBreakdown: '',
    documents: [] as any[]
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingFile(true);
    const uploadedFiles = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('file', file);
        formData.append('applicationId', 'temp-' + Date.now());

        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-f6f51aa6/upload`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`
            },
            body: formData
          }
        );

        const result = await response.json();

        if (!response.ok || result.error) {
          throw new Error(result.error || 'Upload failed');
        }

        uploadedFiles.push(result.file);
      }

      setFormData(prev => ({
        ...prev,
        documents: [...prev.documents, ...uploadedFiles]
      }));
    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.message || 'Failed to upload files');
    } finally {
      setUploadingFile(false);
    }
  };

  const checkEligibility = () => {
    // Simple eligibility check simulation
    // In a real system, this would use the grant's criteria
    const hasProjectTitle = formData.projectTitle.length > 10;
    const hasDescription = formData.projectDescription.length > 50;
    const hasTeamInfo = formData.teamQualifications.length > 20;
    
    const isEligible = hasProjectTitle && hasDescription && hasTeamInfo;
    setEligibilityCheck(isEligible);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-f6f51aa6/applications`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify(formData)
        }
      );

      const result = await response.json();

      if (!response.ok || result.error) {
        throw new Error(result.error || 'Failed to submit application');
      }

      onSuccess();
    } catch (err: any) {
      console.error('Application submission error:', err);
      setError(err.message || 'Failed to submit application');
    } finally {
      setLoading(false);
    }
  };

  // use shared formatCurrency util

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onCancel}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2>Apply for Grant</h2>
          <p className="text-muted-foreground">{grant.title}</p>
        </div>
      </div>

      {/* Grant Info */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle>Grant Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Funding Amount</p>
              <p>{formatCurrency(grant.fundingAmount)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Deadline</p>
              <p>{new Date(grant.deadline).toLocaleDateString()}</p>
            </div>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Eligibility Criteria</p>
            <p className="text-sm">{grant.eligibilityCriteria}</p>
          </div>
        </CardContent>
      </Card>

      {/* Eligibility Check */}
      <Card>
        <CardHeader>
          <CardTitle>Eligibility Check</CardTitle>
          <CardDescription>
            Fill in basic information to check if you're eligible
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {eligibilityCheck !== null && (
            <div className={`p-4 rounded-lg flex items-center gap-3 ${
              eligibilityCheck 
                ? 'bg-green-50 border border-green-200' 
                : 'bg-yellow-50 border border-yellow-200'
            }`}>
              {eligibilityCheck ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-green-900">You appear to be eligible!</p>
                    <p className="text-sm text-green-700">Continue with your application below.</p>
                  </div>
                </>
              ) : (
                <>
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                  <div>
                    <p className="text-yellow-900">Please provide more information</p>
                    <p className="text-sm text-yellow-700">Complete the required fields to verify eligibility.</p>
                  </div>
                </>
              )}
            </div>
          )}
          <Button type="button" variant="outline" onClick={checkEligibility}>
            Check Eligibility
          </Button>
        </CardContent>
      </Card>

      {/* Application Form */}
      <Card>
        <CardHeader>
          <CardTitle>Application Details</CardTitle>
          <CardDescription>
            Provide information about your project
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="projectTitle">Project Title</Label>
              <Input
                id="projectTitle"
                placeholder="Give your project a clear, descriptive title"
                value={formData.projectTitle}
                onChange={(e) => setFormData({ ...formData, projectTitle: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="projectDescription">Project Description</Label>
              <Textarea
                id="projectDescription"
                placeholder="Describe your project, its goals, and how it aligns with the grant objectives..."
                value={formData.projectDescription}
                onChange={(e) => setFormData({ ...formData, projectDescription: e.target.value })}
                rows={5}
                required
              />
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="requestedAmount">Requested Amount (R)</Label>
                <Input
                  id="requestedAmount"
                  type="number"
                  value={formData.requestedAmount}
                  onChange={(e) => setFormData({ ...formData, requestedAmount: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="timeline">Project Timeline</Label>
                <Input
                  id="timeline"
                  placeholder="e.g., 12 months"
                  value={formData.timeline}
                  onChange={(e) => setFormData({ ...formData, timeline: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="organizationInfo">Organization Information</Label>
              <Textarea
                id="organizationInfo"
                placeholder="Tell us about your organization, its mission, and track record..."
                value={formData.organizationInfo}
                onChange={(e) => setFormData({ ...formData, organizationInfo: e.target.value })}
                rows={3}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="teamQualifications">Team Qualifications</Label>
              <Textarea
                id="teamQualifications"
                placeholder="Describe your team's expertise and relevant experience..."
                value={formData.teamQualifications}
                onChange={(e) => setFormData({ ...formData, teamQualifications: e.target.value })}
                rows={3}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="expectedOutcomes">Expected Outcomes</Label>
              <Textarea
                id="expectedOutcomes"
                placeholder="What measurable outcomes do you expect to achieve?"
                value={formData.expectedOutcomes}
                onChange={(e) => setFormData({ ...formData, expectedOutcomes: e.target.value })}
                rows={3}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="budgetBreakdown">Budget Breakdown</Label>
              <Textarea
                id="budgetBreakdown"
                placeholder="Provide a detailed breakdown of how funds will be used..."
                value={formData.budgetBreakdown}
                onChange={(e) => setFormData({ ...formData, budgetBreakdown: e.target.value })}
                rows={4}
                required
              />
            </div>

            {/* Document Upload */}
            <div className="space-y-2">
              <Label htmlFor="documents">Supporting Documents</Label>
              <div className="border-2 border-dashed rounded-lg p-6 text-center">
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-2">
                  Upload required documents (PDF, DOC, etc.)
                </p>
                <Input
                  id="documents"
                  type="file"
                  onChange={handleFileUpload}
                  disabled={uploadingFile}
                  multiple
                  className="max-w-xs mx-auto"
                />
                {uploadingFile && (
                  <p className="text-sm text-blue-600 mt-2">Uploading...</p>
                )}
              </div>
              {formData.documents.length > 0 && (
                <div className="space-y-2 mt-3">
                  <p className="text-sm">Uploaded files:</p>
                  <ul className="space-y-1">
                    {formData.documents.map((doc, idx) => (
                      <li key={idx} className="text-sm flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        {doc.name}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <p className="text-sm text-muted-foreground">
              Required documents: {grant.requiredDocuments}
            </p>

            {error && (
              <div className="bg-destructive/10 text-destructive p-3 rounded-md">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <Button type="submit" disabled={loading}>
                {loading ? 'Submitting...' : 'Submit Application'}
              </Button>
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
