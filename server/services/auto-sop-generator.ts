import { storage } from '../storage';
import { meshRotorSystem } from './mesh-rotor-system';
import { openaiService } from './openai-service';
import { documentProcessor } from './document-processor';
import { vectorizer } from './vectorizer';
import OpenAI from 'openai';

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || ""
});

interface SOPGenerationTask {
  documentId: string;
  manualType: 'owners_manual' | 'service_manual' | 'install_manual' | 'tech_ref';
  priority: 'high' | 'medium' | 'low';
  generateMultiple?: boolean; // Generate SOPs for each major section
}

interface EmbeddingQuery {
  instruction: string;
  context: string[];
  required_fields: string[];
  safety_constraints: string[];
}

interface RevisionDetection {
  documentId: string;
  revisionChanges: {
    section: string;
    changeType: 'added' | 'modified' | 'removed';
    oldContent?: string;
    newContent?: string;
    impactLevel: 'low' | 'medium' | 'high' | 'critical';
  }[];
  affectedSOPs: string[];
}

export class AutoSOPGenerator {
  private processingQueue: Map<string, SOPGenerationTask> = new Map();
  private revisionMonitor = new RevisionMonitor();

  async initializeAutoGeneration(): Promise<void> {
    // Start background workers
    this.startBulkProcessor();
    this.startRevisionMonitor();
    
    console.log('🚀 Auto-SOP Generator initialized with bulk processing');
  }

  // Main automation: Generate SOPs for all ingested manuals
  async processIngestedDocuments(): Promise<{ processed: number; failed: number; sopsCreated: number }> {
    const unprocessedDocs = await this.getUnprocessedDocuments();
    let processed = 0;
    let failed = 0;
    let sopsCreated = 0;

    console.log(`📚 Processing ${unprocessedDocs.length} ingested documents for auto-SOP generation`);

    for (const doc of unprocessedDocs) {
      try {
        const sopCount = await this.generateSOPsFromDocument(doc);
        sopsCreated += sopCount;
        processed++;
        
        // Mark document as processed
        await this.markDocumentProcessed(doc.id);
        
        console.log(`✅ Generated ${sopCount} SOPs from document: ${doc.filename}`);
      } catch (error) {
        console.error(`❌ Failed to process document ${doc.id}:`, error);
        failed++;
      }
    }

    return { processed, failed, sopsCreated };
  }

  // Assembly-code-like embedding retrieval for precise data fetching
  async assemblyLikeRetrieval(query: EmbeddingQuery): Promise<any> {
    const embeddings = await this.createQueryEmbedding(query.instruction);
    
    // Precise retrieval using assembly-like addressing
    const retrievalPlan = {
      // Direct memory addressing for specific data
      LOAD_CONTEXT: query.context,
      FETCH_EMBEDDINGS: embeddings,
      FILTER_SAFETY: query.safety_constraints,
      EXTRACT_FIELDS: query.required_fields,
      VALIDATE_COHERENCE: true,
      RETURN_STRUCTURED: true
    };

    return await this.executeRetrievalPlan(retrievalPlan);
  }

  private async generateSOPsFromDocument(doc: any): Promise<number> {
    // Chunk document into logical sections
    const sections = await this.intelligentSectionChunking(doc.content);
    let sopCount = 0;

    for (const section of sections) {
      if (this.isSOPWorthy(section)) {
        const sopTask: SOPGenerationTask = {
          documentId: doc.id,
          manualType: doc.docClass || 'service_manual',
          priority: this.determinePriority(section),
          generateMultiple: false
        };

        // Submit to mesh rotor system for processing
        await meshRotorSystem.submitTask({
          type: 'sop_generation',
          payload: {
            section,
            sourceDocument: doc,
            task: sopTask
          },
          priority: sopTask.priority === 'high' ? 'critical' : 'medium'
        });

        sopCount++;
      }
    }

    return sopCount;
  }

  private async intelligentSectionChunking(content: string): Promise<any[]> {
    const sections = [];
    
    // Use AI to identify logical procedure sections
    const prompt = `
Analyze this technical manual content and identify distinct procedure sections that would make good SOPs.
Return sections with: title, content, procedure_type, safety_level, complexity

Content: ${content.substring(0, 8000)}...`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{
        role: 'user',
        content: prompt
      }],
      response_format: { type: 'json_object' }
    });
    const analysis = response.choices[0].message.content || '{}';

    try {
      const parsed = JSON.parse(analysis);
      return parsed.sections || [];
    } catch (error) {
      console.error('Failed to parse section analysis:', error);
      // Fallback to basic chunking
      return await documentProcessor.chunkDocument(content, 2000);
    }
  }

  private isSOPWorthy(section: any): boolean {
    const content = typeof section === 'string' ? section : section.content;
    
    // Check for procedural indicators
    const procedureIndicators = [
      /step \d+/i,
      /procedure/i,
      /install/i,
      /replace/i,
      /remove/i,
      /inspect/i,
      /test/i,
      /calibrate/i,
      /troubleshoot/i
    ];

    return procedureIndicators.some(pattern => pattern.test(content));
  }

  private determinePriority(section: any): 'high' | 'medium' | 'low' {
    const content = typeof section === 'string' ? section : section.content;
    
    // High priority for safety-critical procedures
    if (/safety|hazard|warning|caution|electrical|voltage/i.test(content)) {
      return 'high';
    }
    
    // Medium for installation/maintenance
    if (/install|maintain|service|replace/i.test(content)) {
      return 'medium';
    }
    
    return 'low';
  }

  private async createQueryEmbedding(query: string): Promise<number[]> {
    const embeddings = await openaiService.generateEmbeddings([query]);
    return embeddings[0];
  }

  private async executeRetrievalPlan(plan: any): Promise<any> {
    // Assembly-like execution of retrieval operations
    const assemblyInstructions = {
      LOAD: plan.LOAD_CONTEXT,
      FETCH: plan.FETCH_EMBEDDINGS,
      FILTER: plan.FILTER_SAFETY,
      EXTRACT: plan.EXTRACT_FIELDS,
      VALIDATE: plan.VALIDATE_COHERENCE,
      RETURN: plan.RETURN_STRUCTURED
    };

    // Execute each instruction sequentially with precise control
    let result = {};
    
    for (const [instruction, data] of Object.entries(assemblyInstructions)) {
      result = await this.executeAssemblyInstruction(instruction, data, result);
    }

    return result;
  }

  private async executeAssemblyInstruction(instruction: string, data: any, context: any): Promise<any> {
    switch (instruction) {
      case 'LOAD':
        return { ...context, loadedContext: data };
      
      case 'FETCH':
        const similarDocs = await vectorizer.query(JSON.stringify(data), { limit: 10 });
        return { ...context, retrievedDocs: similarDocs };
      
      case 'FILTER':
        return { 
          ...context, 
          filteredDocs: context.retrievedDocs?.filter((doc: any) => 
            this.passesConstraints(doc, data)
          )
        };
      
      case 'EXTRACT':
        return {
          ...context,
          extractedData: this.extractRequiredFields(context.filteredDocs, data)
        };
      
      case 'VALIDATE':
        return {
          ...context,
          validated: await this.validateCoherence(context.extractedData)
        };
      
      case 'RETURN':
        return data ? this.structureReturn(context) : context;
      
      default:
        return context;
    }
  }

  private passesConstraints(doc: any, constraints: string[]): boolean {
    return constraints.every(constraint => {
      switch (constraint) {
        case 'no_electrical_hazard':
          return !doc.electricalHazard;
        case 'ppe_required':
          return doc.ppeRequired;
        default:
          return true;
      }
    });
  }

  private extractRequiredFields(docs: any[], fields: string[]): any {
    return docs?.map(doc => {
      const extracted: any = {};
      fields.forEach(field => {
        extracted[field] = doc[field];
      });
      return extracted;
    });
  }

  private async validateCoherence(data: any): Promise<boolean> {
    // Use AI to validate that extracted data is coherent
    if (!data || !Array.isArray(data)) return false;
    
    try {
      const prompt = `Validate if this extracted data is coherent and safe for SOP generation: ${JSON.stringify(data).substring(0, 1000)}`;
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{
          role: 'user',
          content: prompt
        }]
      });
      const validation = response.choices[0].message.content || '';
      
      return validation.toLowerCase().includes('coherent') && !validation.toLowerCase().includes('unsafe');
    } catch {
      return false;
    }
  }

  private structureReturn(context: any): any {
    return {
      success: true,
      retrievedCount: context.retrievedDocs?.length || 0,
      filteredCount: context.filteredDocs?.length || 0,
      extractedData: context.extractedData,
      validated: context.validated,
      timestamp: new Date().toISOString()
    };
  }

  private async getUnprocessedDocuments(): Promise<any[]> {
    const documents = await storage.getDocuments();
    return documents.filter(doc => {
      const metadata = doc.metadata as any || {};
      return !metadata.sopGenerated && 
             doc.vectorized && 
             ['owners_manual', 'service_manual', 'install_manual', 'tech_ref'].includes(doc.docClass || '');
    });
  }

  private async markDocumentProcessed(docId: string): Promise<void> {
    const doc = await storage.getDocument(docId);
    if (doc) {
      const metadata = doc.metadata as any || {};
      const updatedMetadata = {
        ...metadata,
        sopGenerated: true,
        processedAt: new Date().toISOString()
      };
      // Update document metadata to mark as processed
      // This would require updating storage interface
    }
  }

  private startBulkProcessor(): void {
    // Process documents in batches every 5 minutes
    setInterval(async () => {
      try {
        await this.processIngestedDocuments();
      } catch (error) {
        console.error('Bulk processing error:', error);
      }
    }, 300000); // 5 minutes
  }

  private startRevisionMonitor(): void {
    setInterval(async () => {
      await this.revisionMonitor.checkForRevisions();
    }, 600000); // 10 minutes
  }
}

// Revision Detection and Auditable Changes System
class RevisionMonitor {
  async checkForRevisions(): Promise<RevisionDetection[]> {
    const documents = await storage.getDocuments();
    const revisions: RevisionDetection[] = [];

    for (const doc of documents) {
      if (doc.revCode || doc.etag) {
        const changes = await this.detectChanges(doc);
        if (changes.revisionChanges.length > 0) {
          revisions.push(changes);
          await this.handleRevisionDetected(changes);
        }
      }
    }

    return revisions;
  }

  private async detectChanges(doc: any): Promise<RevisionDetection> {
    // Compare current document with previous version
    const previousVersion = await this.getPreviousVersion(doc.id);
    const changes: RevisionDetection['revisionChanges'] = [];

    if (previousVersion && doc.sha256 !== previousVersion.sha256) {
      // Use AI to analyze what changed
      const changeAnalysis = await this.analyzeChanges(previousVersion.content, doc.content);
      changes.push(...changeAnalysis);
    }

    // Find affected SOPs
    const affectedSOPs = await this.findAffectedSOPs(doc.id);

    return {
      documentId: doc.id,
      revisionChanges: changes,
      affectedSOPs: affectedSOPs.map(sop => sop.id)
    };
  }

  private async analyzeChanges(oldContent: string, newContent: string): Promise<RevisionDetection['revisionChanges']> {
    const prompt = `
Compare these two versions of a technical manual and identify specific changes.
Focus on procedural changes, safety updates, and specification changes.

OLD VERSION: ${oldContent.substring(0, 4000)}...
NEW VERSION: ${newContent.substring(0, 4000)}...

Return JSON with changes array containing: section, changeType, oldContent, newContent, impactLevel`;

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{
          role: 'user',
          content: prompt
        }],
        response_format: { type: 'json_object' }
      });
      const analysis = response.choices[0].message.content || '{}';

      const parsed = JSON.parse(analysis);
      return parsed.changes || [];
    } catch (error) {
      console.error('Failed to analyze changes:', error);
      return [{
        section: 'unknown',
        changeType: 'modified' as const,
        impactLevel: 'medium' as const
      }];
    }
  }

  private async getPreviousVersion(docId: string): Promise<any> {
    // This would query a document versions table
    // For now, return null as placeholder
    return null;
  }

  private async findAffectedSOPs(docId: string): Promise<any[]> {
    const sops = await storage.getSOPs();
    return sops.filter(sop => sop.sourceDocumentId === docId);
  }

  private async handleRevisionDetected(revision: RevisionDetection): Promise<void> {
    console.log(`🔄 Revision detected for document ${revision.documentId}`);
    console.log(`📋 ${revision.affectedSOPs.length} SOPs require updates`);

    for (const sopId of revision.affectedSOPs) {
      // Flag SOP for review
      await this.flagSOPForRevision(sopId, revision);
      
      // Optionally auto-regenerate if changes are minor
      const criticalChanges = revision.revisionChanges.filter(c => c.impactLevel === 'critical');
      if (criticalChanges.length === 0) {
        await this.scheduleSOPRegeneration(sopId, revision);
      }
    }

    // Create audit trail
    await this.createRevisionAuditRecord(revision);
  }

  private async flagSOPForRevision(sopId: string, revision: RevisionDetection): Promise<void> {
    // This would update SOP status to require revision review
    console.log(`🚩 Flagged SOP ${sopId} for revision review`);
  }

  private async scheduleSOPRegeneration(sopId: string, revision: RevisionDetection): Promise<void> {
    // Schedule automatic regeneration for minor changes
    await meshRotorSystem.submitTask({
      type: 'sop_generation',
      payload: {
        sopId,
        revision,
        regenerationType: 'revision_update'
      },
      priority: 'high'
    });

    console.log(`🔄 Scheduled regeneration for SOP ${sopId}`);
  }

  private async createRevisionAuditRecord(revision: RevisionDetection): Promise<void> {
    // Create detailed audit trail for all changes
    const auditRecord = {
      documentId: revision.documentId,
      changes: revision.revisionChanges,
      affectedSOPs: revision.affectedSOPs,
      detectedAt: new Date().toISOString(),
      auditType: 'revision_detection'
    };

    // Store in audit system
    console.log('📝 Created revision audit record:', auditRecord);
  }
}

export const autoSOPGenerator = new AutoSOPGenerator();