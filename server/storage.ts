import { type User, type InsertUser, type Agent, type InsertAgent, type Document, type InsertDocument, type SOP, type InsertSOP, type SystemMetrics, type InsertSystemMetrics, type ComplianceCheck, type InsertComplianceCheck, type SOPCorrection, type InsertSOPCorrection, type TrainingRule, type InsertTrainingRule, type SOPApproval, type InsertSOPApproval, type SOPIssueReport, type InsertSOPIssueReport, type SystemLearning, type InsertSystemLearning, type SOPVersion, type InsertSOPVersion, type StorageDecision, type InsertStorageDecision, type SOPFailure, type InsertSOPFailure } from "@shared/schema";
import { randomUUID } from "crypto";
import { MongoStorage } from './services/mongodb-storage';

// Force use of working MongoDB connection or fallback to memory
const USE_MONGODB = process.env.FORCE_MONGODB === 'true';

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<User>): Promise<User | undefined>;
  deleteUser(id: string): Promise<boolean>;

  // Agent methods
  getAgents(): Promise<Agent[]>;
  listAgents(): Promise<Agent[]>;
  getAgent(id: string): Promise<Agent | undefined>;
  createAgent(agent: InsertAgent): Promise<Agent>;
  updateAgent(id: string, agent: Partial<Agent>): Promise<Agent | undefined>;
  updateAgentHeartbeat(id: string): Promise<void>;

  // Document methods
  getDocuments(): Promise<Document[]>;
  getAllDocuments(): Promise<Document[]>;
  getDocument(id: string): Promise<Document | undefined>;
  createDocument(document: InsertDocument): Promise<Document>;
  updateDocument(id: string, document: Partial<Document>): Promise<Document | undefined>;

  // SOP methods
  getSOPs(): Promise<SOP[]>;
  listSOPs(): Promise<SOP[]>;
  getSOP(id: string): Promise<SOP | undefined>;
  createSOP(sop: InsertSOP): Promise<SOP>;
  updateSOP(id: string, sop: Partial<SOP>): Promise<SOP | undefined>;
  getSOPsByIds(ids: string[]): Promise<SOP[]>;

  // System metrics methods
  getLatestSystemMetrics(): Promise<SystemMetrics | undefined>;
  createSystemMetrics(metrics: InsertSystemMetrics): Promise<SystemMetrics>;

  // Compliance check methods
  getComplianceChecks(): Promise<ComplianceCheck[]>;
  getComplianceChecksBySOP(sopId: string): Promise<ComplianceCheck[]>;
  createComplianceCheck(check: InsertComplianceCheck): Promise<ComplianceCheck>;

  // Training methods
  getSOPCorrections(): Promise<SOPCorrection[]>;
  createSOPCorrection(correction: InsertSOPCorrection): Promise<SOPCorrection>;
  getTrainingRules(): Promise<TrainingRule[]>;
  createTrainingRule(rule: InsertTrainingRule): Promise<TrainingRule>;

  // SOP Approval methods
  getSOPApprovals(): Promise<SOPApproval[]>;
  getSOPApproval(id: string): Promise<SOPApproval | undefined>;
  createSOPApproval(approval: InsertSOPApproval): Promise<SOPApproval>;
  updateSOPApproval(id: string, approval: Partial<SOPApproval>): Promise<SOPApproval | undefined>;
  getSOPApprovalsBySOP(sopId: string): Promise<SOPApproval[]>;
  getPendingApprovals(): Promise<SOPApproval[]>;

  // SOP Issue Report methods
  getSOPIssueReports(): Promise<SOPIssueReport[]>;
  getSOPIssueReport(id: string): Promise<SOPIssueReport | undefined>;
  createSOPIssueReport(report: InsertSOPIssueReport): Promise<SOPIssueReport>;
  updateSOPIssueReport(id: string, report: Partial<SOPIssueReport>): Promise<SOPIssueReport | undefined>;
  getSOPIssueReportsBySOP(sopId: string): Promise<SOPIssueReport[]>;
  getOpenIssueReports(): Promise<SOPIssueReport[]>;

  // System Learning methods
  getSystemLearning(): Promise<SystemLearning[]>;
  createSystemLearning(learning: InsertSystemLearning): Promise<SystemLearning>;
  updateSystemLearning(id: string, learning: Partial<SystemLearning>): Promise<SystemLearning | undefined>;
  getLearningByCategory(category: string): Promise<SystemLearning[]>;
  incrementLearningEncounter(pattern: string): Promise<void>;

  // SOP Version methods
  getSOPVersions(sopId: string): Promise<SOPVersion[]>;
  createSOPVersion(version: InsertSOPVersion): Promise<SOPVersion>;
  getActiveSOPVersion(sopId: string): Promise<SOPVersion | undefined>;

  // Storage Decision methods
  createStorageDecision(decision: InsertStorageDecision): Promise<StorageDecision>;
  getStorageDecisions(): Promise<StorageDecision[]>;
  getStorageDecisionsBySOP(sopId: string): Promise<StorageDecision[]>;

  // SOP Failure methods
  createSOPFailure(failure: InsertSOPFailure): Promise<SOPFailure>;
  getSOPFailures(): Promise<SOPFailure[]>;
  getUnresolvedFailures(): Promise<SOPFailure[]>;
  resolveSOPFailure(id: string, correctionApplied: string): Promise<SOPFailure | undefined>;
  setActiveVersion(sopId: string, versionId: string): Promise<SOPVersion | undefined>;

  // Intelligent Storage Routing
  routeSOPStorage(sopContent: string, metadata: any): Promise<{qdrantId?: string, mongoId?: string, location: string}>;
  searchApprovedSOPs(query: string, filters?: any): Promise<{sops: SOP[], vectors?: any[]}>;

  // Additional methods required by routes
  getAllDocuments(): Promise<Document[]>;
  getAllSOPs(): Promise<SOP[]>;
  listAgents(): Promise<Agent[]>;
  getSop(id: string): Promise<SOP | undefined>;
  updateSop(id: string, sop: Partial<SOP>): Promise<SOP | undefined>;
  createSopApproval(approval: any): Promise<any>;
  getAllSopApprovals(): Promise<any[]>;
  getBulkProcessingJobs?(): Promise<any[]>;
  getDocumentRevisions?(documentId?: string): Promise<any[]>;
  searchDocuments(query: string): Promise<Document[]>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private agents: Map<string, Agent> = new Map();
  private documents: Map<string, Document> = new Map();
  private sops: Map<string, SOP> = new Map();
  private systemMetrics: SystemMetrics[] = [];
  private complianceChecks: Map<string, ComplianceCheck> = new Map();
  private sopCorrections: Map<string, SOPCorrection> = new Map();
  private trainingRules: Map<string, TrainingRule> = new Map();
  private sopApprovals: Map<string, SOPApproval> = new Map();
  private sopIssueReports: Map<string, SOPIssueReport> = new Map();
  private systemLearning: Map<string, SystemLearning> = new Map();
  private sopVersions: Map<string, SOPVersion> = new Map();
  private storageDecisions: Map<string, StorageDecision> = new Map();
  private sopFailures: Map<string, SOPFailure> = new Map();

  // Storage routing intelligence
  private qdrantStorage: Map<string, any> = new Map(); // Simulated Qdrant vector storage
  private mongoStorage: Map<string, any> = new Map(); // Simulated MongoDB document storage

  constructor() {
    this.initializeDefaultData();
  }

  private async initializeDefaultData() {
    // Always initialize default admin user (admin/admin123)
    const { hashPassword } = await import('./utils/auth');
    const hashedPassword = await hashPassword('admin123');
    this.createUser({
      username: 'admin',
      password: hashedPassword,
      role: 'admin'
    });

    // Initialize top-level admin user Lucas.Reynolds
    const lucasHashedPassword = await hashPassword('Service2244');
    this.createUser({
      username: 'Lucas.Reynolds',
      password: lucasHashedPassword,
      role: 'super_admin'
    });
    
    // Initialize default agents
    const defaultAgents: InsertAgent[] = [
      {
        name: 'Watson',
        type: 'watson',
        status: 'active',
        config: JSON.parse('{"role":"Memory & Format Adherence","sopIdPattern":"SYSTEM-TASK-BRAND-SUBTYPE-DETAIL-SEQ#","formatStandards":"System Approved"}') as Record<string, any>
      },
      {
        name: 'Mother',
        type: 'mother',
        status: 'active',
        config: JSON.parse('{"role":"Safety Conscience","oshaCompliance":true,"hazardDetection":"critical","lucasApprovalRequired":true}') as Record<string, any>
      },
      {
        name: 'Father',
        type: 'father',
        status: 'active',
        config: JSON.parse('{"role":"Logic & Research Quality","multiSourceValidation":true,"oemDocumentationPriority":"high","researchDepth":"comprehensive"}') as Record<string, any>
      },
      {
        name: 'Soap',
        type: 'soap',
        status: 'active',
        config: JSON.parse('{"role":"Primary SOP Author","targetAudience":"RV Technicians","integratesAllAgents":true,"writingStyle":"clear_professional"}') as Record<string, any>
      },
      {
        name: 'Enhanced Arbiter',
        type: 'arbitrator',
        status: 'active',
        config: JSON.parse('{"role":"Multi-LLM Validation","models":["openai","gemini","claude","internal"],"votingSystem":"weighted_consensus","discrepancyThreshold":2}') as Record<string, any>
      },
      {
        name: 'Rotor',
        type: 'rotor',
        status: 'active',
        config: JSON.parse('{"role":"System Orchestration","workflow":"sequential","commands":["SPIN-UP","SPIN-DOWN","SAVE-ZIP","BOOT","REPLAY-TASK"],"traceability":"complete"}') as Record<string, any>
      },
      {
        name: 'Eyes',
        type: 'eyes',
        status: 'active',
        config: JSON.parse('{"role":"Real-time Monitoring","systemHealth":"continuous","progressTracking":"detailed","anomalyDetection":"immediate"}') as Record<string, any>
      },
      {
        name: 'Vector Engine',
        type: 'vectorizer',
        status: 'active',
        config: JSON.parse('{"embedding_model":"text-embedding-3-large","chunk_size":1000}') as Record<string, any>
      }
    ];

    defaultAgents.forEach(agent => this.createAgent(agent));

    // No fake initialization - system will populate real data only

    // No sample SOPs - only real SOPs generated through the system will be stored
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async getUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      ...insertUser,
      role: insertUser.role || "user",
      id, 
      createdAt: new Date() 
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: string, userUpdate: Partial<User>): Promise<User | undefined> {
    const existing = this.users.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...userUpdate, id: existing.id };
    this.users.set(id, updated);
    return updated;
  }

  async deleteUser(id: string): Promise<boolean> {
    return this.users.delete(id);
  }

  // SOP methods
  async getSOPsByIds(ids: string[]): Promise<SOP[]> {
    return Array.from(this.sops.values()).filter(sop => ids.includes(sop.id));
  }

  // Agent methods
  async getAgents(): Promise<Agent[]> {
    return Array.from(this.agents.values());
  }

  async listAgents(): Promise<Agent[]> {
    return Array.from(this.agents.values());
  }

  // SOP approval methods implementation
  async getSop(id: string): Promise<SOP | undefined> {
    return this.sops.get(id);
  }

  async updateSop(id: string, sop: Partial<SOP>): Promise<SOP | undefined> {
    const existing = this.sops.get(id);
    if (!existing) return undefined;
    
    const updated = { ...existing, ...sop, updatedAt: new Date() };
    this.sops.set(id, updated);
    return updated;
  }

  async createSopApproval(approval: any): Promise<any> {
    const approvalWithId = {
      id: Math.random().toString(36),
      ...approval,
      createdAt: new Date().toISOString()
    };
    
    if (!this.sopApprovals) {
      this.sopApprovals = new Map();
    }
    this.sopApprovals.set(approvalWithId.id, approvalWithId);
    return approvalWithId;
  }

  async getAllSopApprovals(): Promise<any[]> {
    if (!this.sopApprovals) {
      this.sopApprovals = new Map();
    }
    return Array.from(this.sopApprovals.values());
  }

  async getAgent(id: string): Promise<Agent | undefined> {
    return this.agents.get(id);
  }

  async createAgent(insertAgent: InsertAgent): Promise<Agent> {
    const id = randomUUID();
    const agent: Agent = {
      ...insertAgent,
      config: insertAgent.config || {},
      status: insertAgent.status || "inactive",
      id,
      lastHeartbeat: new Date(),
      createdAt: new Date()
    };
    this.agents.set(id, agent);
    return agent;
  }

  async updateAgent(id: string, agent: Partial<Agent>): Promise<Agent | undefined> {
    const existing = this.agents.get(id);
    if (!existing) return undefined;

    const updated = { ...existing, ...agent };
    this.agents.set(id, updated);
    return updated;
  }

  async updateAgentHeartbeat(id: string): Promise<void> {
    const agent = this.agents.get(id);
    if (agent) {
      agent.lastHeartbeat = new Date();
      this.agents.set(id, agent);
    }
  }

  // Document methods
  async getDocuments(): Promise<Document[]> {
    return Array.from(this.documents.values());
  }

  // Removed duplicate getAllDocuments method

  async getDocument(id: string): Promise<Document | undefined> {
    return this.documents.get(id);
  }

  async createDocument(insertDocument: InsertDocument): Promise<Document> {
    const id = randomUUID();
    const document: Document = {
      ...insertDocument,
      content: insertDocument.content || null,
      industry: insertDocument.industry || null,
      vectorized: insertDocument.vectorized || false,
      metadata: insertDocument.metadata || {},
      uploadedBy: insertDocument.uploadedBy || null,
      
      // Production-grade fields with defaults
      sourceUrl: insertDocument.sourceUrl || null,
      sourceHost: insertDocument.sourceHost || null,
      docType: insertDocument.docType || null,
      docClass: insertDocument.docClass || null,
      region: insertDocument.region || 'US',
      series: insertDocument.series || null,
      ccd: insertDocument.ccd || null,
      features: insertDocument.features || [],
      normalizedTitle: insertDocument.normalizedTitle || null,
      sha256: insertDocument.sha256 || null,
      byteSize: insertDocument.byteSize || null,
      retrievedAt: insertDocument.retrievedAt || null,
      etag: insertDocument.etag || null,
      revCode: insertDocument.revCode || null,
      
      // Video fields
      videoDuration: insertDocument.videoDuration || null,
      videoHost: insertDocument.videoHost || null,
      videoHostId: insertDocument.videoHostId || null,
      transcriptText: insertDocument.transcriptText || null,
      transcriptSha256: insertDocument.transcriptSha256 || null,
      
      // Section fields
      parentUrl: insertDocument.parentUrl || null,
      sectionId: insertDocument.sectionId || null,
      sectionTitle: insertDocument.sectionTitle || null,
      
      // Safety flags
      ppeRequired: insertDocument.ppeRequired || false,
      lockoutTagout: insertDocument.lockoutTagout || false,
      electricalHazard: insertDocument.electricalHazard || false,
      needsOcr: insertDocument.needsOcr || false,
      
      id,
      uploadedAt: new Date()
    };
    this.documents.set(id, document);
    return document;
  }

  async updateDocument(id: string, document: Partial<Document>): Promise<Document | undefined> {
    const existing = this.documents.get(id);
    if (!existing) return undefined;

    const updated = { ...existing, ...document };
    this.documents.set(id, updated);
    return updated;
  }

  // SOP methods
  async getSOPs(): Promise<SOP[]> {
    return Array.from(this.sops.values());
  }

  async listSOPs(): Promise<SOP[]> {
    return Array.from(this.sops.values());
  }

  async getSOP(id: string): Promise<SOP | undefined> {
    return this.sops.get(id);
  }

  async createSOP(insertSOP: InsertSOP): Promise<SOP> {
    const id = randomUUID();
    const sop: SOP = {
      ...insertSOP,
      complianceStandards: insertSOP.complianceStandards || null,
      validationStatus: insertSOP.validationStatus || "pending",
      sourceDocumentId: insertSOP.sourceDocumentId || null,
      generatedBy: insertSOP.generatedBy || null,
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.sops.set(id, sop);
    return sop;
  }

  async updateSOP(id: string, sop: Partial<SOP>): Promise<SOP | undefined> {
    const existing = this.sops.get(id);
    if (!existing) return undefined;

    const updated = { ...existing, ...sop, updatedAt: new Date() };
    this.sops.set(id, updated);
    return updated;
  }

  // System metrics methods
  async getLatestSystemMetrics(): Promise<SystemMetrics | undefined> {
    return this.systemMetrics[this.systemMetrics.length - 1];
  }

  async createSystemMetrics(insertMetrics: InsertSystemMetrics): Promise<SystemMetrics> {
    const id = randomUUID();
    const metrics: SystemMetrics = {
      ...insertMetrics,
      id,
      timestamp: new Date()
    };
    this.systemMetrics.push(metrics);
    
    // MEMORY FIX: Keep only last 10 entries to prevent bloat
    if (this.systemMetrics.length > 10) {
      this.systemMetrics = this.systemMetrics.slice(-10);
    }
    
    return metrics;
  }

  // Compliance check methods
  async getComplianceChecks(): Promise<ComplianceCheck[]> {
    return Array.from(this.complianceChecks.values());
  }

  async getComplianceChecksBySOP(sopId: string): Promise<ComplianceCheck[]> {
    return Array.from(this.complianceChecks.values()).filter(check => check.sopId === sopId);
  }

  async createComplianceCheck(insertCheck: InsertComplianceCheck): Promise<ComplianceCheck> {
    const id = randomUUID();
    const check: ComplianceCheck = {
      ...insertCheck,
      sopId: insertCheck.sopId || null,
      details: insertCheck.details || null,
      checkedBy: insertCheck.checkedBy || null,
      id,
      checkedAt: new Date()
    };
    this.complianceChecks.set(id, check);
    return check;
  }

  // Training methods
  async getSOPCorrections(): Promise<SOPCorrection[]> {
    return Array.from(this.sopCorrections.values()).sort((a, b) => 
      new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
    );
  }

  async createSOPCorrection(correction: InsertSOPCorrection): Promise<SOPCorrection> {
    const id = randomUUID();
    const newCorrection: SOPCorrection = {
      ...correction,
      id,
      createdAt: new Date(),
      status: correction.status || 'active',
    };
    this.sopCorrections.set(id, newCorrection);
    return newCorrection;
  }

  async getTrainingRules(): Promise<TrainingRule[]> {
    return Array.from(this.trainingRules.values())
      .filter(rule => rule.isActive)
      .sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority as keyof typeof priorityOrder] - priorityOrder[a.priority as keyof typeof priorityOrder];
      });
  }

  async createTrainingRule(rule: InsertTrainingRule): Promise<TrainingRule> {
    const id = randomUUID();
    const newRule: TrainingRule = {
      ...rule,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
      examples: rule.examples || [],
      isActive: rule.isActive !== undefined ? rule.isActive : true,
    };
    this.trainingRules.set(id, newRule);
    return newRule;
  }

  // SOP Approval methods
  async getSOPApprovals(): Promise<SOPApproval[]> {
    return Array.from(this.sopApprovals.values()).sort((a, b) => 
      new Date(b.submittedAt!).getTime() - new Date(a.submittedAt!).getTime()
    );
  }

  async getSOPApproval(id: string): Promise<SOPApproval | undefined> {
    return this.sopApprovals.get(id);
  }

  async createSOPApproval(approval: InsertSOPApproval): Promise<SOPApproval> {
    const id = randomUUID();
    const newApproval: SOPApproval = {
      ...approval,
      id,
      submittedAt: new Date(),
      updatedAt: new Date(),
      status: approval.status || 'pending',
    };
    this.sopApprovals.set(id, newApproval);
    return newApproval;
  }

  async updateSOPApproval(id: string, approval: Partial<SOPApproval>): Promise<SOPApproval | undefined> {
    const existing = this.sopApprovals.get(id);
    if (!existing) return undefined;
    
    const updated: SOPApproval = {
      ...existing,
      ...approval,
      updatedAt: new Date(),
      reviewedAt: approval.status && approval.status !== 'pending' ? new Date() : existing.reviewedAt,
    };
    this.sopApprovals.set(id, updated);
    return updated;
  }

  async getSOPApprovalsBySOP(sopId: string): Promise<SOPApproval[]> {
    return Array.from(this.sopApprovals.values())
      .filter(approval => approval.sopId === sopId)
      .sort((a, b) => new Date(b.submittedAt!).getTime() - new Date(a.submittedAt!).getTime());
  }

  async getPendingApprovals(): Promise<SOPApproval[]> {
    return Array.from(this.sopApprovals.values())
      .filter(approval => approval.status === 'pending' || approval.status === 'needs_review')
      .sort((a, b) => new Date(a.submittedAt!).getTime() - new Date(b.submittedAt!).getTime());
  }

  // SOP Issue Report methods
  async getSOPIssueReports(): Promise<SOPIssueReport[]> {
    return Array.from(this.sopIssueReports.values()).sort((a, b) => 
      new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
    );
  }

  async getSOPIssueReport(id: string): Promise<SOPIssueReport | undefined> {
    return this.sopIssueReports.get(id);
  }

  async createSOPIssueReport(report: InsertSOPIssueReport): Promise<SOPIssueReport> {
    const id = randomUUID();
    const newReport: SOPIssueReport = {
      ...report,
      id,
      createdAt: new Date(),
      status: report.status || 'open',
    };
    this.sopIssueReports.set(id, newReport);
    return newReport;
  }

  async updateSOPIssueReport(id: string, report: Partial<SOPIssueReport>): Promise<SOPIssueReport | undefined> {
    const existing = this.sopIssueReports.get(id);
    if (!existing) return undefined;
    
    const updated: SOPIssueReport = {
      ...existing,
      ...report,
      resolvedAt: report.status === 'resolved' || report.status === 'closed' ? new Date() : existing.resolvedAt,
    };
    this.sopIssueReports.set(id, updated);
    return updated;
  }

  async getSOPIssueReportsBySOP(sopId: string): Promise<SOPIssueReport[]> {
    return Array.from(this.sopIssueReports.values())
      .filter(report => report.sopId === sopId)
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
  }

  async getOpenIssueReports(): Promise<SOPIssueReport[]> {
    return Array.from(this.sopIssueReports.values())
      .filter(report => report.status === 'open' || report.status === 'in_review')
      .sort((a, b) => {
        const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return severityOrder[b.severity as keyof typeof severityOrder] - severityOrder[a.severity as keyof typeof severityOrder];
      });
  }

  // System Learning methods
  async getSystemLearning(): Promise<SystemLearning[]> {
    return Array.from(this.systemLearning.values()).sort((a, b) => 
      (b.confidence || 0) - (a.confidence || 0)
    );
  }

  async createSystemLearning(learning: InsertSystemLearning): Promise<SystemLearning> {
    const id = randomUUID();
    const newLearning: SystemLearning = {
      ...learning,
      id,
      lastEncountered: new Date(),
      createdAt: new Date(),
      confidence: learning.confidence || 50,
      context: learning.context ?? {},
    };
    this.systemLearning.set(id, newLearning);
    return newLearning;
  }

  async updateSystemLearning(id: string, learning: Partial<SystemLearning>): Promise<SystemLearning | undefined> {
    const existing = this.systemLearning.get(id);
    if (!existing) return undefined;
    
    const updated: SystemLearning = {
      ...existing,
      ...learning,
    };
    this.systemLearning.set(id, updated);
    return updated;
  }

  async getLearningByCategory(category: string): Promise<SystemLearning[]> {
    return Array.from(this.systemLearning.values())
      .filter(learning => learning.category === category)
      .sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
  }

  async incrementLearningEncounter(pattern: string): Promise<void> {
    const existing = Array.from(this.systemLearning.values()).find(l => l.pattern === pattern);
    if (existing) {
      await this.updateSystemLearning(existing.id, {
        timesEncountered: (existing.timesEncountered || 0) + 1,
        lastEncountered: new Date(),
      });
    }
  }

  // SOP Version methods
  async getSOPVersions(sopId: string): Promise<SOPVersion[]> {
    return Array.from(this.sopVersions.values())
      .filter(version => version.sopId === sopId)
      .sort((a, b) => b.version - a.version);
  }

  async createSOPVersion(version: InsertSOPVersion): Promise<SOPVersion> {
    const id = randomUUID();
    const newVersion: SOPVersion = {
      ...version,
      id,
      createdAt: new Date(),
      isActive: version.isActive !== undefined ? version.isActive : false,
    };
    this.sopVersions.set(id, newVersion);
    return newVersion;
  }

  async getActiveSOPVersion(sopId: string): Promise<SOPVersion | undefined> {
    return Array.from(this.sopVersions.values())
      .find(version => version.sopId === sopId && version.isActive);
  }

  async setActiveVersion(sopId: string, versionId: string): Promise<SOPVersion | undefined> {
    // Deactivate all versions for this SOP
    const versions = Array.from(this.sopVersions.values()).filter(v => v.sopId === sopId);
    versions.forEach(v => {
      this.sopVersions.set(v.id, { ...v, isActive: false });
    });
    
    // Activate the specified version
    const targetVersion = this.sopVersions.get(versionId);
    if (!targetVersion) return undefined;
    
    const updatedVersion = { ...targetVersion, isActive: true };
    this.sopVersions.set(versionId, updatedVersion);
    return updatedVersion;
  }

  // Intelligent Storage Routing
  async routeSOPStorage(sopContent: string, metadata: any): Promise<{qdrantId?: string, mongoId?: string, location: string}> {
    const qdrantId = randomUUID();
    const mongoId = randomUUID();
    
    // Determine storage routing based on content analysis
    const contentLength = sopContent.length;
    const hasComplexProcedures = sopContent.includes('PROCEDURE_SECTION') && sopContent.includes('TROUBLESHOOTING');
    const hasSafetyData = sopContent.includes('SAFETY') && sopContent.includes('HAZARD');
    
    let location = 'both'; // Default to both for comprehensive SOPs
    
    if (contentLength < 1000 && !hasComplexProcedures) {
      // Simple SOPs go to MongoDB only
      location = 'mongodb';
      this.mongoStorage.set(mongoId, { content: sopContent, metadata, timestamp: new Date() });
    } else if (hasSafetyData && hasComplexProcedures) {
      // Complex safety-critical SOPs go to both for redundancy
      location = 'both';
      this.qdrantStorage.set(qdrantId, { 
        vectors: this.generateMockVectors(sopContent), 
        metadata, 
        timestamp: new Date() 
      });
      this.mongoStorage.set(mongoId, { content: sopContent, metadata, timestamp: new Date() });
    } else {
      // Standard procedures go to Qdrant for semantic search
      location = 'qdrant';
      this.qdrantStorage.set(qdrantId, { 
        vectors: this.generateMockVectors(sopContent), 
        metadata, 
        timestamp: new Date() 
      });
    }
    
    return {
      qdrantId: location === 'qdrant' || location === 'both' ? qdrantId : undefined,
      mongoId: location === 'mongodb' || location === 'both' ? mongoId : undefined,
      location
    };
  }

  async searchApprovedSOPs(query: string, filters?: any): Promise<{sops: SOP[], vectors?: any[]}> {
    // Get approved SOPs
    const approvedSOPs = Array.from(this.sops.values())
      .filter(sop => sop.validationStatus === 'approved' || sop.validationStatus === 'validated');
    
    // Simple text search (in real implementation, this would use Qdrant similarity search)
    const matchingSOPs = approvedSOPs.filter(sop => 
      sop.title.toLowerCase().includes(query.toLowerCase()) ||
      sop.content.toLowerCase().includes(query.toLowerCase()) ||
      sop.industry.toLowerCase().includes(query.toLowerCase())
    );
    
    return {
      sops: matchingSOPs,
      vectors: Array.from(this.qdrantStorage.values()).slice(0, 5) // Mock vector results
    };
  }

  private generateMockVectors(content: string): number[] {
    // Generate mock embedding vectors (in real implementation, use OpenAI embeddings)
    const hash = content.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    return Array.from({ length: 1536 }, (_, i) => Math.sin(hash + i) * 0.5);
  }

  // Storage Decision methods
  async createStorageDecision(decision: InsertStorageDecision): Promise<StorageDecision> {
    const id = randomUUID();
    const newDecision: StorageDecision = {
      ...decision,
      id,
      createdAt: new Date(),
      characteristics: decision.characteristics ?? {},
      performance: decision.performance ?? {},
    };
    this.storageDecisions.set(id, newDecision);
    return newDecision;
  }

  async getStorageDecisions(): Promise<StorageDecision[]> {
    return Array.from(this.storageDecisions.values()).sort((a, b) => 
      new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
    );
  }

  async getStorageDecisionsBySOP(sopId: string): Promise<StorageDecision[]> {
    return Array.from(this.storageDecisions.values())
      .filter(decision => decision.sopId === sopId)
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
  }

  // SOP Failure methods
  async createSOPFailure(failure: InsertSOPFailure): Promise<SOPFailure> {
    const id = randomUUID();
    const newFailure: SOPFailure = {
      ...failure,
      id,
      createdAt: new Date(),
      resolvedAt: null,
      severity: failure.severity ?? 'medium',
      resolved: failure.resolved ?? false,
    };
    this.sopFailures.set(id, newFailure);
    return newFailure;
  }

  async getSOPFailures(): Promise<SOPFailure[]> {
    return Array.from(this.sopFailures.values()).sort((a, b) => 
      new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
    );
  }

  async getUnresolvedFailures(): Promise<SOPFailure[]> {
    return Array.from(this.sopFailures.values())
      .filter(failure => !failure.resolved)
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
  }

  async resolveSOPFailure(id: string, correctionApplied: string): Promise<SOPFailure | undefined> {
    const failure = this.sopFailures.get(id);
    if (!failure) return undefined;

    const updatedFailure = {
      ...failure,
      resolved: true,
      correctionApplied,
      resolvedAt: new Date(),
    };
    this.sopFailures.set(id, updatedFailure);
    return updatedFailure;
  }


  // Additional methods required by routes
  async getAllDocuments(): Promise<Document[]> {
    return this.getDocuments();
  }

  async getAllSOPs(): Promise<SOP[]> {
    return this.getSOPs();
  }

  // Search documents by content
  async searchDocuments(query: string): Promise<Document[]> {
    const queryLower = query.toLowerCase();
    return Array.from(this.documents.values()).filter(doc => 
      doc.content?.toLowerCase().includes(queryLower) ||
      doc.originalName?.toLowerCase().includes(queryLower) ||
      doc.filename?.toLowerCase().includes(queryLower)
    );
  }

  // Remove duplicate listAgents method
}

// Import database for PostgreSQL storage
import { db } from './db';
import { users, agents, documents, sops, systemMetrics, complianceChecks, sopCorrections, trainingRules, sopApprovals, sopIssueReports, systemLearning, sopVersions, storageDecisions, sopFailures } from '@shared/schema';
import { eq, desc } from 'drizzle-orm';

// PostgreSQL Database Storage Implementation
class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async createUser(user: InsertUser): Promise<User> {
    const [created] = await db.insert(users).values(user).returning();
    return created;
  }

  async updateUser(id: string, user: Partial<User>): Promise<User | undefined> {
    const [updated] = await db.update(users).set(user).where(eq(users.id, id)).returning();
    return updated || undefined;
  }

  async deleteUser(id: string): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Agent methods
  async getAgents(): Promise<Agent[]> {
    return await db.select().from(agents);
  }

  async listAgents(): Promise<Agent[]> {
    return this.getAgents();
  }

  async getAgent(id: string): Promise<Agent | undefined> {
    const [agent] = await db.select().from(agents).where(eq(agents.id, id));
    return agent || undefined;
  }

  async createAgent(agent: InsertAgent): Promise<Agent> {
    const [created] = await db.insert(agents).values(agent).returning();
    return created;
  }

  async updateAgent(id: string, agent: Partial<Agent>): Promise<Agent | undefined> {
    const [updated] = await db.update(agents).set(agent).where(eq(agents.id, id)).returning();
    return updated || undefined;
  }

  async updateAgentHeartbeat(id: string): Promise<void> {
    await db.update(agents).set({ lastHeartbeat: new Date() }).where(eq(agents.id, id));
  }

  // Document methods
  async getDocuments(): Promise<Document[]> {
    return await db.select().from(documents);
  }

  async getAllDocuments(): Promise<Document[]> {
    return this.getDocuments();
  }

  async getDocument(id: string): Promise<Document | undefined> {
    const [document] = await db.select().from(documents).where(eq(documents.id, id));
    return document || undefined;
  }

  async createDocument(document: InsertDocument): Promise<Document> {
    const [created] = await db.insert(documents).values(document).returning();
    return created;
  }

  async updateDocument(id: string, document: Partial<Document>): Promise<Document | undefined> {
    const [updated] = await db.update(documents).set(document).where(eq(documents.id, id)).returning();
    return updated || undefined;
  }

  // SOP methods
  async getSOPs(): Promise<SOP[]> {
    return await db.select().from(sops);
  }

  async listSOPs(): Promise<SOP[]> {
    return this.getSOPs();
  }

  async getAllSOPs(): Promise<SOP[]> {
    return this.getSOPs();
  }

  async getSOP(id: string): Promise<SOP | undefined> {
    const [sop] = await db.select().from(sops).where(eq(sops.id, id));
    return sop || undefined;
  }

  async createSOP(sop: InsertSOP): Promise<SOP> {
    const [created] = await db.insert(sops).values(sop).returning();
    return created;
  }

  async updateSOP(id: string, sop: Partial<SOP>): Promise<SOP | undefined> {
    const [updated] = await db.update(sops).set(sop).where(eq(sops.id, id)).returning();
    return updated || undefined;
  }

  async getSOPsByIds(ids: string[]): Promise<SOP[]> {
    if (ids.length === 0) return [];
    return await db.select().from(sops).where(eq(sops.id, ids[0])); // Simple implementation
  }

  // System metrics methods
  async getLatestSystemMetrics(): Promise<SystemMetrics | undefined> {
    const [metrics] = await db.select().from(systemMetrics).orderBy(desc(systemMetrics.timestamp)).limit(1);
    return metrics || undefined;
  }

  async createSystemMetrics(metrics: InsertSystemMetrics): Promise<SystemMetrics> {
    const [created] = await db.insert(systemMetrics).values(metrics).returning();
    return created;
  }

  // Compliance check methods
  async getComplianceChecks(): Promise<ComplianceCheck[]> {
    return await db.select().from(complianceChecks);
  }

  async getComplianceChecksBySOP(sopId: string): Promise<ComplianceCheck[]> {
    return await db.select().from(complianceChecks).where(eq(complianceChecks.sopId, sopId));
  }

  async createComplianceCheck(check: InsertComplianceCheck): Promise<ComplianceCheck> {
    const [created] = await db.insert(complianceChecks).values(check).returning();
    return created;
  }

  // Training methods
  async getSOPCorrections(): Promise<SOPCorrection[]> {
    return await db.select().from(sopCorrections);
  }

  async createSOPCorrection(correction: InsertSOPCorrection): Promise<SOPCorrection> {
    const [created] = await db.insert(sopCorrections).values(correction).returning();
    return created;
  }

  async getTrainingRules(): Promise<TrainingRule[]> {
    return await db.select().from(trainingRules);
  }

  async createTrainingRule(rule: InsertTrainingRule): Promise<TrainingRule> {
    const [created] = await db.insert(trainingRules).values(rule).returning();
    return created;
  }

  // SOP Approval methods
  async getSOPApprovals(): Promise<SOPApproval[]> {
    return await db.select().from(sopApprovals);
  }

  async getAllSopApprovals(): Promise<SOPApproval[]> {
    return this.getSOPApprovals();
  }

  async getSOPApproval(id: string): Promise<SOPApproval | undefined> {
    const [approval] = await db.select().from(sopApprovals).where(eq(sopApprovals.id, id));
    return approval || undefined;
  }

  async createSOPApproval(approval: InsertSOPApproval): Promise<SOPApproval> {
    const [created] = await db.insert(sopApprovals).values(approval).returning();
    return created;
  }

  async updateSOPApproval(id: string, approval: Partial<SOPApproval>): Promise<SOPApproval | undefined> {
    const [updated] = await db.update(sopApprovals).set(approval).where(eq(sopApprovals.id, id)).returning();
    return updated || undefined;
  }

  async getSOPApprovalsBySOP(sopId: string): Promise<SOPApproval[]> {
    return await db.select().from(sopApprovals).where(eq(sopApprovals.sopId, sopId));
  }

  async getPendingApprovals(): Promise<SOPApproval[]> {
    return await db.select().from(sopApprovals).where(eq(sopApprovals.status, 'pending'));
  }

  // Implement remaining methods with basic database operations...
  async getSOPIssueReports(): Promise<SOPIssueReport[]> {
    return await db.select().from(sopIssueReports);
  }

  async getSOPIssueReport(id: string): Promise<SOPIssueReport | undefined> {
    const [report] = await db.select().from(sopIssueReports).where(eq(sopIssueReports.id, id));
    return report || undefined;
  }

  async createSOPIssueReport(report: InsertSOPIssueReport): Promise<SOPIssueReport> {
    const [created] = await db.insert(sopIssueReports).values(report).returning();
    return created;
  }

  async updateSOPIssueReport(id: string, report: Partial<SOPIssueReport>): Promise<SOPIssueReport | undefined> {
    const [updated] = await db.update(sopIssueReports).set(report).where(eq(sopIssueReports.id, id)).returning();
    return updated || undefined;
  }

  async getSOPIssueReportsBySOP(sopId: string): Promise<SOPIssueReport[]> {
    return await db.select().from(sopIssueReports).where(eq(sopIssueReports.sopId, sopId));
  }

  async getOpenIssueReports(): Promise<SOPIssueReport[]> {
    return await db.select().from(sopIssueReports).where(eq(sopIssueReports.status, 'open'));
  }

  // Stub implementations for remaining methods
  async getSystemLearning(): Promise<SystemLearning[]> { return []; }
  async createSystemLearning(learning: InsertSystemLearning): Promise<SystemLearning> { throw new Error('Not implemented'); }
  async updateSystemLearning(id: string, learning: Partial<SystemLearning>): Promise<SystemLearning | undefined> { return undefined; }
  async getLearningByCategory(category: string): Promise<SystemLearning[]> { return []; }
  async incrementLearningEncounter(pattern: string): Promise<void> {}
  async getSOPVersions(): Promise<SOPVersion[]> { return []; }
  async getSOPVersion(id: string): Promise<SOPVersion | undefined> { return undefined; }
  async createSOPVersion(version: InsertSOPVersion): Promise<SOPVersion> { throw new Error('Not implemented'); }
  async updateSOPVersion(id: string, version: Partial<SOPVersion>): Promise<SOPVersion | undefined> { return undefined; }
  async getSOPVersionsBySOP(sopId: string): Promise<SOPVersion[]> { return []; }
  async getActiveSOPVersion(sopId: string): Promise<SOPVersion | undefined> { return undefined; }
  async getStorageDecisions(): Promise<StorageDecision[]> { return []; }
  async createStorageDecision(decision: InsertStorageDecision): Promise<StorageDecision> { throw new Error('Not implemented'); }
  async getStorageDecisionsBySOP(sopId: string): Promise<StorageDecision[]> { return []; }
  async getSOPFailures(): Promise<SOPFailure[]> { return []; }
  async getSOPFailure(id: string): Promise<SOPFailure | undefined> { return undefined; }
  async createSOPFailure(failure: InsertSOPFailure): Promise<SOPFailure> { throw new Error('Not implemented'); }
  async updateSOPFailure(id: string, failure: Partial<SOPFailure>): Promise<SOPFailure | undefined> { return undefined; }
  async getSOPFailuresBySOP(sopId: string): Promise<SOPFailure[]> { return []; }
  async getUnresolvedFailures(): Promise<SOPFailure[]> { return []; }
  async markFailureResolved(id: string, correctionApplied: string): Promise<SOPFailure | undefined> { return undefined; }

  // Search documents by content
  async searchDocuments(query: string): Promise<Document[]> {
    const { like } = await import('drizzle-orm');
    const queryPattern = `%${query}%`;
    return await db.select().from(documents).where(
      like(documents.content, queryPattern)
    ).limit(10);
  }
}

// STORAGE INITIALIZATION - MongoDB primary storage
console.log('🔧 Initializing MongoDB storage...');

const mongoStorage = new MongoStorage(process.env.MONGODB_URI || "mongodb+srv://ai-sop-dev.nezgetk.mongodb.net/?authSource=%24external&authMechanism=MONGODB-X509&retryWrites=true&w=majority&appName=ai-sop-dev");

// Attempt MongoDB connection
mongoStorage.connect().then(() => {
  console.log('🗄️ MongoDB storage activated - Primary storage ready');
  (global as any).hasMongoDB = true;
}).catch(error => {
  console.error('⚠️ MongoDB connection failed:', error.message);
  (global as any).hasMongoDB = false;
});

export const storage = mongoStorage;
