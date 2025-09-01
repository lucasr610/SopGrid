import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, CheckCircle, Clock, Wrench, ChevronRight, ChevronDown } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface DiagnosticStep {
  id: string;
  description: string;
  type: 'check' | 'action' | 'test';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  children?: DiagnosticStep[];
}

interface TroubleshootingTree {
  id: string;
  title: string;
  equipment: string;
  failureDescription: string;
  rootCause?: string;
  steps: DiagnosticStep[];
  status: 'active' | 'completed' | 'escalated';
  createdAt: string;
}

export default function Troubleshooting() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('generate');
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  
  // Form state for generating new troubleshooting tree
  const [formData, setFormData] = useState({
    equipment: '',
    failureDescription: '',
    symptoms: '',
    context: ''
  });

  // Generate troubleshooting tree mutation
  const generateTreeMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return await apiRequest('/api/troubleshooting/generate', 'POST', data);
    },
    onSuccess: (tree: any) => {
      toast({
        title: "Troubleshooting Tree Generated",
        description: `Generated diagnostic tree for ${tree?.equipment || 'equipment'}`,
      });
      setActiveTab('tree');
    },
    onError: (error) => {
      toast({
        title: "Generation Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Query for existing troubleshooting trees
  const { data: trees = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/troubleshooting/trees'],
    retry: false,
  });

  const toggleStepExpansion = (stepId: string) => {
    const newExpanded = new Set(expandedSteps);
    if (newExpanded.has(stepId)) {
      newExpanded.delete(stepId);
    } else {
      newExpanded.add(stepId);
    }
    setExpandedSteps(newExpanded);
  };

  const renderDiagnosticStep = (step: DiagnosticStep, level = 0) => {
    const hasChildren = step.children && step.children.length > 0;
    const isExpanded = expandedSteps.has(step.id);

    return (
      <div key={step.id} className={`border-l-2 pl-4 ${level > 0 ? 'ml-4' : ''}`}>
        <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
          {hasChildren && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleStepExpansion(step.id)}
              data-testid={`expand-step-${step.id}`}
            >
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </Button>
          )}
          
          <div className="flex-1">
            <div className="flex items-center gap-2">
              {step.type === 'check' && <CheckCircle className="w-4 h-4 text-blue-500" />}
              {step.type === 'action' && <Wrench className="w-4 h-4 text-orange-500" />}
              {step.type === 'test' && <AlertTriangle className="w-4 h-4 text-yellow-500" />}
              <span className="font-medium">{step.description}</span>
              <Badge variant={
                step.status === 'completed' ? 'default' :
                step.status === 'failed' ? 'destructive' :
                step.status === 'in_progress' ? 'secondary' : 'outline'
              }>
                {step.status}
              </Badge>
            </div>
          </div>
        </div>
        
        {hasChildren && isExpanded && (
          <div className="mt-2 space-y-2">
            {step.children!.map(child => renderDiagnosticStep(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Troubleshooting & Diagnostics</h1>
          <p className="text-muted-foreground mt-2">
            Generate intelligent diagnostic trees and step-by-step troubleshooting guides
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Wrench className="w-6 h-6 text-primary" />
          <span className="text-sm text-muted-foreground">SOPGRID Diagnostics</span>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="generate" data-testid="tab-generate">Generate Tree</TabsTrigger>
          <TabsTrigger value="tree" data-testid="tab-tree">Active Trees</TabsTrigger>
          <TabsTrigger value="history" data-testid="tab-history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-500" />
                Generate Troubleshooting Tree
              </CardTitle>
              <CardDescription>
                Describe the equipment failure and get an intelligent diagnostic tree with step-by-step resolution
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="equipment">Equipment/System</Label>
                  <Input
                    id="equipment"
                    placeholder="e.g., RV Generator, Water Heater, Solar Panel"
                    value={formData.equipment}
                    onChange={(e) => setFormData({ ...formData, equipment: e.target.value })}
                    data-testid="input-equipment"
                  />
                </div>
                <div>
                  <Label htmlFor="context">Context/Environment</Label>
                  <Input
                    id="context"
                    placeholder="e.g., 2022 Winnebago, Cold weather, High usage"
                    value={formData.context}
                    onChange={(e) => setFormData({ ...formData, context: e.target.value })}
                    data-testid="input-context"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="failure">Failure Description</Label>
                <Textarea
                  id="failure"
                  placeholder="Describe what's not working, when it started, and any error messages..."
                  value={formData.failureDescription}
                  onChange={(e) => setFormData({ ...formData, failureDescription: e.target.value })}
                  className="min-h-[100px]"
                  data-testid="textarea-failure"
                />
              </div>
              
              <div>
                <Label htmlFor="symptoms">Symptoms & Observations</Label>
                <Textarea
                  id="symptoms"
                  placeholder="List all symptoms, sounds, behaviors, error codes you've observed..."
                  value={formData.symptoms}
                  onChange={(e) => setFormData({ ...formData, symptoms: e.target.value })}
                  className="min-h-[80px]"
                  data-testid="textarea-symptoms"
                />
              </div>

              <Button 
                onClick={() => generateTreeMutation.mutate(formData)}
                disabled={!formData.equipment || !formData.failureDescription || generateTreeMutation.isPending}
                className="w-full"
                data-testid="button-generate"
              >
                {generateTreeMutation.isPending ? (
                  <>
                    <Clock className="w-4 h-4 mr-2 animate-spin" />
                    Generating Diagnostic Tree...
                  </>
                ) : (
                  <>
                    <Wrench className="w-4 h-4 mr-2" />
                    Generate Troubleshooting Tree
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tree" className="space-y-6">
          {generateTreeMutation.data && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  {generateTreeMutation.data.equipment} - Diagnostic Tree
                </CardTitle>
                <CardDescription>
                  {generateTreeMutation.data.failureDescription}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {generateTreeMutation.data.rootCause && (
                  <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-yellow-500" />
                      <span className="font-medium">Probable Root Cause:</span>
                    </div>
                    <p className="mt-1 text-sm">{generateTreeMutation.data.rootCause}</p>
                  </div>
                )}
                
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-muted-foreground">DIAGNOSTIC STEPS</h4>
                  {generateTreeMutation.data.steps?.map((step: DiagnosticStep) => 
                    renderDiagnosticStep(step)
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Troubleshooting History</CardTitle>
              <CardDescription>
                View past diagnostic trees and their resolution status
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Clock className="w-6 h-6 animate-spin" />
                  <span className="ml-2">Loading history...</span>
                </div>
              ) : trees.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Wrench className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No troubleshooting trees generated yet</p>
                  <p className="text-sm">Generate your first diagnostic tree to get started</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {trees.map((tree: TroubleshootingTree) => (
                    <div key={tree.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <h4 className="font-medium">{tree.equipment}</h4>
                        <p className="text-sm text-muted-foreground">{tree.failureDescription}</p>
                        <p className="text-xs text-muted-foreground">{new Date(tree.createdAt).toLocaleDateString()}</p>
                      </div>
                      <Badge variant={tree.status === 'completed' ? 'default' : 'secondary'}>
                        {tree.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}