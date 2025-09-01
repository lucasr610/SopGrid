import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { motion } from 'framer-motion';
import { 
  FileText, Upload, Loader2, ChevronLeft, Download, 
  Shield, AlertTriangle, CheckCircle, Brain, Zap 
} from 'lucide-react';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQuery } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { SopgridHeader } from '@/components/sopgrid-header';

export function SopGenerator() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedIndustry, setSelectedIndustry] = useState('rv');
  const [sopTitle, setSopTitle] = useState('');
  const [sopDescription, setSopDescription] = useState('');
  const [selectedStandards, setSelectedStandards] = useState<string[]>([]);

  const { data: existingSops } = useQuery<any[]>({
    queryKey: ['/api/sops']
  });

  const generateSop = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/sops/generate-enhanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: data.title,
          description: data.description,
          industry: data.industry,
          procedure: data.description,
          complianceStandards: data.standards,
          requiresArbitration: data.standards.includes('osha') || data.standards.includes('fda')
        })
      });
      if (!response.ok) throw new Error('Failed to generate SOP');
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/sops'] });
      toast({
        title: 'SOP Generated',
        description: 'Your SOP has been generated and validated successfully.',
      });
      setSopTitle('');
      setSopDescription('');
      setSelectedStandards([]);
    }
  });

  const standards = [
    { value: 'osha', label: 'OSHA', icon: Shield },
    { value: 'epa', label: 'EPA', icon: AlertTriangle },
    { value: 'dot', label: 'DOT', icon: Zap },
    { value: 'fda', label: 'FDA', icon: Brain },
    { value: 'nfpa', label: 'NFPA', icon: Shield }
  ];

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Corporate Background */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url(/document-bg.png)'
        }}
      >
        <div className="absolute inset-0 bg-black/20" />
      </div>
      
      {/* Grid Overlay */}
      <div className="absolute inset-0 z-10">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,102,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,102,255,0.03)_1px,transparent_1px)] bg-[size:50px_50px]" />
      </div>
      
      {/* Header */}
      <SopgridHeader />
      
      <div className="relative z-20 p-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-4">
            <Shield className="w-8 h-8 text-blue-500" />
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 via-blue-500 to-cyan-400 bg-clip-text text-transparent">
                Universal Procedure Generator
              </h1>
              <p className="text-gray-400">Multi-industry compliant procedures for all skill levels</p>
            </div>
          </div>
        </motion.div>

        <Tabs defaultValue="generate" className="space-y-6">
          <TabsList className="bg-transparent border border-blue-600/30">
            <TabsTrigger value="generate" className="data-[state=active]:bg-blue-500/20">Generate New</TabsTrigger>
            <TabsTrigger value="existing" className="data-[state=active]:bg-blue-500/20">Existing SOPs</TabsTrigger>
          </TabsList>

          <TabsContent value="generate">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <Card className="bg-transparent backdrop-blur-md border-blue-600/30">
                <CardHeader>
                  <CardTitle className="text-blue-400">Generate New SOP</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <Label className="text-cyan-300">Industry</Label>
                    <Select value={selectedIndustry} onValueChange={setSelectedIndustry}>
                      <SelectTrigger className="bg-black/20 border-cyan-500/50 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-black/90 border-cyan-500/30">
                        <SelectItem value="training">Professional Training</SelectItem>
                        <SelectItem value="automotive">Automotive Repair</SelectItem>
                        <SelectItem value="rv">RV Systems</SelectItem>
                        <SelectItem value="marine">Marine Service</SelectItem>
                        <SelectItem value="welding">Welding & Fabrication</SelectItem>
                        <SelectItem value="atv">ATV/Motorcycle</SelectItem>
                        <SelectItem value="hvac">HVAC</SelectItem>
                        <SelectItem value="manufacturing">Manufacturing</SelectItem>
                        <SelectItem value="local_shop">Local Shop Operations</SelectItem>
                        <SelectItem value="electrical">Electrical</SelectItem>
                        <SelectItem value="plumbing">Plumbing</SelectItem>
                        <SelectItem value="automotive">Automotive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-cyan-300">SOP Title</Label>
                    <Input
                      value={sopTitle}
                      onChange={(e) => setSopTitle(e.target.value)}
                      placeholder="e.g., Engine Diagnostics, Welding Safety, HVAC Troubleshooting"
                      className="bg-black/20 border-cyan-500/50 text-white placeholder:text-gray-500"
                    />
                  </div>

                  <div>
                    <Label className="text-cyan-300">Description</Label>
                    <Textarea
                      value={sopDescription}
                      onChange={(e) => setSopDescription(e.target.value)}
                      placeholder="Describe the task or procedure - from simple instructions to complex operations..."
                      rows={6}
                      className="bg-black/20 border-cyan-500/50 text-white placeholder:text-gray-500"
                    />
                  </div>

                  <div>
                    <Label className="text-cyan-300 mb-3 block">Compliance Standards</Label>
                    <div className="grid grid-cols-5 gap-3">
                      {standards.map((standard) => {
                        const Icon = standard.icon;
                        const isSelected = selectedStandards.includes(standard.value);
                        return (
                          <Button
                            key={standard.value}
                            type="button"
                            variant={isSelected ? "default" : "outline"}
                            className={isSelected 
                              ? "bg-cyan-500/20 text-cyan-300 border-cyan-500" 
                              : "text-gray-400 border-cyan-500/30 hover:bg-cyan-500/10"
                            }
                            onClick={() => {
                              if (isSelected) {
                                setSelectedStandards(prev => prev.filter(s => s !== standard.value));
                              } else {
                                setSelectedStandards(prev => [...prev, standard.value]);
                              }
                            }}
                          >
                            <Icon className="w-4 h-4 mr-2" />
                            {standard.label}
                          </Button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="pt-4">
                    <Button
                      onClick={() => generateSop.mutate({
                        title: sopTitle,
                        description: sopDescription,
                        industry: selectedIndustry,
                        standards: selectedStandards
                      })}
                      disabled={!sopTitle || !sopDescription || generateSop.isPending}
                      className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500"
                    >
                      {generateSop.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Generating SOP...
                        </>
                      ) : (
                        <>
                          <FileText className="w-4 h-4 mr-2" />
                          Generate SOP
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          <TabsContent value="existing">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {existingSops?.map((sop, index) => (
                <motion.div
                  key={sop.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="bg-transparent backdrop-blur-md border-cyan-500/30 hover:border-cyan-400/50 transition-all">
                    <CardHeader>
                      <CardTitle className="text-cyan-300 flex items-center justify-between">
                        <span className="truncate">{sop.title}</span>
                        <Badge className={
                          sop.validationStatus === 'approved'
                            ? 'bg-green-500/20 text-green-300 border-green-500/50'
                            : 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50'
                        }>
                          {sop.validationStatus}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          <Shield className="w-4 h-4" />
                          <span>{sop.complianceStandards?.join(', ') || 'No standards'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          <FileText className="w-4 h-4" />
                          <span className="capitalize">{sop.industry}</span>
                        </div>
                        <div className="flex gap-2 pt-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 text-cyan-300 border-cyan-500/50 hover:bg-cyan-500/20"
                          >
                            <FileText className="w-3 h-3 mr-1" />
                            View
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-cyan-300 border-cyan-500/50 hover:bg-cyan-500/20"
                          >
                            <Download className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}