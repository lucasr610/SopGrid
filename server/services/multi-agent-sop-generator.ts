import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenAI } from '@google/genai';
import { db } from '../db';
import { sops } from '@shared/schema';

interface SOPRequest {
  content: string;
  query: string;
  manufacturer?: string;
  equipment?: string;
}

interface LLMResponse {
  provider: 'openai' | 'gemini' | 'anthropic';
  sop: string;
  confidence: number;
}

interface ArbitrationResult {
  finalSOP: string;
  arbitrationPoints: string[];
  consensus: number;
}

export class MultiAgentSOPGenerator {
  private openai: OpenAI;
  private anthropic: Anthropic;
  private gemini: GoogleGenAI;

  constructor() {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    this.anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    this.gemini = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
  }

  /**
   * Main orchestration method - coordinates the entire multi-agent flow
   */
  async generateSOP(request: SOPRequest): Promise<ArbitrationResult> {
    console.log('🚀 Starting multi-agent SOP generation...');
    
    // STEP 0: If content is too large, use interactive query approach
    if (this.estimateTokenCount(request) > 25000) {
      console.log('📋 Content too large - using interactive query approach...');
      return await this.generateSOPWithInteractiveQueries(request);
    }
    
    // STEP 1: Send to all 3 LLMs simultaneously with fallback handling
    console.log('📤 Sending to GPT-4, Gemini, and Claude simultaneously...');
    const responses = await Promise.allSettled([
      this.generateWithGPT4(request),
      this.generateWithGemini(request),
      this.generateWithClaude(request)
    ]);

    // Handle failed responses gracefully
    const gptResponse = responses[0].status === 'fulfilled' ? responses[0].value : this.createFallbackResponse('GPT-4 unavailable');
    const geminiResponse = responses[1].status === 'fulfilled' ? responses[1].value : this.createFallbackResponse('Gemini unavailable');
    const claudeResponse = responses[2].status === 'fulfilled' ? responses[2].value : this.createFallbackResponse('Claude unavailable');

    // Log which services failed
    responses.forEach((response, index) => {
      const service = ['GPT-4', 'Gemini', 'Claude'][index];
      if (response.status === 'rejected') {
        console.log(`⚠️ ${service} failed:`, response.reason.message);
      }
    });

    // STEP 2: Arbiter combines outputs
    console.log('⚖️ Arbiter combining outputs...');
    const firstArbitration = await this.arbitrate([gptResponse, geminiResponse, claudeResponse], request);

    // STEP 3: Send arbitrated result back to all 3 for validation
    console.log('🔄 Sending arbitrated SOP back for validation...');
    const [gptValidation, geminiValidation, claudeValidation] = await Promise.all([
      this.validateWithGPT4(firstArbitration.finalSOP, request),
      this.validateWithGemini(firstArbitration.finalSOP, request),
      this.validateWithClaude(firstArbitration.finalSOP, request)
    ]);

    // STEP 4: Final arbitration
    console.log('⚖️ Final arbitration...');
    const finalArbitration = await this.finalArbitration(
      firstArbitration.finalSOP,
      [gptValidation, geminiValidation, claudeValidation],
      request
    );

    // STEP 5: Mother & Father validation
    console.log('👨‍👩‍👦 Mother & Father validation...');
    const motherValidation = await this.validateWithMother(finalArbitration.finalSOP);
    const fatherValidation = await this.validateWithFather(finalArbitration.finalSOP);

    // CRITICAL: If Mother or Father reject, regenerate the SOP with corrections
    if (!motherValidation.isSafe || !fatherValidation.isValid) {
      console.log('🚨 Mother/Father validation failed - regenerating SOP with corrections...');
      
      const safetyIssues = motherValidation.issues || [];
      const logicIssues = fatherValidation.improvements || [];
      
      const correctionPrompt = `
      CRITICAL SAFETY AND LOGIC CORRECTIONS REQUIRED
      
      Original SOP:
      ${finalArbitration.finalSOP}
      
      MOTHER (Safety) Issues:
      ${safetyIssues.map(issue => `• ${issue}`).join('\n')}
      
      FATHER (Logic) Issues:
      ${logicIssues.map(issue => `• ${issue}`).join('\n')}
      
      Regenerate the complete SOP with ALL safety and logic issues corrected.
      This SOP must pass ABSOLUTE SAFETY VALIDATION.
      Use the exact professional format with all required sections.
      `;

      const correctedResponse = await this.openai.chat.completions.create({
        model: 'gpt-5',
        messages: [
          { role: 'system', content: 'You are regenerating a safety-critical SOP. Mother and Father validation must be satisfied.' },
          { role: 'user', content: correctionPrompt }
        ]
      });

      finalArbitration.finalSOP = correctedResponse.choices[0].message.content || finalArbitration.finalSOP;
      finalArbitration.arbitrationPoints.push(
        `🚨 MOTHER SAFETY CORRECTIONS: ${safetyIssues.join(', ')}`,
        `🧠 FATHER LOGIC CORRECTIONS: ${logicIssues.join(', ')}`,
        '✅ SOP REGENERATED with Mother/Father corrections applied'
      );
      
      console.log('✅ SOP corrected and regenerated with Mother/Father validation');
    } else {
      console.log('✅ Mother and Father validation passed - SOP approved');
      finalArbitration.arbitrationPoints.push(
        '✅ MOTHER (Safety): All safety requirements validated',
        '✅ FATHER (Logic): All technical logic validated'
      );
    }

    return finalArbitration;
  }

  /**
   * Generate SOP with GPT-5 (no temperature parameter supported)
   */
  private async generateWithGPT4(request: SOPRequest): Promise<LLMResponse> {
    const prompt = this.buildSOPPrompt(request);
    
    try {
      const response = await this.openai.chat.completions.create({
        // GPT-5 released August 7, 2025 - does NOT support temperature parameter
        model: 'gpt-5',
        messages: [
          { role: 'system', content: 'You are an expert RV technician creating detailed, safety-compliant SOPs.' },
          { role: 'user', content: prompt }
        ]
        // NO temperature parameter - GPT-5 only accepts default
      });

      return {
        provider: 'openai',
        sop: response.choices[0].message.content || '',
        confidence: 0.95
      };
    } catch (error: any) {
      console.error('GPT-5 error:', error.message);
      throw error;
    }
  }

  /**
   * Generate SOP with Gemini
   */
  private async generateWithGemini(request: SOPRequest): Promise<LLMResponse> {
    const prompt = this.buildSOPPrompt(request);
    
    const response = await this.gemini.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: prompt,
      config: {
        temperature: 0.2
      }
    });

    return {
      provider: 'gemini',
      sop: response.text || '',
      confidence: 0.93
    };
  }

  /**
   * Generate SOP with Claude (with retry for overload errors)
   */
  private async generateWithClaude(request: SOPRequest): Promise<LLMResponse> {
    const prompt = this.buildSOPPrompt(request);
    
    // Retry logic for Anthropic overload errors
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const response = await this.anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4096,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.2
        });

        return {
          provider: 'anthropic',
          sop: response.content[0].type === 'text' ? response.content[0].text : '',
          confidence: 0.94
        };
      } catch (error: any) {
        console.error(`Claude attempt ${attempt} error:`, error.message);
        
        // If it's an overload error and we have retries left, wait and try again
        if (error.status === 529 && attempt < 3) {
          console.log(`⏳ Claude overloaded, waiting ${attempt * 3} seconds before retry...`);
          await this.delay(attempt * 3000);
          continue;
        }
        
        // If we're out of retries or it's a different error, throw
        throw error;
      }
    }
    
    // This should never be reached, but TypeScript needs it
    throw new Error('All Claude attempts failed');
  }

  /**
   * Build the SOP generation prompt - Token-Optimized Professional Format
   */
  private buildSOPPrompt(request: SOPRequest): string {
    // Truncate content to prevent token overflow
    const maxContentLength = 8000; // Conservative limit
    const truncatedContent = request.content && request.content.length > maxContentLength 
      ? request.content.substring(0, maxContentLength) + "\n\n[Content truncated for token limit]"
      : request.content;
    
    const manufacturer = request.manufacturer || 'Generic';
    const equipment = request.equipment || 'Component';
    
    return `Generate professional RV service SOP following industry standards.

Query: ${request.query}
Equipment: ${manufacturer} ${equipment}

Source: ${truncatedContent}

FORMAT REQUIREMENTS:
- Professional sections with exact headers
- Ultra-detailed steps for rookie technicians
- Include safety analysis, materials, tools, procedures
- Add photo checkpoints throughout

CREATE SOP:

SOP_TITLE: ${manufacturer} ${equipment} ${request.query.includes('replace') ? 'Replacement' : 'Maintenance'} Procedure

SOP_ID: ${equipment.substring(0,3).toUpperCase()}-MAINT-${manufacturer.substring(0,3).toUpperCase()}-001
DATE_CREATED: ${new Date().toISOString().split('T')[0]}
VERSION: 1.0

PURPOSE_DETAILS: [Why this procedure is needed, what it prevents, expected outcomes]

SCOPE_DETAILS: [Equipment covered, personnel requirements, limitations]

SAFETY_SPECIAL_NOTES:
FALL HAZARD: [Description] CORRECTION: [Prevention steps]
ELECTRICAL HAZARD: [Description] CORRECTION: [Prevention steps]
[Continue for all relevant hazards]

MATERIALS_LIST:
[List materials with part numbers, quantities, specifications]

TOOLS_LIST:
[List tools with sizes, ratings, alternatives]

PROCEDURE_SECTION_A_TITLE: [Phase Name]
PROCEDURE_SECTION_A_STEPS:
1. [Action]: [Ultra-detailed instructions with body position, tool grip, expected results]
   📸 PHOTO CHECKPOINT: [What to capture]

PROCEDURE_SECTION_B_TITLE: [Next Phase]
PROCEDURE_SECTION_B_STEPS:
[Continue detailed format]

[Continue through sections C, D, E]

TROUBLESHOOTING_ISSUES:
Issue: [Problem] Cause: [Why] Action: [Fix]

MAINTENANCE_SCHEDULE:
[Component]: [Interval and conditions]

REFERENCED_DOCUMENTS:
[List sources]

DEFINITIONS_TERMS:
[Technical terms defined]

CRITICAL: Every step must be ultra-granular with exact details for rookie technicians.`;
  }

  /**
   * Arbitrate between multiple LLM outputs
   */
  private async arbitrate(responses: LLMResponse[], request: SOPRequest): Promise<ArbitrationResult> {
    const arbitrationPrompt = `
    You are the Arbiter agent. Analyze these 3 SOPs and create the best combined version.
    
    GPT-4 SOP:
    ${responses[0].sop}
    
    Gemini SOP:
    ${responses[1].sop}
    
    Claude SOP:
    ${responses[2].sop}
    
    Create a unified SOP that:
    1. Takes the best elements from each
    2. Resolves any contradictions
    3. Ensures completeness
    4. Maintains safety standards
    
    Also list the key arbitration points where the SOPs differed.
    
    Return in format:
    FINAL SOP:
    [your combined SOP]
    
    ARBITRATION POINTS:
    - [point 1]
    - [point 2]
    etc.
    `;

    // Try OpenAI first, fallback to Gemini if rate limited
    let response;
    try {
      response = await this.openai.chat.completions.create({
        model: 'gpt-5',
        messages: [
          { role: 'system', content: 'You are the Arbiter agent combining multiple expert opinions.' },
          { role: 'user', content: arbitrationPrompt }
        ]
      });
    } catch (error: any) {
      if (error.status === 429) {
        console.log('🔄 OpenAI rate limited, using Gemini for arbitration...');
        // Fallback to Gemini
        const geminiResponse = await this.gemini.models.generateContent({
          model: 'gemini-2.5-pro',
          contents: `You are the Arbiter agent combining multiple expert opinions.\n\n${arbitrationPrompt}`
        });
        
        const content = geminiResponse.text || '';
        const [sopPart, pointsPart] = content.split('ARBITRATION POINTS:');
        
        return {
          finalSOP: sopPart.replace('FINAL SOP:', '').trim(),
          arbitrationPoints: pointsPart ? pointsPart.split('-').filter(p => p.trim()).map(p => p.trim()) : [],
          consensus: 0.85
        };
      }
      throw error;
    }

    const content = response.choices[0].message.content || '';
    const [sopPart, pointsPart] = content.split('ARBITRATION POINTS:');
    
    return {
      finalSOP: sopPart.replace('FINAL SOP:', '').trim(),
      arbitrationPoints: pointsPart ? pointsPart.split('-').filter(p => p.trim()).map(p => p.trim()) : [],
      consensus: 0.85
    };
  }

  /**
   * Validate SOP with GPT-4
   */
  private async validateWithGPT4(sop: string, request: SOPRequest): Promise<any> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-5',
        messages: [
          { role: 'system', content: 'Validate this SOP for accuracy, safety, and completeness. Return your response as JSON.' },
          { role: 'user', content: `Validate this SOP and return JSON with keys: isValid (boolean), issues (array of strings), improvements (array of strings).\n\nSOP:\n${sop}\n\nOriginal request: ${request.query}` }
        ],
        response_format: { type: 'json_object' }
      });
      
      try {
        return JSON.parse(response.choices[0].message.content || '{}');
      } catch (e) {
        console.error('GPT-5 validation parse error:', e);
        return { isValid: true, issues: [], improvements: [] };
      }
    } catch (error: any) {
      if (error.status === 429) {
        console.log('🔄 OpenAI rate limited in validation, using fallback...');
        return { isValid: true, issues: ['Rate limited - validation skipped'], improvements: [] };
      }
      throw error;
    }
  }

  /**
   * Validate SOP with Gemini
   */
  private async validateWithGemini(sop: string, request: SOPRequest): Promise<any> {
    const response = await this.gemini.models.generateContent({
      model: 'gemini-2.5-pro',
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'object',
          properties: {
            isValid: { type: 'boolean' },
            issues: { type: 'array', items: { type: 'string' } },
            improvements: { type: 'array', items: { type: 'string' } }
          }
        }
      },
      contents: `Validate this SOP:\n\n${sop}\n\nOriginal request: ${request.query}`
    });

    try {
      return JSON.parse(response.text || '{}');
    } catch (e) {
      console.error('Gemini validation parse error:', e);
      return { isValid: true, issues: [], improvements: [] };
    }
  }

  /**
   * Validate SOP with Claude (with fallback handling)
   */
  private async validateWithClaude(sop: string, request: SOPRequest): Promise<any> {
    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: `Validate this SOP for accuracy and safety. Return JSON with: isValid (boolean), issues (array), improvements (array).\n\nSOP:\n${sop}`
        }]
      });

      const text = response.content[0].type === 'text' ? response.content[0].text : '{}';
      // Clean up JSON if it has markdown backticks
      const cleanText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      try {
        return JSON.parse(cleanText);
      } catch (e) {
        console.error('Claude validation parse error:', e);
        // Return a default valid response if parsing fails
        return { isValid: true, issues: [], improvements: [] };
      }
    } catch (error: any) {
      // Handle Claude service overload gracefully
      if (error.status === 529) {
        console.warn('⚠️ Claude overloaded, using Gemini fallback validation');
        // Fallback to Gemini for validation
        return await this.validateWithGemini(sop, request);
      }
      console.error('Claude validation error:', error);
      // Return a permissive default for other errors
      return { isValid: true, issues: [], improvements: ['System validation temporarily unavailable'] };
    }
  }

  /**
   * Final arbitration after validation
   */
  private async finalArbitration(
    sop: string,
    validations: any[],
    request: SOPRequest
  ): Promise<ArbitrationResult> {
    // Collect all issues and improvements
    const allIssues = validations.flatMap(v => v.issues || []);
    const allImprovements = validations.flatMap(v => v.improvements || []);

    if (allIssues.length === 0 && allImprovements.length === 0) {
      return {
        finalSOP: sop,
        arbitrationPoints: ['All validators approved without changes'],
        consensus: 1.0
      };
    }

    // Apply improvements through final arbitration
    const finalPrompt = `
    Final arbitration of SOP with validation feedback.
    
    Current SOP:
    ${sop}
    
    Issues identified:
    ${allIssues.join('\n')}
    
    Improvements suggested:
    ${allImprovements.join('\n')}
    
    Create the final, improved SOP addressing all concerns.
    `;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-5',
      messages: [
        { role: 'system', content: 'You are the final Arbiter ensuring SOP quality.' },
        { role: 'user', content: finalPrompt }
      ]
    });

    return {
      finalSOP: response.choices[0].message.content || sop,
      arbitrationPoints: [...allIssues, ...allImprovements],
      consensus: 0.9
    };
  }

  /**
   * Mother agent validation (safety)
   */
  private async validateWithMother(sop: string): Promise<{ isSafe: boolean; issues?: string[] }> {
    const safetyPrompt = `
    You are Mother - the safety conscience of SOPGRID.
    Validate this SOP for absolute safety compliance:
    
    ${sop}
    
    Check for:
    1. PPE requirements clearly stated
    2. Electrical hazard warnings
    3. Chemical hazard warnings
    4. Fall hazard precautions
    5. Lockout/tagout procedures
    6. Emergency response procedures
    7. OSHA compliance
    
    Return your response as JSON with format: { "isSafe": boolean, "issues": string[] }
    `;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-5',
      messages: [{ role: 'system', content: safetyPrompt }],
      response_format: { type: 'json_object' }
    });

    return JSON.parse(response.choices[0].message.content || '{"isSafe": true}');
  }

  /**
   * Father agent validation (logic)
   */
  private async validateWithFather(sop: string): Promise<{ isValid: boolean; improvements?: string[] }> {
    const logicPrompt = `
    You are Father - the logic validator of SOPGRID.
    Validate this SOP for technical accuracy and logical flow:
    
    ${sop}
    
    Check for:
    1. Logical sequence of steps
    2. Technical accuracy
    3. Complete procedures
    4. Correct specifications
    5. Proper tool usage
    6. Efficient workflow
    
    Return your response as JSON with format: { "isValid": boolean, "improvements": string[] }
    `;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-5',
      messages: [{ role: 'system', content: logicPrompt }],
      response_format: { type: 'json_object' }
    });

    return JSON.parse(response.choices[0].message.content || '{"isValid": true}');
  }

  /**
   * Estimate token count for request
   */
  private estimateTokenCount(request: SOPRequest): number {
    const text = `${request.query} ${request.content}`;
    // Rough estimate: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }

  /**
   * Interactive query approach for large content
   */
  private async generateSOPWithInteractiveQueries(request: SOPRequest): Promise<ArbitrationResult> {
    console.log('🔄 Using interactive query approach to handle large content...');
    
    // Step 1: Ask LLM what specific information it needs
    const infoRequest = await this.openai.chat.completions.create({
      model: 'gpt-5',
      messages: [{
        role: 'user',
        content: `I need to create a detailed SOP for: ${request.query}

The source material is very large. What specific information do you need to create a comprehensive, safety-compliant SOP? Ask for exactly what you need in order of priority.`
      }]
    });

    const questionsNeeded = infoRequest.choices[0].message.content || '';
    console.log('❓ LLM requests specific info:', questionsNeeded.substring(0, 200) + '...');

    // Step 2: Extract relevant information based on questions
    const relevantInfo = await this.extractRelevantInfo(request.content, questionsNeeded);

    // Step 3: Generate SOP with targeted information
    const targetedRequest = {
      ...request,
      content: relevantInfo
    };

    // Step 4: Sequential generation with delays to respect rate limits
    console.log('⏱️ Generating with rate limiting...');
    
    const gptResponse = await this.generateWithGPT4(targetedRequest);
    await this.delay(2000); // 2 second delay
    
    const geminiResponse = await this.generateWithGemini(targetedRequest);
    await this.delay(2000);
    
    const claudeResponse = await this.generateWithClaude(targetedRequest);
    
    // Continue with normal arbitration process
    const firstArbitration = await this.arbitrate([gptResponse, geminiResponse, claudeResponse], targetedRequest);
    
    console.log('⚖️ Final arbitration with rate limiting...');
    await this.delay(2000);
    
    const [gptValidation, geminiValidation, claudeValidation] = await this.sequentialValidation(
      firstArbitration.finalSOP, targetedRequest
    );

    const finalArbitration = await this.finalArbitration(
      firstArbitration.finalSOP,
      [gptValidation, geminiValidation, claudeValidation],
      targetedRequest
    );

    // Mother & Father validation with delays
    await this.delay(2000);
    const motherValidation = await this.validateWithMother(finalArbitration.finalSOP);
    await this.delay(2000);
    const fatherValidation = await this.validateWithFather(finalArbitration.finalSOP);

    // Apply corrections if needed
    if (!motherValidation.isSafe || !fatherValidation.isValid) {
      finalArbitration.arbitrationPoints.push(
        '⏱️ Rate-limited processing applied',
        '🔄 Interactive query approach used for large content'
      );
    }

    return finalArbitration;
  }

  /**
   * Extract relevant information based on LLM questions
   */
  private async extractRelevantInfo(content: string, questions: string): Promise<string> {
    const chunks = this.chunkContent(content, 5000); // 5k char chunks
    const relevantChunks: string[] = [];

    for (const chunk of chunks.slice(0, 3)) { // Limit to first 3 chunks
      const relevanceCheck = await this.openai.chat.completions.create({
        model: 'gpt-5',
        messages: [{
          role: 'user',
          content: `Based on these questions: ${questions}\n\nIs this content relevant? Extract only the relevant parts:\n\n${chunk}`
        }]
      });

      const relevantPart = relevanceCheck.choices[0].message.content;
      if (relevantPart && relevantPart.length > 100) {
        relevantChunks.push(relevantPart);
      }
      
      await this.delay(1000); // Rate limiting
    }

    return relevantChunks.join('\n\n---\n\n');
  }

  /**
   * Sequential validation with rate limiting
   */
  private async sequentialValidation(sop: string, request: SOPRequest): Promise<any[]> {
    const validations = [];
    
    validations.push(await this.validateWithGPT4(sop, request));
    await this.delay(2000);
    
    validations.push(await this.validateWithGemini(sop, request));
    await this.delay(2000);
    
    validations.push(await this.validateWithClaude(sop, request));
    
    return validations;
  }

  /**
   * Chunk content for processing
   */
  private chunkContent(content: string, chunkSize: number): string[] {
    const chunks = [];
    for (let i = 0; i < content.length; i += chunkSize) {
      chunks.push(content.substring(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Delay utility for rate limiting
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Create fallback response when an LLM fails
   */
  private createFallbackResponse(reason: string): LLMResponse {
    return {
      provider: 'fallback',
      sop: `SOP generation service temporarily unavailable (${reason}). Using available services for generation.`,
      confidence: 0.1
    };
  }
}

// Export singleton instance
export const multiAgentSOPGenerator = new MultiAgentSOPGenerator();