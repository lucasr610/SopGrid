import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, CheckCircle, BookOpen, Target, Zap, Shield, X, Plus } from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface SOPCorrection {
  id: string;
  originalSOP: string;
  correctedSOP: string;
  category: string;
  safetyLevel: 'critical' | 'important' | 'minor';
  reasoning: string;
  equipment: string;
  procedure: string;
  createdBy: string;
  createdAt: string;
  status: 'active' | 'archived';
}

interface TrainingRule {
  id: string;
  condition: string;
  correction: string;
  category: 'electrical' | 'mechanical' | 'safety' | 'compliance' | 'general';
  priority: 'high' | 'medium' | 'low';
  examples: string[];
}

export default function SOPTraining() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('correct');
  
  // Form state for correction
  const [correctionForm, setCorrectionForm] = useState({
    originalSOP: '',
    correctedSOP: '',
    category: '',
    safetyLevel: 'important' as 'critical' | 'important' | 'minor',
    reasoning: '',
    equipment: '',
    procedure: ''
  });

  // Form state for training rules
  const [ruleForm, setRuleForm] = useState({
    condition: '',
    correction: '',
    category: 'electrical' as 'electrical' | 'mechanical' | 'safety' | 'compliance' | 'general',
    priority: 'medium' as 'high' | 'medium' | 'low',
    examples: ['']
  });

  // Submit SOP correction
  const submitCorrectionMutation = useMutation({
    mutationFn: async (data: typeof correctionForm) => {
      return await apiRequest('/api/training/sop-correction', 'POST', data);
    },
    onSuccess: () => {
      toast({
        title: "SOP Correction Submitted",
        description: "The system will learn from this correction",
      });
      setCorrectionForm({
        originalSOP: '',
        correctedSOP: '',
        category: '',
        safetyLevel: 'important',
        reasoning: '',
        equipment: '',
        procedure: ''
      });
      queryClient.invalidateQueries({ queryKey: ['/api/training/corrections'] });
    },
    onError: (error) => {
      toast({
        title: "Submission Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Submit training rule
  const submitRuleMutation = useMutation({
    mutationFn: async (data: typeof ruleForm) => {
      return await apiRequest('/api/training/rule', 'POST', data);
    },
    onSuccess: () => {
      toast({
        title: "Training Rule Added",
        description: "The AI will apply this rule to future SOPs",
      });
      setRuleForm({
        condition: '',
        correction: '',
        category: 'electrical',
        priority: 'medium',
        examples: ['']
      });
      queryClient.invalidateQueries({ queryKey: ['/api/training/rules'] });
    },
    onError: (error) => {
      toast({
        title: "Rule Creation Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Query existing corrections and rules
  const { data: corrections = [], isLoading: correctionsLoading } = useQuery<any[]>({
    queryKey: ['/api/training/corrections'],
    retry: false,
  });

  const { data: rules = [], isLoading: rulesLoading } = useQuery<any[]>({
    queryKey: ['/api/training/rules'],
    retry: false,
  });

  const addExample = () => {
    setRuleForm({
      ...ruleForm,
      examples: [...ruleForm.examples, '']
    });
  };

  const updateExample = (index: number, value: string) => {
    const newExamples = [...ruleForm.examples];
    newExamples[index] = value;
    setRuleForm({
      ...ruleForm,
      examples: newExamples
    });
  };

  const removeExample = (index: number) => {
    setRuleForm({
      ...ruleForm,
      examples: ruleForm.examples.filter((_, i) => i !== index)
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">SOP Training & Corrections</h1>
          <p className="text-muted-foreground mt-2">
            Teach the AI system correct procedures and safety practices
          </p>
        </div>
        <div className="flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-primary" />
          <span className="text-sm text-muted-foreground">Admin/Master Tech Only</span>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="correct" data-testid="tab-correct">Correct SOPs</TabsTrigger>
          <TabsTrigger value="rules" data-testid="tab-rules">Training Rules</TabsTrigger>
          <TabsTrigger value="history" data-testid="tab-history">Training History</TabsTrigger>
        </TabsList>

        <TabsContent value="correct" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-red-500" />
                Correct an Incorrect SOP
              </CardTitle>
              <CardDescription>
                When the AI generates incorrect or unsafe procedures, correct them here to improve future responses
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="equipment">Equipment/System</Label>
                  <Input
                    id="equipment"
                    placeholder="e.g., GFCI Outlet, Generator, Water Heater"
                    value={correctionForm.equipment}
                    onChange={(e) => setCorrectionForm({ ...correctionForm, equipment: e.target.value })}
                    data-testid="input-equipment"
                  />
                </div>
                <div>
                  <Label htmlFor="procedure">Procedure Type</Label>
                  <Input
                    id="procedure"
                    placeholder="e.g., Testing, Repair, Installation"
                    value={correctionForm.procedure}
                    onChange={(e) => setCorrectionForm({ ...correctionForm, procedure: e.target.value })}
                    data-testid="input-procedure"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Input
                    id="category"
                    placeholder="e.g., Electrical Testing, Safety Procedures"
                    value={correctionForm.category}
                    onChange={(e) => setCorrectionForm({ ...correctionForm, category: e.target.value })}
                    data-testid="input-category"
                  />
                </div>
                <div>
                  <Label htmlFor="safety-level">Safety Level</Label>
                  <Select value={correctionForm.safetyLevel} onValueChange={(value: any) => setCorrectionForm({ ...correctionForm, safetyLevel: value })}>
                    <SelectTrigger data-testid="select-safety-level">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="critical">Critical - Could cause injury/death</SelectItem>
                      <SelectItem value="important">Important - Safety concern</SelectItem>
                      <SelectItem value="minor">Minor - Procedural improvement</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <Label htmlFor="original-sop">Incorrect SOP (what the AI generated)</Label>
                <Textarea
                  id="original-sop"
                  placeholder="Paste the incorrect SOP text here..."
                  value={correctionForm.originalSOP}
                  onChange={(e) => setCorrectionForm({ ...correctionForm, originalSOP: e.target.value })}
                  className="min-h-[150px]"
                  data-testid="textarea-original"
                />
              </div>
              
              <div>
                <Label htmlFor="corrected-sop">Corrected SOP (what it should be)</Label>
                <Textarea
                  id="corrected-sop"
                  placeholder="Provide the correct procedure here..."
                  value={correctionForm.correctedSOP}
                  onChange={(e) => setCorrectionForm({ ...correctionForm, correctedSOP: e.target.value })}
                  className="min-h-[150px]"
                  data-testid="textarea-corrected"
                />
              </div>

              <div>
                <Label htmlFor="reasoning">Why this correction is important</Label>
                <Textarea
                  id="reasoning"
                  placeholder="Explain why the original was wrong and why your correction is correct..."
                  value={correctionForm.reasoning}
                  onChange={(e) => setCorrectionForm({ ...correctionForm, reasoning: e.target.value })}
                  className="min-h-[100px]"
                  data-testid="textarea-reasoning"
                />
              </div>

              <Button 
                onClick={() => submitCorrectionMutation.mutate(correctionForm)}
                disabled={!correctionForm.originalSOP || !correctionForm.correctedSOP || submitCorrectionMutation.isPending}
                className="w-full"
                data-testid="button-submit-correction"
              >
                {submitCorrectionMutation.isPending ? (
                  <>
                    <Target className="w-4 h-4 mr-2 animate-spin" />
                    Submitting Correction...
                  </>
                ) : (
                  <>
                    <Target className="w-4 h-4 mr-2" />
                    Submit SOP Correction
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rules" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-500" />
                Create Training Rule
              </CardTitle>
              <CardDescription>
                Define rules for the AI to follow when generating SOPs
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="rule-category">Category</Label>
                  <Select value={ruleForm.category} onValueChange={(value: any) => setRuleForm({ ...ruleForm, category: value })}>
                    <SelectTrigger data-testid="select-rule-category">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="electrical">Electrical Work</SelectItem>
                      <SelectItem value="mechanical">Mechanical Systems</SelectItem>
                      <SelectItem value="safety">Safety Procedures</SelectItem>
                      <SelectItem value="compliance">Compliance Requirements</SelectItem>
                      <SelectItem value="general">General Procedures</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="rule-priority">Priority</Label>
                  <Select value={ruleForm.priority} onValueChange={(value: any) => setRuleForm({ ...ruleForm, priority: value })}>
                    <SelectTrigger data-testid="select-rule-priority">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">High - Always apply</SelectItem>
                      <SelectItem value="medium">Medium - Usually apply</SelectItem>
                      <SelectItem value="low">Low - Suggestion</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="rule-condition">When this condition is met</Label>
                <Textarea
                  id="rule-condition"
                  placeholder="e.g., When testing electrical circuits for voltage..."
                  value={ruleForm.condition}
                  onChange={(e) => setRuleForm({ ...ruleForm, condition: e.target.value })}
                  className="min-h-[100px]"
                  data-testid="textarea-condition"
                />
              </div>

              <div>
                <Label htmlFor="rule-correction">Apply this correction/rule</Label>
                <Textarea
                  id="rule-correction"
                  placeholder="e.g., Always emphasize that electrical testing must be done with power ON (live) and include proper safety precautions for working with live circuits..."
                  value={ruleForm.correction}
                  onChange={(e) => setRuleForm({ ...ruleForm, correction: e.target.value })}
                  className="min-h-[100px]"
                  data-testid="textarea-rule-correction"
                />
              </div>

              <div>
                <Label>Examples (help the AI understand when to apply this rule)</Label>
                {ruleForm.examples.map((example, index) => (
                  <div key={index} className="flex gap-2 mt-2">
                    <Input
                      placeholder={`Example ${index + 1}`}
                      value={example}
                      onChange={(e) => updateExample(index, e.target.value)}
                      data-testid={`input-example-${index}`}
                    />
                    {ruleForm.examples.length > 1 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeExample(index)}
                        data-testid={`button-remove-example-${index}`}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addExample}
                  className="mt-2"
                  data-testid="button-add-example"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Example
                </Button>
              </div>

              <Button 
                onClick={() => submitRuleMutation.mutate(ruleForm)}
                disabled={!ruleForm.condition || !ruleForm.correction || submitRuleMutation.isPending}
                className="w-full"
                data-testid="button-submit-rule"
              >
                {submitRuleMutation.isPending ? (
                  <>
                    <Shield className="w-4 h-4 mr-2 animate-spin" />
                    Creating Rule...
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4 mr-2" />
                    Create Training Rule
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Corrections</CardTitle>
                <CardDescription>
                  SOPs that have been corrected by admins and master techs
                </CardDescription>
              </CardHeader>
              <CardContent>
                {correctionsLoading ? (
                  <div className="text-center py-4">Loading corrections...</div>
                ) : corrections.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No corrections submitted yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {corrections.map((correction: SOPCorrection) => (
                      <div key={correction.id} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">{correction.equipment} - {correction.procedure}</h4>
                          <Badge variant={
                            correction.safetyLevel === 'critical' ? 'destructive' :
                            correction.safetyLevel === 'important' ? 'default' : 'secondary'
                          }>
                            {correction.safetyLevel}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{correction.reasoning}</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {new Date(correction.createdAt).toLocaleDateString()} by {correction.createdBy}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Active Training Rules</CardTitle>
                <CardDescription>
                  Rules the AI follows when generating SOPs
                </CardDescription>
              </CardHeader>
              <CardContent>
                {rulesLoading ? (
                  <div className="text-center py-4">Loading rules...</div>
                ) : rules.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No training rules created yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {rules.map((rule: TrainingRule) => (
                      <div key={rule.id} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant="outline" className="capitalize">
                            {rule.category}
                          </Badge>
                          <Badge variant={
                            rule.priority === 'high' ? 'destructive' :
                            rule.priority === 'medium' ? 'default' : 'secondary'
                          }>
                            {rule.priority}
                          </Badge>
                        </div>
                        <p className="text-sm font-medium">{rule.condition}</p>
                        <p className="text-sm text-muted-foreground mt-1">{rule.correction}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}