import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Play, Pause, Database, Globe, Zap, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface BulkStatus {
  isProcessing: boolean;
  message?: string;
}

interface CrawlerStatus {
  isRunning: boolean;
  message?: string;
}

export default function BulkGeneration() {
  const [bulkStatus, setBulkStatus] = useState<BulkStatus>({ isProcessing: false });
  const [crawlerStatus, setCrawlerStatus] = useState<CrawlerStatus>({ isRunning: false });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Poll status every 5 seconds
  useEffect(() => {
    const interval = setInterval(checkStatus, 5000);
    checkStatus(); // Initial check
    return () => clearInterval(interval);
  }, []);

  const checkStatus = async () => {
    try {
      const [bulkRes, crawlerRes] = await Promise.all([
        fetch('/api/bulk/sop/status'),
        fetch('/api/crawler/rvpartfinder/status')
      ]);
      
      if (bulkRes.ok) {
        const bulk = await bulkRes.json();
        setBulkStatus(bulk);
      }
      
      if (crawlerRes.ok) {
        const crawler = await crawlerRes.json();
        setCrawlerStatus(crawler);
      }
    } catch (error) {
      console.error('Status check failed:', error);
    }
  };

  const startBulkGeneration = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/bulk/sop/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "Bulk Generation Started",
          description: "Processing existing documents to generate SOPs automatically",
          duration: 5000
        });
        checkStatus();
      } else {
        toast({
          title: "Generation Failed",
          description: result.error || "Unknown error occurred",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Request Failed",
        description: "Could not start bulk generation",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const startCrawler = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/crawler/rvpartfinder/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "Crawler Started",
          description: "RV Partfinder crawler building parts knowledge base",
          duration: 5000
        });
        checkStatus();
      } else {
        toast({
          title: "Crawler Failed",
          description: result.error || "Unknown error occurred",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Request Failed",
        description: "Could not start crawler",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <div className="container mx-auto p-6 space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-white">
            <Zap className="inline-block mr-3 text-yellow-400" size={32} />
            SOPGRID Knowledge Accelerator
          </h1>
          <p className="text-slate-300 text-lg">
            Rapidly expand the knowledge base from existing data and external sources
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Bulk SOP Generation */}
          <Card className="bg-slate-800/50 border-slate-600">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Database className="mr-2 text-blue-400" size={24} />
                Auto-SOP Generation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-slate-300">
                Process existing vectorized documents to automatically generate SOPs.
                Simulates user requests to build knowledge base rapidly.
              </p>
              
              <div className="flex items-center space-x-2">
                <Badge variant={bulkStatus.isProcessing ? "default" : "secondary"}>
                  {bulkStatus.isProcessing ? "Processing" : "Ready"}
                </Badge>
                {bulkStatus.message && (
                  <span className="text-sm text-slate-400">{bulkStatus.message}</span>
                )}
              </div>

              {bulkStatus.isProcessing && (
                <div className="space-y-2">
                  <Progress value={undefined} className="w-full" />
                  <p className="text-sm text-slate-400">
                    Generating SOPs from existing documents...
                  </p>
                </div>
              )}

              <Button
                onClick={startBulkGeneration}
                disabled={isLoading || bulkStatus.isProcessing}
                className="w-full bg-blue-600 hover:bg-blue-700"
                data-testid="button-start-bulk-generation"
              >
                {bulkStatus.isProcessing ? (
                  <>
                    <Pause className="mr-2" size={16} />
                    Processing...
                  </>
                ) : (
                  <>
                    <Play className="mr-2" size={16} />
                    Start Bulk Generation
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* RV Partfinder Crawler */}
          <Card className="bg-slate-800/50 border-slate-600">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Globe className="mr-2 text-green-400" size={24} />
                RV Partfinder Crawler
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-slate-300">
                Extract parts catalog and technical data from rvpartfinder.com.
                Builds comprehensive parts database for SOP generation.
              </p>
              
              <div className="flex items-center space-x-2">
                <Badge variant={crawlerStatus.isRunning ? "default" : "secondary"}>
                  {crawlerStatus.isRunning ? "Crawling" : "Ready"}
                </Badge>
                {crawlerStatus.message && (
                  <span className="text-sm text-slate-400">{crawlerStatus.message}</span>
                )}
              </div>

              {crawlerStatus.isRunning && (
                <div className="space-y-2">
                  <Progress value={undefined} className="w-full" />
                  <p className="text-sm text-slate-400">
                    Extracting parts data from RV Partfinder...
                  </p>
                </div>
              )}

              <Button
                onClick={startCrawler}
                disabled={isLoading || crawlerStatus.isRunning}
                className="w-full bg-green-600 hover:bg-green-700"
                data-testid="button-start-crawler"
              >
                {crawlerStatus.isRunning ? (
                  <>
                    <Pause className="mr-2" size={16} />
                    Crawling...
                  </>
                ) : (
                  <>
                    <Play className="mr-2" size={16} />
                    Start RV Partfinder Crawler
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        <Separator className="bg-slate-600" />

        {/* Knowledge Base Expansion Strategy */}
        <Card className="bg-slate-800/50 border-slate-600">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <CheckCircle className="mr-2 text-yellow-400" size={24} />
              Knowledge Base Expansion Strategy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-slate-300">
              
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-white">Auto-SOP Generation</h3>
                <ul className="space-y-2 text-sm">
                  <li>• Processes 2000+ existing crawler documents</li>
                  <li>• Extracts equipment types and procedures</li>
                  <li>• Simulates user requests for natural SOP creation</li>
                  <li>• Uses multi-agent validation (Mother/Father/Soap)</li>
                  <li>• Generates safety-compliant SOPs automatically</li>
                </ul>
              </div>

              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-white">RV Partfinder Crawler</h3>
                <ul className="space-y-2 text-sm">
                  <li>• Extracts parts catalogs from rvpartfinder.com</li>
                  <li>• Captures installation and troubleshooting data</li>
                  <li>• Builds comprehensive parts specifications</li>
                  <li>• Identifies safety requirements and hazards</li>
                  <li>• Creates manufacturer-specific knowledge base</li>
                </ul>
              </div>
            </div>

            <div className="mt-6 p-4 bg-slate-700/50 rounded-lg">
              <h4 className="text-white font-semibold mb-2">Expected Results:</h4>
              <p className="text-slate-300 text-sm">
                <strong>Rapid Knowledge Base Growth:</strong> These systems will dramatically accelerate 
                SOPGRID's knowledge base by converting existing documents into structured SOPs and 
                continuously harvesting new technical data from industry sources. This creates a 
                self-expanding ecosystem that gets smarter with every crawl and generation cycle.
              </p>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}