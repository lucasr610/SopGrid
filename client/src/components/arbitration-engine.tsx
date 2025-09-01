import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { 
  Scale, 
  Gavel, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  User, 
  Bot,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Shield,
  Eye
} from 'lucide-react';

interface ArbitrationCase {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'in_review' | 'resolved' | 'escalated';
  createdAt: Date;
  resolvedAt?: Date;
  createdBy: 'system' | 'agent' | 'user';
  assignedTo?: string;
  category: 'safety' | 'compliance' | 'technical' | 'quality';
  aiRecommendation?: string;
  humanDecision?: string;
  confidence: number;
  evidence: string[];
  relatedSOPId?: string;
}

interface ArbitrationVote {
  agentName: string;
  recommendation: 'approve' | 'reject' | 'modify';
  confidence: number;
  reasoning: string;
  timestamp: Date;
}

export function ArbitrationEngine() {
  const [selectedCase, setSelectedCase] = useState<string | null>(null);
  const [humanDecision, setHumanDecision] = useState('');
  const [newCaseTitle, setNewCaseTitle] = useState('');
  const [newCaseDescription, setNewCaseDescription] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const queryClient = useQueryClient();

  // Mock arbitration cases data
  const arbitrationCases: ArbitrationCase[] = [
    {
      id: 'case-001',
      title: 'Electrical Safety Procedure Conflict',
      description: 'Mother agent flagged electrical shutdown procedure as requiring Lucas Reynolds approval, but Father agent suggests it meets standard safety requirements.',
      priority: 'critical',
      status: 'pending',
      createdAt: new Date('2025-08-03T02:00:00Z'),
      createdBy: 'agent',
      category: 'safety',
      aiRecommendation: 'Require human approval due to electrical hazards and emergency nature of procedure',
      confidence: 95,
      evidence: [
        'Keywords detected: electrical, emergency, shutdown',
        'OSHA standards 29 CFR 1910.147 applicable',
        'Multi-agent consensus: 2/3 recommend human oversight'
      ],
      relatedSOPId: 'RV-MAINT-ORCL-ELEC-CTRL-873'
    },
    {
      id: 'case-002',
      title: 'SOP Format Inconsistency',
      description: 'Watson agent detected format deviation from Lucas Reynolds standards in generated SOP',
      priority: 'medium',
      status: 'in_review',
      createdAt: new Date('2025-08-03T01:30:00Z'),
      createdBy: 'agent',
      assignedTo: 'Lucas Reynolds',
      category: 'quality',
      aiRecommendation: 'Approve with minor formatting corrections',
      confidence: 78,
      evidence: [
        'SOP ID format correct: RV-MAINT-ORCL-HVAC-SAFE-425',
        'Minor section header formatting deviation',
        'Content technically accurate per Father agent'
      ]
    },
    {
      id: 'case-003',
      title: 'Compliance Standard Interpretation',
      description: 'Enhanced Arbiter detected conflicting interpretations of NFPA 1192 requirements between agents',
      priority: 'high',
      status: 'resolved',
      createdAt: new Date('2025-08-03T01:00:00Z'),
      resolvedAt: new Date('2025-08-03T01:45:00Z'),
      createdBy: 'system',
      assignedTo: 'Lucas Reynolds',
      category: 'compliance',
      aiRecommendation: 'Escalate to compliance expert for NFPA interpretation',
      humanDecision: 'Approved with additional safety notes per NFPA 1192 Section 4.3.2',
      confidence: 85,
      evidence: [
        'NFPA 1192 Section 4.3.2 requirements',
        'Industry best practices analysis',
        'Agent consensus: 3/3 require clarification'
      ]
    }
  ];

  // Mock arbitration votes for selected case
  const getArbitrationVotes = (caseId: string): ArbitrationVote[] => {
    if (caseId === 'case-001') {
      return [
        {
          agentName: 'Mother',
          recommendation: 'reject',
          confidence: 95,
          reasoning: 'Safety-critical procedure with electrical hazards requires human oversight per OSHA 29 CFR 1910.147',
          timestamp: new Date('2025-08-03T02:01:00Z')
        },
        {
          agentName: 'Father',
          recommendation: 'modify',
          confidence: 72,
          reasoning: 'Procedure technically sound but requires additional safety documentation',
          timestamp: new Date('2025-08-03T02:02:00Z')
        },
        {
          agentName: 'Enhanced Arbiter',
          recommendation: 'reject',
          confidence: 92,
          reasoning: 'Multi-LLM consensus indicates high risk without human validation',
          timestamp: new Date('2025-08-03T02:03:00Z')
        }
      ];
    }
    return [];
  };

  const resolveCase = useMutation({
    mutationFn: async (data: { caseId: string; decision: string; reasoning: string }) => {
      return await apiRequest(`/api/arbitration/${data.caseId}/resolve`, 'POST', {
        decision: data.decision,
        reasoning: data.reasoning
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/arbitration'] });
      setSelectedCase(null);
      setHumanDecision('');
    },
  });

  const createCase = useMutation({
    mutationFn: async (data: { title: string; description: string; category: string }) => {
      return await apiRequest('/api/arbitration/cases', 'POST', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/arbitration'] });
      setNewCaseTitle('');
      setNewCaseDescription('');
    },
  });

  const handleResolveCase = () => {
    if (!selectedCase || !humanDecision.trim()) return;
    
    resolveCase.mutate({
      caseId: selectedCase,
      decision: humanDecision,
      reasoning: humanDecision
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'border-red-500/30 text-red-400';
      case 'high': return 'border-orange-500/30 text-orange-400';
      case 'medium': return 'border-yellow-500/30 text-yellow-400';
      case 'low': return 'border-green-500/30 text-green-400';
      default: return 'border-gray-500/30 text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4 text-yellow-400" />;
      case 'in_review': return <Eye className="w-4 h-4 text-blue-400" />;
      case 'resolved': return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'escalated': return <AlertTriangle className="w-4 h-4 text-red-400" />;
      default: return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const filteredCases = filterStatus === 'all' 
    ? arbitrationCases 
    : arbitrationCases.filter(c => c.status === filterStatus);

  const selectedCaseData = arbitrationCases.find(c => c.id === selectedCase);
  const votes = selectedCase ? getArbitrationVotes(selectedCase) : [];

  return (
    <div className="grid grid-cols-12 gap-6">
      {/* Case List */}
      <div className="col-span-12 lg:col-span-4 space-y-4">
        <Card className="glass-panel border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Scale className="w-5 h-5 text-primary" />
              <span>Arbitration Cases</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="bg-black/50 border-primary/20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cases</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_review">In Review</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="escalated">Escalated</SelectItem>
              </SelectContent>
            </Select>

            <div className="space-y-3">
              {filteredCases.map((case_) => (
                <Card 
                  key={case_.id} 
                  className={`glass-panel cursor-pointer transition-all hover:border-primary/40 ${
                    selectedCase === case_.id ? 'border-primary/40 bg-primary/5' : 'border-primary/20'
                  }`}
                  onClick={() => setSelectedCase(case_.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(case_.status)}
                        <span className="font-medium text-white text-sm">{case_.title}</span>
                      </div>
                      <Badge variant="outline" className={getPriorityColor(case_.priority)}>
                        {case_.priority}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-400 line-clamp-2">{case_.description}</p>
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center space-x-2 text-xs text-gray-500">
                        {case_.createdBy === 'agent' ? <Bot className="w-3 h-3" /> : <User className="w-3 h-3" />}
                        <span>{case_.category}</span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {case_.createdAt.toLocaleDateString()}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Case Details */}
      <div className="col-span-12 lg:col-span-8 space-y-4">
        {selectedCaseData ? (
          <>
            {/* Case Overview */}
            <Card className="glass-panel border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Gavel className="w-5 h-5 text-primary" />
                    <span>{selectedCaseData.title}</span>
                  </div>
                  <Badge variant="outline" className={getPriorityColor(selectedCaseData.priority)}>
                    {selectedCaseData.priority} priority
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-300">{selectedCaseData.description}</p>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <span className="text-xs text-gray-500">Status</span>
                    <div className="flex items-center space-x-2 mt-1">
                      {getStatusIcon(selectedCaseData.status)}
                      <span className="text-sm text-white">{selectedCaseData.status}</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">Category</span>
                    <p className="text-sm text-white mt-1">{selectedCaseData.category}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">Confidence</span>
                    <p className="text-sm text-white mt-1">{selectedCaseData.confidence}%</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">Assigned To</span>
                    <p className="text-sm text-white mt-1">{selectedCaseData.assignedTo || 'Unassigned'}</p>
                  </div>
                </div>

                {selectedCaseData.aiRecommendation && (
                  <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                    <h4 className="font-medium text-blue-400 mb-2">AI Recommendation</h4>
                    <p className="text-sm text-gray-300">{selectedCaseData.aiRecommendation}</p>
                  </div>
                )}

                {selectedCaseData.evidence.length > 0 && (
                  <div>
                    <h4 className="font-medium text-white mb-2">Evidence</h4>
                    <ul className="space-y-1">
                      {selectedCaseData.evidence.map((evidence, index) => (
                        <li key={index} className="text-sm text-gray-400 flex items-start space-x-2">
                          <span className="text-primary">•</span>
                          <span>{evidence}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Agent Votes */}
            {votes.length > 0 && (
              <Card className="glass-panel border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Bot className="w-5 h-5 text-primary" />
                    <span>Agent Recommendations</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {votes.map((vote, index) => (
                      <div key={index} className="flex items-start space-x-4 p-4 bg-black/30 rounded-lg">
                        <div className="flex-shrink-0">
                          {vote.recommendation === 'approve' ? (
                            <ThumbsUp className="w-5 h-5 text-green-400" />
                          ) : vote.recommendation === 'reject' ? (
                            <ThumbsDown className="w-5 h-5 text-red-400" />
                          ) : (
                            <MessageSquare className="w-5 h-5 text-yellow-400" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-white">{vote.agentName}</span>
                            <div className="flex items-center space-x-2">
                              <Badge variant="outline" className={
                                vote.recommendation === 'approve' ? 'text-green-400 border-green-500/20' :
                                vote.recommendation === 'reject' ? 'text-red-400 border-red-500/20' :
                                'text-yellow-400 border-yellow-500/20'
                              }>
                                {vote.recommendation}
                              </Badge>
                              <span className="text-xs text-gray-500">{vote.confidence}%</span>
                            </div>
                          </div>
                          <p className="text-sm text-gray-300">{vote.reasoning}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Human Decision */}
            {selectedCaseData.status === 'pending' || selectedCaseData.status === 'in_review' ? (
              <Card className="glass-panel border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Shield className="w-5 h-5 text-primary" />
                    <span>Human Decision Required</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    value={humanDecision}
                    onChange={(e) => setHumanDecision(e.target.value)}
                    placeholder="Enter your decision and reasoning..."
                    className="min-h-[100px] bg-black/50 border-primary/20 text-white"
                  />
                  <div className="flex space-x-3">
                    <Button
                      onClick={handleResolveCase}
                      disabled={!humanDecision.trim() || resolveCase.isPending}
                      className="bg-green-500/20 hover:bg-green-500/30 border border-green-500/20 text-green-400"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Approve & Resolve
                    </Button>
                    <Button
                      variant="outline"
                      className="border-red-500/20 text-red-400 hover:bg-red-500/10"
                    >
                      <AlertTriangle className="w-4 h-4 mr-2" />
                      Reject
                    </Button>
                    <Button
                      variant="outline"
                      className="border-yellow-500/20 text-yellow-400 hover:bg-yellow-500/10"
                    >
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Request Modification
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : selectedCaseData.humanDecision && (
              <Card className="glass-panel border-green-500/20">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-green-400">
                    <CheckCircle className="w-5 h-5" />
                    <span>Resolved Decision</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-300">{selectedCaseData.humanDecision}</p>
                  <p className="text-xs text-gray-500 mt-2">
                    Resolved on {selectedCaseData.resolvedAt?.toLocaleString()}
                  </p>
                </CardContent>
              </Card>
            )}
          </>
        ) : (
          <Card className="glass-panel border-primary/20">
            <CardContent className="p-12 text-center">
              <Scale className="w-16 h-16 text-primary mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium text-white mb-2">No Case Selected</h3>
              <p className="text-gray-400">Select a case from the list to view details and make decisions</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}