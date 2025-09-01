import { z } from 'zod';

interface OllamaConfig {
  baseUrl: string;
  models: {
    small: string;  // 7b model
    large: string;  // 14b model
  };
  timeout?: number;
}

interface OllamaResponse {
  model: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
  eval_duration?: number;
}

interface ComplianceAnalysisResult {
  compliant: boolean;
  violations: string[];
  recommendations: string[];
  score: number;
}

interface SafetyAnalysisResult {
  hazards: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  mitigationStrategies: string[];
  requiredPPE: string[];
  emergencyProcedures: string[];
}

class OllamaService {
  private config: OllamaConfig;
  private isAvailable: boolean = false;

  constructor() {
    this.config = {
      baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
      models: {
        small: process.env.OLLAMA_SMALL_MODEL || 'mistral:7b',        // Your 7B model  
        large: process.env.OLLAMA_LARGE_MODEL || 'llama2:14b'         // Your 14B model
      },
      timeout: parseInt(process.env.OLLAMA_TIMEOUT || '60000', 10)
    };
    console.log('🔧 Ollama configured for YOUR LOCAL MODELS:');
    console.log('   📦 Small (7B): ', this.config.models.small);
    console.log('   📦 Large (14B):', this.config.models.large);
    console.log('   🌐 Base URL:   ', this.config.baseUrl);
    console.log('⚡ To use your models, make sure Ollama is running with your specific models!');
  }

  private async checkAvailability(): Promise<void> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/tags`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        const data = await response.json();
        this.isAvailable = true;
        console.log('Ollama service available with models:', data.models?.map((m: any) => m.name));
      } else {
        this.isAvailable = false;
        console.log('Ollama service not responding properly');
      }
    } catch (error) {
      this.isAvailable = false;
      console.log('Ollama service not available:', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  async isServiceAvailable(): Promise<boolean> {
    await this.checkAvailability();
    return this.isAvailable;
  }

  private async generateCompletion(prompt: string, useSmallModel: boolean = true): Promise<string> {
    const model = useSmallModel ? this.config.models.small : this.config.models.large;
    
    try {
      const response = await fetch(`${this.config.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          prompt,
          stream: false,
          options: {
            temperature: 0.3,
            top_p: 0.9,
            num_predict: 2048
          }
        }),
        signal: AbortSignal.timeout(this.config.timeout!)
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status}`);
      }

      const data: OllamaResponse = await response.json();
      return data.response;
    } catch (error) {
      console.error(`Ollama generation failed with model ${model}:`, error);
      throw error;
    }
  }

  async generateEmbeddings(chunks: string[]): Promise<number[][]> {
    const embeddings: number[][] = [];
    
    try {
      for (const chunk of chunks) {
        const response = await fetch(`${this.config.baseUrl}/api/embeddings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: this.config.models.small,
            prompt: chunk
          })
        });

        if (!response.ok) {
          throw new Error(`Ollama embeddings API error: ${response.status}`);
        }

        const data = await response.json();
        embeddings.push(data.embedding);
      }
      
      return embeddings;
    } catch (error) {
      console.error('Ollama embedding generation failed:', error);
      throw new Error(`Failed to generate embeddings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async analyzeCompliance(content: string): Promise<ComplianceAnalysisResult> {
    const prompt = `You are a compliance expert. Analyze the following content for regulatory compliance.
Focus on OSHA, EPA, DOT, and safety standards for RV maintenance.

Content to analyze:
${content}

Respond with a JSON object containing:
- compliant: boolean (true if compliant, false if violations found)
- violations: array of specific violations found
- recommendations: array of recommendations to achieve compliance
- score: number 0-100 representing compliance percentage

JSON Response:`;

    try {
      const response = await this.generateCompletion(prompt, false); // Use large model for compliance
      
      // Try to parse the response as JSON
      try {
        const result = JSON.parse(response);
        return {
          compliant: result.compliant || false,
          violations: result.violations || [],
          recommendations: result.recommendations || [],
          score: result.score || 0
        };
      } catch (parseError) {
        // If JSON parsing fails, extract information from text
        console.warn('Failed to parse Ollama compliance response as JSON, using fallback parsing');
        return this.parseComplianceFromText(response);
      }
    } catch (error) {
      console.error('Ollama compliance analysis failed:', error);
      throw new Error(`Ollama compliance analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private parseComplianceFromText(text: string): ComplianceAnalysisResult {
    const lowerText = text.toLowerCase();
    const compliant = !lowerText.includes('violation') && !lowerText.includes('non-compliant');
    
    // Extract violations (look for bullet points or numbered items after "violation")
    const violations: string[] = [];
    const violationMatches = text.match(/violation[s]?:?\s*([^\n]+)/gi);
    if (violationMatches) {
      violations.push(...violationMatches.map(m => m.replace(/violation[s]?:?\s*/i, '').trim()));
    }

    // Extract recommendations
    const recommendations: string[] = [];
    const recommendMatches = text.match(/recommend[ation]*[s]?:?\s*([^\n]+)/gi);
    if (recommendMatches) {
      recommendations.push(...recommendMatches.map(m => m.replace(/recommend[ation]*[s]?:?\s*/i, '').trim()));
    }

    // Calculate score based on violations
    const score = compliant ? 100 : Math.max(0, 100 - (violations.length * 20));

    return { compliant, violations, recommendations, score };
  }

  async analyzeSafety(content: string): Promise<SafetyAnalysisResult> {
    const prompt = `You are a safety expert for RV maintenance. Analyze the following content for safety considerations.

Content to analyze:
${content}

Identify:
1. Potential hazards and risks
2. Overall risk level (low, medium, high, critical)
3. Mitigation strategies and safety measures
4. Required Personal Protective Equipment (PPE)
5. Emergency procedures

Respond with a JSON object containing:
- hazards: array of identified hazards
- riskLevel: string (low/medium/high/critical)
- mitigationStrategies: array of mitigation strategies
- requiredPPE: array of required PPE items
- emergencyProcedures: array of emergency procedures

JSON Response:`;

    try {
      const response = await this.generateCompletion(prompt, false); // Use large model for safety
      
      try {
        const result = JSON.parse(response);
        return {
          hazards: result.hazards || [],
          riskLevel: result.riskLevel || 'medium',
          mitigationStrategies: result.mitigationStrategies || [],
          requiredPPE: result.requiredPPE || [],
          emergencyProcedures: result.emergencyProcedures || []
        };
      } catch (parseError) {
        console.warn('Failed to parse Ollama safety response as JSON, using fallback parsing');
        return this.parseSafetyFromText(response);
      }
    } catch (error) {
      console.error('Ollama safety analysis failed:', error);
      throw new Error(`Ollama safety analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private parseSafetyFromText(text: string): SafetyAnalysisResult {
    const lowerText = text.toLowerCase();
    
    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'medium';
    if (lowerText.includes('critical') || lowerText.includes('severe')) {
      riskLevel = 'critical';
    } else if (lowerText.includes('high risk')) {
      riskLevel = 'high';
    } else if (lowerText.includes('low risk')) {
      riskLevel = 'low';
    }

    // Extract hazards
    const hazards: string[] = [];
    const hazardMatches = text.match(/hazard[s]?:?\s*([^\n]+)/gi);
    if (hazardMatches) {
      hazards.push(...hazardMatches.map(m => m.replace(/hazard[s]?:?\s*/i, '').trim()));
    }

    // Basic safety recommendations if none found
    const mitigationStrategies = ['Follow manufacturer guidelines', 'Ensure proper ventilation', 'Use appropriate tools'];
    const requiredPPE = ['Safety glasses', 'Work gloves', 'Steel-toed boots'];
    const emergencyProcedures = ['Stop work immediately if hazard detected', 'Contact supervisor', 'Follow emergency shutdown procedures'];

    return { hazards, riskLevel, mitigationStrategies, requiredPPE, emergencyProcedures };
  }

  async generateSOPContent(prompt: string): Promise<string> {
    const sopPrompt = `You are an expert RV technician creating a detailed Standard Operating Procedure (SOP).

${prompt}

Create a comprehensive SOP that includes:
1. Purpose and scope
2. Required tools and materials
3. Safety precautions and PPE
4. Step-by-step procedures
5. Quality checks
6. Troubleshooting guide
7. Documentation requirements

Format the response as a professional SOP document.`;

    try {
      // Use large model for SOP generation
      return await this.generateCompletion(sopPrompt, false);
    } catch (error) {
      console.error('Ollama SOP generation failed:', error);
      throw new Error(`Ollama SOP generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async chat(message: string): Promise<string> {
    try {
      // Use small model for general chat
      return await this.generateCompletion(message, true);
    } catch (error) {
      console.error('Ollama chat failed:', error);
      throw new Error(`Ollama chat failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export const ollamaService = new OllamaService();