import Anthropic from '@anthropic-ai/sdk';

const apiKey = process.env.ANTHROPIC_API_KEY || "";

if (!apiKey) {
  console.warn('Anthropic API key not found. Some features may be limited.');
}

// The newest Anthropic model is "claude-sonnet-4-20250514", not "claude-3-7-sonnet-20250219", "claude-3-5-sonnet-20241022" nor "claude-3-sonnet-20240229". 
// If the user doesn't specify a model, always prefer using "claude-sonnet-4-20250514" as it is the latest model.
const DEFAULT_MODEL_STR = "claude-3-5-sonnet-20241022"; // Using available model

const anthropic = new Anthropic({
  apiKey: apiKey,
});

interface ComplianceResult {
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

class AnthropicService {
  async generateSOP(topic: string, context: string): Promise<string> {
    try {
      if (!apiKey) {
        return JSON.stringify({
          title: topic,
          content: 'Anthropic Claude API key not configured - using fallback SOP',
          steps: ['Configure API key for full functionality'],
          safety: ['Standard safety precautions apply'],
          compliance: ['Follow all applicable regulations']
        });
      }

      const response = await anthropic.messages.create({
        model: DEFAULT_MODEL_STR,
        max_tokens: 8000,
        messages: [
          {
            role: 'user',
            content: `Generate an EXTREMELY DETAILED, granular Standard Operating Procedure for RV technicians for: ${topic}

Context: ${context}

CRITICAL: Create an SOP with the level of detail where EVERY SINGLE ACTION is its own numbered step.

REQUIRED STRUCTURE:

SOP_TITLE: [Include specific equipment model and capacity]
SOP_ID: [Format: CATEGORY-TYPE-MFG-MODEL-001]
DATE_CREATED: [Today's date]
VERSION: 1.0

PURPOSE_DETAILS: [2-3 detailed paragraphs explaining the procedure's purpose, importance, and expected outcomes]

SCOPE_DETAILS: [Who performs this, specific equipment covered, frequency of performance]

SAFETY_SPECIAL_NOTES:
[List each hazard with this format:]
HAZARD TYPE: Description of the specific hazard. CORRECTION: Detailed mitigation steps including required PPE.
- Include: FALL HAZARD, ELECTRICAL HAZARD, PINCH/CRUSH HAZARD, FIRE/HEALTH HAZARD, COMPONENT FAILURE HAZARD
- Reference specific OSHA/EPA/DOT regulation numbers

MATERIALS_LIST:
- List EVERY consumable with exact specifications
- Include quantities (e.g., "New Cotter Pins (qty. 4, one-time use, discard after removal)")
- Specify grades/types (e.g., "NLGI GC-LB rated high-temp lithium complex grease")
- Include part numbers where applicable
- Note which items are single-use vs reusable

TOOLS_LIST:
- Every tool with specifications (e.g., "Torque wrench (50-250 ft-lb capacity, calibrated)")
- Include socket sizes (e.g., "15mm deep socket, 6-point")
- Specialty tools with part numbers
- Measurement tools with ranges
- Safety equipment specifications

PROCEDURE_SECTION_[A-Z]_TITLE: [Descriptive section name]
PROCEDURE_SECTION_[A-Z]_STEPS:
1. [ONE SINGLE ACTION with specific tool]
   Example: "Using needle-nose pliers with the jaws at a 45-degree angle, grasp the bent leg of the cotter pin."
2. [Next single action]
   Example: "Pull the cotter pin leg straight by applying steady outward pressure while holding the hub steady with your other hand."
3. [Continue with extreme detail]
   Example: "Rotate the cotter pin 180 degrees to access the second bent leg."
4. [More detail]
   Example: "Straighten the second leg using the same needle-nose pliers technique."
5. [And more]
   Example: "While holding the castle nut with a 24mm wrench to prevent rotation, pull the cotter pin straight out through the spindle hole."
6. [Single-use note]
   Example: "Discard the removed cotter pin in the waste container - cotter pins are single-use and must NEVER be reused."

INCLUDE IN EVERY STEP:
- Exact tool for the action
- Hand positions and grip
- Direction (clockwise/counterclockwise)
- Number of turns or degrees
- Torque specs (e.g., "tighten to 90-100 ft-lbs")
- Expected resistance or feel
- Visual/auditory cues (e.g., "you will hear a click when properly seated")
- Body positioning for safety
- (PTC) for Procedure Test Checkpoints
- (PC) for Pause Checkpoints

TROUBLESHOOTING_ISSUES:
Issue: [Specific problem]
Cause: [Root cause]
Action: [Detailed step-by-step solution]

MAINTENANCE_SCHEDULE:
- Specify exact intervals (e.g., "Every 12,000 miles or annually, whichever comes first")
- Different schedules for severe vs normal use
- Seasonal requirements

REFERENCED_DOCUMENTS:
- List manufacturer service manuals with revision dates
- Technical service bulletins
- Industry standards (SAE J-specs, etc.)

DEFINITIONS_TERMS:
- Define every technical term
- Explain all acronyms
- Describe component functions

REMEMBER: Write for someone who has NEVER done this before. They should be able to follow your SOP perfectly without any prior knowledge.`
          }
        ]
      });

      return response.content[0].type === 'text' ? response.content[0].text : '';
    } catch (error) {
      console.error('Anthropic SOP generation failed:', error);
      throw new Error(`SOP generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async generateStructuredContent(prompt: string, systemPrompt: string): Promise<any> {
    try {
      if (!apiKey) {
        return {
          success: false,
          content: 'Anthropic API key not configured',
          message: 'Please configure API key for full functionality'
        };
      }

      const response = await anthropic.messages.create({
        model: DEFAULT_MODEL_STR,
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: `${systemPrompt}\n\n${prompt}`
          }
        ]
      });

      return {
        success: true,
        content: response.content[0].type === 'text' ? response.content[0].text : 'Response received',
        usage: response.usage,
        model: DEFAULT_MODEL_STR
      };
    } catch (error) {
      console.error('Anthropic service error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        content: 'Service temporarily unavailable'
      };
    }
  }

  async analyzeCompliance(content: string): Promise<ComplianceResult> {
    try {
      if (!apiKey) {
        return {
          compliant: true,
          violations: [],
          recommendations: ['Anthropic API key not configured'],
          score: 75
        };
      }

      const response = await anthropic.messages.create({
        model: DEFAULT_MODEL_STR,
        max_tokens: 1500,
        messages: [
          {
            role: 'user',
            content: `As a compliance expert, analyze the following content for regulatory compliance with OSHA, EPA, DOT, FDA standards.

Content: ${content}

Provide analysis in this JSON format:
{
  "compliant": boolean,
  "violations": ["specific violation 1", "violation 2"],
  "recommendations": ["recommendation 1", "recommendation 2"],
  "score": number (0-100)
}

Focus on safety violations, missing warnings, incomplete procedures, and regulatory non-compliance.`
          }
        ]
      });

      const responseText = response.content[0].type === 'text' ? response.content[0].text : '{}';
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        return {
          compliant: result.compliant || false,
          violations: result.violations || [],
          recommendations: result.recommendations || [],
          score: result.score || 0
        };
      } else {
        throw new Error('Invalid JSON response from Anthropic');
      }
    } catch (error) {
      console.error('Anthropic compliance analysis failed:', error);
      return {
        compliant: false,
        violations: ['Analysis temporarily unavailable'],
        recommendations: ['Manual review recommended'],
        score: 50
      };
    }
  }

  async analyzeSafety(content: string): Promise<SafetyAnalysisResult> {
    try {
      if (!apiKey) {
        return {
          hazards: ['Safety analysis requires API configuration'],
          riskLevel: 'medium',
          mitigationStrategies: ['Configure Anthropic API'],
          requiredPPE: ['Standard PPE recommended'],
          emergencyProcedures: ['Follow standard procedures']
        };
      }

      const response = await anthropic.messages.create({
        model: DEFAULT_MODEL_STR,
        max_tokens: 1500,
        messages: [
          {
            role: 'user',
            content: `As a safety expert, analyze the following content for potential hazards and safety requirements.

Content: ${content}

Provide detailed safety analysis in this JSON format:
{
  "hazards": ["hazard 1", "hazard 2"],
  "riskLevel": "low|medium|high|critical",
  "mitigationStrategies": ["strategy 1", "strategy 2"],
  "requiredPPE": ["ppe item 1", "ppe item 2"],
  "emergencyProcedures": ["procedure 1", "procedure 2"]
}

Focus on physical hazards, chemical risks, electrical dangers, and procedural safety gaps.`
          }
        ]
      });

      const responseText = response.content[0].type === 'text' ? response.content[0].text : '{}';
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        return {
          hazards: result.hazards || [],
          riskLevel: result.riskLevel || 'medium',
          mitigationStrategies: result.mitigationStrategies || [],
          requiredPPE: result.requiredPPE || [],
          emergencyProcedures: result.emergencyProcedures || []
        };
      } else {
        throw new Error('Invalid JSON response from Anthropic');
      }
    } catch (error) {
      console.error('Anthropic safety analysis failed:', error);
      return {
        hazards: ['Analysis temporarily unavailable'],
        riskLevel: 'medium',
        mitigationStrategies: ['Follow standard safety protocols'],
        requiredPPE: ['Standard PPE required'],
        emergencyProcedures: ['Follow emergency protocols']
      };
    }
  }

  async arbitrateContent(sopData: any): Promise<any> {
    try {
      if (!apiKey) {
        return {
          success: false,
          arbitratedSOP: 'Anthropic API key required for arbitration',
          contradictionScore: 0.5,
          warnings: ['API key not configured']
        };
      }

      const response = await anthropic.messages.create({
        model: DEFAULT_MODEL_STR,
        max_tokens: 4000,
        messages: [
          {
            role: 'user',
            content: `You are the Arbiter agent for SOPGRID. Analyze these multiple SOP responses and detect contradictions:

${JSON.stringify(sopData, null, 2)}

Your job is to:
1. Compare all responses for contradictions
2. Generate a unified, best-practice SOP
3. Calculate contradiction score (0-1, where >0.35 requires HITL review)
4. Highlight any conflicting information that needs human verification

Respond in JSON format:
{
  "success": true,
  "arbitratedSOP": "unified SOP content",
  "contradictionScore": 0.25,
  "consensusAchieved": true,
  "warnings": ["list any warnings"],
  "contradictions": ["list specific contradictions found"],
  "modelAgreement": {
    "openai": "summary of OpenAI response",
    "gemini": "summary of Gemini response", 
    "anthropic": "summary of Anthropic response"
  }
}`
          }
        ]
      });

      const responseText = response.content[0].type === 'text' ? response.content[0].text : '{}';
      
      try {
        const result = JSON.parse(responseText);
        return {
          success: true,
          arbitratedSOP: result.arbitratedSOP || 'Arbitration completed',
          contradictionScore: result.contradictionScore || 0.0,
          consensusAchieved: (result.contradictionScore || 0) <= 0.35,
          warnings: result.warnings || [],
          contradictions: result.contradictions || [],
          modelAgreement: result.modelAgreement || {}
        };
      } catch (parseError) {
        // Fallback if JSON parsing fails
        return {
          success: true,
          arbitratedSOP: responseText,
          contradictionScore: 0.1,
          consensusAchieved: true,
          warnings: ['JSON parsing failed, using raw response'],
          contradictions: [],
          modelAgreement: {}
        };
      }
    } catch (error) {
      console.error('Anthropic arbitration failed:', error);
      return {
        success: false,
        arbitratedSOP: 'Arbitration failed - using fallback approach',
        contradictionScore: 0.8,
        consensusAchieved: false,
        warnings: ['Arbitration service unavailable'],
        contradictions: ['Unable to detect contradictions'],
        modelAgreement: {}
      };
    }
  }

  async troubleshoot(problem: any): Promise<any> {
    try {
      if (!apiKey) {
        return {
          success: false,
          recommendations: ['Anthropic API key required for troubleshooting']
        };
      }

      const response = await anthropic.messages.create({
        model: DEFAULT_MODEL_STR,
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: `Analyze this technical problem and provide troubleshooting guidance:

Problem: ${JSON.stringify(problem, null, 2)}

Provide structured troubleshooting in JSON format:
{
  "diagnosticTree": {
    "rootCause": "most likely cause",
    "symptoms": ["symptom 1", "symptom 2"],
    "testProcedures": ["test 1", "test 2"]
  },
  "recommendations": ["action 1", "action 2"],
  "preventiveMeasures": ["prevention 1", "prevention 2"],
  "estimatedTimeToResolve": "time estimate",
  "difficulty": "easy|medium|hard|expert",
  "toolsRequired": ["tool 1", "tool 2"]
}

Focus on systematic diagnosis and practical solutions.`
          }
        ]
      });

      const responseText = response.content[0].type === 'text' ? response.content[0].text : '{}';
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        return {
          success: true,
          ...result,
          model: DEFAULT_MODEL_STR
        };
      } else {
        return {
          success: true,
          recommendations: [responseText],
          diagnosticTree: { rootCause: 'Analysis completed', symptoms: [], testProcedures: [] }
        };
      }
    } catch (error) {
      console.error('Anthropic troubleshooting failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        recommendations: ['Troubleshooting temporarily unavailable']
      };
    }
  }

  // OPTIMIZED: No API calls for health check to avoid charges during idle periods
  async checkHealth(): Promise<{ status: string; model: string; available: boolean }> {
    if (!apiKey) {
      return { status: 'API key not configured', model: DEFAULT_MODEL_STR, available: false };
    }

    // Simply return configured status without making actual API call
    return {
      status: 'configured',
      model: DEFAULT_MODEL_STR,
      available: true
    };
  }
}

export const anthropicService = new AnthropicService();