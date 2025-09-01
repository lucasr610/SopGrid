import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { motion } from 'framer-motion';
import { 
  Scale, Vote, AlertTriangle, CheckCircle, XCircle, 
  ChevronLeft, Loader2, Users, Brain, Zap
} from 'lucide-react';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { SopgridHeader } from '@/components/sopgrid-header';

export function Arbitration() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isArbitrating, setIsArbitrating] = useState(false);
  const [decisionInput, setDecisionInput] = useState('');

  const activeArbitrations = [
    {
      id: '1',
      title: 'SOP Validation Conflict',
      description: 'Conflicting safety requirements between OSHA and EPA standards',
      agents: ['Watson', 'Mother', 'Father'],
      votes: { approve: 2, reject: 1 },
      status: 'pending',
      contradictionScore: 0.28
    },
    {
      id: '2',
      title: 'Procedure Sequence Dispute',
      description: 'Disagreement on optimal step order for HVAC maintenance',
      agents: ['Soap', 'Father', 'Arbiter'],
      votes: { approve: 1, reject: 2 },
      status: 'review',
      contradictionScore: 0.42
    }
  ];

  const submitArbitration = () => {
    setIsArbitrating(true);
    setTimeout(() => {
      setIsArbitrating(false);
      toast({
        title: 'Arbitration Submitted',
        description: 'Multi-agent validation process initiated.',
      });
      setDecisionInput('');
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Corporate Background */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url(/arbitration-bg.png)'
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
            <Button
              onClick={() => setLocation('/dashboard')}
              variant="ghost"
              className="text-cyan-300 hover:text-cyan-200 hover:bg-cyan-500/10"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                Arbitration Engine
              </h1>
              <p className="text-gray-400">Multi-agent consensus and decision validation</p>
            </div>
          </div>
        </motion.div>

        {/* New Arbitration */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-8"
        >
          <Card className="glass">
            <CardHeader>
              <CardTitle className="text-cyan-300">Submit for Arbitration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-cyan-300">Decision or Conflict Description</Label>
                <Textarea
                  value={decisionInput}
                  onChange={(e) => setDecisionInput(e.target.value)}
                  placeholder="Describe the decision that needs arbitration or the conflict between agents..."
                  rows={4}
                  className="glass-input text-white placeholder:text-gray-300"
                />
              </div>
              <Button
                onClick={submitArbitration}
                disabled={!decisionInput || isArbitrating}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500"
              >
                {isArbitrating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing Arbitration...
                  </>
                ) : (
                  <>
                    <Scale className="w-4 h-4 mr-2" />
                    Submit for Arbitration
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Active Arbitrations */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {activeArbitrations.map((arbitration, index) => (
            <motion.div
              key={arbitration.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="glass hover:border-white/20 transition-all">
                <CardHeader>
                  <CardTitle className="text-cyan-300 flex items-center justify-between">
                    <span className="truncate">{arbitration.title}</span>
                    <Badge className={
                      arbitration.status === 'pending'
                        ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50'
                        : 'bg-blue-500/20 text-blue-300 border-blue-500/50'
                    }>
                      {arbitration.status}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-gray-400">{arbitration.description}</p>
                  
                  {/* Agents Involved */}
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-cyan-400" />
                    <div className="flex gap-2">
                      {arbitration.agents.map(agent => (
                        <Badge key={agent} className="bg-black/20 text-cyan-300 border-cyan-500/20">
                          {agent}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Voting Status */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-green-400">Approve: {arbitration.votes.approve}</span>
                      <span className="text-red-400">Reject: {arbitration.votes.reject}</span>
                    </div>
                    <Progress 
                      value={(arbitration.votes.approve / (arbitration.votes.approve + arbitration.votes.reject)) * 100}
                      className="h-2 bg-black/30"
                    />
                  </div>

                  {/* Contradiction Score */}
                  <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg">
                    <span className="text-sm text-gray-400">Contradiction Score</span>
                    <div className="flex items-center gap-2">
                      <span className={`font-bold ${
                        arbitration.contradictionScore <= 0.35 ? 'text-green-400' : 'text-yellow-400'
                      }`}>
                        {arbitration.contradictionScore.toFixed(2)}
                      </span>
                      {arbitration.contradictionScore <= 0.35 ? (
                        <CheckCircle className="w-4 h-4 text-green-400" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-yellow-400" />
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 text-cyan-300 border-cyan-500/50 hover:bg-cyan-500/20"
                    >
                      View Details
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 text-green-300 border-green-500/50 hover:bg-green-500/20"
                    >
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Approve
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}