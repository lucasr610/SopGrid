import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { 
  AlertTriangle, 
  Users, 
  Shield, 
  CheckCircle, 
  Clock, 
  User, 
  FileText,
  Zap,
  Eye,
  Wrench,
  BookOpen
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface HITLDecision {
  id: string;
  type: 'arbiter_flag' | 'data_gathering' | 'safety_verification';
  status: 'pending' | 'in_review' | 'escalated' | 'approved' | 'rejected';
  priority: 'low' | 'medium' | 'high' | 'critical';
  sopId?: string;
  originalQuestion: string;
  conflictingOptions: string[];
  recommendedAction: string;
  reviewChain: any[];
  finalDecision?: string;
  decisionMaker?: string;
  createdAt: string;
  updatedAt: string;
}

interface DataGatheringRequest {
  id: string;
  sopId: string;
  step: string;
  dataNeeded: Array<{
    type: string;
    description: string;
    safetyProcedure: string;
    expectedRange?: string;
    tools: string[];
  }>;
  assignedTech: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  collectedData: any[];
  createdAt: string;
}

export default function HITLSystem() {
  const [selectedDecision, setSelectedDecision] = useState<HITLDecision | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [reviewDecision, setReviewDecision] = useState("");
  const [reviewerRole, setReviewerRole] = useState("new_tech");
  const [confidence, setConfidence] = useState(80);
  
  // Data gathering states
  const [dataValue, setDataValue] = useState("");
  const [dataUnit, setDataUnit] = useState("");
  const [dataNotes, setDataNotes] = useState("");
  const [selectedDataRequest, setSelectedDataRequest] = useState<DataGatheringRequest | null>(null);

  const { toast } = useToast();

  // Fetch HITL decisions
  const { data: decisions = [] } = useQuery({
    queryKey: ["/api/hitl/decisions"],
    // Enterprise: Event-driven updates - no polling
  });

  // Fetch data gathering requests
  const { data: dataRequests = [] } = useQuery({
    queryKey: ["/api/hitl/data-gathering"],
    // Enterprise: Event-driven updates - no polling
  });

  // Submit review mutation
  const submitReview = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("/api/hitl/review", "POST", data);
    },
    onSuccess: () => {
      toast({
        title: "Review Submitted",
        description: "Your review has been submitted successfully",
      });
      setSelectedDecision(null);
      setReviewNotes("");
      queryClient.invalidateQueries({ queryKey: ["/api/hitl/decisions"] });
    },
    onError: (error) => {
      toast({
        title: "Review Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    },
  });

  // Submit collected data mutation
  const submitData = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("/api/hitl/submit-data", "POST", data);
    },
    onSuccess: () => {
      toast({
        title: "Data Submitted",
        description: "Your data has been collected successfully",
      });
      setDataValue("");
      setDataUnit("");
      setDataNotes("");
      queryClient.invalidateQueries({ queryKey: ["/api/hitl/data-gathering"] });
    },
    onError: (error) => {
      toast({
        title: "Data Submission Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    },
  });

  const handleReviewSubmit = () => {
    if (!selectedDecision || !reviewDecision) return;

    submitReview.mutate({
      hitlId: selectedDecision.id,
      reviewerId: "current_user", // Would come from auth context
      reviewerRole,
      decision: reviewDecision,
      notes: reviewNotes,
      confidence: confidence / 100
    });
  };

  const handleDataSubmit = (requestId: string, dataType: string) => {
    if (!dataValue) return;

    submitData.mutate({
      requestId,
      type: dataType,
      value: dataValue,
      unit: dataUnit,
      notes: dataNotes,
      collectorId: "current_user" // Would come from auth context
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'secondary';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'default';
      case 'rejected': return 'destructive';
      case 'pending': return 'secondary';
      case 'in_review': return 'secondary';
      case 'escalated': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-foreground">HITL System</h1>
        <p className="text-muted-foreground">
          Human-In-The-Loop: Decision Review & Data Gathering
        </p>
      </div>

      <Tabs defaultValue="decisions" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="decisions">Decision Review</TabsTrigger>
          <TabsTrigger value="data-gathering">Data Gathering</TabsTrigger>
          <TabsTrigger value="guidance">New Tech Guidance</TabsTrigger>
        </TabsList>

        <TabsContent value="decisions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Pending HITL Decisions
              </CardTitle>
              <CardDescription>
                Review flagged decisions from the arbiter system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {(decisions as HITLDecision[]).map((decision: HITLDecision) => (
                  <Card key={decision.id} className="border-l-4 border-l-orange-500">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge variant={getPriorityColor(decision.priority)}>
                              {decision.priority}
                            </Badge>
                            <Badge variant={getStatusColor(decision.status)}>
                              {decision.status}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {decision.reviewChain.length} reviews
                            </span>
                          </div>
                          <p className="font-medium">{decision.originalQuestion}</p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedDecision(decision)}
                        >
                          Review
                        </Button>
                      </div>
                      
                      <div className="text-sm text-muted-foreground mb-2">
                        <strong>Conflicting Options:</strong>
                      </div>
                      <div className="space-y-1 mb-3">
                        {decision.conflictingOptions.map((option, idx) => (
                          <div key={idx} className="text-sm bg-muted p-2 rounded">
                            {option}
                          </div>
                        ))}
                      </div>
                      
                      <div className="text-sm">
                        <strong>Recommended Action:</strong>
                        <p className="mt-1 text-muted-foreground">{decision.recommendedAction}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                {(decisions as HITLDecision[]).length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500" />
                    No pending decisions - all clear!
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {selectedDecision && (
            <Card>
              <CardHeader>
                <CardTitle>Review Decision: {selectedDecision.id}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Your Role</Label>
                    <Select value={reviewerRole} onValueChange={setReviewerRole}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new_tech">New Technician</SelectItem>
                        <SelectItem value="senior_tech">Senior Technician</SelectItem>
                        <SelectItem value="master">Master Technician</SelectItem>
                        <SelectItem value="admin">Administrator</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Decision</Label>
                    <Select value={reviewDecision} onValueChange={setReviewDecision}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="approve">Approve</SelectItem>
                        <SelectItem value="reject">Reject</SelectItem>
                        <SelectItem value="escalate">Escalate</SelectItem>
                        <SelectItem value="request_data">Request More Data</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Confidence Level: {confidence}%</Label>
                  <div className="px-3">
                    <Progress value={confidence} className="w-full" />
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={confidence}
                      onChange={(e) => setConfidence(parseInt(e.target.value))}
                      className="w-full mt-2"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Review Notes</Label>
                  <Textarea
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    placeholder="Explain your decision and reasoning..."
                    rows={4}
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleReviewSubmit}
                    disabled={!reviewDecision || submitReview.isPending}
                  >
                    Submit Review
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setSelectedDecision(null)}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="data-gathering" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Data Gathering Requests
              </CardTitle>
              <CardDescription>
                Collect real-world data using humans as multi-sensors
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {(dataRequests as DataGatheringRequest[]).map((request: DataGatheringRequest) => (
                  <Card key={request.id} className="border-l-4 border-l-blue-500">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <Badge variant={getStatusColor(request.status)}>
                            {request.status}
                          </Badge>
                          <p className="font-medium mt-1">Step: {request.step}</p>
                          <p className="text-sm text-muted-foreground">
                            Assigned to: {request.assignedTech}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedDataRequest(request)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Button>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="text-sm">
                          <strong>Data Needed:</strong>
                        </div>
                        {request.dataNeeded.map((data, idx) => (
                          <div key={idx} className="bg-muted p-3 rounded space-y-2">
                            <div className="flex items-center gap-2">
                              <Wrench className="w-4 h-4" />
                              <span className="font-medium">{data.type}</span>
                            </div>
                            <p className="text-sm">{data.description}</p>
                            <div className="text-xs text-muted-foreground">
                              Tools: {data.tools.join(', ')}
                              {data.expectedRange && ` | Expected: ${data.expectedRange}`}
                            </div>
                            
                            {request.status === 'pending' && (
                              <div className="mt-3 space-y-2">
                                <div className="flex gap-2">
                                  <Input
                                    placeholder="Value"
                                    value={dataValue}
                                    onChange={(e) => setDataValue(e.target.value)}
                                  />
                                  <Input
                                    placeholder="Unit"
                                    value={dataUnit}
                                    onChange={(e) => setDataUnit(e.target.value)}
                                    className="w-24"
                                  />
                                  <Button
                                    size="sm"
                                    onClick={() => handleDataSubmit(request.id, data.type)}
                                    disabled={!dataValue || submitData.isPending}
                                  >
                                    Submit
                                  </Button>
                                </div>
                                <Input
                                  placeholder="Notes (optional)"
                                  value={dataNotes}
                                  onChange={(e) => setDataNotes(e.target.value)}
                                />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      
                      {request.collectedData.length > 0 && (
                        <div className="mt-3">
                          <div className="text-sm font-medium mb-2">Collected Data:</div>
                          <div className="space-y-1">
                            {request.collectedData.map((data, idx) => (
                              <div key={idx} className="flex justify-between text-sm bg-green-50 dark:bg-green-900/20 p-2 rounded">
                                <span>{data.type}: {data.value} {data.unit}</span>
                                <Badge variant={data.verificationStatus === 'verified' ? 'default' : 'destructive'}>
                                  {data.verificationStatus}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
                
                {(dataRequests as DataGatheringRequest[]).length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Eye className="w-12 h-12 mx-auto mb-3" />
                    No data gathering requests pending
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {selectedDataRequest && (
            <Card>
              <CardHeader>
                <CardTitle>Safety Procedures for Data Collection</CardTitle>
              </CardHeader>
              <CardContent>
                {selectedDataRequest.dataNeeded.map((data, idx) => (
                  <div key={idx} className="mb-6">
                    <h4 className="font-semibold flex items-center gap-2 mb-2">
                      <Shield className="w-4 h-4 text-red-500" />
                      {data.type} - Safety Procedure
                    </h4>
                    <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded border-l-4 border-l-red-500">
                      <div className="whitespace-pre-wrap text-sm">
                        {data.safetyProcedure}
                      </div>
                    </div>
                  </div>
                ))}
                <Button
                  variant="outline"
                  onClick={() => setSelectedDataRequest(null)}
                  className="mt-4"
                >
                  Close
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="guidance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                New Technician Guidance
              </CardTitle>
              <CardDescription>
                Get guidance on when to seek HITL assistance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded border border-blue-200 dark:border-blue-800">
                <h4 className="font-semibold mb-2">When to Seek HITL Assistance:</h4>
                <ul className="space-y-1 text-sm">
                  <li>• Conflicting information from different sources</li>
                  <li>• Safety concerns or unusual readings</li>
                  <li>• Unfamiliar procedures or equipment</li>
                  <li>• System contradictions above threshold</li>
                  <li>• Customer-critical decisions</li>
                </ul>
              </div>

              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded border border-green-200 dark:border-green-800">
                <h4 className="font-semibold mb-2">Review Chain Process:</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    <span><strong>New Tech:</strong> Identifies need for help</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    <span><strong>Senior Tech:</strong> Provides guidance and review</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    <span><strong>Master:</strong> Final technical approval</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    <span><strong>Admin:</strong> System-level decisions</span>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded border border-yellow-200 dark:border-yellow-800">
                <h4 className="font-semibold mb-2">Data Gathering as Multi-Sensor:</h4>
                <p className="text-sm">
                  The system will guide you through safe data collection procedures. 
                  You are the eyes, hands, and sensors of the system - collecting real-world 
                  measurements, voltages, and visual inspections that AI cannot perform remotely.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}