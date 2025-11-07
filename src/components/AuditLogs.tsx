import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { Search, Activity } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface AuditLogsProps {
  accessToken: string;
}

export function AuditLogs({ accessToken }: AuditLogsProps) {
  const [logs, setLogs] = useState<any[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchLogs();
  }, []);

  useEffect(() => {
    filterLogs();
  }, [logs, searchTerm]);

  const fetchLogs = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-f6f51aa6/audit-logs`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      const result = await response.json();
      if (result.logs) {
        setLogs(result.logs);
      } else if (result.error) {
        console.error('Error fetching logs:', result.error);
      }
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterLogs = () => {
    if (!searchTerm) {
      setFilteredLogs(logs);
      return;
    }

    const filtered = logs.filter(
      (log) =>
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        JSON.stringify(log.details).toLowerCase().includes(searchTerm.toLowerCase())
    );

    setFilteredLogs(filtered);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getActionColor = (action: string) => {
    if (action.includes('created') || action.includes('signup')) {
      return 'bg-green-100 text-green-800 border-green-300';
    } else if (action.includes('updated') || action.includes('reviewed')) {
      return 'bg-blue-100 text-blue-800 border-blue-300';
    } else if (action.includes('deleted') || action.includes('rejected')) {
      return 'bg-red-100 text-red-800 border-red-300';
    }
    return 'bg-gray-100 text-gray-800 border-gray-300';
  };

  const formatAction = (action: string) => {
    return action.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2>Audit Logs</h2>
        <p className="text-muted-foreground">
          Complete system activity tracking and compliance logs
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search audit logs..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Total Events</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{logs.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">User Signups</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl">
              {logs.filter(l => l.action === 'user_signup').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Grants Created</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl">
              {logs.filter(l => l.action === 'grant_created').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Applications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl">
              {logs.filter(l => l.action === 'application_submitted').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Logs List */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Timeline</CardTitle>
          <CardDescription>
            Showing {filteredLogs.length} of {logs.length} events
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredLogs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No audit logs found</p>
            </div>
          ) : (
            <ScrollArea className="h-[600px] pr-4">
              <div className="space-y-3">
                {filteredLogs.map((log) => (
                  <div
                    key={log.id}
                    className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <Badge className={getActionColor(log.action)}>
                        {formatAction(log.action)}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {formatDate(log.timestamp)}
                      </span>
                    </div>
                    
                    <div className="space-y-1">
                      <p className="text-sm">
                        <span className="text-muted-foreground">User ID: </span>
                        <span className="font-mono text-xs">{log.userId}</span>
                      </p>
                      
                      {log.details && Object.keys(log.details).length > 0 && (
                        <div className="text-sm">
                          <span className="text-muted-foreground">Details: </span>
                          <div className="mt-1 bg-muted p-2 rounded font-mono text-xs overflow-x-auto">
                            {JSON.stringify(log.details, null, 2)}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Compliance Notice */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-sm">Compliance & Data Privacy</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            All system activities are logged in compliance with data privacy regulations. 
            Audit logs are retained for regulatory compliance and security monitoring purposes. 
            Access to audit logs is restricted to system administrators only.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
