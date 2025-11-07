import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { ArrowLeft } from 'lucide-react';
import { projectId } from '../utils/supabase/info';
import { toast } from 'sonner@2.0.3';

interface GrantFormProps {
  accessToken: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function GrantForm({ accessToken, onSuccess, onCancel }: GrantFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'Education',
    fundingAmount: '',
    deadline: '',
    eligibilityCriteria: '',
    requiredDocuments: '',
    objectives: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!accessToken) {
        throw new Error('You must be logged in to create a grant');
      }

      console.log('Creating grant with data:', formData);
      console.log('Using access token:', accessToken.substring(0, 20) + '...');
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-f6f51aa6/grants`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify(formData)
        }
      );

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);

      const result = await response.json();
      console.log('Response result:', result);

      if (response.status === 401) {
        throw new Error('You do not have permission to create grants. Only Admin and Grantor users can create grants.');
      }

      if (!response.ok || result.error) {
        throw new Error(result.error || `Failed to create grant (status: ${response.status})`);
      }

      toast.success('Grant created successfully!');
      onSuccess();
    } catch (err: any) {
      console.error('Grant creation error details:', err);
      setError(err.message || 'Failed to create grant');
      toast.error(err.message || 'Failed to create grant');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onCancel}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2>Create New Grant</h2>
          <p className="text-muted-foreground">
            Set up a new grant opportunity
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Grant Details</CardTitle>
          <CardDescription>
            Fill in the information about this grant opportunity
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="title">Grant Title</Label>
                <Input
                  id="title"
                  placeholder="e.g., Small Business Innovation Grant"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Education">Education</SelectItem>
                    <SelectItem value="Healthcare">Healthcare</SelectItem>
                    <SelectItem value="Technology">Technology</SelectItem>
                    <SelectItem value="Environment">Environment</SelectItem>
                    <SelectItem value="Community Development">Community Development</SelectItem>
                    <SelectItem value="Research">Research</SelectItem>
                    <SelectItem value="Arts & Culture">Arts & Culture</SelectItem>
                    <SelectItem value="Small Business">Small Business</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fundingAmount">Funding Amount (R)</Label>
                <Input
                  id="fundingAmount"
                  type="number"
                  placeholder="50000"
                  value={formData.fundingAmount}
                  onChange={(e) => setFormData({ ...formData, fundingAmount: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="deadline">Application Deadline</Label>
                <Input
                  id="deadline"
                  type="date"
                  value={formData.deadline}
                  onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe the purpose and goals of this grant..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="objectives">Grant Objectives</Label>
              <Textarea
                id="objectives"
                placeholder="What are the key objectives and expected outcomes?"
                value={formData.objectives}
                onChange={(e) => setFormData({ ...formData, objectives: e.target.value })}
                rows={3}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="eligibilityCriteria">Eligibility Criteria</Label>
              <Textarea
                id="eligibilityCriteria"
                placeholder="Who can apply? List requirements..."
                value={formData.eligibilityCriteria}
                onChange={(e) => setFormData({ ...formData, eligibilityCriteria: e.target.value })}
                rows={3}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="requiredDocuments">Required Documents</Label>
              <Textarea
                id="requiredDocuments"
                placeholder="List all required documents for application..."
                value={formData.requiredDocuments}
                onChange={(e) => setFormData({ ...formData, requiredDocuments: e.target.value })}
                rows={3}
                required
              />
            </div>

            {error && (
              <div className="bg-destructive/10 text-destructive p-3 rounded-md">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <Button type="submit" disabled={loading}>
                {loading ? 'Creating...' : 'Create Grant'}
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
