import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  AlertTriangle, 
  Shield, 
  Wrench, 
  FileText, 
  Download,
  Cloud,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Hash
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SOPDocument {
  id: string;
  title: string;
  system: string;
  make?: string;
  model?: string;
  component: string;
  issue?: string;
  ppe: string[];
  hazards: string[];
  steps: {
    number: number;
    instruction: string;
    refs: string[];
    warnings?: string[];
  }[];
  torqueSpecs?: Record<string, string>;
  tools: string[];
  materials?: string[];
  arbitrationNotes?: string[];
  contradictionScore: number;
  confidence: number;
  evidence: {
    chunkIds: string[];
    sources: string[];
    hashes: string[];
  };
  status: string;
  createdAt: string;
  updatedAt: string;
}

export default function SOPViewer() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [sop, setSOP] = useState<SOPDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sopId = params.get('id');
    
    if (!sopId) {
      toast({
        title: 'Error',
        description: 'No SOP ID provided',
        variant: 'destructive'
      });
      setLocation('/sop-generator');
      return;
    }
    
    fetchSOP(sopId);
  }, []);

  const fetchSOP = async (id: string) => {
    try {
      const response = await fetch(`/api/sop/get?id=${id}`);
      if (!response.ok) throw new Error('Failed to fetch SOP');
      
      const data = await response.json();
      setSOP(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load SOP',
        variant: 'destructive'
      });
      setLocation('/sop-generator');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (!sop) return;
    
    setExporting(true);
    try {
      const response = await fetch(`/api/export?sop_id=${sop.id}`, {
        method: 'POST'
      });
      
      if (!response.ok) throw new Error('Export failed');
      
      const { path, size } = await response.json();
      
      // Trigger download
      const a = document.createElement('a');
      a.href = path;
      a.download = `${sop.id}.zip`;
      a.click();
      
      toast({
        title: 'Export Ready',
        description: `SOP exported (${size} bytes)`
      });
    } catch (error) {
      toast({
        title: 'Export Failed',
        description: 'Failed to export SOP',
        variant: 'destructive'
      });
    } finally {
      setExporting(false);
    }
  };

  const handleUpload = async () => {
    if (!sop) return;
    
    setUploading(true);
    try {
      const exportResponse = await fetch(`/api/export?sop_id=${sop.id}`, {
        method: 'POST'
      });
      
      if (!exportResponse.ok) throw new Error('Export failed');
      
      const { path } = await exportResponse.json();
      
      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from_path: path })
      });
      
      if (!uploadResponse.ok) throw new Error('Upload failed');
      
      const { handle } = await uploadResponse.json();
      
      // Copy to clipboard
      await navigator.clipboard.writeText(handle);
      
      toast({
        title: 'Upload Complete',
        description: `Uploaded to: ${handle} (copied to clipboard)`
      });
    } catch (error) {
      toast({
        title: 'Upload Failed',
        description: 'Failed to upload to cloud',
        variant: 'destructive'
      });
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-cyan-400">Loading SOP...</div>
      </div>
    );
  }

  if (!sop) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-red-400">SOP not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              onClick={() => setLocation('/sop-generator')}
              variant="ghost"
              className="text-cyan-400 hover:text-cyan-300"
              data-testid="button-back"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Generator
            </Button>
          </div>
          
          <div className="flex gap-2">
            <Button
              onClick={handleExport}
              disabled={exporting}
              className="bg-blue-600 hover:bg-blue-700"
              data-testid="button-export"
            >
              <Download className="h-4 w-4 mr-2" />
              Export SOP
            </Button>
            <Button
              onClick={handleUpload}
              disabled={uploading}
              className="bg-purple-600 hover:bg-purple-700"
              data-testid="button-upload"
            >
              <Cloud className="h-4 w-4 mr-2" />
              Upload to Cloud
            </Button>
          </div>
        </div>

        {/* SOP Title Card */}
        <Card className="bg-gray-900/50 border-cyan-500/30">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl text-cyan-400">{sop.title}</CardTitle>
                <div className="flex gap-2 mt-2">
                  <Badge variant="outline" className="text-cyan-300">
                    {sop.system}
                  </Badge>
                  {sop.make && (
                    <Badge variant="outline" className="text-blue-300">
                      {sop.make}
                    </Badge>
                  )}
                  {sop.model && (
                    <Badge variant="outline" className="text-purple-300">
                      {sop.model}
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-green-300">
                    {sop.component}
                  </Badge>
                </div>
              </div>
              
              <div className="text-right">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm text-gray-400">Status:</span>
                  <Badge 
                    variant={sop.status === 'approved' ? 'default' : 'destructive'}
                    className={sop.status === 'approved' ? 'bg-green-600' : ''}
                  >
                    {sop.status}
                  </Badge>
                </div>
                <div className="text-sm text-gray-400">
                  Confidence: {(sop.confidence * 100).toFixed(0)}%
                </div>
                {sop.contradictionScore > 0 && (
                  <div className="text-sm text-yellow-400">
                    Contradiction Score: {sop.contradictionScore.toFixed(2)}
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Main Content Tabs */}
        <Tabs defaultValue="procedure" className="space-y-4">
          <TabsList className="bg-gray-800/50 border border-gray-700">
            <TabsTrigger value="procedure" className="data-[state=active]:bg-gray-700">
              <FileText className="h-4 w-4 mr-2" />
              Procedure
            </TabsTrigger>
            <TabsTrigger value="safety" className="data-[state=active]:bg-gray-700">
              <Shield className="h-4 w-4 mr-2" />
              Safety
            </TabsTrigger>
            <TabsTrigger value="specs" className="data-[state=active]:bg-gray-700">
              <Wrench className="h-4 w-4 mr-2" />
              Specifications
            </TabsTrigger>
            <TabsTrigger value="evidence" className="data-[state=active]:bg-gray-700">
              <Hash className="h-4 w-4 mr-2" />
              Evidence
            </TabsTrigger>
          </TabsList>

          {/* Procedure Tab */}
          <TabsContent value="procedure">
            <Card className="bg-gray-900/50 border-gray-800">
              <CardHeader>
                <CardTitle className="text-cyan-400">Step-by-Step Procedure</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <div className="space-y-4">
                    {sop.steps.map((step) => (
                      <div key={step.number} className="border-l-2 border-cyan-500/50 pl-4">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-500 flex items-center justify-center text-cyan-400 font-bold">
                            {step.number}
                          </div>
                          <div className="flex-1">
                            <p className="text-white mb-2">{step.instruction}</p>
                            
                            {step.warnings && step.warnings.length > 0 && (
                              <div className="bg-red-900/20 border border-red-500/50 rounded p-2 mb-2">
                                {step.warnings.map((warning, idx) => (
                                  <div key={idx} className="flex items-start gap-2">
                                    <AlertTriangle className="h-4 w-4 text-red-400 mt-0.5" />
                                    <span className="text-red-300 text-sm">{warning}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                            
                            {step.refs && step.refs.length > 0 && (
                              <div className="text-xs text-gray-500">
                                References: {step.refs.join(', ')}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Safety Tab */}
          <TabsContent value="safety">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="bg-gray-900/50 border-gray-800">
                <CardHeader>
                  <CardTitle className="text-cyan-400 flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Required PPE
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {sop.ppe.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-400" />
                        <span className="text-white">{item}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-900/50 border-gray-800">
                <CardHeader>
                  <CardTitle className="text-red-400 flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Hazards
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {sop.hazards.map((hazard, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-yellow-400" />
                        <span className="text-white">{hazard}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Specifications Tab */}
          <TabsContent value="specs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="bg-gray-900/50 border-gray-800">
                <CardHeader>
                  <CardTitle className="text-cyan-400">Required Tools</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {sop.tools.map((tool, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <Wrench className="h-4 w-4 text-blue-400" />
                        <span className="text-white">{tool}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {sop.torqueSpecs && Object.keys(sop.torqueSpecs).length > 0 && (
                <Card className="bg-gray-900/50 border-gray-800">
                  <CardHeader>
                    <CardTitle className="text-cyan-400">Torque Specifications</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {Object.entries(sop.torqueSpecs).map(([key, value]) => (
                        <div key={key} className="flex justify-between">
                          <span className="text-gray-400">{key}:</span>
                          <span className="text-white font-mono">{value}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Evidence Tab */}
          <TabsContent value="evidence">
            <Card className="bg-gray-900/50 border-gray-800">
              <CardHeader>
                <CardTitle className="text-cyan-400">Evidence & Citations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-400 mb-2">Sources</h4>
                  <div className="space-y-1">
                    {sop.evidence.sources.map((source, idx) => (
                      <div key={idx} className="text-white">{source}</div>
                    ))}
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <h4 className="text-sm font-medium text-gray-400 mb-2">Hash Chain</h4>
                  <div className="space-y-1">
                    {sop.evidence.hashes.map((hash, idx) => (
                      <div key={idx} className="font-mono text-xs text-gray-500">{hash}</div>
                    ))}
                  </div>
                </div>
                
                {sop.arbitrationNotes && sop.arbitrationNotes.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="text-sm font-medium text-gray-400 mb-2">Arbitration Notes</h4>
                      <div className="space-y-1">
                        {sop.arbitrationNotes.map((note, idx) => (
                          <div key={idx} className="text-yellow-300 text-sm">{note}</div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}