import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Globe, 
  Download, 
  FileText, 
  Search, 
  AlertCircle,
  CheckCircle,
  Loader2,
  Link,
  Database,
  FileSearch
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { SopgridHeader } from '@/components/sopgrid-header';

// Database ping component
function DatabasePing() {
  const { data: dbStatus } = useQuery<any>({
    queryKey: ['/api/ping/database'],
    // Enterprise: Event-driven updates - no polling
  });

  if (!dbStatus) {
    return <div className="text-gray-400">Checking database...</div>;
  }

  return (
    <div className="space-y-2 text-sm">
      <div className="flex justify-between">
        <span className="text-gray-400">Documents:</span>
        <span className="text-green-400 font-mono">{dbStatus.documents?.total || 0}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-gray-400">SOPs:</span>
        <span className="text-blue-400 font-mono">{dbStatus.sops?.total || 0}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-gray-400">DB Size:</span>
        <span className="text-cyan-400 font-mono">{(dbStatus.documents?.size_mb || 0) + (dbStatus.sops?.size_mb || 0)} MB</span>
      </div>
      <div className="flex justify-between">
        <span className="text-gray-400">Crawl Jobs:</span>
        <span className="text-yellow-400 font-mono">{dbStatus.crawler_jobs || 0}</span>
      </div>
      <div className="text-xs text-gray-500 mt-2">
        Last updated: {new Date(dbStatus.timestamp || Date.now()).toLocaleTimeString()}
      </div>
    </div>
  );
}

interface CrawlResult {
  url: string;
  title: string;
  type: string;
  metadata: {
    size?: number;
    contentType?: string;
    lastModified?: string;
  };
}

interface CrawlJob {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startUrl: string;
  documentsFound: number;
  embedded: number;
  errors: string[];
  startedAt: string;
  completedAt?: string;
}

export default function WebCrawler() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [crawlUrl, setCrawlUrl] = useState('');
  const [keywords, setKeywords] = useState('');
  const [maxPages, setMaxPages] = useState(100);
  const [maxDepth, setMaxDepth] = useState(5);
  const [maxTime, setMaxTime] = useState(30);
  const [currentJob, setCurrentJob] = useState<CrawlJob | null>(null);

  // Fetch recent crawl jobs and auto-set running job
  const { data: crawlJobs = [] } = useQuery<CrawlJob[]>({
    queryKey: ['/api/crawler/jobs']
  });

  // Auto-set current job when crawlJobs updates
  React.useEffect(() => {
    if (!currentJob && crawlJobs.length > 0) {
      const runningJob = crawlJobs.find((job: CrawlJob) => job.status === 'running');
      if (runningJob) {
        setCurrentJob(runningJob);
      }
    }
  }, [crawlJobs, currentJob]);

  // Start crawl mutation
  const startCrawl = useMutation({
    mutationFn: async (data: { 
      url: string; 
      keywords?: string[]; 
      maxPages: number;
      maxDepth: number;
      maxTimeMinutes: number;
    }) => {
      const response = await fetch('/api/crawler/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to start crawl');
      return response.json();
    },
    onSuccess: (data: CrawlJob) => {
      setCurrentJob(data);
      toast({
        title: 'Crawl Started',
        description: `Started crawling ${data.startUrl}`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/crawler/jobs'] });
    },
    onError: (error) => {
      toast({
        title: 'Crawl Failed',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Check job status with more aggressive updates
  const { data: jobStatus } = useQuery<CrawlJob>({
    queryKey: ['/api/crawler/job', currentJob?.id],
    enabled: !!currentJob,
    // Enterprise: No polling - event-driven updates // MEMORY FIX: Reduced to 10 seconds to prevent bloat
    refetchIntervalInBackground: true
  });

  // Update currentJob when jobStatus changes
  React.useEffect(() => {
    if (jobStatus) {
      setCurrentJob(jobStatus);
    }
  }, [jobStatus]);

  const handleStartCrawl = () => {
    if (!crawlUrl) {
      toast({
        title: 'URL Required',
        description: 'Please enter a URL to crawl',
        variant: 'destructive'
      });
      return;
    }

    const keywordList = keywords.split(',').map(k => k.trim()).filter(k => k);
    
    startCrawl.mutate({
      url: crawlUrl,
      keywords: keywordList.length > 0 ? keywordList : undefined,
      maxPages,
      maxDepth,
      maxTimeMinutes: maxTime
    });
  };

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Corporate Background */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url(/dashboard-bg.png)'
        }}
      >
        <div className="absolute inset-0 bg-transparent" />
      </div>

      {/* Grid Overlay */}
      <div className="absolute inset-0 z-10">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,102,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,102,255,0.03)_1px,transparent_1px)] bg-[size:50px_50px]" />
      </div>

      {/* Header */}
      <SopgridHeader />

      <div className="relative z-20 container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-center mb-6">
          <div className="flex items-center gap-3">
            <Globe className="w-8 h-8 text-blue-500" />
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 via-blue-500 to-cyan-400 bg-clip-text text-transparent">
                Web Crawler
              </h1>
              <p className="text-gray-400 text-sm text-center">Automated Manual Ingestion & Embedding</p>
            </div>
          </div>
        </div>

      <Tabs defaultValue="crawl" className="space-y-4">
        <TabsList className="bg-transparent border border-blue-600/30">
          <TabsTrigger value="crawl" className="data-[state=active]:bg-blue-500/20">
            <FileSearch className="h-4 w-4 mr-2" />
            New Crawl
          </TabsTrigger>
          <TabsTrigger value="history" className="data-[state=active]:bg-blue-500/20">
            <Database className="h-4 w-4 mr-2" />
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="crawl" className="space-y-4">
          <Card className="bg-transparent backdrop-blur-xl border-blue-600/30">
            <CardHeader>
              <CardTitle className="text-blue-400">Configure Web Crawl</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="url">Website URL</Label>
                <div className="flex gap-2">
                  <Input
                    id="url"
                    type="url"
                    placeholder="https://manufacturer-website.com/manuals"
                    value={crawlUrl}
                    onChange={(e) => setCrawlUrl(e.target.value)}
                    className="bg-transparent0 border-gray-700 text-white"
                    data-testid="input-crawl-url"
                  />
                  <Button
                    onClick={handleStartCrawl}
                    disabled={startCrawl.isPending || !crawlUrl}
                    className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700"
                    data-testid="button-start-crawl"
                  >
                    {startCrawl.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                    Start Crawl
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="keywords">Keywords (optional)</Label>
                <Textarea
                  id="keywords"
                  placeholder="Enter keywords separated by commas: maintenance, troubleshooting, repair"
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  className="bg-transparent0 border-gray-700 text-white min-h-[80px]"
                  data-testid="textarea-keywords"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="maxPages">Max Pages</Label>
                  <Input
                    id="maxPages"
                    type="number"
                    min="1"
                    max="1000"
                    value={maxPages}
                    onChange={(e) => setMaxPages(parseInt(e.target.value) || 100)}
                    className="bg-transparent0 border-gray-700 text-white"
                    data-testid="input-max-pages"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="maxDepth">Max Depth</Label>
                  <Input
                    id="maxDepth"
                    type="number"
                    min="1"
                    max="10"
                    value={maxDepth}
                    onChange={(e) => setMaxDepth(parseInt(e.target.value) || 5)}
                    className="bg-transparent0 border-gray-700 text-white"
                    data-testid="input-max-depth"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="maxTime">Max Time (min)</Label>
                  <Input
                    id="maxTime"
                    type="number"
                    min="1"
                    max="120"
                    value={maxTime}
                    onChange={(e) => setMaxTime(parseInt(e.target.value) || 30)}
                    className="bg-transparent0 border-gray-700 text-white"
                    data-testid="input-max-time"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Database Size Checker */}
          <Card className="bg-gray-900/50 border-gray-800">
            <CardHeader>
              <CardTitle className="text-green-400 flex items-center gap-2">
                <Database className="h-5 w-5" />
                Database Live Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DatabasePing />
              <div className="mt-4 p-3 bg-cyan-900/30 border border-cyan-700 rounded">
                <p className="text-xs text-cyan-200">
                  💡 <strong>Why it shows 0:</strong> The crawler processes documents in memory and they were cleared when the server restarted. 
                  Start a new crawl to see this counter grow in real-time!
                </p>
              </div>
            </CardContent>
          </Card>

          {currentJob && (
            <Card className="bg-gray-900/50 border-gray-800">
              <CardHeader>
                <CardTitle className="text-cyan-400 flex items-center gap-2">
                  <Loader2 className={`h-5 w-5 ${currentJob.status === 'running' ? 'animate-spin' : ''}`} />
                  Current Crawl Job
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Status</span>
                  <Badge 
                    variant={currentJob.status === 'completed' ? 'default' : 
                            currentJob.status === 'failed' ? 'destructive' : 'secondary'}
                    data-testid={`badge-status-${currentJob.status}`}
                  >
                    {currentJob.status}
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-400">URL</span>
                  <span className="text-white text-sm" data-testid="text-crawl-url">{currentJob.startUrl}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Documents Found</span>
                  <span className="text-cyan-400 font-mono" data-testid="text-docs-found">
                    {jobStatus?.documentsFound || currentJob.documentsFound}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Embedded</span>
                  <span className="text-green-400 font-mono" data-testid="text-embedded">
                    {jobStatus?.embedded || currentJob.embedded}
                  </span>
                </div>

                {currentJob.status === 'running' && (
                  <>
                    <Progress 
                      value={(currentJob.embedded / Math.max(currentJob.documentsFound, 1)) * 100}
                      className="h-2 bg-gray-800"
                    />
                    <div className="text-xs text-gray-500 text-center">
                      Processing depth levels and avoiding duplicates...
                    </div>
                  </>
                )}

                {currentJob.errors.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-red-400">Errors</Label>
                    <ScrollArea className="h-32 w-full rounded-md border border-gray-700 bg-transparent0 p-2">
                      {currentJob.errors.map((error, idx) => (
                        <div key={idx} className="text-xs text-red-300 mb-1" data-testid={`text-error-${idx}`}>
                          {error}
                        </div>
                      ))}
                    </ScrollArea>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card className="bg-gray-900/50 border-gray-800">
            <CardHeader>
              <CardTitle className="text-cyan-400">Crawl History</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {crawlJobs.map((job) => (
                    <div
                      key={job.id}
                      className="p-3 bg-transparent0 border border-gray-700 rounded-lg hover:border-cyan-500/50 transition-colors"
                      data-testid={`card-job-${job.id}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Link className="h-4 w-4 text-cyan-400" />
                            <span className="text-sm text-white font-medium">{job.startUrl}</span>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-gray-400">
                            <span>📄 {job.documentsFound} documents</span>
                            <span>✓ {job.embedded} embedded</span>
                            <span>{new Date(job.startedAt).toLocaleString()}</span>
                          </div>
                        </div>
                        <Badge 
                          variant={job.status === 'completed' ? 'default' : 
                                  job.status === 'failed' ? 'destructive' : 'secondary'}
                        >
                          {job.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>
    </div>
  );
}