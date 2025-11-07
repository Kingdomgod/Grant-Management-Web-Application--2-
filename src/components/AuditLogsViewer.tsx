import { useState, useEffect } from 'react';

type AuditLogFilters = {
  userId?: string;
  action?: AuditAction | undefined;
  resourceType?: string;
  status?: 'success' | 'failure';
  startDate?: Date;
  endDate?: Date;
};
import { DataTable } from './ui/table';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from './ui/select';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Calendar } from './ui/calendar';
import { format } from 'date-fns';
import { Download, Filter, Trash } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from './ui/popover';
import { AuditEvent, AuditAction, getAuditLogs } from '../utils/supabase/audit';
import { toast } from 'sonner';


interface AuditLogsViewerProps {
  onExport?: () => void;
}

export function AuditLogsViewer({ onExport }: AuditLogsViewerProps) {
  const [logs, setLogs] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState<AuditLogFilters>({
      action: undefined,
      status: undefined,
      startDate: undefined,
      endDate: undefined,
    });
  const [page, setPage] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);
  const pageSize = 50;

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const { data, total } = await getAuditLogs(filters, page, pageSize);
      setLogs(data);
      setTotalLogs(total);
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
      toast.error('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, filters]);

  const handleFilterChange = (key: keyof AuditLogFilters, value: string | Date | 'success' | 'failure') => {
    setFilters((prev: AuditLogFilters) => ({
      ...prev,
      [key]: value,
    }));
    setPage(1); // Reset to first page when filters change
  };

  const clearFilters = () => {
    setFilters({});
    setPage(1);
  };

  const exportLogs = async () => {
    try {
      // Get all logs for export
      const allLogs = [];
      let currentPage = 1;
      
      while (true) {
        const { data } = await getAuditLogs(filters, currentPage, 1000);
        if (data.length === 0) break;
        allLogs.push(...data);
        currentPage++;
      }

      // Convert to CSV
      const headers = ['Timestamp', 'User', 'Action', 'Resource', 'Status', 'Details'];
      const csv = [
        headers.join(','),
        ...allLogs.map(log => [
          format(new Date(log.timestamp), 'yyyy-MM-dd HH:mm:ss'),
          log.userId,
          log.action,
          `${log.resource.type}:${log.resource.id}`,
          log.status,
          JSON.stringify(log.metadata)
        ].join(','))
      ].join('\n');

      // Download file
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success('Audit logs exported successfully');
      if (onExport) onExport();
    } catch (error) {
      console.error('Failed to export logs:', error);
      toast.error('Failed to export audit logs');
    }
  };

  const columns = [
    {
      header: 'Timestamp',
      accessorKey: 'timestamp',
      cell: ({ row }: any) => format(new Date(row.original.timestamp), 'yyyy-MM-dd HH:mm:ss')
    },
    {
      header: 'User',
      accessorKey: 'userId'
    },
    {
      header: 'Action',
      accessorKey: 'action'
    },
    {
      header: 'Resource',
      accessorKey: 'resource',
      cell: ({ row }: any) => `${row.original.resource.type}:${row.original.resource.id}`
    },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: ({ row }: any) => (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            row.original.status === 'success'
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }`}
        >
          {row.original.status}
        </span>
      )
    },
    {
      header: 'Details',
      accessorKey: 'metadata',
      cell: ({ row }: any) => (
        <pre className="text-xs overflow-hidden text-ellipsis max-w-xs">
          {JSON.stringify(row.original.metadata, null, 2)}
        </pre>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Audit Logs</h2>
        
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Filter className="h-4 w-4" />
                Filters
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-4">
              <div className="space-y-4">
                {/* Action filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Action</label>
                  <Select
                    value={filters.action}
                    onValueChange={(value: string) => handleFilterChange('action', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select action" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(AuditAction).map((action) => (
                        <SelectItem key={action} value={action}>
                          {action}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Status filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Status</label>
                  <Select
                    value={filters.status}
                    onValueChange={(value: 'success' | 'failure') => handleFilterChange('status', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="success">Success</SelectItem>
                      <SelectItem value="failure">Failure</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Date range */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Date Range</label>
                  <div className="flex gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full">
                          {filters.startDate ? format(filters.startDate, 'PP') : 'Start date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={filters.startDate}
                          onSelect={(date: Date) => handleFilterChange('startDate', date)}
                        />
                      </PopoverContent>
                    </Popover>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full">
                          {filters.endDate ? format(filters.endDate, 'PP') : 'End date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={filters.endDate}
                          onSelect={(date: Date) => handleFilterChange('endDate', date)}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {/* User ID filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">User ID</label>
                  <Input
                    value={filters.userId || ''}
                    onChange={(e) => handleFilterChange('userId', e.target.value)}
                    placeholder="Enter user ID"
                  />
                </div>

                {/* Resource type filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Resource Type</label>
                  <Input
                    value={filters.resourceType || ''}
                    onChange={(e) => handleFilterChange('resourceType', e.target.value)}
                    placeholder="Enter resource type"
                  />
                </div>

                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={clearFilters}
                >
                  <Trash className="h-4 w-4" />
                  Clear Filters
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          <Button
            variant="outline"
            className="gap-2"
            onClick={exportLogs}
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      <DataTable
        columns={columns}
        loading={loading}
      />
    </div>
  );
}