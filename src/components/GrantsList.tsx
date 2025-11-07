import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Calendar, DollarSign, FileText, Search, Filter } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { formatCurrency } from '../utils/formatCurrency';

interface GrantsListProps {
  user: any;
  accessToken: string;
  onApply: (grant: any) => void;
  onCreateGrant?: () => void;
}

export function GrantsList({ user, accessToken, onApply, onCreateGrant }: GrantsListProps) {
  const [grants, setGrants] = useState<any[]>([]);
  const [filteredGrants, setFilteredGrants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  useEffect(() => {
    fetchGrants();
  }, []);

  useEffect(() => {
    filterGrants();
  }, [grants, searchTerm, categoryFilter]);

  const fetchGrants = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-f6f51aa6/grants`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      const result = await response.json();
      if (result.grants) {
        setGrants(result.grants);
      }
    } catch (error) {
      console.error('Failed to fetch grants:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterGrants = () => {
    let filtered = grants;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (grant) =>
          grant.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          grant.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by category
    if (categoryFilter !== 'all') {
      filtered = filtered.filter((grant) => grant.category === categoryFilter);
    }

    setFilteredGrants(filtered);
  };

  // use shared formatCurrency util

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const isDeadlinePassed = (deadline: string) => {
    return new Date(deadline) < new Date();
  };

  const getCategories = () => {
    const categories = new Set(grants.map(g => g.category).filter(Boolean));
    return Array.from(categories);
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
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="normal-case">Available Grants</h2>
          <p className="text-muted-foreground normal-case mt-1">
            Browse and apply for government grants
          </p>
        </div>
        {(user.role === 'admin' || user.role === 'grantor') && onCreateGrant && (
          <Button onClick={onCreateGrant} size="lg">
            <FileText className="mr-2 h-4 w-4" />
            Create Grant
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card className="elevation-1">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search grants..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {getCategories().map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Grants Grid */}
      {filteredGrants.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="p-4 bg-muted rounded-full mb-4">
              <FileText className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="normal-case">No grants found</h3>
            <p className="text-muted-foreground text-center normal-case mt-2">
              {searchTerm || categoryFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Check back later for new opportunities'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredGrants.map((grant, index) => (
            <Card 
              key={grant.id} 
              className="flex flex-col md-transition-decelerated hover:scale-105 hover:elevation-4"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <CardHeader>
                <div className="flex items-start justify-between mb-2 gap-2">
                  <Badge 
                    variant={grant.status === 'active' ? 'success' : 'secondary'}
                  >
                    {grant.status}
                  </Badge>
                  {grant.category && (
                    <Badge variant="outline">{grant.category}</Badge>
                  )}
                </div>
                <CardTitle className="normal-case">{grant.title}</CardTitle>
                <CardDescription className="line-clamp-2 normal-case">
                  {grant.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-between">
                <div className="space-y-3 mb-4">
                  <div className="flex items-center gap-3 p-2 rounded bg-accent/30">
                    <div className="p-1.5 bg-primary/10 rounded-full">
                      <DollarSign className="h-4 w-4 text-primary" />
                    </div>
                    <span className="normal-case">{formatCurrency(grant.fundingAmount)}</span>
                  </div>
                  <div className="flex items-center gap-3 p-2 rounded bg-accent/30">
                    <div className="p-1.5 bg-primary/10 rounded-full">
                      <Calendar className="h-4 w-4 text-primary" />
                    </div>
                    <span className="normal-case text-sm">
                      Deadline: {new Date(grant.deadline).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 p-2 rounded bg-accent/30">
                    <div className="p-1.5 bg-primary/10 rounded-full">
                      <FileText className="h-4 w-4 text-primary" />
                    </div>
                    <span className="normal-case text-sm">{grant.applicationCount || 0} applications</span>
                  </div>
                  {grant.eligibilityCriteria && (
                    <div className="text-sm text-muted-foreground mt-2 p-3 bg-muted/30 rounded normal-case">
                      <p>Eligibility: {grant.eligibilityCriteria.slice(0, 100)}...</p>
                    </div>
                  )}
                </div>

                {user.role === 'grantee' && (
                  <Button
                    onClick={() => onApply(grant)}
                    disabled={isDeadlinePassed(grant.deadline) || grant.status !== 'active'}
                    className="w-full"
                    size="lg"
                  >
                    {isDeadlinePassed(grant.deadline)
                      ? 'Deadline Passed'
                      : grant.status !== 'active'
                      ? 'Grant Closed'
                      : 'Apply Now'}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
