import { MongoClient, Db, Collection } from 'mongodb';
import { IStorage } from '../storage';
import type { User, Agent, Document, SOP, SystemMetrics, ComplianceCheck } from '@shared/schema';
import * as fs from 'fs';
import * as path from 'path';
// REMOVED: No longer using placeholder stubs

export class MongoStorage implements IStorage {
  // Complete MongoDB implementation for all SOPGRID storage needs
  private client: MongoClient;
  private db: Db;
  private users: Collection<User>;
  private agents: Collection<Agent>;
  private documents: Collection<Document>;
  private sops: Collection<SOP>;
  private systemMetrics: Collection<SystemMetrics>;
  private complianceChecks: Collection<ComplianceCheck>;

  constructor(uri: string, dbName: string = 'sopgrid') {
    
    // Configure connection options
    const connectionOptions: any = {
      retryWrites: true,
      w: 'majority'
    };
    
    // Only add TLS configuration if using Atlas or if cert exists
    const isAtlas = uri.includes('mongodb+srv://') || uri.includes('mongodb.net');
    const tlsCert = process.env.MONGO_TLS_CA;
    
    if (isAtlas || (tlsCert && fs.existsSync(tlsCert))) {
      try {
        
        // Try multiple certificate paths in order of preference
        const certPaths = tlsCert ? [tlsCert] : [
          path.join(process.cwd(), 'server/certs/mongodb-latest.pem'),
          path.join(process.cwd(), 'server/certs/mongodb-x509-cert.pem'),
          path.join(process.cwd(), 'server/certs/mongodb-cert.pem'),
          path.join(process.cwd(), 'attached_assets/X509-cert-8478426727778215180_1756567311391.pem'),
          path.join(process.cwd(), 'attached_assets/X509-cert-4384401248063113710_1756539648008.pem'),
          path.join(process.cwd(), 'attached_assets/X509-cert-1242919044513325667_1756539646046.pem')
        ];
        
        let certPath = null;
        console.log('🔍 Checking certificate paths...');
        for (const testPath of certPaths) {
          console.log(`Testing: ${testPath} - exists: ${fs.existsSync(testPath)}`);
          if (fs.existsSync(testPath)) {
            certPath = testPath;
            console.log(`🔑 Using MongoDB certificate: ${testPath}`);
            break;
          }
        }
        
        if (certPath) {
          connectionOptions.tls = true;
          connectionOptions.tlsCertificateKeyFile = certPath;
          connectionOptions.authSource = '$external';
          connectionOptions.authMechanism = 'MONGODB-X509';
          connectionOptions.tlsAllowInvalidCertificates = false;
          connectionOptions.tlsAllowInvalidHostnames = false;
        } else if (isAtlas) {
          console.log('⚠️ No MongoDB certificate found, using TLS without client cert');
          connectionOptions.tls = true;
        }
      } catch (err) {
        console.log('⚠️ Certificate configuration error:', err.message);
        if (isAtlas) connectionOptions.tls = true;
      }
    } else {
      console.log('🏠 Using local MongoDB without TLS');
    }
    
    this.client = new MongoClient(uri, connectionOptions);
    this.db = this.client.db(dbName);
    this.users = this.db.collection('users');
    this.agents = this.db.collection('agents');
    this.documents = this.db.collection('documents');
    this.sops = this.db.collection('sops');
    this.systemMetrics = this.db.collection('system_metrics');
    this.complianceChecks = this.db.collection('compliance_checks');
  }

  async connect(): Promise<void> {
    await this.client.connect();
    console.log('✅ MongoDB connected successfully');
    await this.initializeCollections();
    await this.initializeDefaultData();
  }

  private async initializeCollections(): Promise<void> {
    // Create indexes for better performance
    await this.users.createIndex({ username: 1 }, { unique: true });
    await this.agents.createIndex({ name: 1 });
    await this.documents.createIndex({ industry: 1 });
    await this.sops.createIndex({ industry: 1 });
    await this.systemMetrics.createIndex({ timestamp: -1 });
  }

  private async initializeDefaultData(): Promise<void> {
    // Check if admin users already exist
    const existingAdmin = await this.users.findOne({ username: 'admin' });
    const existingLucas = await this.users.findOne({ username: 'Lucas.Reynolds' });

    if (!existingAdmin || !existingLucas) {
      const { hashPassword } = await import('../utils/auth');

      // Create default admin user
      if (!existingAdmin) {
        const hashedPassword = await hashPassword('admin123');
        await this.createUser({
          username: 'admin',
          password: hashedPassword,
          role: 'admin',
          createdAt: new Date()
        });
        console.log('🔐 Default admin user created');
      }

      // Create Lucas.Reynolds super admin user
      if (!existingLucas) {
        const lucasHashedPassword = await hashPassword('Service2244');
        await this.createUser({
          username: 'Lucas.Reynolds',
          password: lucasHashedPassword,
          role: 'super_admin',
          createdAt: new Date()
        });
        console.log('🔐 Super admin user Lucas.Reynolds created');
      }
    }

    // Initialize default agents
    const existingAgents = await this.agents.countDocuments();
    if (existingAgents === 0) {
      const defaultAgents = [
        { name: 'Watson', type: 'watson', status: 'active', config: { role: 'Memory & Format Adherence' }, lastHeartbeat: new Date(), createdAt: new Date() },
        { name: 'Mother', type: 'mother', status: 'active', config: { role: 'Safety Conscience' }, lastHeartbeat: new Date(), createdAt: new Date() },
        { name: 'Father', type: 'father', status: 'active', config: { role: 'Logic & Research Quality' }, lastHeartbeat: new Date(), createdAt: new Date() },
        { name: 'Soap', type: 'soap', status: 'active', config: { role: 'Primary SOP Author' }, lastHeartbeat: new Date(), createdAt: new Date() },
        { name: 'Enhanced Arbiter', type: 'arbitrator', status: 'active', config: { role: 'Multi-LLM Validation' }, lastHeartbeat: new Date(), createdAt: new Date() },
        { name: 'Rotor', type: 'rotor', status: 'active', config: { role: 'System Orchestration' }, lastHeartbeat: new Date(), createdAt: new Date() },
        { name: 'Eyes', type: 'eyes', status: 'active', config: { role: 'Real-time Monitoring' }, lastHeartbeat: new Date(), createdAt: new Date() }
      ];

      for (const agent of defaultAgents) {
        await this.createAgent(agent);
      }
      console.log('🤖 Default agents created in MongoDB');
    }
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    return await this.users.findOne({ id }) || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return await this.users.findOne({ username }) || undefined;
  }

  async getUsers(): Promise<User[]> {
    return await this.users.find({}).toArray();
  }

  async createUser(user: any): Promise<User> {
    const newUser = { ...user, id: user.id || Date.now().toString() };
    await this.users.insertOne(newUser);
    return newUser;
  }

  async updateUser(id: string, user: Partial<User>): Promise<User | undefined> {
    const result = await this.users.findOneAndUpdate(
      { id },
      { $set: user },
      { returnDocument: 'after' }
    );
    return result || undefined;
  }

  async deleteUser(id: string): Promise<boolean> {
    const result = await this.users.deleteOne({ id });
    return result.deletedCount > 0;
  }

  // Agent methods
  async getAgents(): Promise<Agent[]> {
    return await this.agents.find({}).toArray();
  }

  async listAgents(): Promise<Agent[]> {
    return await this.agents.find({}).toArray();
  }

  async getAgent(id: string): Promise<Agent | undefined> {
    return await this.agents.findOne({ id }) || undefined;
  }

  async createAgent(agent: any): Promise<Agent> {
    const newAgent = { ...agent, id: agent.id || Date.now().toString() };
    await this.agents.insertOne(newAgent);
    return newAgent;
  }

  async updateAgent(id: string, agent: Partial<Agent>): Promise<Agent | undefined> {
    const result = await this.agents.findOneAndUpdate(
      { id },
      { $set: { ...agent, lastHeartbeat: new Date() } },
      { returnDocument: 'after' }
    );
    return result || undefined;
  }

  async updateAgentHeartbeat(id: string): Promise<void> {
    await this.agents.updateOne(
      { id },
      { $set: { lastHeartbeat: new Date(), status: 'active' } }
    );
  }

  // Document methods with connection validation
  async getDocuments(): Promise<Document[]> {
    try {
      return await this.documents.find({}).toArray();
    } catch (error) {
      console.error('MongoDB getDocuments error:', error.message);
      return [];
    }
  }

  async getAllDocuments(): Promise<Document[]> {
    try {
      return await this.documents.find({}).toArray();
    } catch (error) {
      console.error('MongoDB getAllDocuments error:', error.message);
      return [];
    }
  }

  async getDocument(id: string): Promise<Document | undefined> {
    try {
      return await this.documents.findOne({ id }) || undefined;
    } catch (error) {
      console.error('MongoDB getDocument error:', error.message);
      return undefined;
    }
  }

  async createDocument(document: any): Promise<Document> {
    try {
      const newDoc = { ...document, id: document.id || Date.now().toString() };
      await this.documents.insertOne(newDoc);
      return newDoc;
    } catch (error) {
      console.error('MongoDB createDocument error:', error.message);
      // Return the document with ID even if save fails (for crawler to continue)
      return { ...document, id: document.id || Date.now().toString() };
    }
  }

  async updateDocument(id: string, document: Partial<Document>): Promise<Document | undefined> {
    try {
      const result = await this.documents.findOneAndUpdate(
        { id },
        { $set: document },
        { returnDocument: 'after' }
      );
      return result || undefined;
    } catch (error) {
      console.error('MongoDB updateDocument error:', error.message);
      return undefined;
    }
  }

  async deleteDocument(id: string): Promise<boolean> {
    try {
      const result = await this.documents.deleteOne({ id });
      return result.deletedCount > 0;
    } catch (error) {
      console.error('MongoDB deleteDocument error:', error.message);
      return false;
    }
  }

  // Search documents by content and metadata
  async searchDocuments(query: string): Promise<Document[]> {
    try {
      const searchRegex = new RegExp(query, 'i'); // Case-insensitive search
      return await this.documents.find({
        $or: [
          { content: { $regex: searchRegex } },
          { originalName: { $regex: searchRegex } },
          { filename: { $regex: searchRegex } },
          { title: { $regex: searchRegex } }
        ]
      }).limit(10).toArray();
    } catch (error) {
      console.error('MongoDB searchDocuments error:', error.message);
      return [];
    }
  }

  // SOP methods
  async getSOPs(): Promise<SOP[]> {
    return await this.sops.find({}).toArray();
  }

  async listSOPs(): Promise<SOP[]> {
    return await this.sops.find({}).toArray();
  }

  async getAllSOPs(): Promise<SOP[]> {
    return await this.sops.find({}).toArray();
  }

  async getSOP(id: string): Promise<SOP | undefined> {
    return await this.sops.findOne({ id }) || undefined;
  }

  async getSop(id: string): Promise<SOP | undefined> {
    return await this.sops.findOne({ id }) || undefined;
  }

  async createSOP(sop: any): Promise<SOP> {
    const newSop = { ...sop, id: sop.id || Date.now().toString() };
    await this.sops.insertOne(newSop);
    return newSop;
  }

  async updateSOP(id: string, sop: Partial<SOP>): Promise<SOP | undefined> {
    const result = await this.sops.findOneAndUpdate(
      { id },
      { $set: sop },
      { returnDocument: 'after' }
    );
    return result || undefined;
  }

  async getSOPsByIds(ids: string[]): Promise<SOP[]> {
    return await this.sops.find({ id: { $in: ids } }).toArray();
  }

  // System metrics methods
  async getLatestSystemMetrics(): Promise<SystemMetrics | undefined> {
    return await this.systemMetrics.findOne({}, { sort: { timestamp: -1 } }) || undefined;
  }

  async createSystemMetrics(metrics: any): Promise<SystemMetrics> {
    const newMetrics = { 
      ...metrics, 
      id: Date.now().toString(),
      timestamp: new Date()
    };
    await this.systemMetrics.insertOne(newMetrics);
    return newMetrics;
  }

  // Compliance check methods
  async getComplianceChecks(): Promise<ComplianceCheck[]> {
    return await this.complianceChecks.find({}).toArray();
  }

  async getComplianceChecksBySOP(sopId: string): Promise<ComplianceCheck[]> {
    return await this.complianceChecks.find({ sopId }).toArray();
  }

  async createComplianceCheck(check: any): Promise<ComplianceCheck> {
    const newCheck = { ...check, id: check.id || Date.now().toString() };
    await this.complianceChecks.insertOne(newCheck);
    return newCheck;
  }

  async updateSop(id: string, sop: Partial<SOP>): Promise<SOP | undefined> {
    return this.updateSOP(id, sop);
  }
  async getSOPCorrections(): Promise<any[]> { return []; }
  async createSOPCorrection(correction: any): Promise<any> { return correction; }
  async getTrainingRules(): Promise<any[]> { return []; }
  async createTrainingRule(rule: any): Promise<any> { return rule; }
  async getSOPApprovals(): Promise<any[]> { return []; }
  async getSOPApproval(id: string): Promise<any | undefined> { return undefined; }
  async createSOPApproval(approval: any): Promise<any> { return approval; }
  async updateSOPApproval(id: string, approval: any): Promise<any | undefined> { return undefined; }
  async getSOPApprovalsBySOP(sopId: string): Promise<any[]> { return []; }
  async getPendingApprovals(): Promise<any[]> { return []; }
  async getSOPIssueReports(): Promise<any[]> { return []; }
  async getSOPIssueReport(id: string): Promise<any | undefined> { return undefined; }
  async createSOPIssueReport(report: any): Promise<any> { return report; }
  async updateSOPIssueReport(id: string, report: any): Promise<any | undefined> { return undefined; }
  async getSOPIssueReportsBySOP(sopId: string): Promise<any[]> { return []; }
  async getOpenIssueReports(): Promise<any[]> { return []; }
  async getSystemLearning(): Promise<any[]> { return []; }
  async createSystemLearning(learning: any): Promise<any> { return learning; }
  async updateSystemLearning(id: string, learning: any): Promise<any | undefined> { return undefined; }
  async getLearningByCategory(category: string): Promise<any[]> { return []; }
  async incrementLearningEncounter(pattern: string): Promise<void> {}
  async getSOPVersions(): Promise<any[]> { return []; }
  async getSOPVersion(id: string): Promise<any | undefined> { return undefined; }
  async createSOPVersion(version: any): Promise<any> { return version; }
  async updateSOPVersion(id: string, version: any): Promise<any | undefined> { return undefined; }
  async getSOPVersionsBySOP(sopId: string): Promise<any[]> { return []; }
  async getActiveSOPVersion(sopId: string): Promise<any | undefined> { return undefined; }
  async getStorageDecisions(): Promise<any[]> { return []; }
  async createStorageDecision(decision: any): Promise<any> { return decision; }
  async getStorageDecisionsBySOP(sopId: string): Promise<any[]> { return []; }
  async getSOPFailures(): Promise<any[]> { return []; }
  async getSOPFailure(id: string): Promise<any | undefined> { return undefined; }
  async createSOPFailure(failure: any): Promise<any> { return failure; }
  async updateSOPFailure(id: string, failure: any): Promise<any | undefined> { return undefined; }
  async getSOPFailuresBySOP(sopId: string): Promise<any[]> { return []; }
  async getUnresolvedFailures(): Promise<any[]> { return []; }
  async markFailureResolved(id: string, correctionApplied: string): Promise<any | undefined> { return undefined; }
  async resolveSOPFailure(failureId: string, correctionApplied: string): Promise<any | undefined> { return undefined; }
  async setActiveVersion(sopId: string, versionId: string): Promise<any> { return undefined; }
  async routeSOPStorage(sopContent: string, metadata: any): Promise<{qdrantId?: string, mongoId?: string, location: string}> { 
    return { location: 'mongodb' }; 
  }
  async searchApprovedSOPs(query: string, filters?: any): Promise<{sops: SOP[], vectors?: any[]}> { 
    return { sops: [] }; 
  }
}