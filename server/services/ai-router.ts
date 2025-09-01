import { ollamaService } from './ollama-service';
import { openaiService } from './openai-service';
import { geminiService } from './gemini-service';

interface RouterConfig {
  preferLocal: boolean;
  fallbackToCloud: boolean;
  costThreshold?: number;
  logUsage: boolean;
}

interface UsageLog {
  timestamp: Date;
  service: string;
  model?: string;
  tokensUsed?: number;
  estimatedCost: number;
  success: boolean;
}

class AIRouter {
  private config: RouterConfig;
  private usageLogs: UsageLog[] = [];
  private totalCost: number = 0;

  constructor() {
    this.config = {
      preferLocal: process.env.PREFER_LOCAL_AI === 'true', // Cloud-first by default
      fallbackToCloud: process.env.FALLBACK_TO_CLOUD !== 'false', // Fallback enabled by default
      costThreshold: parseFloat(process.env.COST_THRESHOLD || '0'), 
      logUsage: process.env.LOG_AI_USAGE !== 'false'
    };
    
    if (this.config.preferLocal) {
      console.log('🏠 AI Router: LOCAL MODE - Using Ollama for internal agents only');
    } else {
      console.log('☁️ AI Router: CLOUD MODE - Using OpenAI, Gemini, Anthropic as primary processors');
    }
  }

  private logUsage(service: string, success: boolean, estimatedCost: number = 0, model?: string) {
    if (this.config.logUsage) {
      const log: UsageLog = {
        timestamp: new Date(),
        service,
        model,
        estimatedCost,
        success
      };
      this.usageLogs.push(log);
      this.totalCost += estimatedCost;
      
      console.log(`[AI Router] Used ${service}${model ? ` (${model})` : ''} - Cost: $${estimatedCost.toFixed(4)} - Total: $${this.totalCost.toFixed(4)}`);
    }
  }

  async generateEmbeddings(chunks: string[]): Promise<number[][]> {
    // Use OpenAI as primary for embeddings
    if (process.env.OPENAI_API_KEY) {
      try {
        const result = await openaiService.generateEmbeddings(chunks);
        const estimatedCost = (chunks.join('').length / 1000) * 0.00002;
        this.logUsage('openai', true, estimatedCost, 'text-embedding-3-large');
        return result;
      } catch (error) {
        console.warn('OpenAI embeddings failed, trying fallback:', error);
      }
    }

    // Fallback to Ollama only for internal operations
    if (this.config.preferLocal) {
      try {
        const available = await ollamaService.isServiceAvailable();
        if (available) {
          const result = await ollamaService.generateEmbeddings(chunks);
          this.logUsage('ollama', true, 0, 'local-embedding-model');
          return result;
        }
      } catch (error) {
        console.warn('Ollama embeddings failed:', error);
      }
    }

    // Return empty embeddings if no service available
    console.log('No embedding service available - returning empty embeddings');
    return chunks.map(() => []);
  }

  async analyzeCompliance(content: string): Promise<any> {
    // Use Gemini as primary for compliance analysis
    if (process.env.GEMINI_API_KEY) {
      try {
        const result = await geminiService.analyzeCompliance(content);
        const estimatedCost = (content.length / 1000) * 0.00025;
        this.logUsage('gemini', true, estimatedCost, 'gemini-2.5-pro');
        return result;
      } catch (error) {
        console.warn('Gemini compliance analysis failed:', error);
      }
    }

    // Fallback to OpenAI
    if (process.env.OPENAI_API_KEY) {
      try {
        const result = await openaiService.analyzeCompliance(content);
        const estimatedCost = (content.length / 1000) * 0.01;
        this.logUsage('openai', true, estimatedCost, 'gpt-4o');
        return result;
      } catch (error) {
        console.warn('OpenAI compliance analysis failed:', error);
      }
    }

    // Only use Ollama for internal agents as last resort
    if (this.config.preferLocal) {
      try {
        const available = await ollamaService.isServiceAvailable();
        if (available) {
          const result = await ollamaService.analyzeCompliance(content);
          this.logUsage('ollama', true, 0, 'compliance-internal');
          return result;
        }
      } catch (error) {
        console.warn('Ollama compliance analysis failed:', error);
      }
    }

    throw new Error('No compliance analysis service available');
  }

  async analyzeSafety(content: string): Promise<any> {
    // Use Anthropic Claude as primary for safety analysis
    if (process.env.ANTHROPIC_API_KEY) {
      try {
        // Import anthropic service dynamically for now
        const result = await geminiService.analyzeSafety(content); // Use Gemini for safety until Anthropic service is ready
        const estimatedCost = (content.length / 1000) * 0.00025;
        this.logUsage('gemini', true, estimatedCost, 'gemini-2.5-pro');
        return result;
      } catch (error) {
        console.warn('Safety analysis failed:', error);
      }
    }

    // Fallback to OpenAI
    if (process.env.OPENAI_API_KEY) {
      try {
        const result = await openaiService.analyzeSafety(content);
        const estimatedCost = (content.length / 1000) * 0.01;
        this.logUsage('openai', true, estimatedCost, 'gpt-4o');
        return result;
      } catch (error) {
        console.warn('OpenAI safety analysis failed:', error);
      }
    }

    // Only use Ollama for internal agents as last resort
    if (this.config.preferLocal) {
      try {
        const available = await ollamaService.isServiceAvailable();
        if (available) {
          const result = await ollamaService.analyzeSafety(content);
          this.logUsage('ollama', true, 0, 'safety-internal');
          return result;
        }
      } catch (error) {
        console.warn('Ollama safety analysis failed:', error);
      }
    }

    throw new Error('No safety analysis service available');
  }

  async generateSOPContent(prompt: string): Promise<string> {
    // Use OpenAI as primary for SOP generation (highest quality)
    if (process.env.OPENAI_API_KEY) {
      try {
        const result = await openaiService.generateSOPContent(prompt);
        const estimatedCost = (prompt.length / 1000) * 0.01 + 0.03;
        this.logUsage('openai', true, estimatedCost, 'gpt-4o');
        return result;
      } catch (error) {
        console.warn('OpenAI SOP generation failed:', error);
      }
    }

    // Fallback to Gemini
    if (process.env.GEMINI_API_KEY) {
      try {
        const result = await geminiService.generateSOPContent(prompt);
        const estimatedCost = (prompt.length / 1000) * 0.00025 + 0.001;
        this.logUsage('gemini', true, estimatedCost, 'gemini-2.5-pro');
        return result;
      } catch (error) {
        console.warn('Gemini SOP generation failed:', error);
      }
    }

    // Only use Ollama for internal agents as last resort
    if (this.config.preferLocal) {
      try {
        const available = await ollamaService.isServiceAvailable();
        if (available) {
          const result = await ollamaService.generateSOPContent(prompt);
          this.logUsage('ollama', true, 0, 'sop-generation-internal');
          return result;
        }
      } catch (error) {
        console.warn('Ollama SOP generation failed:', error);
      }
    }

    throw new Error('No SOP generation service available');
  }

  async chat(message: string): Promise<string> {
    // Use Gemini as primary for chat
    if (process.env.GEMINI_API_KEY) {
      try {
        const result = await geminiService.chat(message);
        const estimatedCost = (message.length / 1000) * 0.00025;
        this.logUsage('gemini', true, estimatedCost, 'gemini-2.5-pro');
        return result;
      } catch (error) {
        console.warn('Gemini chat failed:', error);
      }
    }

    // Fallback to OpenAI
    if (process.env.OPENAI_API_KEY) {
      try {
        const result = await openaiService.chat(message);
        const estimatedCost = (message.length / 1000) * 0.002;
        this.logUsage('openai', true, estimatedCost, 'gpt-4o');
        return result;
      } catch (error) {
        console.warn('OpenAI chat failed:', error);
      }
    }

    // Only use Ollama for internal agents as last resort
    if (this.config.preferLocal) {
      try {
        const available = await ollamaService.isServiceAvailable();
        if (available) {
          const result = await ollamaService.chat(message);
          this.logUsage('ollama', true, 0, 'chat-internal');
          return result;
        }
      } catch (error) {
        console.warn('Ollama chat failed:', error);
      }
    }

    throw new Error('No chat service available');
  }

  getUsageReport(): { logs: UsageLog[], totalCost: number, serviceBreakdown: Record<string, number> } {
    const serviceBreakdown: Record<string, number> = {};
    
    for (const log of this.usageLogs) {
      if (!serviceBreakdown[log.service]) {
        serviceBreakdown[log.service] = 0;
      }
      serviceBreakdown[log.service] += log.estimatedCost;
    }

    return {
      logs: this.usageLogs,
      totalCost: this.totalCost,
      serviceBreakdown
    };
  }

  async checkServiceAvailability(): Promise<Record<string, boolean>> {
    const status: Record<string, boolean> = {
      ollama: false,
      openai: false,
      gemini: false,
      anthropic: false
    };

    // Check Ollama
    try {
      status.ollama = await ollamaService.isServiceAvailable();
    } catch (e) {
      status.ollama = false;
    }

    // Check API keys for cloud services
    status.openai = !!process.env.OPENAI_API_KEY;
    status.gemini = !!process.env.GEMINI_API_KEY;
    status.anthropic = !!process.env.ANTHROPIC_API_KEY;

    return status;
  }
}

export const aiRouter = new AIRouter();