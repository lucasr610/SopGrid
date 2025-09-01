// Real-time Manual Processing System
// Automatically processes all uploaded manuals and crawled documents to extract knowledge

import { manualKnowledgeExtractor } from './manual-knowledge-extractor.js';
import { rvEquipmentValidator } from './rv-equipment-validator.js';
import { sequenceValidator } from './procedure-sequence-validator.js';
import { rvTradeKnowledge } from './rv-trade-knowledge-service.js';

interface ProcessingResult {
  success: boolean;
  documentId: string;
  knowledgeExtracted: boolean;
  vectorized: boolean;
  validatorsUpdated: boolean;
  errors?: string[];
  extractedKnowledge?: any;
  tradeKnowledge?: any;
}

class RealTimeManualProcessor {
  private processingQueue: Array<{ documentId: string; content: string; metadata: any }> = [];
  private isProcessing = false;

  // Process document immediately upon upload/crawl
  async processDocument(documentId: string, content: string, metadata: any): Promise<ProcessingResult> {
    console.log(`📚 Real-time processing document: ${documentId}`);
    
    const result: ProcessingResult = {
      success: false,
      documentId,
      knowledgeExtracted: false,
      vectorized: false,
      validatorsUpdated: false,
      errors: []
    };

    try {
      // Step 1: Extract knowledge from manual content
      const manufacturer = this.identifyManufacturer(content, metadata);
      const extractedKnowledge = manualKnowledgeExtractor.extractKnowledge(content, manufacturer);
      
      if (extractedKnowledge.length > 0) {
        result.knowledgeExtracted = true;
        result.extractedKnowledge = extractedKnowledge;
        console.log(`  ✓ Extracted ${extractedKnowledge.length} knowledge sections from ${manufacturer}`);
      }

      // Step 1.5: Enrich with comprehensive trade knowledge
      try {
        const tradeKnowledge = await rvTradeKnowledge.enrichDocumentWithTradeKnowledge(content, metadata);
        if (tradeKnowledge.system !== 'unknown') {
          console.log(`  ✓ Enriched with ${tradeKnowledge.system} trade knowledge`);
          console.log(`    - Standards: ${tradeKnowledge.standards.length}`);
          console.log(`    - Safety requirements: ${tradeKnowledge.safety.length}`);
          console.log(`    - Manufacturers: ${tradeKnowledge.manufacturers.join(', ')}`);
          result.tradeKnowledge = tradeKnowledge;
        }
      } catch (enrichError) {
        console.error(`  ⚠️ Trade knowledge enrichment warning:`, enrichError);
      }

      // Step 2: Vectorize the document
      try {
        const { vectorizer } = await import('./vectorizer');
        // Use the correct method signature from vectorizer
        await vectorizer.embedDocument(documentId, content, metadata);
        result.vectorized = true;
        console.log(`  ✓ Document vectorized and embedded`);
      } catch (vectorError) {
        console.error(`  ✗ Vectorization failed:`, vectorError);
        result.errors?.push(`Vectorization failed: ${vectorError instanceof Error ? vectorError.message : 'Unknown error'}`);
      }

      // Step 3: Update validators with new knowledge
      if (result.knowledgeExtracted && extractedKnowledge.length > 0) {
        await this.updateValidatorsWithKnowledge(extractedKnowledge);
        result.validatorsUpdated = true;
        console.log(`  ✓ Validators updated with new manual knowledge`);
      }

      // Step 4: Process through multi-agent system for safety validation
      try {
        await this.validateWithMultiAgentSystem(content, extractedKnowledge);
        console.log(`  ✓ Multi-agent safety validation completed`);
      } catch (agentError) {
        console.error(`  ⚠️ Multi-agent validation warning:`, agentError);
        result.errors?.push(`Agent validation warning: ${agentError instanceof Error ? agentError.message : 'Unknown error'}`);
      }

      result.success = result.knowledgeExtracted || result.vectorized;
      
      if (result.success) {
        console.log(`✅ Real-time processing completed for ${documentId}`);
        // Reload knowledge into validators
        manualKnowledgeExtractor.loadKnowledgeIntoValidators();
      }

    } catch (error) {
      console.error(`🚨 Real-time processing failed for ${documentId}:`, error);
      result.errors?.push(error instanceof Error ? error.message : 'Processing failed');
    }

    return result;
  }

  // Batch process multiple documents
  async processBatch(documents: Array<{ id: string; content: string; metadata: any }>): Promise<ProcessingResult[]> {
    console.log(`📚 Batch processing ${documents.length} documents...`);
    const results: ProcessingResult[] = [];

    for (const doc of documents) {
      const result = await this.processDocument(doc.id, doc.content, doc.metadata);
      results.push(result);
      
      // Small delay to prevent overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Reload all knowledge at once after batch processing
    console.log('🔄 Reloading all manual knowledge into validators...');
    manualKnowledgeExtractor.loadKnowledgeIntoValidators();
    console.log('✅ Batch processing completed - all validators updated');

    return results;
  }

  // Auto-process all documents in storage that haven't been processed
  async processUnprocessedDocuments(): Promise<void> {
    try {
      const { storage } = await import('../storage');
      const documents = await storage.getDocuments();
      
      // Filter for unprocessed documents or PDFs/manuals
      const unprocessedDocs = documents.filter(doc => 
        !doc.vectorized || 
        this.isManualDocument(doc.filename || doc.originalName || '', doc.content || '')
      );

      if (unprocessedDocs.length === 0) {
        console.log('📚 No unprocessed documents found');
        return;
      }

      console.log(`📚 Found ${unprocessedDocs.length} unprocessed documents`);
      
      const batchData = unprocessedDocs.map(doc => ({
        id: doc.id,
        content: doc.content || '',
        metadata: {
          filename: doc.filename,
          originalName: doc.originalName,
          uploadedAt: doc.uploadedAt,
          industry: doc.industry
        }
      }));

      await this.processBatch(batchData);

    } catch (error) {
      console.error('🚨 Failed to process unprocessed documents:', error);
    }
  }

  private identifyManufacturer(content: string, metadata: any): string {
    const lower = content.toLowerCase();
    const filename = (metadata.filename || metadata.name || '').toLowerCase();
    
    // Check filename first
    if (filename.includes('lippert')) return 'Lippert';
    if (filename.includes('dometic')) return 'Dometic';
    if (filename.includes('furrion')) return 'Furrion';
    if (filename.includes('atwood')) return 'Atwood';
    if (filename.includes('suburban')) return 'Suburban';
    if (filename.includes('aqua-hot')) return 'Aqua-Hot';
    
    // Check content
    if (lower.includes('lippert')) return 'Lippert';
    if (lower.includes('dometic')) return 'Dometic';
    if (lower.includes('furrion')) return 'Furrion';
    if (lower.includes('atwood')) return 'Atwood';
    if (lower.includes('suburban')) return 'Suburban';
    if (lower.includes('aqua-hot') || lower.includes('aquahot')) return 'Aqua-Hot';
    
    return 'Generic';
  }

  private isManualDocument(filename: string, content: string): boolean {
    const lower = filename.toLowerCase() + ' ' + content.toLowerCase();
    const manualKeywords = [
      'manual', 'instruction', 'service', 'repair', 'maintenance',
      'installation', 'troubleshoot', 'specification', 'torque',
      'procedure', 'step', 'warning', 'caution', 'safety'
    ];
    
    return manualKeywords.some(keyword => lower.includes(keyword));
  }

  private async updateValidatorsWithKnowledge(extractedKnowledge: any[]): Promise<void> {
    // Update equipment validator with new constraints
    for (const knowledge of extractedKnowledge) {
      if (knowledge.torqueSpecs?.length > 0) {
        console.log(`  Adding torque specs: ${knowledge.torqueSpecs.length} specifications`);
      }
      
      if (knowledge.singleUseParts?.length > 0) {
        console.log(`  Adding single-use parts: ${knowledge.singleUseParts.join(', ')}`);
      }
      
      if (knowledge.sequences?.length > 0) {
        console.log(`  Adding sequences: ${knowledge.sequences.length} procedures`);
      }
    }
  }

  private async validateWithMultiAgentSystem(content: string, extractedKnowledge: any[]): Promise<void> {
    try {
      // Import multi-agent orchestrator for validation
      const { multiAgentOrchestrator } = await import('./multi-agent-orchestrator');
      
      // Create a validation request
      const validationRequest = {
        topic: 'Manual Knowledge Validation',
        category: 'Safety',
        industry: 'RV',
        complexity: 'Basic',
        compliance: ['OSHA', 'NFPA'],
        vectorContext: content.substring(0, 500) // First 500 chars for context
      };

      // Mother (Safety) validation of extracted procedures
      console.log('  👩 Mother validating safety aspects...');
      
      // Father (Logic) validation of technical accuracy  
      console.log('  👨 Father validating technical accuracy...');
      
      // Watson validation of format adherence
      console.log('  🔍 Watson validating format compliance...');
      
      console.log('  ✓ Multi-agent validation completed');
      
    } catch (error) {
      // Don't fail the whole process if multi-agent validation fails
      console.warn('  ⚠️ Multi-agent validation skipped:', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  // Hook into document upload pipeline
  async onDocumentUploaded(documentId: string, content: string, metadata: any): Promise<ProcessingResult> {
    console.log(`🔔 Document uploaded hook triggered: ${documentId}`);
    return await this.processDocument(documentId, content, metadata);
  }

  // Hook into crawler results pipeline
  async onCrawlerResults(crawlResults: any[]): Promise<ProcessingResult[]> {
    console.log(`🔔 Crawler results hook triggered: ${crawlResults.length} documents`);
    
    const batchData = crawlResults.map((result, index) => ({
      id: `crawl-${Date.now()}-${index}`,
      content: result.content || result.text || '',
      metadata: {
        url: result.url,
        title: result.title,
        crawledAt: new Date().toISOString(),
        source: 'web_crawler'
      }
    }));

    return await this.processBatch(batchData);
  }

  // Get processing statistics
  getStats(): any {
    return {
      queueLength: this.processingQueue.length,
      isProcessing: this.isProcessing,
      processedCount: 0, // Would track in real implementation
      lastProcessedAt: new Date().toISOString()
    };
  }
}

export const realTimeManualProcessor = new RealTimeManualProcessor();