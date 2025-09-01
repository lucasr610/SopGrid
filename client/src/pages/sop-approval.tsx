import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Eye, 
  MessageSquare, 
  Database,
  Brain,
  Search,
  Flag,
  Clock,
  User,
  FileText
} from 'lucide-react';

interface SOPApproval {
  id: string;
  sopId: string;
  status: 'pending' | 'approved' | 'denied' | 'needs_review' | 'under_review';
  techId: string;
  techNotes?: string;
  adminNotes?: string;
  reviewedBy?: string;
  storageLocation: string;
  approvalScore: number;
  safetyFlags: string[];
  complianceFlags: string[];
  submittedAt: string;
  reviewedAt?: string;
  failedSections?: any;
}

interface SOPIssueReport {
  id: string;
  sopId: string;
  reportedBy: string;
  issueType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  suggestedFix?: string;
  status: string;
  createdAt: string;
}

export default function SOPApprovalPage() {
  const [selectedApproval, setSelectedApproval] = useState<SOPApproval | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [filter, setFilter] = useState<string>('all');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch pending approvals
  const { data: approvals = [], isLoading: approvalsLoading } = useQuery<SOPApproval[]>({
    queryKey: ['/api/sop/approvals'],
    // Enterprise: No polling - event-driven updates // Refresh every 30 seconds
  });

  // Fetch issue reports
  const { data: issues = [], isLoading: issuesLoading } = useQuery<SOPIssueReport[]>({
    queryKey: ['/api/sop/issues'],
    // Enterprise: No polling - event-driven updates
  });

  // Fetch system learning data
  const { data: learning = [] } = useQuery<any[]>({
    queryKey: ['/api/system/learning'],
  });

  // Update approval mutation
  const updateApprovalMutation = useMutation({
    mutationFn: async ({ id, status, adminNotes, failedSections }: any) => {
      return apiRequest(`/api/sop/approvals/${id}`, 'PATCH', {
        status,
        adminNotes,
        reviewedBy: 'admin', // TODO: Get from auth context
        failedSections
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sop/approvals'] });
      toast({
        title: "Success",
        description: "SOP approval status updated successfully",
      });
      setSelectedApproval(null);
      setAdminNotes('');
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update approval: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Update issue mutation
  const updateIssueMutation = useMutation({
    mutationFn: async ({ id, status, adminResponse }: any) => {
      return apiRequest(`/api/sop/issues/${id}`, 'PATCH', {
        status,
        adminResponse,
        resolvedBy: 'admin', // TODO: Get from auth context
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sop/issues'] });
      toast({
        title: "Success",
        description: "Issue report updated successfully",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-500', icon: Clock },
      approved: { color: 'bg-green-500', icon: CheckCircle2 },
      denied: { color: 'bg-red-500', icon: XCircle },
      needs_review: { color: 'bg-orange-500', icon: AlertTriangle },
      under_review: { color: 'bg-blue-500', icon: Eye },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge className={`${config.color} text-white`}>
        <Icon className="w-3 h-3 mr-1" />
        {status.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  const getSeverityBadge = (severity: string) => {
    const colors = {
      low: 'bg-blue-500',
      medium: 'bg-yellow-500',
      high: 'bg-orange-500',
      critical: 'bg-red-500'
    };
    return (
      <Badge className={`${colors[severity as keyof typeof colors]} text-white`}>
        {severity.toUpperCase()}
      </Badge>
    );
  };

  const filteredApprovals = (approvals as SOPApproval[]).filter((approval: SOPApproval) => {
    if (filter === 'all') return true;
    return approval.status === filter;
  });

  const handleApprove = () => {
    if (selectedApproval) {
      updateApprovalMutation.mutate({
        id: selectedApproval.id,
        status: 'approved',
        adminNotes,
      });
    }
  };

  const handleDeny = () => {
    if (selectedApproval) {
      updateApprovalMutation.mutate({
        id: selectedApproval.id,
        status: 'denied',
        adminNotes,
        failedSections: adminNotes.split('\n').filter(line => line.trim()),
      });
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">SOP Approval Management</h1>
        <div className="flex gap-4 items-center">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Approvals</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="needs_review">Needs Review</SelectItem>
              <SelectItem value="under_review">Under Review</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="denied">Denied</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* System Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Pending Approvals</p>
                <p className="text-2xl font-bold text-white">
                  {approvals.filter((a: SOPApproval) => a.status === 'pending').length}
                </p>
              </div>
              <Clock className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Needs Review</p>
                <p className="text-2xl font-bold text-white">
                  {approvals.filter((a: SOPApproval) => a.status === 'needs_review').length}
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Auto-Approved</p>
                <p className="text-2xl font-bold text-white">
                  {approvals.filter((a: SOPApproval) => a.reviewedBy === 'system_auto_approval').length}
                </p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Learning Patterns</p>
                <p className="text-2xl font-bold text-white">{learning.length}</p>
              </div>
              <Brain className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Approvals Grid */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <FileText className="w-5 h-5" />
            SOP Approvals ({filteredApprovals.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {approvalsLoading ? (
            <div className="text-center py-8 text-gray-400">Loading approvals...</div>
          ) : filteredApprovals.length === 0 ? (
            <div className="text-center py-8 text-gray-400">No approvals found</div>
          ) : (
            <div className="space-y-4">
              {filteredApprovals.map((approval: SOPApproval) => (
                <Card key={approval.id} className="bg-gray-700 border-gray-600">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-3">
                          {getStatusBadge(approval.status)}
                          <span className="text-white font-medium">SOP ID: {approval.sopId}</span>
                          <div className="flex items-center gap-1 text-sm text-gray-400">
                            <Database className="w-4 h-4" />
                            {approval.storageLocation}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-gray-400">
                          <div className="flex items-center gap-1">
                            <User className="w-4 h-4" />
                            Tech: {approval.techId}
                          </div>
                          <div>Score: {approval.approvalScore}%</div>
                          <div>Submitted: {new Date(approval.submittedAt).toLocaleDateString()}</div>
                        </div>

                        {approval.techNotes && (
                          <div className="flex items-start gap-2 text-sm">
                            <MessageSquare className="w-4 h-4 text-blue-400 mt-0.5" />
                            <span className="text-gray-300">{approval.techNotes}</span>
                          </div>
                        )}

                        {(approval.safetyFlags.length > 0 || approval.complianceFlags.length > 0) && (
                          <div className="space-y-1">
                            {approval.safetyFlags.map((flag, i) => (
                              <Alert key={i} className="border-red-600 bg-red-900/20">
                                <Flag className="w-4 h-4 text-red-400" />
                                <AlertDescription className="text-red-300">
                                  Safety: {flag}
                                </AlertDescription>
                              </Alert>
                            ))}
                            {approval.complianceFlags.map((flag, i) => (
                              <Alert key={i} className="border-orange-600 bg-orange-900/20">
                                <Flag className="w-4 h-4 text-orange-400" />
                                <AlertDescription className="text-orange-300">
                                  Compliance: {flag}
                                </AlertDescription>
                              </Alert>
                            ))}
                          </div>
                        )}

                        {approval.adminNotes && (
                          <div className="bg-gray-600 p-3 rounded text-sm">
                            <span className="text-gray-300">{approval.adminNotes}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        {(approval.status === 'pending' || approval.status === 'needs_review') && (
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => setSelectedApproval(approval)}
                                data-testid={`button-review-${approval.id}`}
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                Review
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl bg-gray-800 border-gray-700">
                              <DialogHeader>
                                <DialogTitle className="text-white">Review SOP Approval</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <span className="text-gray-400">Approval Score:</span>
                                    <span className="text-white ml-2">{approval.approvalScore}%</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-400">Storage:</span>
                                    <span className="text-white ml-2">{approval.storageLocation}</span>
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <label className="text-gray-400 text-sm">Admin Notes</label>
                                  <Textarea
                                    value={adminNotes}
                                    onChange={(e) => setAdminNotes(e.target.value)}
                                    placeholder="Add notes about your decision..."
                                    className="bg-gray-700 border-gray-600 text-white"
                                    rows={4}
                                    data-testid="textarea-admin-notes"
                                  />
                                </div>

                                <div className="flex gap-3 justify-end">
                                  <Button
                                    variant="destructive"
                                    onClick={handleDeny}
                                    disabled={updateApprovalMutation.isPending}
                                    data-testid="button-deny"
                                  >
                                    <XCircle className="w-4 h-4 mr-1" />
                                    Deny
                                  </Button>
                                  <Button
                                    variant="default"
                                    onClick={handleApprove}
                                    disabled={updateApprovalMutation.isPending}
                                    className="bg-green-600 hover:bg-green-700"
                                    data-testid="button-approve"
                                  >
                                    <CheckCircle2 className="w-4 h-4 mr-1" />
                                    Approve
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Issue Reports */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Flag className="w-5 h-5" />
            Issue Reports ({issues.filter((i: SOPIssueReport) => i.status === 'open').length} open)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {issuesLoading ? (
            <div className="text-center py-8 text-gray-400">Loading issues...</div>
          ) : issues.length === 0 ? (
            <div className="text-center py-8 text-gray-400">No issues reported</div>
          ) : (
            <div className="space-y-3">
              {issues.filter((issue: SOPIssueReport) => issue.status === 'open').map((issue: SOPIssueReport) => (
                <Card key={issue.id} className="bg-gray-700 border-gray-600">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-3">
                          {getSeverityBadge(issue.severity)}
                          <span className="text-white font-medium">{issue.issueType.toUpperCase()}</span>
                          <span className="text-gray-400 text-sm">SOP: {issue.sopId}</span>
                        </div>
                        <p className="text-gray-300 text-sm">{issue.description}</p>
                        {issue.suggestedFix && (
                          <p className="text-green-300 text-sm">
                            <strong>Suggested Fix:</strong> {issue.suggestedFix}
                          </p>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateIssueMutation.mutate({
                          id: issue.id,
                          status: 'resolved',
                          adminResponse: 'Reviewed and resolved by admin'
                        })}
                        data-testid={`button-resolve-${issue.id}`}
                      >
                        Resolve
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}