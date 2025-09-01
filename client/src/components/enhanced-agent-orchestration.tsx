import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { 
  Play, 
  Square, 
  Save, 
  RotateCcw, 
  MemoryStick,
  Shield,
  Brain,
  FileText,
  Scale,
  Cog,
  Eye,
  Zap,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock
} from 'lucide-react';

interface AgentResult {
  agentName: string;
  status: 'success' | 'warning' | 'error';
  output: any;
  recommendations?: string[];
  safetyConcerns?: string[];
  timestamp: Date;
}

interface WorkflowResult {
  success: boolean;
  results: AgentResult[];
  finalSOP?: any;
  requiresLucasApproval?: boolean;
}

const agentIcons = {
  watson: MemoryStick,
  mother: Shield,
  father: Brain,
  soap: FileText,
  arbitrator: Scale,
  rotor: Cog,
  eyes: Eye,
  vectorizer: Zap
};

const agentColors = {
  watson: 'bg-blue-500/20 border-blue-500/30 text-blue-400',
  mother: 'bg-green-500/20 border-green-500/30 text-green-400',
  father: 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400',
  soap: 'bg-purple-500/20 border-purple-500/30 text-purple-400',
  arbitrator: 'bg-orange-500/20 border-orange-500/30 text-orange-400',
  rotor: 'bg-red-500/20 border-red-500/30 text-red-400',
  eyes: 'bg-cyan-500/20 border-cyan-500/30 text-cyan-400',
  vectorizer: 'bg-pink-500/20 border-pink-500/30 text-pink-400'
};

export function EnhancedAgentOrchestration() {
  const [sopRequest, setSOPRequest] = useState('');
  const [workflowResults, setWorkflowResults] = useState<WorkflowResult | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: agents } = useQuery<any[]>({
    queryKey: ['/api/agents'],
    // Enterprise: No polling - event-driven updates // MEMORY FIX: Reduced to 60 seconds to prevent bloat
  });

  // Enhanced SOP Generation Mutation
  const generateEnhancedSOP = useMutation({
    mutationFn: async (request: any) => {
      const response = await apiRequest('/api/sops/generate-enhanced', 'POST', request);
      return response;
    },
    onSuccess: (data: any) => {
      if (data.workflowResults) {
        setWorkflowResults({
          success: data.success,
          results: data.workflowResults,
          finalSOP: data.finalSOP,
          requiresLucasApproval: data.requiresLucasApproval
        });
      }
      queryClient.invalidateQueries({ queryKey: ['/api/sops'] });
    },
  });

  // Agent Control Mutations
  const spinUpAgent = useMutation({
    mutationFn: async (agentName: string) => {
      return await apiRequest(`/api/rotor/spin-up/${agentName}`, 'POST');
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/agents'] }),
  });

  const spinDownAgent = useMutation({
    mutationFn: async (agentName: string) => {
      return await apiRequest(`/api/rotor/spin-down/${agentName}`, 'POST');
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/agents'] }),
  });

  const saveSystemState = useMutation({
    mutationFn: async () => {
      return await apiRequest('/api/rotor/save-zip', 'POST');
    },
  });

  const handleGenerateEnhancedSOP = () => {
    if (!sopRequest.trim()) return;
    
    generateEnhancedSOP.mutate({
      title: sopRequest,
      industry: 'Universal',
      procedure: sopRequest,
      purpose: 'Knowledge transfer and procedure generation',
      scope: 'All industries and skill levels'
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
      case 'error': return <XCircle className="w-4 h-4 text-red-400" />;
      default: return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const formatAgentName = (type: string) => {
    const nameMap = {
      watson: 'Watson (Memory & Format)',
      mother: 'Mother (Safety Conscience)', 
      father: 'Father (Logic & Research)',
      soap: 'Soap (Primary SOP Author)',
      arbitrator: 'Enhanced Arbiter (Multi-LLM)',
      rotor: 'Rotor (System Orchestration)',
      eyes: 'Eyes (Real-time Monitoring)',
      vectorizer: 'Vector Engine'
    };
    return nameMap[type as keyof typeof nameMap] || type;
  };

  return (
    <div className="col-span-12 space-y-6">
      {/* Enhanced Agent Workflow Control */}
      <Card className="glass-panel border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-xl">
            <Cog className="w-6 h-6 text-primary" />
            <span>Enhanced Agent Orchestration</span>
            <Badge variant="outline" className="border-green-500/20 text-green-400">
              Universal Compliance Standard
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* SOP Request Input */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-300">
              Procedure Request
            </label>
            <Textarea
              value={sopRequest}
              onChange={(e) => setSOPRequest(e.target.value)}
              placeholder="Describe the professional procedure needed - from apprentice training to master-level operations"
              className="min-h-[100px] bg-black/50 border-primary/20 text-white resize-none"
            />
            <div className="flex space-x-3">
              <Button
                onClick={handleGenerateEnhancedSOP}
                disabled={!sopRequest.trim() || generateEnhancedSOP.isPending}
                className="bg-primary/20 hover:bg-primary/30 border border-primary/20"
              >
                <Play className="w-4 h-4 mr-2" />
                {generateEnhancedSOP.isPending ? 'Executing Workflow...' : 'Execute Complete Agent Workflow'}
              </Button>
              <Button
                onClick={() => saveSystemState.mutate()}
                variant="outline"
                className="border-yellow-500/20 text-yellow-400 hover:bg-yellow-500/10"
              >
                <Save className="w-4 h-4 mr-2" />
                SAVE-ZIP
              </Button>
            </div>
          </div>

          {/* Workflow Progress */}
          {generateEnhancedSOP.isPending && (
            <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
              <div className="flex items-center space-x-2 mb-3">
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                <span className="text-primary font-medium">Executing Sequential Agent Workflow</span>
              </div>
              <div className="text-sm text-gray-400">
                Watson → Father → Mother → Soap → Arbiter → Final Output
              </div>
            </div>
          )}

          {/* Workflow Results */}
          {workflowResults && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Workflow Results</h3>
                <Badge variant={workflowResults.success ? "default" : "destructive"}>
                  {workflowResults.success ? 'Success' : 'Failed'}
                </Badge>
              </div>

              {/* Lucas Approval Notice */}
              {workflowResults.requiresLucasApproval && (
                <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-400" />
                    <span className="font-medium text-yellow-400">
                      Requires Lucas Reynolds Approval
                    </span>
                  </div>
                  <p className="text-sm text-gray-300 mt-2">
                    Safety-critical procedures detected. Human oversight required before SOP finalization.
                  </p>
                </div>
              )}

              {/* Agent Results */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {workflowResults.results.map((result, index) => (
                  <Card key={index} className="glass-panel border-primary/20">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(result.status)}
                          <span className="font-medium text-white text-sm">
                            {result.agentName}
                          </span>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {result.status}
                        </Badge>
                      </div>
                      
                      {result.recommendations && (
                        <div className="space-y-1">
                          {result.recommendations.slice(0, 2).map((rec, i) => (
                            <p key={i} className="text-xs text-gray-400">
                              • {rec}
                            </p>
                          ))}
                        </div>
                      )}

                      {result.safetyConcerns && result.safetyConcerns.length > 0 && (
                        <div className="mt-3 p-2 bg-red-500/10 border border-red-500/20 rounded">
                          <p className="text-xs text-red-400 font-medium">Safety Concerns:</p>
                          {result.safetyConcerns.slice(0, 1).map((concern, i) => (
                            <p key={i} className="text-xs text-red-300">• {concern}</p>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Individual Agent Control Panel */}
      <Card className="glass-panel border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Cog className="w-5 h-5 text-primary" />
            <span>Individual Agent Control</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
            {agents?.map((agent) => {
              const Icon = agentIcons[agent.type as keyof typeof agentIcons] || Cog;
              const colorClass = agentColors[agent.type as keyof typeof agentColors] || 'bg-gray-500/20 border-gray-500/30 text-gray-400';
              
              return (
                <Card key={agent.id} className={`glass-panel cursor-pointer transition-all hover:scale-105 ${colorClass}`}>
                  <CardContent className="p-4 text-center">
                    <Icon className="w-8 h-8 mx-auto mb-2" />
                    <p className="text-xs font-medium mb-2">
                      {formatAgentName(agent.type)}
                    </p>
                    <Badge variant="outline" className={`text-xs ${
                      agent.status === 'active' ? 'border-green-500/20 text-green-400' :
                      agent.status === 'processing' ? 'border-yellow-500/20 text-yellow-400' :
                      agent.status === 'error' ? 'border-red-500/20 text-red-400' :
                      'border-gray-500/20 text-gray-400'
                    }`}>
                      {agent.status}
                    </Badge>
                    <div className="flex space-x-1 mt-3">
                      <Button
                        size="sm"
                        variant="outline"
                        className="px-2 py-1 text-xs"
                        onClick={() => spinUpAgent.mutate(agent.type)}
                        disabled={spinUpAgent.isPending}
                      >
                        <Play className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="px-2 py-1 text-xs"
                        onClick={() => spinDownAgent.mutate(agent.type)}
                        disabled={spinDownAgent.isPending}
                      >
                        <Square className="w-3 h-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Rotor Commands */}
      <Card className="glass-panel border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <RotateCcw className="w-5 h-5 text-primary" />
            <span>Rotor System Commands</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button
              variant="outline"
              className="border-blue-500/20 text-blue-400 hover:bg-blue-500/10"
              onClick={() => saveSystemState.mutate()}
              disabled={saveSystemState.isPending}
            >
              <Save className="w-4 h-4 mr-2" />
              SAVE-ZIP
            </Button>
            <Button
              variant="outline"
              className="border-green-500/20 text-green-400 hover:bg-green-500/10"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              BOOT
            </Button>
            <Button
              variant="outline"
              className="border-purple-500/20 text-purple-400 hover:bg-purple-500/10"
            >
              <Play className="w-4 h-4 mr-2" />
              REPLAY-TASK
            </Button>
            <Button
              variant="outline"
              className="border-orange-500/20 text-orange-400 hover:bg-orange-500/10"
            >
              <Eye className="w-4 h-4 mr-2" />
              MONITOR
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}