import { useState, useEffect } from 'react';
import {
  runSecurityTests,
  validateSecurityConfig,
  generateSecurityReport,
  SecurityTestResult
} from '../utils/supabase/securityTesting';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Progress } from './ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
  Play,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Shield,
  Download
} from 'lucide-react';
import { toast } from 'sonner';

interface SecurityMetrics {
  passed: number;
  failed: number;
  warnings: number;
  total: number;
}

interface SecurityTestingDashboardProps {
  onComplete?: () => void;
  onExport?: () => void;
}

export function SecurityTestingDashboard({ onComplete, onExport }: SecurityTestingDashboardProps) {
  const [metrics, setMetrics] = useState<SecurityMetrics>({
    passed: 0,
    failed: 0,
    warnings: 0,
    total: 0
  });
  const [results, setResults] = useState<SecurityTestResult[]>([]);
  const [criticalIssues, setCriticalIssues] = useState<SecurityTestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState('');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    loadLastReport();
  }, []);

  const loadLastReport = async () => {
    try {
      // Get last 24 hours of test results
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);
      
      const report = await generateSecurityReport(startDate, endDate);
      setMetrics(report.summary);
      setCriticalIssues(report.criticalIssues);
      setResults(report.recentTests);
    } catch (error) {
      console.error('Failed to load security report:', error);
      toast.error('Failed to load security report');
    }
  };

  const runTests = async () => {
    try {
      setIsRunning(true);
      setProgress(0);
      
      // Run configuration validation
      setCurrentTest('Validating security configuration...');
      setProgress(20);
      const configResults = await validateSecurityConfig();
      
      // Run security test suite
      setCurrentTest('Running security tests...');
      setProgress(60);
      const { passed, failed, warnings, results: testResults } = await runSecurityTests();
      
      // Combine results
      const allResults = [...configResults, ...testResults];
      setResults(allResults);
      
      // Update metrics
      setMetrics({
        passed,
        failed,
        warnings,
        total: passed + failed + warnings
      });
      
      // Find critical issues
      const critical = allResults.filter(
        result => result.details.severity === 'critical' && result.status !== 'passed'
      );
      setCriticalIssues(critical);
      
      setProgress(100);
  toast.success('Security tests completed');
  if (onComplete) onComplete();
    } catch (error) {
      console.error('Security tests failed:', error);
      toast.error('Security tests failed');
    } finally {
      setIsRunning(false);
      setCurrentTest('');
    }
  };

  const exportReport = async () => {
    try {
      const report = {
        timestamp: new Date().toISOString(),
        metrics,
        criticalIssues,
        results
      };

      const blob = new Blob([JSON.stringify(report, null, 2)], {
        type: 'application/json'
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `security-report-${new Date().toISOString()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

  toast.success('Security report exported');
  if (onExport) onExport();
    } catch (error) {
      console.error('Failed to export report:', error);
      toast.error('Failed to export security report');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'passed':
        return 'text-green-500';
      case 'failed':
        return 'text-red-500';
      default:
        return 'text-yellow-500';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Security Testing Dashboard</h2>
        
        <div className="flex items-center gap-2">
          <Button
            onClick={runTests}
            disabled={isRunning}
            className="gap-2"
          >
            <Play className="h-4 w-4" />
            Run Tests
          </Button>
          
          <Button
            variant="outline"
            onClick={exportReport}
            disabled={isRunning}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Test Progress */}
      {isRunning && (
        <Card className="p-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">{currentTest}</p>
            <Progress value={progress} />
          </div>
        </Card>
      )}

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Total Tests</p>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-2xl font-bold mt-2">{metrics.total}</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Passed</p>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </div>
          <p className="text-2xl font-bold mt-2">{metrics.passed}</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Failed</p>
            <XCircle className="h-4 w-4 text-red-500" />
          </div>
          <p className="text-2xl font-bold mt-2">{metrics.failed}</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Warnings</p>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </div>
          <p className="text-2xl font-bold mt-2">{metrics.warnings}</p>
        </Card>
      </div>

      {/* Test Results */}
      <Tabs defaultValue="critical" className="w-full">
        <TabsList>
          <TabsTrigger value="critical">
            Critical Issues ({criticalIssues.length})
          </TabsTrigger>
          <TabsTrigger value="all">
            All Tests ({results.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="critical">
          {criticalIssues.length > 0 ? (
            <div className="space-y-4">
              {criticalIssues.map((issue) => (
                <Card key={issue.testId} className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">{issue.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {issue.details.description}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        getStatusColor(issue.status)
                      }`}
                    >
                      {issue.status}
                    </span>
                  </div>
                  {issue.details.remediation && (
                    <p className="mt-2 text-sm border-t pt-2">
                      <span className="font-medium">Remediation: </span>
                      {issue.details.remediation}
                    </p>
                  )}
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-4">
              <p className="text-center text-muted-foreground">
                No critical issues found
              </p>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="all">
          <div className="space-y-4">
            {results.map((result) => (
              <Card key={result.testId} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{result.name}</h3>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          getSeverityColor(result.details.severity)
                        }`}
                      >
                        {result.details.severity}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {result.details.description}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      getStatusColor(result.status)
                    }`}
                  >
                    {result.status}
                  </span>
                </div>
                {result.details.location && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Location: {result.details.location}
                  </p>
                )}
                {result.details.remediation && (
                  <p className="mt-2 text-sm border-t pt-2">
                    <span className="font-medium">Remediation: </span>
                    {result.details.remediation}
                  </p>
                )}
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}