/**
 * AI-IN-THE-LOOP INFORMATION GATHERER
 * 
 * Intelligently asks users for specific information like serial numbers,
 * model numbers, and technical specifications to find the exact correct 
 * information needed for accurate SOPs.
 */

import { aiRouter } from './ai-router';
import { evidenceLedger } from './evidence-ledger';

export interface InformationRequest {
  id: string;
  userId: string;
  sopContext: {
    topic: string;
    system: string;
    component: string;
  };
  requestedInfo: {
    type: 'serial_number' | 'model_number' | 'part_number' | 'year' | 'manufacturer' | 'specifications' | 'voltage' | 'fluid_level' | 'diagnostic_reading' | 'manual_upload' | 'custom';
    field: string;
    prompt: string;
    required: boolean;
    format?: string;
    examples?: string[];
    category?: 'equipment_identification' | 'diagnostic_data' | 'troubleshooting_step' | 'manual_verification';
  }[];
  status: 'pending' | 'completed' | 'partial';
  responses: Record<string, string>;
  timestamp: Date;
}

class AIITLInformationGatherer {
  private pendingRequests: Map<string, InformationRequest> = new Map();

  /**
   * INTELLIGENT INFORMATION ANALYSIS - Determine what specific info is needed
   */
  async analyzeInformationNeeds(request: {
    topic: string;
    system: string;
    component: string;
    complexity?: string;
    userId: string;
  }): Promise<InformationRequest | null> {
    
    console.log('🤖 AI-ITL: Analyzing what specific information is needed...');
    
    // Use all 3 LLMs to determine what specific information to ask for
    const analysisPrompt = `
ANALYZE INFORMATION REQUIREMENTS for SOP generation:

Topic: ${request.topic}
System: ${request.system}
Component: ${request.component}
Complexity: ${request.complexity || 'intermediate'}

DETERMINE what specific information is needed to generate an accurate, safe SOP:

1. Does this require model-specific information?
2. Are serial numbers needed for warranty/service procedures?
3. What technical specifications are critical for safety?
4. Are there year/version differences that affect procedures?
5. What manufacturer-specific details are required?

For water heaters, typically need:
- Water heater model number (e.g., Atwood GC6AA-10E, Suburban SW6DE)
- Serial number (for exact manual lookup and parts)
- Year/vintage (procedures and parts change over time)
- Type: tankless vs tank, electric vs gas vs combination
- Control board part number if available
- Installation location and access panels

For troubleshooting, also need:
- Voltage readings at control board
- Error codes or LED patterns
- Fluid levels (propane, water)
- Temperature readings
- Signal continuity tests
- Thermostat positions

Respond with JSON array of required information:
{
  "needsSpecificInfo": true/false,
  "requiredFields": [
    {
      "type": "model_number",
      "field": "generator_model",
      "prompt": "What is the exact model number of your RV generator?",
      "required": true,
      "format": "Usually found on a label on the generator housing",
      "examples": ["Onan QG 4000", "Generac GP3000i", "Champion 3400W"]
    }
  ]
}
`;

    try {
      // Get consensus from all 3 LLMs about what information is needed
      const [geminiAnalysis, claudeAnalysis, chatgptAnalysis] = await Promise.all([
        aiRouter.callAI({
          model: 'gemini',
          messages: [{ role: 'system', content: 'You are an expert at determining what specific technical information is needed for accurate SOP generation.' }, { role: 'user', content: analysisPrompt }],
          temperature: 0.2,
          systemName: 'information_needs_analysis'
        }),
        aiRouter.callAI({
          model: 'anthropic',
          messages: [{ role: 'system', content: 'You are an expert at identifying critical information requirements for technical procedures.' }, { role: 'user', content: analysisPrompt }],
          temperature: 0.2,
          systemName: 'information_needs_analysis'
        }),
        aiRouter.callAI({
          model: 'openai',
          messages: [{ role: 'system', content: 'You are an expert at determining what specific equipment details are needed for safe, accurate procedures.' }, { role: 'user', content: analysisPrompt }],
          temperature: 0.2,
          systemName: 'information_needs_analysis'
        })
      ]);

      // Parse and consolidate the analyses
      const consolidatedRequirements = this.consolidateInformationRequirements([
        geminiAnalysis, claudeAnalysis, chatgptAnalysis
      ]);

      if (!consolidatedRequirements.needsSpecificInfo) {
        console.log('📋 AI-ITL: No specific information needed - proceeding with general SOP');
        return null;
      }

      // Create information request
      const informationRequest: InformationRequest = {
        id: `info_req_${Date.now()}`,
        userId: request.userId,
        sopContext: {
          topic: request.topic,
          system: request.system,
          component: request.component
        },
        requestedInfo: consolidatedRequirements.requiredFields,
        status: 'pending',
        responses: {},
        timestamp: new Date()
      };

      // Store the request
      this.pendingRequests.set(informationRequest.id, informationRequest);

      // Log to evidence ledger
      await evidenceLedger.append('AI_ITL_INFORMATION_REQUEST', {
        requestId: informationRequest.id,
        sopContext: informationRequest.sopContext,
        fieldsRequested: informationRequest.requestedInfo.length,
        llmModelsUsed: ['gemini', 'claude', 'chatgpt'],
        timestamp: new Date().toISOString()
      });

      console.log(`🤖 AI-ITL: Created information request with ${informationRequest.requestedInfo.length} required fields`);
      
      return informationRequest;

    } catch (error) {
      console.error('🚨 AI-ITL: Failed to analyze information needs:', error);
      return null;
    }
  }

  /**
   * Consolidate information requirements from multiple LLM analyses
   */
  private consolidateInformationRequirements(analyses: string[]): any {
    try {
      // Parse JSON responses and find common requirements
      const parsedAnalyses = analyses.map(analysis => {
        try {
          // Extract JSON from response
          const jsonMatch = analysis.match(/\{[\s\S]*\}/);
          return jsonMatch ? JSON.parse(jsonMatch[0]) : null;
        } catch {
          return null;
        }
      }).filter(Boolean);

      if (parsedAnalyses.length === 0) {
        return { needsSpecificInfo: false, requiredFields: [] };
      }

      // Check if majority think specific info is needed
      const needsInfo = parsedAnalyses.filter(a => a.needsSpecificInfo).length > parsedAnalyses.length / 2;

      if (!needsInfo) {
        return { needsSpecificInfo: false, requiredFields: [] };
      }

      // Consolidate required fields from all analyses
      const allFields = parsedAnalyses.flatMap(a => a.requiredFields || []);
      const fieldMap = new Map();

      // Merge similar fields and prioritize by frequency
      allFields.forEach(field => {
        const key = `${field.type}_${field.field}`;
        if (fieldMap.has(key)) {
          const existing = fieldMap.get(key);
          existing.count++;
          // Use the most detailed prompt
          if (field.prompt && field.prompt.length > existing.prompt.length) {
            existing.prompt = field.prompt;
          }
        } else {
          fieldMap.set(key, { ...field, count: 1 });
        }
      });

      // Keep fields mentioned by majority of LLMs
      const consolidatedFields = Array.from(fieldMap.values())
        .filter(field => field.count > parsedAnalyses.length / 2)
        .map(field => {
          const { count, ...fieldData } = field;
          return fieldData;
        });

      return {
        needsSpecificInfo: true,
        requiredFields: consolidatedFields
      };

    } catch (error) {
      console.error('🚨 AI-ITL: Failed to consolidate requirements:', error);
      return { needsSpecificInfo: false, requiredFields: [] };
    }
  }

  /**
   * Get pending information request for user
   */
  getPendingRequest(userId: string): InformationRequest | null {
    for (const [id, request] of this.pendingRequests) {
      if (request.userId === userId && request.status === 'pending') {
        return request;
      }
    }
    return null;
  }

  /**
   * Submit user response to information request
   */
  async submitResponse(requestId: string, fieldId: string, value: string): Promise<{
    success: boolean;
    completed: boolean;
    nextField?: any;
  }> {
    
    const request = this.pendingRequests.get(requestId);
    if (!request) {
      return { success: false, completed: false };
    }

    // Validate the response using AI
    const validationResult = await this.validateUserResponse(request, fieldId, value);
    
    if (validationResult.valid) {
      // Store the response
      request.responses[fieldId] = value;

      // Check if all required fields are completed
      const requiredFields = request.requestedInfo.filter(field => field.required);
      const completedRequired = requiredFields.filter(field => 
        request.responses[field.field] && request.responses[field.field].trim() !== ''
      );

      const isCompleted = completedRequired.length === requiredFields.length;

      if (isCompleted) {
        request.status = 'completed';
        console.log(`✅ AI-ITL: Information gathering completed for request ${requestId}`);
        
        // Log completion to evidence ledger
        await evidenceLedger.append('AI_ITL_INFORMATION_COMPLETED', {
          requestId,
          fieldsCompleted: Object.keys(request.responses).length,
          userResponses: request.responses,
          timestamp: new Date().toISOString()
        });
      } else {
        request.status = 'partial';
        
        // Find next unanswered required field
        const nextField = requiredFields.find(field => 
          !request.responses[field.field] || request.responses[field.field].trim() === ''
        );
        
        return {
          success: true,
          completed: false,
          nextField
        };
      }

      return { success: true, completed: isCompleted };
    } else {
      return { 
        success: false, 
        completed: false,
        error: validationResult.reason
      };
    }
  }

  /**
   * Validate user response using AI
   */
  private async validateUserResponse(
    request: InformationRequest, 
    fieldId: string, 
    value: string
  ): Promise<{ valid: boolean; reason?: string }> {
    
    const field = request.requestedInfo.find(f => f.field === fieldId);
    if (!field) {
      return { valid: false, reason: 'Invalid field' };
    }

    const validationPrompt = `
VALIDATE USER RESPONSE for SOP information gathering:

Field Type: ${field.type}
Field Description: ${field.prompt}
User Response: "${value}"
Expected Format: ${field.format || 'Any valid format'}
Examples: ${field.examples?.join(', ') || 'No examples provided'}

Is this response valid and useful for generating an accurate SOP?

Validation criteria:
- Serial numbers: Should be alphanumeric, reasonable length
- Model numbers: Should match typical manufacturer patterns
- Years: Should be reasonable (1980-2025 for RV equipment)
- Specifications: Should contain relevant technical details

Respond with: VALID or INVALID: reason
`;

    try {
      const validationResponse = await aiRouter.callAI({
        model: 'openai', // Use ChatGPT for validation
        messages: [
          { role: 'system', content: 'You are an expert at validating technical equipment information.' },
          { role: 'user', content: validationPrompt }
        ],
        temperature: 0.1,
        systemName: 'user_response_validation'
      });

      const isValid = validationResponse.toLowerCase().includes('valid') && 
                     !validationResponse.toLowerCase().includes('invalid');

      if (!isValid) {
        const reasonMatch = validationResponse.match(/invalid:\s*(.+)/i);
        const reason = reasonMatch ? reasonMatch[1] : 'Response format appears incorrect';
        return { valid: false, reason };
      }

      return { valid: true };

    } catch (error) {
      console.error('🚨 AI-ITL: Validation failed:', error);
      // Default to valid if validation fails (don't block user)
      return { valid: true };
    }
  }

  /**
   * Get completed information for SOP generation
   */
  getCompletedInformation(requestId: string): Record<string, string> | null {
    const request = this.pendingRequests.get(requestId);
    if (!request || request.status !== 'completed') {
      return null;
    }
    
    return request.responses;
  }

  /**
   * Clean up completed requests (optional)
   */
  cleanupCompletedRequests(): void {
    const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago
    
    for (const [id, request] of this.pendingRequests) {
      if (request.status === 'completed' && request.timestamp.getTime() < cutoffTime) {
        this.pendingRequests.delete(id);
      }
    }
  }
}

// Export singleton instance
export const aiITLInformationGatherer = new AIITLInformationGatherer();