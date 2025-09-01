export interface LedgerEntry {
  id: string;
  ts: string;
  sha256: string;
  parent_sha256: string;
  signer: string;
  type: 'SNAPSHOT' | 'SOP_GENERATION' | 'COMPLIANCE_CHECK' | 'VALIDATION' | 'SYSTEM_CHANGE';
  payload: any;
}

export interface SOPDoc {
  id: string;
  title: string;
  content: string;
  steps: SOPStep[];
  metadata?: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface SOPStep {
  id: string;
  stepNumber: number;
  title: string;
  description: string;
  warnings?: string[];
  tools?: string[];
  materials?: string[];
  duration?: number;
}

export interface ContradictionScore {
  score: number;
  details: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface SOPRequest {
  topic: string;
  category: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  requestedBy: string;
  title?: string;
  equipment?: string;
  manufacturer?: string;
  model?: string;
  context?: string;
}

export interface ArbitrationResult {
  approved: boolean;
  confidence: number;
  recommendations: string[];
  warnings: string[];
  reasoning: string;
  validators?: any[];
  contradictionScore?: ContradictionScore;
  success?: boolean;
  error?: string;
  sop?: SOPDoc;
}

export interface ExtractedKnowledge {
  system: string;
  standards: string[];
  procedures: string[];
  safety: string[];
  manufacturers: string[];
}