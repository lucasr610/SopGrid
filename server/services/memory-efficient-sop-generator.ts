import { aiRouter } from "./ai-router.js";

interface MemoryEfficientSOPRequest {
  topic: string;
  system: string;
  component: string;
  complexity?: 'basic' | 'intermediate' | 'advanced' | 'expert';
  maxMemoryMB?: number;
}

interface SOPChunk {
  id: string;
  section: string;
  content: string;
  order: number;
}

interface MemoryStatus {
  currentMB: number;
  percentageUsed: number;
  isNearLimit: boolean;
}

class MemoryEfficientSOPGenerator {
  private readonly MAX_MEMORY_PERCENTAGE = 85; // Don't exceed 85% memory
  private readonly CHUNK_SIZE = 2000; // Characters per chunk
  private readonly MAX_CONCURRENT_AI_CALLS = 2; // Limit concurrent AI operations

  /**
   * Generate large SOPs without hitting memory limits
   */
  async generateMassiveSOP(request: MemoryEfficientSOPRequest): Promise<{
    success: boolean;
    sop?: string;
    chunks?: SOPChunk[];
    memoryUsed: number;
    error?: string;
  }> {
    console.log(`🚀 Starting memory-efficient SOP generation for: ${request.topic}`);
    
    try {
      // Step 1: Check memory before starting
      let memoryStatus = this.checkMemoryUsage();
      if (memoryStatus.isNearLimit) {
        console.log(`⚠️ Memory too high (${memoryStatus.percentageUsed}%) - triggering garbage collection`);
        this.forceGarbageCollection();
        memoryStatus = this.checkMemoryUsage();
        
        if (memoryStatus.isNearLimit) {
          return {
            success: false,
            memoryUsed: memoryStatus.currentMB,
            error: `Memory usage too high: ${memoryStatus.percentageUsed}% - cannot generate large SOP safely`
          };
        }
      }

      // Step 2: Break down the request into manageable sections
      const sections = this.createSOPSections(request);
      console.log(`📋 Created ${sections.length} SOP sections for processing`);

      // Step 3: Process sections in memory-safe chunks with streaming
      const chunks: SOPChunk[] = [];
      let totalMemoryUsed = 0;

      for (let i = 0; i < sections.length; i++) {
        // Check memory before each section
        const beforeProcessing = this.checkMemoryUsage();
        if (beforeProcessing.isNearLimit) {
          console.log(`⚠️ Memory limit reached after ${i} sections - stopping generation`);
          break;
        }

        console.log(`🔄 Processing section ${i + 1}/${sections.length}: ${sections[i]}`);

        // Generate section content with memory limits
        const sectionContent = await this.generateSectionSafely(
          sections[i],
          request,
          beforeProcessing.currentMB
        );

        if (sectionContent) {
          chunks.push({
            id: `chunk_${i}`,
            section: sections[i],
            content: sectionContent,
            order: i
          });

          // Force cleanup after each section
          this.forceGarbageCollection();
        }

        const afterProcessing = this.checkMemoryUsage();
        totalMemoryUsed = Math.max(totalMemoryUsed, afterProcessing.currentMB);
        
        console.log(`💾 Memory after section ${i + 1}: ${afterProcessing.currentMB}MB (${afterProcessing.percentageUsed}%)`);
      }

      // Step 4: Combine chunks into final SOP (if memory allows)
      const finalMemory = this.checkMemoryUsage();
      let finalSOP = '';
      
      if (finalMemory.percentageUsed < 70 && chunks.length > 0) {
        // Safe to combine chunks
        finalSOP = chunks
          .sort((a, b) => a.order - b.order)
          .map(chunk => `## ${chunk.section}\n\n${chunk.content}\n\n`)
          .join('');
        
        console.log(`✅ Successfully generated ${chunks.length} section SOP (${finalSOP.length} characters)`);
      } else {
        console.log(`⚠️ Memory too high to combine chunks - returning individual sections`);
      }

      return {
        success: true,
        sop: finalSOP || undefined,
        chunks: chunks,
        memoryUsed: totalMemoryUsed
      };

    } catch (error) {
      console.error('🚨 Memory-efficient SOP generation failed:', error);
      return {
        success: false,
        memoryUsed: this.checkMemoryUsage().currentMB,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private createSOPSections(request: MemoryEfficientSOPRequest): string[] {
    // Create sections based on complexity
    const baseSection = [
      'Safety Overview',
      'Prerequisites & Tools',
      'Step-by-Step Procedure'
    ];

    const advancedSections = [
      'Safety Overview & Hazard Assessment',
      'Prerequisites & Required Tools',
      'System Preparation & Isolation',
      'Diagnostic Procedures',
      'Main Installation/Repair Steps',
      'Testing & Verification',
      'Quality Control & Final Inspection',
      'Documentation & Compliance'
    ];

    const expertSections = [
      'Comprehensive Safety Assessment',
      'Regulatory Compliance Overview',
      'Prerequisites & Advanced Tooling',
      'System Analysis & Diagnostics',
      'Pre-Work Isolation Procedures',
      'Primary Installation/Repair Process',
      'Secondary System Integration',
      'Comprehensive Testing Protocol',
      'Quality Assurance & Validation',
      'Final Inspection & Documentation',
      'Maintenance Schedule & Follow-up'
    ];

    switch (request.complexity) {
      case 'expert':
        return expertSections;
      case 'advanced':
        return advancedSections;
      default:
        return baseSection;
    }
  }

  private async generateSectionSafely(
    section: string,
    request: MemoryEfficientSOPRequest,
    currentMemoryMB: number
  ): Promise<string | null> {
    try {
      // Create a focused prompt for just this section
      const prompt = `Generate the "${section}" section for ${request.system} ${request.component} maintenance. 
      Keep response under ${this.CHUNK_SIZE} characters. Focus only on this specific section.
      
      Topic: ${request.topic}
      System: ${request.system}
      Component: ${request.component}`;

      // Use AI router with memory monitoring
      const beforeAI = this.checkMemoryUsage();
      
      if (beforeAI.percentageUsed > this.MAX_MEMORY_PERCENTAGE) {
        console.log(`⚠️ Skipping section ${section} - memory usage too high (${beforeAI.percentageUsed}%)`);
        return null;
      }

      const response = await aiRouter.generateResponse({
        prompt,
        maxTokens: 500, // Limit token generation to control memory
        model: 'gemini' // Use most memory-efficient model
      });

      // Truncate response if too large
      const content = response.substring(0, this.CHUNK_SIZE);
      
      const afterAI = this.checkMemoryUsage();
      console.log(`🤖 AI section generated: ${content.length} chars, Memory: ${afterAI.currentMB}MB`);
      
      return content;
      
    } catch (error) {
      console.error(`❌ Failed to generate section ${section}:`, error);
      return `## ${section}\n\nSection generation failed due to memory constraints. Please generate this section separately.`;
    }
  }

  private checkMemoryUsage(): MemoryStatus {
    const memUsage = process.memoryUsage();
    const currentMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    const totalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
    const percentageUsed = Math.round((currentMB / totalMB) * 100);
    
    return {
      currentMB,
      percentageUsed,
      isNearLimit: percentageUsed > this.MAX_MEMORY_PERCENTAGE
    };
  }

  private forceGarbageCollection(): void {
    try {
      if (global.gc) {
        global.gc();
        console.log('🧹 Forced garbage collection');
      } else {
        console.log('⚠️ Garbage collection not available');
      }
    } catch (error) {
      console.log('⚠️ Could not force garbage collection:', error);
    }
  }

  /**
   * Queue system for processing multiple large SOP requests
   */
  async queueLargeSOPGeneration(requests: MemoryEfficientSOPRequest[]): Promise<{
    completed: any[];
    failed: any[];
    totalMemoryUsed: number;
  }> {
    console.log(`📋 Queuing ${requests.length} large SOP requests for memory-safe processing`);
    
    const completed: any[] = [];
    const failed: any[] = [];
    let maxMemoryUsed = 0;

    for (let i = 0; i < requests.length; i++) {
      const request = requests[i];
      console.log(`🔄 Processing queued SOP ${i + 1}/${requests.length}: ${request.topic}`);

      // Check memory before each request
      const beforeRequest = this.checkMemoryUsage();
      if (beforeRequest.isNearLimit) {
        console.log(`⚠️ Memory limit reached - queuing remaining ${requests.length - i} requests for later`);
        failed.push(...requests.slice(i).map(req => ({
          request: req,
          reason: 'Memory limit reached in queue'
        })));
        break;
      }

      const result = await this.generateMassiveSOP(request);
      maxMemoryUsed = Math.max(maxMemoryUsed, result.memoryUsed);

      if (result.success) {
        completed.push({ request, result });
      } else {
        failed.push({ request, error: result.error });
      }

      // Force cleanup between requests
      this.forceGarbageCollection();

      // Optional: Add delay between requests to allow memory stabilization
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return {
      completed,
      failed,
      totalMemoryUsed: maxMemoryUsed
    };
  }
}

export const memoryEfficientSOPGenerator = new MemoryEfficientSOPGenerator();