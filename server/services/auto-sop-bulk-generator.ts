import { MongoStorage } from './mongodb-storage';
import { MultiAgentSOPGenerator } from './multi-agent-sop-generator';
import type { Document } from '@shared/schema';

// Define SOPRequest interface locally since it's not in schema
interface SOPRequest {
  query: string;
  equipment_type: string;
  system_category: string;
  brand: string;
  model: string;
  serial_number: string;
  problem_description: string;
  user_id: string;
  safety_requirements?: string[];
  reference_documents?: string[];
  evidence_requirements?: string[];
}

/**
 * Auto-SOP Bulk Generator
 * Processes existing documents to automatically generate SOPs
 * Simulates user requests to build knowledge base rapidly
 */
export class AutoSOPBulkGenerator {
  private storage: MongoStorage;
  private sopGenerator: MultiAgentSOPGenerator;
  private isProcessing = false;

  constructor(
    storage: MongoStorage,
    sopGenerator: MultiAgentSOPGenerator
  ) {
    this.storage = storage;
    this.sopGenerator = sopGenerator;
  }

  /**
   * Start bulk SOP generation from existing documents
   */
  async startBulkGeneration(): Promise<void> {
    if (this.isProcessing) {
      console.log('🔄 Bulk SOP generation already in progress...');
      return;
    }

    this.isProcessing = true;
    console.log('🚀 Starting bulk SOP generation from existing documents...');

    try {
      // Get all vectorized documents from MongoDB
      const documents = await this.getVectorizedDocuments();
      console.log(`📚 Found ${documents.length} vectorized documents for SOP generation`);

      // Process documents in batches to avoid overwhelming the system
      const batchSize = 3;
      for (let i = 0; i < documents.length; i += batchSize) {
        const batch = documents.slice(i, i + batchSize);
        console.log(`📄 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(documents.length/batchSize)}`);
        
        await Promise.all(batch.map(doc => this.generateSOPFromDocument(doc)));
        
        // Wait between batches to respect rate limits
        if (i + batchSize < documents.length) {
          console.log('⏳ Waiting 30 seconds between batches...');
          await new Promise(resolve => setTimeout(resolve, 30000));
        }
      }

      console.log('✅ Bulk SOP generation completed!');
    } catch (error) {
      console.error('❌ Bulk SOP generation failed:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Get vectorized documents ready for SOP generation
   */
  private async getVectorizedDocuments(): Promise<Document[]> {
    try {
      const documents = await this.storage.getDocuments();
      return documents.filter(doc => 
        doc.vectorized && 
        doc.content && 
        doc.content.length > 500 // Only process substantial documents
      );
    } catch (error) {
      console.error('❌ Failed to get vectorized documents:', error);
      return [];
    }
  }

  /**
   * Generate SOP from document content
   */
  private async generateSOPFromDocument(document: Document): Promise<void> {
    try {
      console.log(`🔧 Generating SOP from: ${document.filename || 'Untitled'}`);

      // Extract equipment types and procedures from document
      const analysis = await this.analyzeDocumentForSOPs(document);
      
      if (!analysis.procedures || analysis.procedures.length === 0) {
        console.log(`⏭️ Skipping ${document.filename} - no procedures found`);
        return;
      }

      // Generate SOPs for each identified procedure
      for (const procedure of analysis.procedures) {
        await this.generateSingleSOP(document, procedure, analysis);
        
        // Short delay between SOPs
        await new Promise(resolve => setTimeout(resolve, 5000));
      }

    } catch (error) {
      console.error(`❌ Failed to generate SOP from ${document.filename}:`, error);
    }
  }

  /**
   * Analyze document to identify equipment and procedures
   */
  private async analyzeDocumentForSOPs(document: Document): Promise<{
    equipment: string[];
    procedures: string[];
    manufacturer: string;
    model: string;
    safetyHazards: string[];
  }> {
    try {
      // Simplified analysis that extracts key terms from document content
      const content = document.content || '';
      const filename = document.filename || '';
      
      // Extract equipment from filename and content
      const equipment = this.extractEquipment(content + ' ' + filename);
      const procedures = this.extractProcedures(content);
      const manufacturer = this.extractManufacturer(content + ' ' + filename);
      const model = this.extractModel(content + ' ' + filename);
      const safetyHazards = this.extractSafetyHazards(content);

      return { equipment, procedures, manufacturer, model, safetyHazards };
    } catch (error) {
      console.error('❌ Document analysis failed:', error);
      return { equipment: [], procedures: [], manufacturer: '', model: '', safetyHazards: [] };
    }
  }

  private extractEquipment(text: string): string[] {
    const equipment = [];
    const patterns = [
      /\b(alternator|generator|battery|inverter|converter|pump|furnace|heater|refrigerator|toilet|awning|slide|jack|brake|bearing|axle)\b/gi
    ];
    
    for (const pattern of patterns) {
      const matches = text.match(pattern);
      if (matches) equipment.push(...matches.map(m => m.toLowerCase()));
    }
    
    return [...new Set(equipment)]; // Remove duplicates
  }

  private extractProcedures(text: string): string[] {
    const procedures = [];
    const patterns = [
      /\b(install|repair|replace|troubleshoot|diagnose|maintain|service|adjust|calibrate|test)\b/gi
    ];
    
    for (const pattern of patterns) {
      const matches = text.match(pattern);
      if (matches) procedures.push(...matches.map(m => m.toLowerCase()));
    }
    
    return [...new Set(procedures)];
  }

  private extractManufacturer(text: string): string {
    const manufacturers = ['Dometic', 'Lippert', 'Winnebago', 'Forest River', 'Suburban', 'Atwood', 'Progressive Dynamics', 'WFCO', 'Victron'];
    for (const mfg of manufacturers) {
      if (text.toLowerCase().includes(mfg.toLowerCase())) {
        return mfg;
      }
    }
    return 'General';
  }

  private extractModel(text: string): string {
    const modelMatch = text.match(/model\s+([A-Z0-9\-]+)/i);
    return modelMatch ? modelMatch[1] : 'All Models';
  }

  private extractSafetyHazards(text: string): string[] {
    const hazards = [];
    if (text.toLowerCase().includes('electric') || text.toLowerCase().includes('voltage')) {
      hazards.push('Electrical hazard');
    }
    if (text.toLowerCase().includes('gas') || text.toLowerCase().includes('propane')) {
      hazards.push('Gas hazard');
    }
    if (text.toLowerCase().includes('pressure')) {
      hazards.push('High pressure');
    }
    return hazards.length > 0 ? hazards : ['Standard PPE required'];
  }

  /**
   * Generate a single SOP from document and procedure
   */
  private async generateSingleSOP(
    document: Document, 
    procedure: string, 
    analysis: any
  ): Promise<void> {
    try {
      // Create synthetic user request to simulate real usage
      const sopRequest: SOPRequest = {
        query: `${procedure} for ${analysis.equipment.join(' ')} on ${analysis.manufacturer} ${analysis.model}`.trim(),
        equipment_type: analysis.equipment[0] || 'general',
        system_category: this.categorizeEquipment(analysis.equipment[0] || ''),
        brand: analysis.manufacturer || 'General',
        model: analysis.model || 'All Models',
        serial_number: 'AUTO-GEN',
        problem_description: `${procedure} - Auto-generated from ${document.filename}`,
        user_id: 'auto-generator',
        safety_requirements: analysis.safetyHazards.length > 0 ? analysis.safetyHazards : ['Standard PPE'],
        reference_documents: [document.id],
        evidence_requirements: ['Photo documentation required', 'Completion verification']
      };

      console.log(`🤖 Generating SOP: "${sopRequest.query}"`);

      // Generate SOP using multi-agent system
      const sopResult = await this.sopGenerator.generateSOP(sopRequest);

      if (sopResult && sopResult.finalSOP) {
        console.log(`✅ Generated SOP for: ${procedure}`);
        console.log(`📄 SOP Preview: ${sopResult.finalSOP.substring(0, 100)}...`);
      } else {
        console.log(`❌ SOP generation failed for: ${procedure}`);
      }

    } catch (error) {
      console.error(`❌ Failed to generate SOP for ${procedure}:`, error);
    }
  }

  /**
   * Categorize equipment into system categories
   */
  private categorizeEquipment(equipment: string): string {
    const electrical = ['alternator', 'battery', 'inverter', 'converter', 'panel', 'outlet', 'wiring'];
    const plumbing = ['pump', 'tank', 'faucet', 'toilet', 'shower', 'pipe', 'valve'];
    const hvac = ['furnace', 'ac', 'air conditioner', 'heater', 'vent', 'thermostat'];
    const mechanical = ['brake', 'axle', 'bearing', 'suspension', 'engine', 'transmission'];
    const appliance = ['refrigerator', 'stove', 'microwave', 'water heater', 'furnace'];

    const eq = equipment.toLowerCase();
    
    if (electrical.some(term => eq.includes(term))) return 'electrical';
    if (plumbing.some(term => eq.includes(term))) return 'plumbing'; 
    if (hvac.some(term => eq.includes(term))) return 'hvac';
    if (mechanical.some(term => eq.includes(term))) return 'mechanical';
    if (appliance.some(term => eq.includes(term))) return 'appliance';
    
    return 'general';
  }

  /**
   * Get processing status
   */
  getStatus(): { isProcessing: boolean } {
    return { isProcessing: this.isProcessing };
  }
}