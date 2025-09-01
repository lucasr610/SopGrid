import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, CheckCircle, AlertTriangle, Users, Brain, Shield, Wrench, Scale } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface MultiAgentSOPResult {
  success: boolean;
  sopId: string;
  contradictionScore: number;
  consensusAchieved: boolean;
  approvalRequired: boolean;
  workflow: string;
  agents: string[];
  message: string;
}

export default function MultiAgentSOP() {
  const [topic, setTopic] = useState("");
  const [category, setCategory] = useState("");
  const [urgency, setUrgency] = useState("medium");
  const { toast } = useToast();

  const generateSOP = useMutation({
    mutationFn: async (data: { topic: string; category: string; urgency: string }): Promise<MultiAgentSOPResult> => {
      return await apiRequest("/api/sop/generate-orchestrated", "POST", {
        ...data,
        requestedBy: "user"
      }) as unknown as MultiAgentSOPResult;
    },
    onSuccess: (data: MultiAgentSOPResult) => {
      toast({
        title: data.success ? "SOP Generated Successfully" : "Generation Issue",
        description: data.message,
        variant: data.success ? "default" : "destructive",
      });
    },
    onError: (error) => {
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) {
      toast({
        title: "Topic Required",
        description: "Please enter a topic for SOP generation",
        variant: "destructive",
      });
      return;
    }

    generateSOP.mutate({ topic, category, urgency });
  };

  const getAgentIcon = (agent: string) => {
    switch (agent.toLowerCase()) {
      case 'watson': return <Brain className="w-4 h-4" />;
      case 'mother': return <Shield className="w-4 h-4" />;
      case 'father': return <Wrench className="w-4 h-4" />;
      case 'soap': return <Users className="w-4 h-4" />;
      case 'arbiter': return <Scale className="w-4 h-4" />;
      default: return <Brain className="w-4 h-4" />;
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'secondary';
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Multi-Agent SOP Orchestration</h1>
        <p className="text-muted-foreground">
          SOPGRID's multi-agent workflow: Watson → Mother → Father → Soap → Arbiter
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Generate Orchestrated SOP
          </CardTitle>
          <CardDescription>
            The question goes to all LLMs, gets combined, verified, arbitrated through Mother and Father first
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="topic">SOP Topic / Question</Label>
              <Input
                id="topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., Replace RV air conditioning compressor"
                data-testid="input-topic"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="e.g., HVAC, Electrical, Plumbing"
                  data-testid="input-category"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="urgency">Urgency Level</Label>
                <Select value={urgency} onValueChange={setUrgency}>
                  <SelectTrigger data-testid="select-urgency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button 
              type="submit" 
              disabled={generateSOP.isPending}
              className="w-full"
              data-testid="button-generate"
            >
              {generateSOP.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Generate Multi-Agent SOP
            </Button>
          </form>
        </CardContent>
      </Card>

      {generateSOP.isPending && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              Multi-Agent Processing...
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Processing through all agents</span>
                <span>Step 1-8</span>
              </div>
              <Progress value={65} className="w-full" />
            </div>
            <div className="text-sm text-muted-foreground">
              • Step 1: Checking existing SOPs...<br/>
              • Step 2: Mother (Safety) review in progress...<br/>
              • Step 3: Father (Logic) review in progress...<br/>
              • Step 4: All LLMs responding...<br/>
              • Step 5: Combining responses...<br/>
              • Step 6: Verification round...<br/>
              • Step 7: Arbitration...<br/>
              • Step 8: Watson formatting...
            </div>
          </CardContent>
        </Card>
      )}

      {generateSOP.data && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {generateSOP.data.success ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
              )}
              Generation Result
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Contradiction Score</Label>
                <div className="flex items-center gap-2">
                  <Progress 
                    value={(1 - generateSOP.data.contradictionScore) * 100} 
                    className="flex-1"
                  />
                  <span className="text-sm font-mono">
                    {generateSOP.data.contradictionScore.toFixed(3)}
                  </span>
                </div>
              </div>
              
              <div>
                <Label className="text-sm font-medium">Status</Label>
                <div className="flex gap-2 mt-1">
                  <Badge variant={generateSOP.data.consensusAchieved ? "default" : "destructive"}>
                    {generateSOP.data.consensusAchieved ? "Consensus" : "No Consensus"}
                  </Badge>
                  <Badge variant={getUrgencyColor(urgency)}>
                    {urgency}
                  </Badge>
                </div>
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium">Agents Involved</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {generateSOP.data.agents.map((agent) => (
                  <Badge key={agent} variant="secondary" className="flex items-center gap-1">
                    {getAgentIcon(agent)}
                    {agent}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="bg-muted p-3 rounded-md">
              <p className="text-sm font-medium">Result:</p>
              <p className="text-sm text-muted-foreground mt-1">
                {generateSOP.data.message}
              </p>
            </div>

            {generateSOP.data.approvalRequired && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-md border border-yellow-200 dark:border-yellow-800">
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  ⚠️ Lucas Reynolds Approval Required
                </p>
                <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                  This SOP requires approval due to high contradiction score or critical safety concerns.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">How Multi-Agent Orchestration Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm space-y-2">
            <div className="flex items-start gap-3">
              <Badge variant="outline" className="min-w-fit">1</Badge>
              <div>
                <strong>Check Existing:</strong> System checks if SOP already exists
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Badge variant="outline" className="min-w-fit">2</Badge>
              <div>
                <strong>Mother (Safety):</strong> Reviews for safety hazards, OSHA compliance, PPE requirements
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Badge variant="outline" className="min-w-fit">3</Badge>
              <div>
                <strong>Father (Logic):</strong> Ensures technical accuracy and logical structure
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Badge variant="outline" className="min-w-fit">4</Badge>
              <div>
                <strong>All LLMs:</strong> OpenAI, Gemini, Anthropic all generate initial responses
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Badge variant="outline" className="min-w-fit">5</Badge>
              <div>
                <strong>Combine:</strong> System combines all 3 responses into unified version
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Badge variant="outline" className="min-w-fit">6</Badge>
              <div>
                <strong>Verification:</strong> Combined response sent back to all LLMs for improvement
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Badge variant="outline" className="min-w-fit">7</Badge>
              <div>
                <strong>Arbiter:</strong> Final arbitration with contradiction scoring (≤ 0.35 threshold)
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Badge variant="outline" className="min-w-fit">8</Badge>
              <div>
                <strong>Watson Format:</strong> Apply Mother/Father injections and format to exact SOP template
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}