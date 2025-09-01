class DocumentProcessor {
  async preprocessDocument(content: string): Promise<string> {
    // Remove extra whitespace and normalize text
    let processed = content
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/\n+/g, '\n') // Replace multiple newlines with single newline
      .trim();

    // Remove common document artifacts
    processed = processed
      .replace(/\f/g, '') // Remove form feeds
      .replace(/\r/g, '') // Remove carriage returns
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, ''); // Remove control characters

    // Normalize quotes and dashes
    processed = processed
      .replace(/[""]/g, '"')
      .replace(/['']/g, "'")
      .replace(/[–—]/g, '-');

    return processed;
  }

  async chunkDocument(content: string, chunkSize: number = 1000): Promise<string[]> {
    const chunks: string[] = [];
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    let currentChunk = '';
    
    for (const sentence of sentences) {
      const trimmedSentence = sentence.trim();
      
      if (currentChunk.length + trimmedSentence.length + 1 <= chunkSize) {
        currentChunk += (currentChunk ? '. ' : '') + trimmedSentence;
      } else {
        if (currentChunk) {
          chunks.push(currentChunk + '.');
        }
        currentChunk = trimmedSentence;
      }
    }
    
    if (currentChunk) {
      chunks.push(currentChunk + '.');
    }
    
    return chunks;
  }

  async extractMetadata(content: string): Promise<Record<string, any>> {
    const metadata: Record<string, any> = {};
    
    // Extract potential section headers
    const headers = content.match(/^[A-Z][A-Z\s]*$/gm) || [];
    metadata.sections = headers.slice(0, 10); // Limit to first 10 headers
    
    // Extract numbers that might be references or codes
    const codes = content.match(/\b[A-Z]{2,}\d{2,}\b/g) || [];
    metadata.referenceCodes = Array.from(new Set(codes)).slice(0, 20);
    
    // Calculate basic stats
    metadata.wordCount = content.split(/\s+/).length;
    metadata.characterCount = content.length;
    metadata.estimatedReadingTime = Math.ceil(metadata.wordCount / 200); // 200 words per minute
    
    // Detect potential industry keywords
    const industryKeywords = {
      electrical: ['voltage', 'current', 'electrical', 'circuit', 'wire', 'power'],
      mechanical: ['mechanical', 'bearing', 'gear', 'motor', 'maintenance', 'lubrication'],
      medical: ['patient', 'medical', 'healthcare', 'clinical', 'sterile', 'FDA'],
      hvac: ['HVAC', 'heating', 'cooling', 'ventilation', 'refrigerant', 'thermostat'],
      safety: ['safety', 'hazard', 'PPE', 'emergency', 'risk', 'protection']
    };
    
    const detectedIndustries: string[] = [];
    for (const [industry, keywords] of Object.entries(industryKeywords)) {
      const matches = keywords.filter(keyword => 
        content.toLowerCase().includes(keyword.toLowerCase())
      );
      if (matches.length >= 2) {
        detectedIndustries.push(industry);
      }
    }
    
    metadata.detectedIndustries = detectedIndustries;
    
    return metadata;
  }

  async validateDocumentStructure(content: string): Promise<{ valid: boolean; issues: string[] }> {
    const issues: string[] = [];
    
    // Check minimum content length
    if (content.length < 100) {
      issues.push('Document content is too short for meaningful analysis');
    }
    
    // Check for potential corrupted text
    const nonPrintableRatio = (content.match(/[\u0000-\u001F\u007F-\u009F]/g) || []).length / content.length;
    if (nonPrintableRatio > 0.1) {
      issues.push('Document contains high ratio of non-printable characters');
    }
    
    // Check for proper sentence structure
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length < 3) {
      issues.push('Document lacks proper sentence structure');
    }
    
    // Check for extremely long lines (might indicate formatting issues)
    const lines = content.split('\n');
    const longLines = lines.filter(line => line.length > 500);
    if (longLines.length > lines.length * 0.5) {
      issues.push('Document may have formatting issues (very long lines detected)');
    }
    
    return {
      valid: issues.length === 0,
      issues
    };
  }
}

export const documentProcessor = new DocumentProcessor();
