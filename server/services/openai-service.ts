import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || ""
});

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

class OpenAIService {
  async generateEmbeddings(chunks: string[]): Promise<number[][]> {
    try {
      const embeddings: number[][] = [];
      
      for (const chunk of chunks) {
        const response = await openai.embeddings.create({
          model: "text-embedding-3-large",
          input: chunk,
          dimensions: 1536  // Match Qdrant collection dimension
        });
        
        embeddings.push(response.data[0].embedding);
      }
      
      return embeddings;
    } catch (error) {
      console.error('OpenAI embedding generation failed:', error);
      throw new Error(`Failed to generate embeddings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async analyzeSafety(content: string): Promise<SafetyAnalysisResult> {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a safety analysis expert for the Oracle Engine. Analyze documents for potential safety hazards, risks, and required safety measures. Respond with JSON in the specified format.`
          },
          {
            role: "user",
            content: `Analyze the following content for safety considerations:

${content}

Identify:
1. Potential hazards and risks
2. Overall risk level (low, medium, high, critical)
3. Mitigation strategies and safety measures
4. Required Personal Protective Equipment (PPE)
5. Emergency procedures that should be in place

Respond with JSON in this exact format:
{
  "hazards": ["array of identified hazards"],
  "riskLevel": "low|medium|high|critical",
  "mitigationStrategies": ["array of mitigation strategies"],
  "requiredPPE": ["array of required PPE items"],
  "emergencyProcedures": ["array of emergency procedures"]
}`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      
      return {
        hazards: result.hazards || [],
        riskLevel: result.riskLevel || 'medium',
        mitigationStrategies: result.mitigationStrategies || [],
        requiredPPE: result.requiredPPE || [],
        emergencyProcedures: result.emergencyProcedures || []
      };
    } catch (error) {
      console.error('OpenAI safety analysis failed:', error);
      throw new Error(`Safety analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async analyzeCompliance(prompt: string): Promise<ComplianceAnalysisResult> {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a compliance analysis expert for the Oracle Engine. Analyze content for regulatory compliance and provide detailed assessments. Always respond with valid JSON."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      
      return {
        compliant: result.compliant || false,
        violations: result.violations || [],
        recommendations: result.recommendations || [],
        score: result.score || 0
      };
    } catch (error) {
      console.error('OpenAI compliance analysis failed:', error);
      throw new Error(`Compliance analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async generateSOP(
    content: string, 
    safetyAnalysis: SafetyAnalysisResult, 
    complianceResult: any
  ): Promise<string> {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are an expert SOP (Standard Operating Procedure) generator for the Oracle Engine. Create comprehensive, safety-compliant SOPs based on technical documentation, safety analysis, and compliance requirements.

Generate SOPs that are:
- Clear and actionable
- Safety-first oriented
- Compliant with all relevant standards
- Industry best practices focused
- Step-by-step procedural
- Include all necessary safety measures and PPE requirements`
          },
          {
            role: "user",
            content: `Generate a comprehensive Standard Operating Procedure based on:

ORIGINAL DOCUMENT:
${content}

SAFETY ANALYSIS:
- Risk Level: ${safetyAnalysis.riskLevel}
- Identified Hazards: ${safetyAnalysis.hazards.join(', ')}
- Required PPE: ${safetyAnalysis.requiredPPE.join(', ')}
- Mitigation Strategies: ${safetyAnalysis.mitigationStrategies.join(', ')}
- Emergency Procedures: ${safetyAnalysis.emergencyProcedures.join(', ')}

COMPLIANCE REQUIREMENTS:
- Standards: ${complianceResult.standards?.join(', ') || 'General safety standards'}
- Compliance Score: ${complianceResult.score || 0}%

Create a detailed SOP that includes:
1. Purpose and Scope
2. Safety Requirements and PPE
3. Prerequisites and Preparations
4. Step-by-step Procedures
5. Safety Checkpoints
6. Emergency Procedures
7. Quality Control/Verification Steps
8. Documentation Requirements

Ensure the SOP is safety-compliant and follows industry best practices.`
          }
        ],
        temperature: 0.2,
        max_tokens: 3000
      });

      return response.choices[0].message.content || '';
    } catch (error) {
      console.error('OpenAI SOP generation failed:', error);
      throw new Error(`SOP generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async summarizeDocument(content: string): Promise<string> {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a technical document summarization expert. Create concise, accurate summaries that capture key technical information, safety considerations, and procedural elements."
          },
          {
            role: "user",
            content: `Summarize the following technical document, focusing on key procedures, safety requirements, and important technical details:

${content}

Provide a comprehensive but concise summary that would be useful for SOP generation.`
          }
        ],
        temperature: 0.1,
        max_tokens: 1000
      });

      return response.choices[0].message.content || '';
    } catch (error) {
      console.error('OpenAI document summarization failed:', error);
      throw new Error(`Document summarization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async chat(message: string): Promise<string> {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are SOPGRID Assistant, a helpful AI for RV technicians. You help with troubleshooting, SOP generation, compliance checking, and technical questions. Be concise but thorough."
          },
          {
            role: "user",
            content: message
          }
        ],
        temperature: 0.7,
        max_tokens: 1500
      });

      return response.choices[0].message.content || 'I apologize, but I could not generate a response.';
    } catch (error) {
      console.error('OpenAI chat failed:', error);
      throw new Error(`Chat failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async validateSOP(sopContent: string, originalDocument: string): Promise<{
    valid: boolean;
    issues: string[];
    suggestions: string[];
    completenessScore: number;
  }> {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an SOP validation expert. Analyze SOPs for completeness, accuracy, safety compliance, and alignment with source documents. Respond with JSON."
          },
          {
            role: "user",
            content: `Validate this SOP against the original document:

SOP CONTENT:
${sopContent}

ORIGINAL DOCUMENT:
${originalDocument}

Assess:
1. Completeness (does it cover all important procedures?)
2. Accuracy (does it align with the source material?)
3. Safety compliance (are all safety measures included?)
4. Clarity and actionability
5. Missing elements or gaps

Respond with JSON:
{
  "valid": boolean,
  "issues": ["array of identified issues"],
  "suggestions": ["array of improvement suggestions"],
  "completenessScore": number (0-100)
}`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      
      return {
        valid: result.valid || false,
        issues: result.issues || [],
        suggestions: result.suggestions || [],
        completenessScore: result.completenessScore || 0
      };
    } catch (error) {
      console.error('OpenAI SOP validation failed:', error);
      throw new Error(`SOP validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async generateSOPContent(prompt: string): Promise<string> {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are SOAP, the primary SOP author for SOPGRID. You specialize in creating EXTREMELY DETAILED, safety-compliant Standard Operating Procedures for RV technicians. Your SOPs must be granular enough for a novice technician to follow without confusion. Each step must be broken down into individual actions with specific tool usage.

CRITICAL REQUIREMENTS:
- Break down EVERY action into its own numbered step
- Specify EXACT tools for each action (e.g., "using needle-nose pliers" not just "remove pin")
- Include torque specifications with exact values
- Note when parts are single-use (e.g., cotter pins must be replaced)
- Reference manufacturer manuals and part numbers
- Include visual inspection criteria
- Specify exact PPE for each section
- Include time estimates for each major section`
          },
          {
            role: "user",
            content: `Generate an EXTREMELY DETAILED Standard Operating Procedure based on these requirements:

${prompt}

Create a comprehensive SOP following this EXACT structure:

SOP_TITLE: [Descriptive title with equipment model/capacity]
SOP_ID: [Format: CATEGORY-TYPE-MFG-MODEL-VERSION]
VERSION: 1.0

PURPOSE_DETAILS: [2-3 paragraphs explaining what, why, and expected outcomes]

SCOPE_DETAILS: [Who performs this, what equipment it applies to, when it should be done]

SAFETY_SPECIAL_NOTES:
- List EACH hazard with: HAZARD TYPE: Description. CORRECTION: Specific mitigation steps
- Include electrical, mechanical, chemical, and ergonomic hazards
- Reference specific OSHA/EPA/DOT regulations

MATERIALS_LIST:
- List EVERY consumable with quantity and specifications
- Include manufacturer part numbers where applicable
- Specify grade/type of lubricants, solvents, etc.
- Note which items are single-use vs reusable

TOOLS_LIST:
- List EVERY tool needed with specifications
- Include torque wrench ranges
- Specify socket sizes
- Include specialty tools with part numbers
- List measurement tools needed

PROCEDURE_SECTION_[A-Z]_TITLE: [Section name]
PROCEDURE_SECTION_[A-Z]_STEPS:
1. [Single action with specific tool - e.g., "Using a 15mm socket on a 3/8" ratchet, loosen the drain plug by turning counterclockwise"]
2. [Next single action - e.g., "Position a drain pan with minimum 5-quart capacity directly under the drain plug"]
3. [Continue breaking down EVERY action]
- Include (PTC) for Procedure Test Checkpoints
- Include (PC) for Pause Checkpoints
- Note torque specs in ft-lbs or in-lbs
- Specify hand positions and body mechanics
- Include inspection criteria (e.g., "look for metal shavings larger than 1mm")

TROUBLESHOOTING_ISSUES:
Issue: [Specific problem]
Cause: [Root cause]
Action: [Step-by-step resolution]

MAINTENANCE_SCHEDULE:
- Specify intervals in miles/hours/months
- Include seasonal considerations
- Note heavy-use vs normal-use schedules

REFERENCED_DOCUMENTS:
- List manufacturer service manuals
- Include technical bulletins
- Reference industry standards

DEFINITIONS_TERMS:
- Define ALL technical terms
- Include acronyms
- Explain specialized components

REMEMBER: Each step must be so detailed that someone who has never done this procedure could follow it perfectly. Include things like:
- Which hand to use
- Clockwise vs counterclockwise
- Specific number of turns
- Expected resistance or feel
- What proper seating looks/sounds like
- When to use thread locker or anti-seize
- Cross-threading prevention techniques`
          }
        ],
        temperature: 0.3,
        max_tokens: 8000
      });

      return response.choices[0].message.content || "Failed to generate SOP content";
    } catch (error) {
      console.error('OpenAI SOP generation failed:', error);
      throw new Error(`SOP generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export const openaiService = new OpenAIService();
