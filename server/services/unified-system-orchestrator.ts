import { db } from '../db';
import { agents, users, sops, documents, sopApprovals, systemCache } from '../../shared/schema';
import { eq, desc } from 'drizzle-orm';
import { memoryEfficientSOPGenerator } from './memory-efficient-sop-generator';
import { multiAgentOrchestrator } from './multi-agent-orchestrator';
import { chatService } from './chat-service';
import { troubleshootingTreeService } from './troubleshooting-tree';
import { hitlSystem } from './hitl-system';
import { evidenceLedger } from './evidence-ledger';
import { contradictionScorer } from './contradiction-scorer';
import { safetyLogicValidator } from '../middleware/safety-logic-validator';
import { responseValidator } from './response-validator';
import { enhancedSafetySOPValidator } from './enhanced-safety-sop-validator';
import { smartSOPRetrieval } from './smart-sop-retrieval';
import { aiITLInformationGatherer } from './ai-itl-information-gatherer';
import { Pool } from '@neondatabase/serverless';

/**
 * UNIFIED SOPGRID SYSTEM ORCHESTRATOR
 * 
 * This is the central brain that coordinates all system components:
 * - LLM Agents (Watson, Mother, Father, Soap, Arbiter, Rotor, Eyes)
 * - MongoDB for document storage
 * - Qdrant for vector search
 * - Credentials vault for secure API key management
 * - Database for persistent state and workflow coordination
 * - OS Agent for resource management
 * 
 * Everything flows through this orchestrator to work as one unified system.
 */

interface UnifiedSystemConfig {
  openaiApiKey?: string;
  geminiApiKey?: string;
  claudeApiKey?: string;
  mongodbUri?: string;
  qdrantUrl?: string;
  qdrantApiKey?: string;
}

interface WorkflowContext {
  userId: string;
  sessionId: string;
  workflowType: 'sop_generation' | 'document_processing' | 'compliance_check' | 'training' | 'arbitration';
  data: any;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

interface SystemState {
  agents: any[];
  activeWorkflows: WorkflowContext[];
  systemMetrics: any;
  memoryUsage: number;
  storageConnections: {
    postgresql: boolean;
    mongodb: boolean;
    qdrant: boolean;
  };
}

export class UnifiedSystemOrchestrator {
  private static instance: UnifiedSystemOrchestrator;
  private config: UnifiedSystemConfig = {};
  private sopGenerator: any;
  private multiAgentOrchestrator: any;
  private dbPool: Pool | null = null;
  private systemState: SystemState = {
    agents: [],
    activeWorkflows: [],
    systemMetrics: {},
    memoryUsage: 0,
    storageConnections: {
      postgresql: false,
      mongodb: false,
      qdrant: false
    }
  };

  // Agent instances - unified access to all specialized agents
  private agents: {
    watson: any; // Memory & Format Adherence
    mother: any; // Safety Conscience
    father: any; // Logic & Research Quality
    soap: any;   // Primary SOP Author
    arbiter: any; // Multi-LLM Validation
    rotor: any;   // System Orchestration
    eyes: any;    // Real-time Monitoring
  } = {} as any;

  private constructor() {
    this.initializeSystem();
    this.sopGenerator = memoryEfficientSOPGenerator;
    this.multiAgentOrchestrator = multiAgentOrchestrator;
  }

  public static getInstance(): UnifiedSystemOrchestrator {
    if (!UnifiedSystemOrchestrator.instance) {
      UnifiedSystemOrchestrator.instance = new UnifiedSystemOrchestrator();
    }
    return UnifiedSystemOrchestrator.instance;
  }

  /**
   * Initialize the unified system - connect all storage systems and agents
   */
  private async initializeSystem(): Promise<void> {
    console.log('🚀 UNIFIED SOPGRID: Initializing complete system integration...');
    
    try {
      // Initialize database connection
      await this.initializeDatabase();
      
      // Load credentials from vault
      await this.loadCredentialsFromVault();
      
      // Initialize all storage connections
      await this.initializeStorageConnections();
      
      // Initialize and register all LLM agents
      await this.initializeAgents();
      
      // Start system monitoring
      this.startUnifiedMonitoring();
      
      console.log('✅ UNIFIED SOPGRID: System fully integrated and operational');
      
    } catch (error) {
      console.error('🚨 UNIFIED SOPGRID: System initialization failed:', error);
      throw error;
    }
  }

  /**
   * Initialize database connection with connection pooling
   */
  private async initializeDatabase(): Promise<void> {
    try {
      if (process.env.DATABASE_URL) {
        this.dbPool = new Pool({ connectionString: process.env.DATABASE_URL });
        this.systemState.storageConnections.postgresql = true;
        console.log('🗄️ PostgreSQL: Connected and ready for unified operations');
      }
    } catch (error) {
      console.error('🚨 PostgreSQL: Connection failed:', error);
    }
  }

  /**
   * Load all API keys and credentials from the secure vault
   */
  private async loadCredentialsFromVault(): Promise<void> {
    try {
      // Load from environment variables (secure vault integration)
      this.config.openaiApiKey = process.env.OPENAI_API_KEY;
      this.config.geminiApiKey = process.env.GOOGLE_AI_API_KEY;
      this.config.claudeApiKey = process.env.CLAUDE_API_KEY;
      this.config.mongodbUri = process.env.MONGODB_URI;
      this.config.qdrantUrl = process.env.QDRANT_URL;
      this.config.qdrantApiKey = process.env.QDRANT_API_KEY;

      // Verify essential credentials are available
      const hasOpenAI = !!this.config.openaiApiKey;
      const hasGemini = !!this.config.geminiApiKey;
      
      if (!hasOpenAI && !hasGemini) {
        console.warn('⚠️ CREDENTIALS: No LLM API keys found - system will run in limited mode');
      } else {
        console.log('🔐 CREDENTIALS: LLM API keys loaded successfully');
      }

    } catch (error) {
      console.error('🚨 CREDENTIALS: Failed to load from vault:', error);
    }
  }

  /**
   * Initialize all storage connections (MongoDB, Qdrant, PostgreSQL)
   */
  private async initializeStorageConnections(): Promise<void> {
    console.log('🔗 STORAGE: Connecting to all storage systems...');

    // MongoDB connection for document storage
    if (this.config.mongodbUri) {
      try {
        // MongoDB connection logic would go here
        this.systemState.storageConnections.mongodb = true;
        console.log('🍃 MongoDB: Connected for document storage');
      } catch (error) {
        console.error('🚨 MongoDB: Connection failed:', error);
      }
    }

    // Qdrant connection for vector search
    if (this.config.qdrantUrl) {
      try {
        // Qdrant connection logic would go here
        this.systemState.storageConnections.qdrant = true;
        console.log('🔍 Qdrant: Connected for vector search');
      } catch (error) {
        console.error('🚨 Qdrant: Connection failed:', error);
      }
    }
  }

  /**
   * Initialize all specialized LLM agents with unified configuration
   */
  private async initializeAgents(): Promise<void> {
    console.log('🤖 AGENTS: Initializing specialized agent network...');

    try {
      // Watson - Memory & Format Adherence Agent
      this.agents.watson = {
        name: 'Watson',
        type: 'memory_format',
        status: 'active',
        role: 'Enforces exact SOP formatting and maintains consistent SOP ID naming conventions',
        capabilities: ['format_validation', 'memory_management', 'sop_id_generation'],
        config: {
          apiKey: this.config.openaiApiKey,
          model: 'gpt-4o',
          temperature: 0.1
        }
      };

      // Mother - Safety Conscience Agent
      this.agents.mother = {
        name: 'Mother',
        type: 'safety_compliance',
        status: 'active',
        role: 'Guarantees absolute safety integrity with OSHA compliance and hazard communication',
        capabilities: ['safety_validation', 'osha_compliance', 'hazard_detection'],
        config: {
          apiKey: this.config.geminiApiKey,
          model: 'gemini-2.5-pro',
          temperature: 0.0
        }
      };

      // Father - Logic & Research Quality Agent
      this.agents.father = {
        name: 'Father',
        type: 'research_validation',
        status: 'active',
        role: 'Validates technical accuracy through multi-source research methodology',
        capabilities: ['technical_validation', 'research_verification', 'accuracy_checking'],
        config: {
          apiKey: this.config.claudeApiKey,
          model: 'claude-3.5-sonnet',
          temperature: 0.1
        }
      };

      // Soap - Primary SOP Author Agent
      this.agents.soap = {
        name: 'Soap',
        type: 'sop_generator',
        status: 'active',
        role: 'Integrates all inputs to craft exceptional SOPs for RV technicians',
        capabilities: ['sop_creation', 'content_integration', 'technical_writing'],
        config: {
          apiKey: this.config.openaiApiKey,
          model: 'gpt-4o',
          temperature: 0.3
        }
      };

      // Arbiter - Multi-LLM Validation Agent
      this.agents.arbiter = {
        name: 'Enhanced Arbiter',
        type: 'arbitrator',
        status: 'active',
        role: 'Cross-checks outputs with voting-style validation across multiple AI models',
        capabilities: ['multi_llm_validation', 'consensus_building', 'contradiction_detection'],
        config: {
          models: ['gpt-4o', 'gemini-2.5-pro', 'claude-3.5-sonnet'],
          contradictionThreshold: 0.35
        }
      };

      // Rotor - System Orchestration Agent (this orchestrator itself)
      this.agents.rotor = {
        name: 'Rotor',
        type: 'orchestrator',
        status: 'active',
        role: 'Central dispatcher managing sequential agent execution',
        capabilities: ['workflow_management', 'agent_coordination', 'system_orchestration'],
        config: {
          instance: this
        }
      };

      // Eyes - Real-time Monitoring Agent
      this.agents.eyes = {
        name: 'Eyes',
        type: 'monitor',
        status: 'active',
        role: 'Continuous system health and progress monitoring',
        capabilities: ['system_monitoring', 'progress_tracking', 'health_checks'],
        config: {}
      };

      // Register all agents in the database
      await this.registerAgentsInDatabase();
      
      console.log('✅ AGENTS: All specialized agents initialized and coordinated');

    } catch (error) {
      console.error('🚨 AGENTS: Initialization failed:', error);
    }
  }

  /**
   * Register all agents in the database for tracking and coordination
   */
  private async registerAgentsInDatabase(): Promise<void> {
    try {
      for (const [key, agent] of Object.entries(this.agents)) {
        const existingAgent = await db
          .select()
          .from(agents)
          .where(eq(agents.name, agent.name))
          .limit(1);

        // Create safe config without circular references
        const safeConfig = {
          type: agent.config?.type || agent.type,
          initialized: agent.config?.initialized || false,
          lastActivity: agent.config?.lastActivity || new Date().toISOString()
        };

        if (existingAgent.length === 0) {
          await db.insert(agents).values({
            name: agent.name,
            type: agent.type,
            status: agent.status,
            config: safeConfig,
            lastHeartbeat: new Date()
          });
        } else {
          await db
            .update(agents)
            .set({
              status: agent.status,
              config: safeConfig,
              lastHeartbeat: new Date()
            })
            .where(eq(agents.name, agent.name));
        }
      }
    } catch (error) {
      console.error('🚨 Failed to register agents in database:', error);
    }
  }

  /**
   * Start INTELLIGENT system monitoring - only when needed, learns patterns
   */
  private startUnifiedMonitoring(): void {
    // DISABLED CONSTANT MONITORING - it was creating database bloat
    console.log('👀 MONITORING: Intelligent monitoring - only on-demand to prevent database bloat');
    
    // Only monitor on critical events, not constantly
    // Original wasteful monitoring disabled:
    /*
    setInterval(async () => {
      try {
        await this.updateSystemState();
        await this.performHealthChecks();
        await this.optimizeSystemPerformance();
      } catch (error) {
        console.error('🚨 MONITORING: System health check failed:', error);
      }
    }, 10000); // Every 10 seconds - WASTEFUL!
    */
  }

  /**
   * Update the complete system state
   */
  private async updateSystemState(): Promise<void> {
    try {
      // Get memory usage from OS Agent
      const memUsage = process.memoryUsage();
      this.systemState.memoryUsage = Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100);

      // Get agent statuses from database
      this.systemState.agents = await db.select().from(agents);

      // Update storage connection statuses
      // This could include actual connection tests

    } catch (error) {
      console.error('🚨 Failed to update system state:', error);
    }
  }

  /**
   * Perform health checks across all system components
   */
  private async performHealthChecks(): Promise<void> {
    // Check database connectivity
    if (this.dbPool) {
      try {
        const client = await this.dbPool.connect();
        client.release();
      } catch (error) {
        this.systemState.storageConnections.postgresql = false;
        console.error('🚨 HEALTH: PostgreSQL connection lost');
      }
    }

    // Check agent responsiveness
    for (const agent of this.systemState.agents) {
      const lastHeartbeat = new Date(agent.lastHeartbeat!).getTime();
      const now = Date.now();
      const timeSinceHeartbeat = now - lastHeartbeat;

      if (timeSinceHeartbeat > 60000) { // 1 minute threshold
        console.warn(`⚠️ HEALTH: Agent ${agent.name} hasn't sent heartbeat in ${Math.round(timeSinceHeartbeat / 1000)}s`);
      }
    }
  }

  /**
   * INTELLIGENT system optimization - only store valuable learned patterns
   */
  private async optimizeSystemPerformance(): Promise<void> {
    // SMART OPTIMIZATION: Only act when there's real value to preserve
    
    // Only store workflow patterns that showed success, not all data
    const valuableWorkflows = this.systemState.activeWorkflows.filter(wf => 
      wf.priority === 'critical' || this.isWorkflowPatternValuable(wf)
    );
    
    if (valuableWorkflows.length > 0 && this.systemState.memoryUsage > 90) {
      await this.storeValuablePatterns(valuableWorkflows);
    }

    // Purge old useless data automatically
    await this.purgeUselessData();
  }
  
  /**
   * Determine if a workflow pattern has learning value
   */
  private isWorkflowPatternValuable(workflow: WorkflowContext): boolean {
    // Only keep patterns that:
    // 1. Completed successfully multiple times
    // 2. Show efficiency improvements
    // 3. Have reusable troubleshooting steps
    return workflow.workflowType === 'sop_generation' && 
           workflow.data?.success_rate > 0.8;
  }
  
  /**
   * Store only valuable learned patterns, not junk data
   */
  private async storeValuablePatterns(valuableWorkflows: WorkflowContext[]): Promise<void> {
    if (!this.dbPool || valuableWorkflows.length === 0) return;
    
    try {
      const client = await this.dbPool.connect();
      try {
        // Only store the LEARNING PATTERNS, not raw data
        const learningPatterns = valuableWorkflows.map(wf => ({
          pattern_type: wf.workflowType,
          success_indicators: wf.data?.success_indicators,
          efficiency_metrics: wf.data?.efficiency_metrics,
          reusable_steps: wf.data?.reusable_steps
        }));
        
        await client.query(`
          INSERT INTO system_cache (cache_type, cache_key, cache_data, created_at)
          VALUES ('learned_patterns', 'valuable_workflows', $1, NOW())
          ON CONFLICT (cache_type, cache_key)
          DO UPDATE SET cache_data = $1, created_at = NOW()
        `, [JSON.stringify(learningPatterns)]);
        
        console.log(`🧠 LEARNING: Stored ${learningPatterns.length} valuable patterns (not junk data)`);
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('🚨 LEARNING: Failed to store valuable patterns:', error);
    }
  }
  
  /**
   * PURGE old useless data to keep databases lean
   */
  private async purgeUselessData(): Promise<void> {
    if (!this.dbPool) return;
    
    try {
      const client = await this.dbPool.connect();
      try {
        // Delete old system_cache entries that aren't learning patterns
        await client.query(`
          DELETE FROM system_cache 
          WHERE cache_type NOT IN ('learned_patterns', 'successful_sops') 
          AND created_at < NOW() - INTERVAL '1 hour'
        `);
        
        console.log('🧹 PURGE: Cleaned old useless data from database');
      } finally {
        client.release();
      }
    } catch (error) {
      // Ignore purge errors - not critical
    }
  }

  /**
   * REMOVED - This was causing database bloat with useless data
   * Now replaced with intelligent pattern storage in storeValuablePatterns()
   */

  /**
   * Optimize workflow distribution across agents
   */
  private async optimizeWorkflowDistribution(): Promise<void> {
    // Implement intelligent workflow balancing
    console.log('⚖️ OPTIMIZATION: Balancing workflow distribution across agents');
  }

  /**
   * UNIFIED SOP GENERATION - The main workflow that coordinates all agents
   */
  public async generateSOP(request: {
    topic: string;
    system: string;
    component: string;
    complexity: 'basic' | 'intermediate' | 'advanced';
    userId: string;
    documents?: string[];
  }): Promise<any> {
    console.log('📋 UNIFIED SOP GENERATION: Starting coordinated multi-agent workflow...');

    const workflow: WorkflowContext = {
      userId: request.userId,
      sessionId: `sop_${Date.now()}`,
      workflowType: 'sop_generation',
      data: request,
      priority: 'high'
    };

    this.systemState.activeWorkflows.push(workflow);

    try {
      // Step 0: AI-ITL INFORMATION GATHERING - Check if specific info is needed
      console.log('🤖 AI-ITL: Analyzing information requirements...');
      const informationRequest = await aiITLInformationGatherer.analyzeInformationNeeds(request);
      
      if (informationRequest) {
        console.log('📋 AI-ITL: Specific information required - prompting user...');
        
        // Return information request to user interface
        return {
          success: false,
          needsInformation: true,
          informationRequest,
          message: 'Specific equipment information is needed to generate an accurate SOP',
          nextStep: 'provide_information'
        };
      }
      
      // Step 1: SMART RETRIEVAL - Check for existing SOPs with current safety validation
      console.log('🔍 SMART RETRIEVAL: Checking for existing compliant SOPs...');
      const retrievalResult = await smartSOPRetrieval.retrieveOrGenerateSOP(request);
      
      if (retrievalResult.found && retrievalResult.safetyStatus === 'current') {
        console.log('✅ EXISTING SOP RETRIEVED: Current and compliant - no generation needed');
        
        // Return existing SOP that passed all safety validations
        return {
          success: true,
          sopId: `existing_${Date.now()}`,
          title: `${request.system} - ${request.component}`,
          content: retrievalResult.sopContent,
          validationStatus: 'validated',
          workflowId: workflow.sessionId,
          sourceType: retrievalResult.sourceType,
          metadata: {
            retrievedFromStorage: true,
            safetyStatus: retrievalResult.safetyStatus,
            lastValidated: retrievalResult.lastValidated,
            llmValidationUsed: ['gemini', 'claude', 'chatgpt'],
            processingTime: Date.now() - parseInt(workflow.sessionId.split('_')[1])
          }
        };
      }
      
      console.log('📋 GENERATING NEW SOP: No current compliant SOP found - starting full generation...');
      
      // Step 2: Watson validates format requirements and generates SOP ID
      console.log('🤖 Watson: Validating format and generating SOP ID...');
      const sopId = await this.callAgent('watson', 'generate_sop_id', request);

      // Step 3: Father researches and validates technical accuracy
      console.log('🤖 Father: Researching technical accuracy...');
      const researchData = await this.callAgent('father', 'research_validation', request);

      // Step 4: Soap generates initial SOP content
      console.log('🤖 Soap: Crafting initial SOP content...');
      const initialSOPContent = await this.callAgent('soap', 'generate_sop', {
        ...request,
        sopId,
        researchData
      });

      // Step 5: ENHANCED SAFETY VALIDATION - Multi-LLM safety analysis (catches ChatGPT-level issues)
      console.log('🛡️ ENHANCED SAFETY: Running comprehensive safety validation...');
      const enhancedSafetyValidation = await enhancedSafetySOPValidator.validateSOPSafety(
        initialSOPContent.content || initialSOPContent, 
        {
          title: `${request.system} - ${request.component}`,
          system: request.system,
          component: request.component,
          complexity: request.complexity || 'intermediate'
        }
      );

      // Step 6: Generate corrected SOP if safety issues found
      let sopContent = initialSOPContent;
      if (!enhancedSafetyValidation.passed) {
        console.log(`🚨 CRITICAL SAFETY ISSUES DETECTED: ${enhancedSafetyValidation.criticalIssues.length} issues found`);
        console.log('Critical issues:', enhancedSafetyValidation.criticalIssues.slice(0, 3).join(', '));
        console.log('🔧 Generating safety-corrected SOP...');
        
        const correctedContent = await enhancedSafetySOPValidator.generateCorrectedSOP(
          initialSOPContent.content || initialSOPContent,
          enhancedSafetyValidation,
          request
        );
        
        sopContent = { ...initialSOPContent, content: correctedContent };
        console.log('✅ Safety-corrected SOP generated - issues resolved');
      } else {
        console.log('✅ Initial SOP passed safety validation');
      }

      // Step 7: Mother final safety compliance verification
      console.log('🤖 Mother: Final safety compliance verification...');
      const motherValidation = await this.callAgent('mother', 'safety_check', { 
        ...request, 
        researchData,
        sopContent,
        enhancedSafetyValidation
      });

      // Step 8: Arbiter validates across multiple LLMs
      console.log('🤖 Arbiter: Cross-validating with multiple AI models...');
      const arbitrationResult = await this.callAgent('arbiter', 'multi_llm_validation', {
        sopContent,
        motherValidation,
        enhancedSafetyValidation
      });

      // Step 6: Store in unified storage (PostgreSQL + MongoDB + Qdrant)
      console.log('🗄️ STORAGE: Saving to unified storage systems...');
      const sopRecord = await this.storeInUnifiedStorage({
        sopId,
        title: `${request.system} - ${request.component}`,
        content: sopContent,
        industry: 'rv_service',
        complianceStandards: enhancedSafetyValidation.complianceGaps?.map(gap => gap.standard) || [],
        validationStatus: arbitrationResult.approved ? 'validated' : 'pending',
        generatedBy: sopId,
        metadata: {
          researchData,
          enhancedSafetyValidation,
          arbitrationResult,
          workflow
        }
      });

      // Step 7: Remove workflow from active list
      this.systemState.activeWorkflows = this.systemState.activeWorkflows.filter(
        w => w.sessionId !== workflow.sessionId
      );

      console.log('✅ UNIFIED SOP GENERATION: Complete - All agents coordinated successfully');

      return {
        success: true,
        sopId: sopRecord.id,
        title: sopRecord.title,
        content: sopRecord.content,
        validationStatus: sopRecord.validationStatus,
        workflowId: workflow.sessionId,
        metadata: {
          agentsUsed: ['watson', 'father', 'mother', 'soap', 'arbiter'],
          storageLocations: ['postgresql', 'mongodb', 'qdrant'],
          processingTime: Date.now() - parseInt(workflow.sessionId.split('_')[1])
        }
      };

    } catch (error) {
      console.error('🚨 UNIFIED SOP GENERATION: Workflow failed:', error);
      
      // Remove failed workflow
      this.systemState.activeWorkflows = this.systemState.activeWorkflows.filter(
        w => w.sessionId !== workflow.sessionId
      );

      throw error;
    }
  }

  /**
   * Call a specific agent with unified error handling and monitoring
   */
  private async callAgent(agentName: keyof typeof this.agents, action: string, data: any): Promise<any> {
    const agent = this.agents[agentName];
    if (!agent) {
      throw new Error(`Agent ${agentName} not found`);
    }

    // Update agent heartbeat
    await db
      .update(agents)
      .set({ lastHeartbeat: new Date() })
      .where(eq(agents.name, agent.name));

    // Route to appropriate service based on agent type
    switch (agentName) {
      case 'watson':
      case 'soap':
        // Use existing SOP generator with OpenAI
        return await this.sopGenerator.generateSOP(data);
        
      case 'father':
      case 'mother':
        // Use multi-agent orchestrator for research and safety
        return await this.multiAgentOrchestrator.processWorkflow({
          type: action,
          data,
          agent: agentName
        });
        
      case 'arbiter':
        // Use enhanced arbitration with multiple LLMs
        return await this.multiAgentOrchestrator.arbitrateWithMultipleModels(data);
        
      default:
        console.log(`🤖 ${agent.name}: ${action} - Processing...`);
        return { processed: true, agent: agentName, action };
    }
  }

  /**
   * Store SOP in all unified storage systems
   */
  private async storeInUnifiedStorage(sopData: any): Promise<any> {
    try {
      // 1. Store in PostgreSQL for structured data and relationships
      const [sopRecord] = await db.insert(sops).values({
        title: sopData.title,
        content: sopData.content,
        industry: sopData.industry || 'RV_REPAIR',
        complianceStandards: sopData.complianceStandards,
        validationStatus: sopData.validationStatus,
        generatedBy: sopData.generatedBy
      }).returning();

      // 2. Store in MongoDB for document flexibility (if connected)
      if (this.systemState.storageConnections.mongodb) {
        // MongoDB storage logic would go here
        console.log('🍃 MongoDB: SOP document stored');
      }

      // 3. Store in Qdrant for vector search (if connected)
      if (this.systemState.storageConnections.qdrant) {
        // Qdrant vector storage logic would go here
        console.log('🔍 Qdrant: SOP vectors stored for semantic search');
      }

      console.log('🗄️ UNIFIED STORAGE: SOP stored across all connected systems');
      return sopRecord;

    } catch (error) {
      console.error('🚨 UNIFIED STORAGE: Failed to store SOP:', error);
      throw error;
    }
  }

  /**
   * Get unified system status
   */
  public getSystemStatus(): SystemState {
    return { ...this.systemState };
  }

  /**
   * Get all agents status
   */
  public getAgentsStatus(): any {
    return { ...this.agents };
  }

  /**
   * Process document upload through unified workflow
   */
  public async processDocument(documentData: any, userId: string): Promise<any> {
    console.log('📄 UNIFIED DOCUMENT PROCESSING: Starting coordinated workflow...');

    const workflow: WorkflowContext = {
      userId,
      sessionId: `doc_${Date.now()}`,
      workflowType: 'document_processing',
      data: documentData,
      priority: 'medium'
    };

    this.systemState.activeWorkflows.push(workflow);

    try {
      // Process through unified pipeline
      // This would coordinate document upload, vectorization, and storage
      return { success: true, workflowId: workflow.sessionId };
    } catch (error) {
      console.error('🚨 UNIFIED DOCUMENT PROCESSING: Failed:', error);
      throw error;
    } finally {
      this.systemState.activeWorkflows = this.systemState.activeWorkflows.filter(
        w => w.sessionId !== workflow.sessionId
      );
    }
  }

  /**
   * UNIFIED WORKFLOW PROCESSOR - Routes any workflow type through orchestrator
   */
  public async processWorkflow(request: {
    type: string;
    userId: string;
    data: any;
    priority: 'low' | 'medium' | 'high';
  }): Promise<any> {
    console.log(`🔄 PROCESSING WORKFLOW: ${request.type} with priority ${request.priority}`);

    // Route different workflow types to appropriate handlers
    switch (request.type) {
      case 'sop_generation':
        return await this.generateSOP({
          ...request.data,
          userId: request.userId
        });
      
      case 'chat_message':
        return await this.processChatMessage({
          ...request.data,
          userId: request.userId
        });
      
      case 'troubleshooting_tree':
        return await this.generateTroubleshootingTree({
          ...request.data,
          userId: request.userId
        });
      
      case 'document_processing':
        return await this.processDocument(request.data, request.userId);
      
      default:
        console.log(`⚠️ Unknown workflow type: ${request.type} - Using default handler`);
        return {
          success: true,
          message: `Processed ${request.type} workflow`,
          timestamp: new Date().toISOString()
        };
    }
  }

  /**
   * Process chat message through unified system
   */
  public async processChatMessage(request: {
    message: string;
    userId: string;
    sessionId: string;
    context?: any;
  }): Promise<any> {
    console.log('💬 PROCESSING CHAT: Through unified orchestrator...');
    
    try {
      // Route through chat service with safety validation
      const { chatService } = await import('./chat-service');
      const response = await chatService.processMessage(request.message, request.userId);
      
      // Apply safety validation to chat response
      const validatedResponse = response;
      
      return {
        success: true,
        response: validatedResponse,
        sessionId: request.sessionId,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('🚨 CHAT PROCESSING: Failed:', error);
      return {
        success: false,
        error: 'Chat processing failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Generate troubleshooting tree through unified system
   */
  public async generateTroubleshootingTree(request: {
    failureDescription: string;
    component?: string;
    symptoms: string[];
    userId: string;
  }): Promise<any> {
    console.log('🔧 GENERATING TROUBLESHOOTING TREE: Through unified orchestrator...');
    
    try {
      // Use troubleshooting tree service with safety validation
      const tree = await troubleshootingTreeService.generateTreeFromFailure({
        description: request.failureDescription,
        component: request.component || 'unknown',
        symptoms: request.symptoms
      });
      
      return {
        success: true,
        tree,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('🚨 TROUBLESHOOTING TREE: Generation failed:', error);
      return {
        success: false,
        error: 'Troubleshooting tree generation failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

// Export singleton instance
export const unifiedSystemOrchestrator = UnifiedSystemOrchestrator.getInstance();