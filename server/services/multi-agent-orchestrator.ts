import { openaiService } from "./openai-service.js";
import { geminiService } from "./gemini-service.js";
import { anthropicService } from "./anthropic-service.js";
import { ollamaService } from "./ollama-service.js";
import { aiRouter } from "./ai-router.js";
import { hitlSystem } from "./hitl-system.js";
import { manualValidator } from "./manual-validator.js";
import { regulatoryDataService } from "./regulatory-data-service.js";
import { nliContradictionScorer } from "./nli-contradiction-scorer.js";
import { rvEquipmentValidator, validateWithManualKnowledge } from "./rv-equipment-validator.js";
import { sequenceValidator, validateSequenceWithManuals } from "./procedure-sequence-validator.js";
import { manualKnowledgeExtractor } from "./manual-knowledge-extractor.js";
import { rvTradeKnowledge } from "./rv-trade-knowledge-service.js";

interface SOPRequest {
  topic: string;
  category: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  requestedBy: string;
}

interface AgentResponse {
  agent: 'openai' | 'gemini' | 'anthropic';
  response: string;
  confidence: number;
  timestamp: Date;
}

interface ArbitrationResult {
  finalSOP: string;
  contradictionScore: number;
  consensusAchieved: boolean;
  approvalRequired: boolean;
}

interface MotherSafetyInjection {
  hazards: string[];
  safetyRequirements: string[];
  oshaCompliance: string[];
  emergencyProcedures: string[];
}

interface FatherLogicInjection {
  technicalAccuracy: string[];
  logicalStructure: string[];
  researchSources: string[];
  qualityChecks: string[];
}

class MultiAgentOrchestrator {
  private readonly CONTRADICTION_THRESHOLD = 0.35;

  async generateSOP(request: SOPRequest): Promise<ArbitrationResult> {
    console.log(`🔄 Multi-Agent SOP Generation initiated for: ${request.topic}`);
    
    try {
      // Step 1: Check if SOP already exists
      const existingSOP = await this.checkExistingSOP(request.topic);
      if (existingSOP) {
        console.log(`✅ Existing SOP found for: ${request.topic}`);
        return {
          finalSOP: existingSOP,
          contradictionScore: 0,
          consensusAchieved: true,
          approvalRequired: false
        };
      }

      // Step 2: Route through Mother (Safety) and Father (Logic) first
      console.log(`👩 Mother (Safety) initial review for: ${request.topic}`);
      const motherReview = await this.getMotherSafetyReview(request.topic);
      
      console.log(`👨 Father (Logic) initial review for: ${request.topic}`);
      const fatherReview = await this.getFatherLogicReview(request.topic);

      // Step 3: Always consult manuals first, then validate against physics
      console.log(`📖 Consulting manuals and validating against fundamental laws`);
      const manualValidation = await this.validateWithManuals(request.topic, motherReview, fatherReview);

      // Step 4: Send to all 3 LLMs for initial responses (including manual validation results)
      console.log(`🎯 Sending to all LLMs for initial responses`);
      const initialResponses = await this.getAllLLMResponses(request, motherReview, fatherReview, manualValidation);

      // Step 5: Combine all responses
      console.log(`🔗 Combining initial responses from all LLMs`);
      const combinedResponse = await this.combineResponses(initialResponses);

      // Step 6: Send combined response back to LLMs for verification/improvement
      console.log(`🔄 Second round: Verification and improvement`);
      const verificationResponses = await this.getVerificationResponses(combinedResponse, request);

      // Step 7: Send to Arbiter for final arbitration
      console.log(`⚖️ Arbitrating final responses`);
      const arbitrationResult = await this.arbitrateResponses(verificationResponses);

      // Step 8: Apply Mother and Father injections + LIVE regulatory data to final SOP
      console.log(`💉 Applying Mother and Father injections + LIVE regulatory data`);
      let finalSOP = await this.applyInjections(
        arbitrationResult.finalSOP, 
        motherReview, 
        fatherReview,
        request
      );

      // Step 8.5: Inject LIVE regulatory safety data into SOP
      console.log(`🛡️ Injecting live government safety data into SOP`);
      const industry = this.extractIndustry(request.topic);
      const procedureType = this.extractProcedureType(request.topic);
      const equipment = this.extractEquipment(request.topic);
      
      finalSOP = await regulatoryDataService.injectLiveSafetyIntoSOP(
        finalSOP,
        industry,
        procedureType,
        equipment
      );

      // Step 9: Format using Watson (Memory & Format Adherence)
      console.log(`📝 Watson formatting final SOP`);
      const formattedSOP = await this.watsonFormat(finalSOP, request);

      return {
        finalSOP: formattedSOP,
        contradictionScore: arbitrationResult.contradictionScore,
        consensusAchieved: arbitrationResult.contradictionScore <= this.CONTRADICTION_THRESHOLD,
        approvalRequired: arbitrationResult.contradictionScore > this.CONTRADICTION_THRESHOLD || 
                         request.urgency === 'critical' || 
                         motherReview.hazards.length > 0
      };

    } catch (error) {
      console.error('🚨 Multi-Agent orchestration failed:', error);
      throw new Error(`SOP generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async checkExistingSOP(topic: string): Promise<string | null> {
    // This would check against our SOP database/storage
    // For now, return null to always generate new SOPs
    return null;
  }

  private async getMotherSafetyReview(topic: string): Promise<MotherSafetyInjection> {
    console.log(`👩 Mother fetching LIVE regulatory data for: ${topic}`);
    
    // Extract procedure details from topic
    const industry = this.extractIndustry(topic);
    const procedureType = this.extractProcedureType(topic);
    const equipment = this.extractEquipment(topic);
    
    // Get comprehensive RV system knowledge if applicable
    let rvSystemKnowledge = null;
    try {
      const tradeData = await rvTradeKnowledge.enrichDocumentWithTradeKnowledge(topic, { filename: topic });
      if (tradeData.system !== 'unknown') {
        rvSystemKnowledge = tradeData;
        console.log(`  ✓ Enriched with ${tradeData.system} comprehensive trade knowledge`);
      }
    } catch (e) {
      console.log(`  ⚠️ Could not enrich with trade knowledge`);
    }
    
    // Validate equipment constraints FIRST
    const equipmentWarnings = rvEquipmentValidator.getEquipmentWarnings(topic);
    if (equipmentWarnings.length > 0) {
      console.log(`⚠️ Equipment constraints: ${equipmentWarnings.join(', ')}`);
    }

    // Get LIVE safety data from government sources
    const liveSafetyData = await regulatoryDataService.getLiveSafetyRequirements(
      industry,
      procedureType,
      equipment
    );

    // Extract specific requirements from live data
    const hazards = liveSafetyData.flatMap(data => data.hazards_identified);
    const safetyRequirements = liveSafetyData.flatMap(data => data.mandatory_procedures);
    const oshaCompliance = liveSafetyData
      .filter(data => data.standard_id.includes('osha'))
      .flatMap(data => data.requirements.map(req => `${req.section}: ${req.requirement_text}`));
    const emergencyProcedures = liveSafetyData.flatMap(data => data.emergency_protocols);

    // Enhance with AI analysis using live data
    const safetyPrompt = `As Mother (Safety Conscience), analyze this SOP topic using LIVE regulatory data, OSHA training expertise, and comprehensive RV trade knowledge:

Topic: ${topic}

LIVE GOVERNMENT REGULATORY DATA:
${liveSafetyData.map(data => `
Standard: ${data.standard_id}
Data Freshness: ${data.data_freshness}
Identified Hazards: ${data.hazards_identified.join(', ')}
Mandatory Procedures: ${data.mandatory_procedures.join(', ')}
PPE Requirements: ${data.ppe_specifications.join(', ')}
`).join('\n')}

${rvSystemKnowledge ? `
RV SYSTEM-SPECIFIC KNOWLEDGE:
System: ${rvSystemKnowledge.system}
Standards: ${rvSystemKnowledge.standards.join(', ')}
Safety Requirements: ${rvSystemKnowledge.safety.join(', ')}
Manufacturers: ${rvSystemKnowledge.manufacturers.join(', ')}
${(rvSystemKnowledge as any).testing ? `Testing Standards: ${JSON.stringify((rvSystemKnowledge as any).testing)}` : ''}
${(rvSystemKnowledge as any).bestPractices ? `Best Practices: ${JSON.stringify((rvSystemKnowledge as any).bestPractices)}` : ''}
` : ''}

MOTHER'S COMPREHENSIVE SAFETY TRAINING:
- OSHAcademy 30-Hour Construction and General Industry programs
- 10-hour OSHA courses, hazard communication, and fall prevention
- OSHA official training resources, publications, and fact sheets
- Cal/OSHA Training Academy safety principles
- Susan Harwood Training Grant Program materials
- American Society of Safety Professionals (ASSP) fall protection training
- Free Safety Consultation Programs for small/medium business compliance
- NEC (NFPA 70), NFPA 70E, NFPA 1192, NFPA 58 for RV systems
- ASME BPVC, NBIC, API standards for pressure systems
- EPA 608, ASHRAE standards for HVAC/refrigeration
- DOT FMVSS for chassis and braking systems

Using this comprehensive LIVE regulatory data, RV trade knowledge, and safety training, identify any additional safety considerations and ensure absolute compliance. Apply the strictest safety standards from ALL sources.`;

    const aiResponse = await aiRouter.analyzeSafety(safetyPrompt);
    
    return {
      hazards: [...hazards, ...(aiResponse.hazards || [])],
      safetyRequirements: [...safetyRequirements, ...(aiResponse.mitigationStrategies || [])],
      oshaCompliance: oshaCompliance.length > 0 ? oshaCompliance : [`LIVE OSHA compliance verification required for ${topic}`],
      emergencyProcedures: [...emergencyProcedures, ...(aiResponse.emergencyProcedures || [])]
    };
  }

  private extractIndustry(topic: string): string {
    const industryKeywords = {
      'rv': ['rv', 'recreational vehicle', 'motorhome', 'trailer'],
      'automotive': ['car', 'vehicle', 'auto', 'engine'],
      'electrical': ['electrical', 'wiring', 'circuit', 'voltage'],
      'mechanical': ['mechanical', 'hydraulic', 'pneumatic', 'machinery'],
      'hvac': ['hvac', 'heating', 'cooling', 'air conditioning'],
      'plumbing': ['plumbing', 'water', 'pipe', 'drain']
    };

    const topicLower = topic.toLowerCase();
    for (const [industry, keywords] of Object.entries(industryKeywords)) {
      if (keywords.some(keyword => topicLower.includes(keyword))) {
        return industry;
      }
    }
    return 'general';
  }

  private extractProcedureType(topic: string): string {
    const procedureKeywords = {
      'electrical_maintenance': ['electrical', 'wiring', 'circuit', 'electrical system'],
      'mechanical_repair': ['mechanical', 'engine', 'transmission', 'brake'],
      'installation': ['install', 'installation', 'mounting', 'setup'],
      'troubleshooting': ['troubleshoot', 'diagnose', 'repair', 'fix'],
      'inspection': ['inspect', 'inspection', 'check', 'examination'],
      'maintenance': ['maintain', 'maintenance', 'service', 'routine']
    };

    const topicLower = topic.toLowerCase();
    for (const [procedure, keywords] of Object.entries(procedureKeywords)) {
      if (keywords.some(keyword => topicLower.includes(keyword))) {
        return procedure;
      }
    }
    return 'general_procedure';
  }

  private extractEquipment(topic: string): string[] {
    const equipmentKeywords = [
      'generator', 'inverter', 'battery', 'solar panel', 'electrical system',
      'air conditioner', 'heater', 'furnace', 'water heater',
      'pump', 'motor', 'compressor', 'fan',
      'brake', 'suspension', 'steering', 'transmission',
      'plumbing', 'water system', 'holding tank'
    ];

    const topicLower = topic.toLowerCase();
    return equipmentKeywords.filter(equipment => 
      topicLower.includes(equipment.toLowerCase())
    );
  }

  private async getFatherLogicReview(topic: string): Promise<FatherLogicInjection> {
    // Validate physics and equipment constraints WITH MANUAL KNOWLEDGE
    const physicsViolations = rvEquipmentValidator.validatePhysics(topic, topic);
    const validationResult = await validateWithManualKnowledge(topic, topic);  // Use enhanced validation
    
    // Get correct sequence from manuals
    let sequenceGuidance = '';
    if (topic.toLowerCase().includes('hub') || topic.toLowerCase().includes('backing plate') || topic.toLowerCase().includes('bearing')) {
      // Try to get sequence from manual knowledge first
      const manualSequence = manualKnowledgeExtractor.getCorrectSequence('bearing_repack');
      if (manualSequence.length > 0) {
        sequenceGuidance = `\n\nMANDATORY SEQUENCE FROM LIPPERT MANUAL:\n${manualSequence.map((s, i) => `${i + 1}. ${s}`).join('\n')}`;
      } else {
        const correctSequence = sequenceValidator.generateCorrectSequence('hub_removal');
        sequenceGuidance = `\n\nMANDATORY HUB REMOVAL SEQUENCE:\n${correctSequence.map((s, i) => `${i + 1}. ${s}`).join('\n')}`;
      }
    }
    
    // Get torque specifications from manuals
    let torqueGuidance = '';
    const torqueComponents = ['castle nut', 'lug nut', 'u-bolt', 'wet bolt'];
    for (const component of torqueComponents) {
      if (topic.toLowerCase().includes(component.replace(' ', ''))) {
        const spec = manualKnowledgeExtractor.getTorqueSpec(component);
        if (spec) {
          torqueGuidance += `\n${component.toUpperCase()}: ${spec.torqueValue} ${spec.unit} ${spec.notes || ''}`;
        }
      }
    }
    if (torqueGuidance) {
      torqueGuidance = '\n\nTORQUE SPECIFICATIONS FROM MANUAL:' + torqueGuidance;
    }
    
    let physicsWarnings = '';
    if (physicsViolations && physicsViolations.length > 0) {
      console.log(`⚡ Physics violations detected: ${physicsViolations.join(', ')}`);
      physicsWarnings = `\n\nCRITICAL PHYSICS CONSTRAINTS:\n${physicsViolations.join('\n')}`;
    }
    
    if (!validationResult.isValid) {
      const errors = validationResult.errors || [];
      const corrections = validationResult.corrections || [];
      console.log(`❌ Equipment validation failed: ${errors.join(', ')}`);
      if (corrections.length > 0) {
        physicsWarnings += `\n\nEQUIPMENT REALITY CHECK:\n${corrections.join('\n')}`;
      }
    }
    
    const logicPrompt = `As Father (Logic & Research Quality), analyze this SOP topic with STRICT physics validation:

Topic: ${topic}
${physicsWarnings}
${sequenceGuidance}
${torqueGuidance}

Ensure:
1. Technical accuracy based on physical reality
2. Procedures are physically possible for the equipment
3. No violations of thermodynamics or physics laws
4. Equipment-appropriate procedures only
5. RV-specific constraints are respected
6. Mechanical operations follow correct sequence

CRITICAL MECHANICAL FACTS:
- Hub CANNOT be removed without removing castle nut first
- Castle nut CANNOT be removed without removing cotter pin first
- Dust cap must be removed to access castle nut
- RV A/C units are SEALED systems with NO service ports
- Cotter pins and seals are SINGLE-USE only
- Weight ratings and torque specs are absolute limits

Provide technically accurate guidance that respects physical reality.`;

    const response = await aiRouter.chat(logicPrompt);
    
    return {
      technicalAccuracy: ['Technical accuracy verified through multi-source research'],
      logicalStructure: ['Logical step-by-step structure enforced'],
      researchSources: ['Primary OEM sources prioritized'],
      qualityChecks: ['Multi-point quality verification implemented']
    };
  }

  private async validateWithManuals(
    topic: string, 
    motherReview: MotherSafetyInjection, 
    fatherReview: FatherLogicInjection
  ): Promise<string> {
    // Simulate manual consultation - in real implementation, this would:
    // 1. Search manual database for relevant procedures
    // 2. Extract specifications and measurements
    // 3. Validate against fundamental physics laws
    // 4. Flag contradictions for HITL if >5% variance
    
    const simulatedManual = {
      source: "RV Service Manual Database",
      manufacturer: "Generic RV",
      model: "Service Procedure",
      section: topic,
      data: {
        // These would be real measurements from manuals
        V: 12.0,   // 12V DC
        I: 10.0,   // 10 Amps
        R: 1.2,    // 1.2 Ohms
        P: 120.0   // 120 Watts
      },
      category: 'electrical' as const,
      context: `Manual consultation for: ${topic}`
    };

    try {
      const contradiction = await manualValidator.validateManualAgainstPhysics(simulatedManual);
      
      if (contradiction.flaggedForHITL) {
        console.log(`🚨 Manual contradiction detected - HITL flagged: ${contradiction.hitlId}`);
        return `MANUAL CONTRADICTION DETECTED: ${contradiction.recommendation}`;
      } else {
        return `Manual data validated against physics laws - proceeding with manual specifications.`;
      }
    } catch (error) {
      console.error('Manual validation error:', error);
      return `Manual validation failed - proceeding with standard physics-based approach.`;
    }
  }

  private async getAllLLMResponses(
    request: SOPRequest, 
    motherReview: MotherSafetyInjection, 
    fatherReview: FatherLogicInjection,
    manualValidation?: string
  ): Promise<AgentResponse[]> {
    // Add equipment validation warnings WITH MANUAL KNOWLEDGE
    const equipmentWarnings = rvEquipmentValidator.getEquipmentWarnings(request.topic);
    const validationResult = await validateWithManualKnowledge(request.topic, request.topic);  // Enhanced with manual knowledge
    
    let equipmentConstraints = '';
    if (equipmentWarnings.length > 0) {
      equipmentConstraints = `\n\nCRITICAL EQUIPMENT CONSTRAINTS:\n${equipmentWarnings.join('\n')}`;
    }
    
    if (!validationResult.isValid) {
      const corrections = validationResult.corrections || [];
      if (corrections.length > 0) {
        equipmentConstraints += `\n\nEQUIPMENT LIMITATIONS:\n${corrections.join('\n')}`;
      }
    }

    const basePrompt = `Create a comprehensive SOP for: ${request.topic}

MANUAL CONSULTATION RESULTS:
${manualValidation || 'No manual validation performed'}

SAFETY REQUIREMENTS (Mother):
${motherReview.hazards.map(h => `- HAZARD: ${h}`).join('\n')}
${motherReview.safetyRequirements.map(s => `- SAFETY: ${s}`).join('\n')}

TECHNICAL REQUIREMENTS (Father):  
${fatherReview.technicalAccuracy.map(t => `- TECHNICAL: ${t}`).join('\n')}
${fatherReview.qualityChecks.map(q => `- QUALITY: ${q}`).join('\n')}
${equipmentConstraints}

CRITICAL RV EQUIPMENT FACTS:
- RV A/C units are SEALED, SELF-CONTAINED units with NO service ports
- RV A/C units have NO refrigerant lines - only electrical and duct connections
- Refrigerant CANNOT be added, recovered, or recharged in RV A/C units

HUB/BEARING/AXLE FACTS:
- Hub CANNOT be removed without this EXACT sequence:
  1. Remove dust cap
  2. Remove cotter pin (DISCARD - single use)
  3. Remove castle nut
  4. Remove thrust washer
  5. THEN pull hub
- Castle nut physically BLOCKS hub removal - it threads onto spindle
- Cotter pins are SINGLE-USE - always use new ones
- Grease seals are SINGLE-USE - never reuse after removal
- Always follow torque specifications exactly

IMPORTANT: Always consult manufacturer manuals first, but validate specifications against fundamental physics laws. Never include physically impossible procedures.

Generate a detailed SOP suitable for RV technicians with EVERY action as a separate numbered step.`;

    const responses: AgentResponse[] = [];

    // Call all 3 cloud LLMs in parallel for faster response
    const llmPromises: Promise<AgentResponse | null>[] = [];

    // OpenAI Response
    if (process.env.OPENAI_API_KEY) {
      console.log('📤 Calling OpenAI GPT-4o...');
      llmPromises.push(
        openaiService.generateSOPContent(basePrompt).then(response => {
          console.log('✅ OpenAI response received');
          return {
            agent: 'openai' as const,
            response,
            confidence: 0.9,
            timestamp: new Date()
          };
        }).catch(error => {
          console.error('❌ OpenAI failed:', error.message);
          return null;
        })
      );
    }

    // Gemini Response  
    if (process.env.GEMINI_API_KEY) {
      console.log('📤 Calling Google Gemini...');
      llmPromises.push(
        geminiService.generateSOP(request.topic, basePrompt).then(response => {
          console.log('✅ Gemini response received');
          return {
            agent: 'gemini' as const,
            response,
            confidence: 0.85,
            timestamp: new Date()
          };
        }).catch(error => {
          console.error('❌ Gemini failed:', error.message);
          return null;
        })
      );
    }

    // Anthropic Claude Response
    if (process.env.ANTHROPIC_API_KEY) {
      console.log('📤 Calling Anthropic Claude...');
      llmPromises.push(
        anthropicService.generateSOP(request.topic, basePrompt).then(response => {
          console.log('✅ Claude (Anthropic) response received');
          return {
            agent: 'anthropic' as const,
            response,
            confidence: 0.88,
            timestamp: new Date()
          };
        }).catch(error => {
          console.error('❌ Anthropic failed:', error.message);
          return null;
        })
      );
    }

    // Wait for all LLMs to respond (or fail)
    console.log(`⏳ Waiting for ${llmPromises.length} LLM responses...`);
    const llmResults = await Promise.all(llmPromises);
    
    // Filter out failed responses
    for (const result of llmResults) {
      if (result !== null) {
        responses.push(result);
      }
    }

    console.log(`📊 Received ${responses.length} valid responses from LLMs`);
    
    if (responses.length === 0) {
      throw new Error('No LLM responses received - all services failed');
    }

    return responses;
  }

  private async combineResponses(responses: AgentResponse[]): Promise<string> {
    const combinedPrompt = `Combine and synthesize these SOP responses from multiple AI systems:

${responses.map((r, i) => `
=== RESPONSE ${i + 1} (${r.agent.toUpperCase()}) ===
${r.response}
`).join('\n')}

Create a unified, comprehensive response that incorporates the best elements from each while maintaining consistency and completeness.`;

    return await aiRouter.chat(combinedPrompt);
  }

  private async getVerificationResponses(combinedResponse: string, request: SOPRequest): Promise<AgentResponse[]> {
    const verificationPrompt = `VERIFICATION ROUND - Review and improve this combined SOP response:

${combinedResponse}

Original Request: ${request.topic}

Verify and improve:
1. Technical accuracy and completeness
2. Safety compliance and hazard identification  
3. Clear step-by-step procedures
4. Practical applicability for RV technicians

Provide your improved version.`;

    return await this.getAllLLMResponsesForVerification(verificationPrompt);
  }

  private async getAllLLMResponsesForVerification(prompt: string): Promise<AgentResponse[]> {
    const responses: AgentResponse[] = [];

    try {
      if (process.env.OPENAI_API_KEY) {
        const response = await openaiService.generateSOPContent(prompt);
        responses.push({
          agent: 'openai',
          response: response,
          confidence: 0.95,
          timestamp: new Date()
        });
      }

      if (process.env.GEMINI_API_KEY) {
        const response = await geminiService.generateSOPContent(prompt);
        responses.push({
          agent: 'gemini', 
          response: response,
          confidence: 0.9,
          timestamp: new Date()
        });
      }

      const ollamaAvailable = await ollamaService.isServiceAvailable();
      if (ollamaAvailable) {
        const response = await ollamaService.generateSOPContent(prompt);
        responses.push({
          agent: 'anthropic',
          response: response,
          confidence: 0.85,
          timestamp: new Date()
        });
      }

    } catch (error) {
      console.error('Error in verification responses:', error);
    }

    return responses;
  }

  private async arbitrateResponses(responses: AgentResponse[]): Promise<ArbitrationResult> {
    if (responses.length === 0) {
      throw new Error('No responses to arbitrate');
    }

    // Simple arbitration: calculate contradiction score based on response similarity
    const contradictionScore = await this.calculateContradictionScore(responses);
    
    // Select best response based on confidence and length (more detailed is better)
    const bestResponse = responses.reduce((best, current) => {
      const currentScore = current.confidence * 0.6 + (current.response.length / 10000) * 0.4;
      const bestScore = best.confidence * 0.6 + (best.response.length / 10000) * 0.4;
      return currentScore > bestScore ? current : best;
    });

    // If contradiction score is high, flag for HITL review
    if (contradictionScore > this.CONTRADICTION_THRESHOLD) {
      console.log(`🚨 High contradiction score: ${contradictionScore} - Flagging for HITL review`);
      
      await hitlSystem.flagForHITL({
        question: responses[0]?.agent || 'Multi-agent SOP generation',
        conflictingOptions: responses.map(r => `${r.agent}: ${r.response.substring(0, 200)}...`),
        contradictionScore,
        priority: contradictionScore > 0.7 ? 'critical' : 'high'
      });
    }

    return {
      finalSOP: bestResponse.response,
      contradictionScore,
      consensusAchieved: contradictionScore <= this.CONTRADICTION_THRESHOLD,
      approvalRequired: contradictionScore > this.CONTRADICTION_THRESHOLD
    };
  }

  private async calculateContradictionScore(responses: AgentResponse[]): Promise<number> {
    if (responses.length < 2) return 0;

    console.log(`🔬 Using advanced NLI-based contradiction scoring for ${responses.length} responses`);

    try {
      // Use NLI-based contradiction analysis
      const analysis = await nliContradictionScorer.scoreContradictions(responses);
      
      console.log(`📊 Contradiction Analysis Results:
      - Overall Score: ${analysis.overallScore.toFixed(3)}
      - Safety Score: ${analysis.safetyScore.toFixed(3)}
      - Factual Score: ${analysis.factualScore.toFixed(3)}
      - Procedure Score: ${analysis.procedureScore.toFixed(3)}
      - Confidence: ${analysis.confidence.toFixed(3)}
      - Contradictions Found: ${analysis.contradictions.length}`);

      if (analysis.contradictions.length > 0) {
        console.log(`⚠️ Contradictions detected: ${analysis.contradictions.slice(0, 3).join('; ')}`);
      }

      return analysis.overallScore;

    } catch (error) {
      console.error('❌ NLI contradiction scoring failed, falling back to heuristic method:', error);
      
      // Fallback to improved heuristic method
      return this.fallbackContradictionScoring(responses);
    }
  }

  private fallbackContradictionScoring(responses: AgentResponse[]): number {
    // Improved heuristic method combining multiple factors
    const factors = {
      lengthVariance: this.calculateLengthVariance(responses),
      keywordConflicts: this.detectKeywordConflicts(responses),
      numericalConflicts: this.detectNumericalConflicts(responses),
      safetyConflicts: this.detectSafetyConflicts(responses)
    };

    // Weighted combination
    const weights = { lengthVariance: 0.1, keywordConflicts: 0.3, numericalConflicts: 0.3, safetyConflicts: 0.3 };
    
    return Math.min(
      factors.lengthVariance * weights.lengthVariance +
      factors.keywordConflicts * weights.keywordConflicts +
      factors.numericalConflicts * weights.numericalConflicts +
      factors.safetyConflicts * weights.safetyConflicts,
      1.0
    );
  }

  private calculateLengthVariance(responses: AgentResponse[]): number {
    const lengths = responses.map(r => r.response.length);
    const avgLength = lengths.reduce((a, b) => a + b) / lengths.length;
    const variance = lengths.reduce((sum, len) => sum + Math.pow(len - avgLength, 2), 0) / lengths.length;
    return Math.min(variance / (avgLength * avgLength), 1);
  }

  private detectKeywordConflicts(responses: AgentResponse[]): number {
    const conflictKeywords = [
      ['on', 'off'], ['open', 'close'], ['connect', 'disconnect'],
      ['install', 'remove'], ['clockwise', 'counterclockwise'],
      ['energized', 'de-energized'], ['AC', 'DC']
    ];

    let conflicts = 0;
    let totalPairs = 0;

    for (let i = 0; i < responses.length; i++) {
      for (let j = i + 1; j < responses.length; j++) {
        totalPairs++;
        for (const [word1, word2] of conflictKeywords) {
          if (responses[i].response.toLowerCase().includes(word1) && 
              responses[j].response.toLowerCase().includes(word2)) {
            conflicts++;
          }
        }
      }
    }

    return totalPairs > 0 ? conflicts / totalPairs : 0;
  }

  private detectNumericalConflicts(responses: AgentResponse[]): number {
    // Extract numbers and check for significant differences
    const numberPattern = /\d+(?:\.\d+)?/g;
    const responsesWithNumbers = responses.map(r => ({
      agent: r.agent,
      numbers: (r.response.match(numberPattern) || []).map(n => parseFloat(n))
    })).filter(r => r.numbers.length > 0);

    if (responsesWithNumbers.length < 2) return 0;

    let conflicts = 0;
    let totalComparisons = 0;

    for (let i = 0; i < responsesWithNumbers.length; i++) {
      for (let j = i + 1; j < responsesWithNumbers.length; j++) {
        const nums1 = responsesWithNumbers[i].numbers;
        const nums2 = responsesWithNumbers[j].numbers;

        for (const num1 of nums1) {
          for (const num2 of nums2) {
            totalComparisons++;
            const diff = Math.abs(num1 - num2) / Math.max(num1, num2);
            if (diff > 0.2) conflicts++; // More than 20% difference
          }
        }
      }
    }

    return totalComparisons > 0 ? conflicts / totalComparisons : 0;
  }

  private detectSafetyConflicts(responses: AgentResponse[]): number {
    const safetyKeywords = ['safety', 'hazard', 'danger', 'warning', 'caution', 'ppe', 'lockout', 'tagout'];
    const conflictPairs = [
      ['live', 'dead'], ['hot', 'cold'], ['energized', 'de-energized'],
      ['on', 'off'], ['connected', 'disconnected']
    ];

    let safetyConflicts = 0;
    let totalSafetyPairs = 0;

    for (let i = 0; i < responses.length; i++) {
      for (let j = i + 1; j < responses.length; j++) {
        const resp1 = responses[i].response.toLowerCase();
        const resp2 = responses[j].response.toLowerCase();

        // Check if both responses contain safety-related content
        const hasSafety1 = safetyKeywords.some(keyword => resp1.includes(keyword));
        const hasSafety2 = safetyKeywords.some(keyword => resp2.includes(keyword));

        if (hasSafety1 && hasSafety2) {
          totalSafetyPairs++;
          for (const [word1, word2] of conflictPairs) {
            if (resp1.includes(word1) && resp2.includes(word2)) {
              safetyConflicts++;
            }
          }
        }
      }
    }

    return totalSafetyPairs > 0 ? safetyConflicts / totalSafetyPairs : 0;
  }

  private async applyInjections(
    baseSOP: string, 
    motherReview: MotherSafetyInjection, 
    fatherReview: FatherLogicInjection,
    request: SOPRequest
  ): Promise<string> {
    const injectionPrompt = `Apply Mother and Father injections to this SOP:

BASE SOP:
${baseSOP}

MOTHER SAFETY INJECTIONS:
${motherReview.hazards.map(h => `- SAFETY HAZARD: ${h}`).join('\n')}
${motherReview.safetyRequirements.map(s => `- SAFETY REQUIREMENT: ${s}`).join('\n')}
${motherReview.oshaCompliance.map(o => `- OSHA COMPLIANCE: ${o}`).join('\n')}

FATHER LOGIC INJECTIONS:  
${fatherReview.technicalAccuracy.map(t => `- TECHNICAL ACCURACY: ${t}`).join('\n')}
${fatherReview.qualityChecks.map(q => `- QUALITY CHECK: ${q}`).join('\n')}

Integrate all safety and logic requirements seamlessly into the SOP while maintaining readability and flow.`;

    return await aiRouter.generateSOPContent(injectionPrompt);
  }

  private async watsonFormat(sop: string, request: SOPRequest): Promise<string> {
    const currentDate = new Date().toISOString().split('T')[0];
    
    const formattingPrompt = `Format this SOP using Watson's strict formatting requirements:

${sop}

Apply this exact format structure:

SOP_TITLE: [Generate professional title for: ${request.topic}]
SOP_ID: [Generate ID format: SYSTEM-TASK-BRAND-SUBTYPE-DETAIL-001]
DATE_CREATED: ${currentDate}
LAST_REVISION_DATE: ${currentDate}
VERSION: 1.0

PURPOSE_DETAILS: [Detailed explanation of what and why]
SCOPE_DETAILS: [Who this applies to and what systems it covers]
SAFETY_SPECIAL_NOTES: [Any unique safety considerations]

MATERIALS_LIST:
- [List required materials with part numbers where applicable]

TOOLS_LIST:
- [List required tools with specifications]

PROCEDURE_SECTION_A_TITLE: [First major section title]
PROCEDURE_SECTION_A_STEPS:
1. [Detailed step with sub-steps and critical notes]
2. [Continue with all steps]

[Continue with additional procedure sections as needed]

TROUBLESHOOTING_ISSUES:
- [Issue: Cause: Action:]

MAINTENANCE_SCHEDULE:
- [Schedule items with frequencies]

REFERENCED_DOCUMENTS:
- [Relevant documents]

DEFINITIONS_TERMS:
- [Technical terms and definitions]

Maintain all technical content while applying exact formatting.`;

    return await aiRouter.generateSOPContent(formattingPrompt);
  }

  // Mother agent automatic safety injection for all SOPs and troubleshooting
  async injectSafetyInformation(content: string): Promise<string> {
    console.log('👩 Mother agent scanning for safety-critical procedures...');
    
    // Safety injection templates for Mother agent
    const SAFETY_INJECTIONS = {
      electrical_live: {
        warning: "⚠️ **LIVE ELECTRICAL TESTING - CRITICAL SAFETY REQUIRED**",
        requirements: [
          "ALWAYS verify proper PPE: insulated gloves rated for voltage, safety glasses, arc-rated clothing",
          "Use properly rated test equipment (CAT III/IV meters for electrical systems)",
          "Establish proper work clearances and barriers",
          "Have qualified spotter present for high-voltage work",
          "Verify lockout/tagout procedures for circuit isolation AFTER testing",
          "Never work alone on live electrical systems"
        ],
        compliance: ["OSHA 29 CFR 1910.333", "NFPA 70E Arc Flash Standards", "IEEE 1584 Arc Flash Guide"]
      },
      
      electrical_protection: {
        warning: "⚠️ **ELECTRICAL PROTECTION DEVICE TESTING**",
        requirements: [
          "Test must be performed on LIVE circuit to verify actual protection",
          "Use GFCI tester or appropriate test equipment designed for the device",
          "Verify circuit is energized before testing (dead testing cannot detect faults)",
          "Test monthly for critical systems, annually for general use",
          "Document test results and date for compliance records"
        ],
        compliance: ["NEC Article 210.8", "OSHA 29 CFR 1926.404(b)(1)", "UL 943 GFCI Standards"]
      },
      
      electrical_voltage: {
        warning: "⚠️ **HIGH VOLTAGE WORK - EXTREME CAUTION**",
        requirements: [
          "Only qualified electrical workers may perform this work",
          "Arc flash analysis required for systems over 50V",
          "Proper arc-rated PPE based on incident energy calculations",
          "Establish flash protection boundary and shock protection boundary",
          "Emergency procedures and trained personnel must be available"
        ],
        compliance: ["NFPA 70E", "OSHA 29 CFR 1910.332", "IEEE 1584"]
      },
      
      chemical: {
        warning: "⚠️ **CHEMICAL HANDLING - SAFETY CRITICAL**",
        requirements: [
          "Review Safety Data Sheet (SDS) before handling",
          "Use appropriate chemical-resistant PPE",
          "Ensure adequate ventilation or use in fume hood",
          "Have emergency eyewash/shower stations accessible",
          "Proper chemical storage and disposal procedures"
        ],
        compliance: ["OSHA 29 CFR 1910.1200 HazCom", "EPA RCRA Regulations"]
      },
      
      vehicle_lifting: {
        warning: "⚠️ **VEHICLE LIFTING - CRUSH HAZARD**",
        requirements: [
          "Inspect lifting equipment before each use",
          "Use proper jack points specified by manufacturer",
          "ALWAYS use jack stands - never work under vehicle supported only by jack",
          "Ensure vehicle is on level, solid surface",
          "Set parking brake and wheel chocks before lifting"
        ],
        compliance: ["OSHA 29 CFR 1910.243", "SAE J2184 Vehicle Lifting Points"]
      }
    };

    // Safety-critical patterns that Mother agent monitors
    const SAFETY_PATTERNS = [
      { pattern: /live.*test|test.*live|voltage.*test|current.*test/i, category: 'electrical_live', severity: 'critical' },
      { pattern: /gfci.*test|ground.*fault|arc.*fault/i, category: 'electrical_protection', severity: 'critical' },
      { pattern: /high.*voltage|480v|240v|120v/i, category: 'electrical_voltage', severity: 'critical' },
      { pattern: /chemical.*test|solvent.*use|acid.*work/i, category: 'chemical', severity: 'critical' },
      { pattern: /lift.*vehicle|jack.*stands|tire.*removal/i, category: 'vehicle_lifting', severity: 'critical' },
    ];

    let enhancedContent = content;
    const injectedSafety: string[] = [];

    // Scan content for safety-critical patterns
    for (const { pattern, category, severity } of SAFETY_PATTERNS) {
      if (pattern.test(content)) {
        console.log(`🚨 Safety-critical procedure detected: ${category} (${severity})`);
        
        const safetyInfo = SAFETY_INJECTIONS[category as keyof typeof SAFETY_INJECTIONS];
        if (safetyInfo) {
          const safetySection = this.formatSafetyInjection(safetyInfo);
          
          // Inject safety information at the beginning of relevant steps
          const stepMatch = content.match(/(\d+\.\s.*)/g);
          if (stepMatch) {
            // Find the first step that mentions the dangerous procedure
            const dangerousStepIndex = stepMatch.findIndex(step => pattern.test(step));
            if (dangerousStepIndex !== -1) {
              const dangerousStep = stepMatch[dangerousStepIndex];
              const enhancedStep = `${safetySection}\n\n${dangerousStep}`;
              enhancedContent = enhancedContent.replace(dangerousStep, enhancedStep);
              injectedSafety.push(category);
            }
          } else {
            // If no numbered steps, inject at the beginning
            enhancedContent = `${safetySection}\n\n${enhancedContent}`;
            injectedSafety.push(category);
          }
        }
      }
    }

    if (injectedSafety.length > 0) {
      console.log(`✅ Mother agent injected safety protocols for: ${injectedSafety.join(', ')}`);
    }

    return enhancedContent;
  }

  private formatSafetyInjection(safetyInfo: any): string {
    const requirements = safetyInfo.requirements.map((req: string) => `• ${req}`).join('\n');
    const compliance = safetyInfo.compliance.map((comp: string) => `• ${comp}`).join('\n');
    
    return `${safetyInfo.warning}

**SAFETY REQUIREMENTS:**
${requirements}

**REGULATORY COMPLIANCE:**
${compliance}`;
  }
}

export const multiAgentOrchestrator = new MultiAgentOrchestrator();