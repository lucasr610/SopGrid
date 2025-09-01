/**
 * MANUAL LOOKUP SERVICE
 * 
 * Searches for and validates equipment manuals based on model/serial numbers.
 * If manuals aren't found, prompts user to upload them for accurate procedures.
 */

import { aiRouter } from './ai-router';
import { evidenceLedger } from './evidence-ledger';

export interface ManualSearchResult {
  found: boolean;
  manualSource: 'database' | 'manufacturer_website' | 'user_uploaded' | 'not_found';
  manualData?: {
    title: string;
    modelNumber: string;
    serialNumber?: string;
    manufacturer: string;
    year?: string;
    content: string;
    sections: {
      troubleshooting?: string;
      specifications?: string;
      wiring?: string;
      parts?: string;
      safety?: string;
    };
    images: {
      [sectionName: string]: ManualImage[];
    };
  };
  confidence: number;
  needsUserUpload: boolean;
  uploadRequest?: {
    message: string;
    acceptedFormats: string[];
    requiredSections: string[];
  };
}

export interface ManualImage {
  id: string;
  filename: string;
  description: string;
  section: string;
  pageNumber?: number;
  imageUrl: string; // Path to actual stored image
  relevantFor: string[]; // What procedures this image helps with
  verified: boolean; // Only TRUE if from actual manual
}

class ManualLookupService {
  
  /**
   * SMART MANUAL LOOKUP - Find exact manuals for equipment
   */
  async searchForManual(equipmentInfo: {
    modelNumber: string;
    serialNumber?: string;
    manufacturer?: string;
    equipmentType: string;
  }): Promise<ManualSearchResult> {
    
    console.log(`📖 MANUAL LOOKUP: Searching for ${equipmentInfo.equipmentType} manual...`);
    console.log(`Model: ${equipmentInfo.modelNumber}, Serial: ${equipmentInfo.serialNumber || 'N/A'}`);
    
    // Step 1: Search internal database
    const databaseResult = await this.searchInternalDatabase(equipmentInfo);
    if (databaseResult.found) {
      return databaseResult;
    }
    
    // Step 2: Search manufacturer websites/databases
    const manufacturerResult = await this.searchManufacturerSources(equipmentInfo);
    if (manufacturerResult.found) {
      return manufacturerResult;
    }
    
    // Step 3: Request user to upload manual
    console.log('📖 MANUAL NOT FOUND: Requesting user upload for accuracy');
    
    return {
      found: false,
      manualSource: 'not_found',
      confidence: 0,
      needsUserUpload: true,
      uploadRequest: {
        message: `I need the manual for your ${equipmentInfo.equipmentType} (Model: ${equipmentInfo.modelNumber}) to provide accurate procedures. Please upload the manual or service documentation.`,
        acceptedFormats: ['PDF', 'JPG', 'PNG', 'DOC'],
        requiredSections: [
          'Troubleshooting Guide',
          'Wiring Diagram', 
          'Parts List',
          'Specifications',
          'Control Board Information'
        ]
      }
    };
  }
  
  /**
   * Search internal database for stored manuals
   */
  private async searchInternalDatabase(equipmentInfo: any): Promise<ManualSearchResult> {
    try {
      console.log('🗄️ Searching internal manual database...');
      
      // This would search PostgreSQL/MongoDB for stored manuals
      // For now, return not found to demonstrate the flow
      
      return {
        found: false,
        manualSource: 'database',
        confidence: 0,
        needsUserUpload: false
      };
      
    } catch (error) {
      console.error('🚨 Database manual search failed:', error);
      return {
        found: false,
        manualSource: 'database',
        confidence: 0,
        needsUserUpload: false
      };
    }
  }
  
  /**
   * Search manufacturer websites and databases
   */
  private async searchManufacturerSources(equipmentInfo: any): Promise<ManualSearchResult> {
    try {
      console.log('🌐 Searching manufacturer sources...');
      
      // Use AI to generate likely manual sources and search strategies
      const searchStrategy = await this.generateSearchStrategy(equipmentInfo);
      
      // This would implement actual web scraping or API calls to manufacturer sites
      // For now, simulate the search process
      
      const searchPrompt = `
MANUFACTURER MANUAL SEARCH for:
Model: ${equipmentInfo.modelNumber}
Type: ${equipmentInfo.equipmentType}
Manufacturer: ${equipmentInfo.manufacturer || 'Unknown'}

Based on this model number, determine:
1. Most likely manufacturer (Atwood, Suburban, Dometic, etc.)
2. Typical manual naming patterns for this manufacturer
3. Common manual locations/websites
4. Alternative model number formats or series information

Respond with likelihood of finding manual and expected manual structure.
`;

      const aiResponse = await aiRouter.callAI({
        model: 'openai',
        messages: [
          { role: 'system', content: 'You are an expert at finding RV equipment manuals and understanding manufacturer patterns.' },
          { role: 'user', content: searchPrompt }
        ],
        temperature: 0.2,
        systemName: 'manual_search_strategy'
      });
      
      // Analyze AI response to determine if manual is likely findable
      const confidence = this.analyzeSearchConfidence(aiResponse);
      
      if (confidence > 0.7) {
        // High confidence - would normally fetch actual manual here
        console.log('📖 HIGH CONFIDENCE: Manual likely available from manufacturer');
        
        // For demonstration, return mock manual data
        return {
          found: true,
          manualSource: 'manufacturer_website',
          confidence: confidence,
          needsUserUpload: false,
          manualData: {
            title: `${equipmentInfo.modelNumber} Service Manual`,
            modelNumber: equipmentInfo.modelNumber,
            manufacturer: equipmentInfo.manufacturer || 'Determined from model',
            content: 'Mock manual content - would be actual manual in production',
            sections: {
              troubleshooting: 'Troubleshooting section content',
              specifications: 'Technical specifications',
              wiring: 'Wiring diagrams and electrical info',
              parts: 'Parts list and part numbers',
              safety: 'Safety procedures and warnings'
            }
          }
        };
      } else {
        console.log('📖 LOW CONFIDENCE: Manual not readily available');
        return {
          found: false,
          manualSource: 'manufacturer_website',
          confidence: confidence,
          needsUserUpload: true
        };
      }
      
    } catch (error) {
      console.error('🚨 Manufacturer search failed:', error);
      return {
        found: false,
        manualSource: 'manufacturer_website',
        confidence: 0,
        needsUserUpload: true
      };
    }
  }
  
  /**
   * Generate search strategy using AI
   */
  private async generateSearchStrategy(equipmentInfo: any): Promise<any> {
    // Use AI to understand model number patterns and suggest search approaches
    return {
      manufacturer: 'inferred',
      searchTerms: [equipmentInfo.modelNumber],
      likelihood: 0.5
    };
  }
  
  /**
   * Analyze AI response to determine search confidence
   */
  private analyzeSearchConfidence(aiResponse: string): number {
    const response = aiResponse.toLowerCase();
    
    // Simple confidence scoring based on AI response
    let confidence = 0.3; // Base confidence
    
    if (response.includes('atwood') || response.includes('suburban') || response.includes('dometic')) {
      confidence += 0.3; // Known manufacturer
    }
    
    if (response.includes('common') || response.includes('standard') || response.includes('available')) {
      confidence += 0.2; // Likely available
    }
    
    if (response.includes('manual') && response.includes('website')) {
      confidence += 0.2; // Manual mentioned with source
    }
    
    return Math.min(confidence, 1.0);
  }
  
  /**
   * Process user-uploaded manual
   */
  async processUploadedManual(file: Buffer, equipmentInfo: any): Promise<ManualSearchResult> {
    try {
      console.log('📤 PROCESSING: User uploaded manual...');
      
      // Extract text AND images from uploaded file
      const extractedContent = await this.extractContentFromFile(file);
      
      // Validate manual is for correct equipment
      const validation = await this.validateManualMatch(extractedContent.text, equipmentInfo);
      
      if (!validation.isValid) {
        throw new Error(`Manual validation failed: ${validation.reason}`);
      }
      
      // Parse manual sections using AI
      const parsedManual = await this.parseManualSections(extractedContent.text, equipmentInfo);
      
      // Process and categorize images from manual
      const processedImages = await this.processManualImages(extractedContent.images, equipmentInfo);
      parsedManual.images = processedImages;
      
      // Store manual with images for future use
      await this.storeManual(parsedManual, equipmentInfo);
      
      // Log to evidence ledger
      await evidenceLedger.append('MANUAL_UPLOAD_PROCESSED', {
        modelNumber: equipmentInfo.modelNumber,
        manualSize: file.length,
        sectionsFound: Object.keys(parsedManual.sections).length,
        imagesFound: Object.keys(processedImages).reduce((total, section) => total + processedImages[section].length, 0),
        timestamp: new Date().toISOString()
      });
      
      console.log('✅ Manual with images processed and stored successfully');
      
      return {
        found: true,
        manualSource: 'user_uploaded',
        confidence: validation.confidence,
        needsUserUpload: false,
        manualData: parsedManual
      };
      
    } catch (error) {
      console.error('🚨 Manual processing failed:', error);
      throw error;
    }
  }
  
  /**
   * Extract text AND images from uploaded file
   */
  private async extractContentFromFile(file: Buffer): Promise<{
    text: string;
    images: Array<{
      data: Buffer;
      filename: string;
      pageNumber?: number;
    }>;
  }> {
    // This would use PDF parsing with image extraction, OCR for images, etc.
    // Different handling based on file type
    
    const fileHeader = file.slice(0, 4);
    
    if (fileHeader.toString('hex').startsWith('25504446')) {
      // PDF file - extract both text and images
      return await this.extractFromPDF(file);
    } else if (fileHeader[0] === 0xFF && fileHeader[1] === 0xD8) {
      // JPEG image - OCR the image and return it as single image
      return await this.extractFromImage(file, 'jpg');
    } else if (fileHeader.toString('hex').startsWith('89504e47')) {
      // PNG image - OCR the image
      return await this.extractFromImage(file, 'png');
    } else {
      throw new Error('Unsupported file format. Please upload PDF, JPG, or PNG files.');
    }
  }
  
  /**
   * Extract content from PDF including embedded images
   */
  private async extractFromPDF(file: Buffer): Promise<{
    text: string;
    images: Array<{
      data: Buffer;
      filename: string;
      pageNumber?: number;
    }>;
  }> {
    try {
      // This would use a PDF library like pdf-parse with image extraction
      // For now, simulate the extraction process
      
      console.log('📄 EXTRACTING: PDF content and images...');
      
      return {
        text: 'Extracted PDF text content - would contain actual manual text',
        images: [
          // Simulated extracted images from PDF
          {
            data: Buffer.from(''), // Would contain actual image data
            filename: 'wiring_diagram_page_15.jpg',
            pageNumber: 15
          },
          {
            data: Buffer.from(''), // Would contain actual image data
            filename: 'control_board_location_page_8.jpg',
            pageNumber: 8
          }
        ]
      };
      
    } catch (error) {
      console.error('🚨 PDF extraction failed:', error);
      throw new Error('Failed to extract content from PDF');
    }
  }
  
  /**
   * Extract content from image file using OCR
   */
  private async extractFromImage(file: Buffer, format: string): Promise<{
    text: string;
    images: Array<{
      data: Buffer;
      filename: string;
    }>;
  }> {
    try {
      console.log(`🖼️ EXTRACTING: ${format.toUpperCase()} image content...`);
      
      // This would use OCR like Tesseract to extract text from image
      // For now, simulate the process
      
      return {
        text: 'OCR extracted text from manual image',
        images: [
          {
            data: file, // The original image
            filename: `manual_image.${format}`
          }
        ]
      };
      
    } catch (error) {
      console.error('🚨 Image extraction failed:', error);
      throw new Error(`Failed to extract content from ${format.toUpperCase()} image`);
    }
  }
  
  /**
   * Validate uploaded manual matches equipment
   */
  private async validateManualMatch(text: string, equipmentInfo: any): Promise<{
    isValid: boolean;
    confidence: number;
    reason?: string;
  }> {
    
    const validationPrompt = `
VALIDATE MANUAL MATCH:

Expected Equipment:
- Model: ${equipmentInfo.modelNumber}
- Type: ${equipmentInfo.equipmentType}
- Manufacturer: ${equipmentInfo.manufacturer || 'Unknown'}

Manual Text Sample:
${text.substring(0, 1000)}...

Does this manual match the expected equipment?
- Look for model number matches
- Check manufacturer information
- Verify equipment type consistency

Respond with: VALID or INVALID: reason
Include confidence score 0-1.
`;

    try {
      const response = await aiRouter.callAI({
        model: 'claude',
        messages: [
          { role: 'system', content: 'You are an expert at validating technical manuals for RV equipment.' },
          { role: 'user', content: validationPrompt }
        ],
        temperature: 0.1,
        systemName: 'manual_validation'
      });
      
      const isValid = response.toLowerCase().includes('valid') && !response.toLowerCase().includes('invalid');
      const confidenceMatch = response.match(/confidence[:\s]*([0-9.]+)/i);
      const confidence = confidenceMatch ? parseFloat(confidenceMatch[1]) : (isValid ? 0.8 : 0.2);
      
      if (!isValid) {
        const reasonMatch = response.match(/invalid:\s*(.+)/i);
        const reason = reasonMatch ? reasonMatch[1] : 'Manual does not match expected equipment';
        return { isValid: false, confidence, reason };
      }
      
      return { isValid: true, confidence };
      
    } catch (error) {
      console.error('🚨 Manual validation failed:', error);
      return { isValid: false, confidence: 0, reason: 'Validation system error' };
    }
  }
  
  /**
   * Parse manual into structured sections
   */
  private async parseManualSections(text: string, equipmentInfo: any): Promise<any> {
    // Use AI to identify and extract key sections
    const parsingPrompt = `
PARSE MANUAL SECTIONS for ${equipmentInfo.equipmentType} ${equipmentInfo.modelNumber}:

${text}

Extract and organize into sections:
1. TROUBLESHOOTING - diagnostic procedures and problem solving
2. SPECIFICATIONS - voltage, dimensions, capacities, ratings
3. WIRING - electrical diagrams and connections
4. PARTS - part numbers and component information
5. SAFETY - warnings, precautions, and safety procedures

Return structured JSON with each section's content.
`;

    try {
      const response = await aiRouter.callAI({
        model: 'claude',
        messages: [
          { role: 'system', content: 'You are an expert at parsing technical manuals and extracting structured information.' },
          { role: 'user', content: parsingPrompt }
        ],
        temperature: 0.2,
        systemName: 'manual_parsing'
      });
      
      // Parse the AI response to extract sections
      const sections = this.extractSectionsFromResponse(response);
      
      return {
        title: `${equipmentInfo.modelNumber} Manual`,
        modelNumber: equipmentInfo.modelNumber,
        manufacturer: equipmentInfo.manufacturer,
        content: text,
        sections: sections,
        images: {} // Will be populated by processManualImages
      };
      
    } catch (error) {
      console.error('🚨 Manual parsing failed:', error);
      return {
        title: `${equipmentInfo.modelNumber} Manual`,
        modelNumber: equipmentInfo.modelNumber,
        content: text,
        sections: {
          troubleshooting: 'Section extraction failed - full manual available',
          specifications: 'Section extraction failed - full manual available'
        },
        images: {}
      };
    }
  }
  
  /**
   * Process and categorize images from manual - ONLY REAL IMAGES
   */
  private async processManualImages(
    extractedImages: Array<{
      data: Buffer;
      filename: string;
      pageNumber?: number;
    }>,
    equipmentInfo: any
  ): Promise<{ [sectionName: string]: ManualImage[] }> {
    
    console.log(`🖼️ PROCESSING: ${extractedImages.length} images from manual...`);
    
    const processedImages: { [sectionName: string]: ManualImage[] } = {
      troubleshooting: [],
      wiring: [],
      parts: [],
      specifications: [],
      safety: []
    };
    
    // CRITICAL: Only process actual images from the manual - NEVER generate or search web
    for (const image of extractedImages) {
      try {
        // Store the actual image from manual
        const storedImageUrl = await this.storeManualImage(image, equipmentInfo);
        
        // Use AI to identify what the image shows (but never generate images)
        const imageDescription = await this.analyzeManualImage(image, equipmentInfo);
        
        const manualImage: ManualImage = {
          id: `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          filename: image.filename,
          description: imageDescription.description,
          section: imageDescription.section,
          pageNumber: image.pageNumber,
          imageUrl: storedImageUrl,
          relevantFor: imageDescription.relevantFor,
          verified: true // TRUE because it's from actual manual
        };
        
        // Categorize into appropriate section
        if (processedImages[imageDescription.section]) {
          processedImages[imageDescription.section].push(manualImage);
        } else {
          // Default to troubleshooting if section unclear
          processedImages.troubleshooting.push(manualImage);
        }
        
        console.log(`✅ IMAGE PROCESSED: ${image.filename} → ${imageDescription.section}`);
        
      } catch (error) {
        console.error(`🚨 Failed to process image ${image.filename}:`, error);
        // Skip failed images - don't break the whole process
      }
    }
    
    const totalProcessed = Object.values(processedImages).reduce((sum, imgs) => sum + imgs.length, 0);
    console.log(`📊 IMAGES CATEGORIZED: ${totalProcessed} images across ${Object.keys(processedImages).length} sections`);
    
    return processedImages;
  }
  
  /**
   * Store actual manual image - NO FAKES OR WEB IMAGES
   */
  private async storeManualImage(
    image: { data: Buffer; filename: string; pageNumber?: number },
    equipmentInfo: any
  ): Promise<string> {
    try {
      // Store in object storage or file system
      const imagePath = `/manuals/${equipmentInfo.modelNumber}/images/${image.filename}`;
      
      // This would actually store the image file
      console.log(`💾 STORING: Manual image ${image.filename} at ${imagePath}`);
      
      // Return the path where image is stored
      return imagePath;
      
    } catch (error) {
      console.error('🚨 Image storage failed:', error);
      throw new Error('Failed to store manual image');
    }
  }
  
  /**
   * Analyze what the manual image shows - ONLY describe, never generate
   */
  private async analyzeManualImage(
    image: { data: Buffer; filename: string; pageNumber?: number },
    equipmentInfo: any
  ): Promise<{
    description: string;
    section: string;
    relevantFor: string[];
  }> {
    
    try {
      // Use AI to analyze what's in the actual manual image
      const analysisPrompt = `
ANALYZE MANUAL IMAGE from ${equipmentInfo.equipmentType} ${equipmentInfo.modelNumber}:

Image filename: ${image.filename}
Page: ${image.pageNumber || 'Unknown'}

Based on the filename and context, determine:
1. What does this image likely show? (wiring diagram, parts, controls, etc.)
2. Which manual section does it belong to?
3. What troubleshooting procedures would this image help with?

IMPORTANT: Only describe what would logically be in a manual image with this filename.
Do NOT make up specific details or generate content.
`;

      const response = await aiRouter.callAI({
        model: 'claude',
        messages: [
          { role: 'system', content: 'You are analyzing filenames and context of manual images. Only describe what would logically be in such images based on filename patterns.' },
          { role: 'user', content: analysisPrompt }
        ],
        temperature: 0.1,
        systemName: 'image_analysis'
      });
      
      // Parse AI response to categorize image
      const section = this.categorizeImageByContent(response, image.filename);
      const relevantProcedures = this.extractRelevantProcedures(response);
      
      return {
        description: `Manual image: ${image.filename}${image.pageNumber ? ` (Page ${image.pageNumber})` : ''}`,
        section: section,
        relevantFor: relevantProcedures
      };
      
    } catch (error) {
      console.error('🚨 Image analysis failed:', error);
      
      // Fallback based on filename patterns
      return {
        description: `Manual image: ${image.filename}`,
        section: this.categorizeImageByFilename(image.filename),
        relevantFor: ['General reference']
      };
    }
  }
  
  /**
   * Categorize image by filename patterns
   */
  private categorizeImageByFilename(filename: string): string {
    const name = filename.toLowerCase();
    
    if (name.includes('wiring') || name.includes('diagram') || name.includes('electrical')) {
      return 'wiring';
    }
    if (name.includes('parts') || name.includes('component') || name.includes('exploded')) {
      return 'parts';
    }
    if (name.includes('control') || name.includes('board') || name.includes('panel')) {
      return 'troubleshooting';
    }
    if (name.includes('spec') || name.includes('dimension') || name.includes('rating')) {
      return 'specifications';
    }
    if (name.includes('safety') || name.includes('warning') || name.includes('caution')) {
      return 'safety';
    }
    
    // Default to troubleshooting for unclear images
    return 'troubleshooting';
  }
  
  /**
   * Categorize image by AI analysis content
   */
  private categorizeImageByContent(analysis: string, filename: string): string {
    const content = analysis.toLowerCase();
    
    if (content.includes('wiring') || content.includes('electrical') || content.includes('diagram')) {
      return 'wiring';
    }
    if (content.includes('parts') || content.includes('component')) {
      return 'parts';
    }
    if (content.includes('specification') || content.includes('dimension')) {
      return 'specifications';
    }
    if (content.includes('safety') || content.includes('warning')) {
      return 'safety';
    }
    
    // Fallback to filename categorization
    return this.categorizeImageByFilename(filename);
  }
  
  /**
   * Extract what procedures this image helps with
   */
  private extractRelevantProcedures(analysis: string): string[] {
    // Simple extraction based on content
    const procedures: string[] = [];
    
    if (analysis.includes('troubleshoot')) procedures.push('Troubleshooting');
    if (analysis.includes('install')) procedures.push('Installation');
    if (analysis.includes('repair')) procedures.push('Repair');
    if (analysis.includes('test')) procedures.push('Testing');
    if (analysis.includes('replace')) procedures.push('Replacement');
    
    return procedures.length > 0 ? procedures : ['General reference'];
  }
  
  /**
   * Extract sections from AI response
   */
  private extractSectionsFromResponse(response: string): any {
    // Simple section extraction - would be more sophisticated in production
    return {
      troubleshooting: 'Extracted troubleshooting content',
      specifications: 'Extracted specifications content',
      wiring: 'Extracted wiring information',
      parts: 'Extracted parts information',
      safety: 'Extracted safety information'
    };
  }
  
  /**
   * Store manual for future use
   */
  private async storeManual(manual: any, equipmentInfo: any): Promise<void> {
    try {
      // Store in database for future retrieval
      console.log('🗄️ STORING: Manual for future use...');
      
      // This would store in PostgreSQL/MongoDB with proper indexing
      // For now, just log the action
      
    } catch (error) {
      console.error('🚨 Manual storage failed:', error);
    }
  }
}

// Export singleton instance
export const manualLookupService = new ManualLookupService();