import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Shield, CheckCircle, AlertTriangle, XCircle, Eye, Download, RefreshCw } from 'lucide-react';

interface ComplianceCheck {
  id: string;
  sopId: string | null;
  standard: string;
  status: 'compliant' | 'non-compliant' | 'warning';
  details: string;
  checkedBy: string | null;
  checkedAt: string;
}

export function ComplianceMonitoring() {
  const { data: complianceChecks, isLoading: checksLoading } = useQuery({
    queryKey: ['/api/compliance/status'],
    // Enterprise: No polling - event-driven updates // MEMORY FIX: Reduced to 60 seconds to prevent bloat
  });

  const { data: sops, isLoading: sopsLoading } = useQuery({
    queryKey: ['/api/sops'],
    // Enterprise: No polling - event-driven updates // MEMORY FIX: Reduced to 60 seconds to prevent bloat
  });

  const { data: systemStatus } = useQuery({
    queryKey: ['/api/system/status'],
    // Enterprise: No polling - event-driven updates // MEMORY FIX: Reduced to 60 seconds to prevent bloat
  });

  const complianceStandards = [
    { code: 'OSHA', name: 'Occupational Safety and Health Administration', category: 'Safety' },
    { code: 'EPA', name: 'Environmental Protection Agency', category: 'Environmental' },
    { code: 'DOT', name: 'Department of Transportation', category: 'Transportation' },
    { code: 'FDA', name: 'Food and Drug Administration', category: 'Medical' },
    { code: 'DOD', name: 'Department of Defense', category: 'Defense' },
    { code: 'NFPA', name: 'National Fire Protection Association', category: 'Fire Safety' },
    { code: 'ISO', name: 'International Organization for Standardization', category: 'Quality' },
    { code: 'AAMI', name: 'Association for the Advancement of Medical Instrumentation', category: 'Medical' }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'compliant':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
      case 'non-compliant':
        return <XCircle className="w-5 h-5 text-red-400" />;
      default:
        return <Shield className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'compliant':
        return 'text-green-400';
      case 'warning':
        return 'text-yellow-400';
      case 'non-compliant':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  const complianceScore = (systemStatus as any)?.complianceScore || 0;

  return (
    <div className="space-y-6">
      {/* Compliance Overview */}
      <Card className="glass-panel border-primary/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-semibold flex items-center space-x-2">
              <Shield className="w-6 h-6 text-primary" />
              <span>Compliance Monitoring Dashboard</span>
            </CardTitle>
            <div className="flex items-center space-x-3">
              <Badge variant="outline" className="border-primary/20">
                Score: {complianceScore}%
              </Badge>
              <Button variant="outline" size="sm" className="border-primary/20">
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-6">
            {/* Compliance Score */}
            <Card className="glass-panel border-primary/20">
              <CardContent className="p-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary mb-2">{complianceScore}%</div>
                  <p className="text-sm text-muted-foreground mb-4">Overall Compliance</p>
                  <Progress value={complianceScore} className="w-full" />
                </div>
              </CardContent>
            </Card>

            {/* Active Standards */}
            <Card className="glass-panel border-primary/20">
              <CardContent className="p-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-400 mb-2">
                    {(complianceChecks as ComplianceCheck[])?.filter((c: ComplianceCheck) => c.status === 'compliant').length || 0}
                  </div>
                  <p className="text-sm text-muted-foreground">Standards Compliant</p>
                  <div className="text-xs text-green-400 mt-2">
                    /{(complianceChecks as ComplianceCheck[])?.length || 0} Total Standards
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* SOPs Verified */}
            <Card className="glass-panel border-primary/20">
              <CardContent className="p-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-400 mb-2">
                    {(sops as any[])?.filter((s: any) => s.reviewStatus === 'approved').length || 0}
                  </div>
                  <p className="text-sm text-muted-foreground">SOPs Verified</p>
                  <div className="text-xs text-blue-400 mt-2">
                    /{(sops as any[])?.length || 0} Total SOPs
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Compliance Details */}
      <Tabs defaultValue="standards" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="standards">Compliance Standards</TabsTrigger>
          <TabsTrigger value="sops">SOP Compliance</TabsTrigger>
          <TabsTrigger value="audit">Audit Trail</TabsTrigger>
        </TabsList>

        <TabsContent value="standards" className="space-y-4">
          <Card className="glass-panel border-primary/20">
            <CardHeader>
              <CardTitle className="text-lg">Regulatory Standards Compliance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {complianceStandards.map((standard) => {
                  const check = (complianceChecks as ComplianceCheck[])?.find((c: ComplianceCheck) => c.standard === standard.code);
                  const status = check?.status || 'unknown';
                  
                  return (
                    <div key={standard.code} className="flex items-center justify-between p-4 rounded-lg border border-primary/10 bg-black/20">
                      <div className="flex items-center space-x-4">
                        {getStatusIcon(status)}
                        <div>
                          <h4 className="font-medium">{standard.code} - {standard.name}</h4>
                          <p className="text-sm text-muted-foreground">{standard.category}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Badge variant="outline" className={`${getStatusColor(status)} border-current`}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </Badge>
                        <Button variant="ghost" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sops" className="space-y-4">
          <Card className="glass-panel border-primary/20">
            <CardHeader>
              <CardTitle className="text-lg">SOP Compliance Status</CardTitle>
            </CardHeader>
            <CardContent>
              {sopsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-16 bg-white/5 rounded animate-pulse"></div>
                  ))}
                </div>
              ) : (sops as any[])?.length ? (
                <div className="space-y-4">
                  {(sops as any[]).map((sop: any) => (
                    <div key={sop.id} className="flex items-center justify-between p-4 rounded-lg border border-primary/10 bg-black/20">
                      <div className="flex items-center space-x-4">
                        <CheckCircle className="w-5 h-5 text-green-400" />
                        <div>
                          <h4 className="font-medium">{sop.title}</h4>
                          <p className="text-sm text-muted-foreground">
                            Industry: {sop.industry} | Standards: {sop.complianceStandards?.join(', ')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Badge variant="outline" className="text-green-400 border-green-400/30">
                          {sop.reviewStatus}
                        </Badge>
                        <Button variant="ghost" size="sm">
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No SOPs available for compliance review</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="space-y-4">
          <Card className="glass-panel border-primary/20">
            <CardHeader>
              <CardTitle className="text-lg">Compliance Audit Trail</CardTitle>
            </CardHeader>
            <CardContent>
              {checksLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="h-12 bg-white/5 rounded animate-pulse"></div>
                  ))}
                </div>
              ) : (complianceChecks as ComplianceCheck[])?.length ? (
                <div className="space-y-3">
                  {(complianceChecks as ComplianceCheck[]).map((check: ComplianceCheck) => (
                    <div key={check.id} className="flex items-center justify-between p-3 rounded border border-primary/10 bg-black/20">
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(check.status)}
                        <div>
                          <span className="font-medium">{check.standard}</span>
                          <p className="text-sm text-muted-foreground">{check.details}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">
                          {check.checkedAt ? new Date(check.checkedAt).toLocaleDateString() : 'Recently'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {check.checkedBy || 'System Check'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No compliance audit records available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}