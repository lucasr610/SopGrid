/**
 * INTERACTIVE TROUBLESHOOTING SERVICE
 * 
 * Creates "pick your own adventure" style troubleshooting flows
 * that guide technicians through manual-based diagnostic procedures.
 */

import { aiRouter } from './ai-router';
import { manualLookupService } from './manual-lookup-service';
import { evidenceLedger } from './evidence-ledger';

export interface TroubleshootingStep {
  id: string;
  stepNumber: number;
  instruction: string;
  requiresReading?: {
    type: 'voltage' | 'temperature' | 'pressure' | 'fluid_level' | 'visual_inspection' | 'continuity';
    location: string;
    expectedRange?: string;
    tools?: string[];
  };
  options: {
    id: string;
    text: string;
    nextStepId?: string;
    followUpQuestions?: string[];
    diagnosticAction?: string;
  }[];
  manualReference?: {
    section: string;
    page?: string;
    diagram?: string;
  };
  manualImages?: Array<{
    imageUrl: string;
    description: string;
    relevantFor: string[];
    verified: boolean; // Always true - only from actual manuals
  }>;
  safetyWarning?: string;
}

export interface TroubleshootingSession {
  id: string;
  userId: string;
  technicianLevel: 'beginner' | 'intermediate' | 'master';
  equipmentInfo: {
    modelNumber: string;
    serialNumber?: string;
    type: string;
    issue: string;
    failurePoint: string; // Specific component that failed
  };
  manualFound: boolean;
  currentStep: TroubleshootingStep;
  stepHistory: string[];
  diagnosticData: Record<string, any>;
  troubleshootingStrategy: 'forward_basics' | 'backward_from_failure' | 'hybrid';
  status: 'information_gathering' | 'active_troubleshooting' | 'resolved' | 'escalated';
  startTime: Date;
}

class InteractiveTroubleshootingService {
  private activeSessions: Map<string, TroubleshootingSession> = new Map();
  
  /**
   * START TROUBLESHOOTING SESSION - Adaptive based on technician skill level
   */
  async startTroubleshootingSession(request: {
    userId: string;
    equipmentType: string;
    issue: string;
    technicianLevel: 'beginner' | 'intermediate' | 'master';
    modelNumber?: string;
    serialNumber?: string;
  }): Promise<TroubleshootingSession> {
    
    console.log(`🔧 INTERACTIVE TROUBLESHOOTING: Starting session for ${request.equipmentType} issue...`);
    
    const sessionId = `troubleshoot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Determine troubleshooting strategy based on skill level
    const strategy = this.determineTroubleshootingStrategy(request.technicianLevel, request.issue);
    
    // Extract failure point from issue description
    const failurePoint = this.extractFailurePoint(request.issue);
    
    // Create initial session
    const session: TroubleshootingSession = {
      id: sessionId,
      userId: request.userId,
      technicianLevel: request.technicianLevel,
      equipmentInfo: {
        modelNumber: request.modelNumber || 'unknown',
        serialNumber: request.serialNumber,
        type: request.equipmentType,
        issue: request.issue,
        failurePoint: failurePoint
      },
      manualFound: false,
      currentStep: await this.generateAdaptiveInitialStep(request, strategy, failurePoint),
      stepHistory: [],
      diagnosticData: {},
      troubleshootingStrategy: strategy,
      status: request.modelNumber ? 'active_troubleshooting' : 'information_gathering',
      startTime: new Date()
    };
    
    // If we have model info, try to find manual
    if (request.modelNumber) {
      const manualResult = await manualLookupService.searchForManual({
        modelNumber: request.modelNumber,
        serialNumber: request.serialNumber,
        equipmentType: request.equipmentType
      });
      
      session.manualFound = manualResult.found;
      
      if (manualResult.found && manualResult.manualData) {
        // Generate manual-based first step with actual images
        session.currentStep = await this.generateManualBasedStep(request, manualResult.manualData);
        session.status = 'active_troubleshooting';
        
        console.log(`📖 MANUAL FOUND: ${Object.keys(manualResult.manualData.images || {}).length} image sections available`);
      } else if (manualResult.needsUserUpload) {
        // Request manual upload
        session.currentStep = await this.generateManualRequestStep(manualResult.uploadRequest);
      }
    }
    
    // Store session
    this.activeSessions.set(sessionId, session);
    
    // Log to evidence ledger
    await evidenceLedger.append('TROUBLESHOOTING_SESSION_STARTED', {
      sessionId,
      equipmentType: request.equipmentType,
      issue: request.issue,
      manualFound: session.manualFound,
      timestamp: new Date().toISOString()
    });
    
    console.log(`🔧 SESSION CREATED: ${sessionId} - Level: ${request.technicianLevel}, Strategy: ${strategy}`);
    
    return session;
  }
  
  /**
   * DETERMINE TROUBLESHOOTING STRATEGY based on technician skill level
   */
  private determineTroubleshootingStrategy(
    techLevel: 'beginner' | 'intermediate' | 'master', 
    issue: string
  ): 'forward_basics' | 'backward_from_failure' | 'hybrid' {
    
    // BEGINNERS: Always start with basics (power, connections, simple checks)
    if (techLevel === 'beginner') {
      return 'forward_basics';
    }
    
    // MASTERS: Start from failure point and work backwards
    if (techLevel === 'master') {
      return 'backward_from_failure';
    }
    
    // INTERMEDIATE: Hybrid approach - quick basic checks then failure point analysis
    return 'hybrid';
  }
  
  /**
   * EXTRACT FAILURE POINT from issue description
   */
  private extractFailurePoint(issue: string): string {
    const issueLower = issue.toLowerCase();
    
    // Motor-related failures
    if (issueLower.includes('motor') && issueLower.includes('not')) {
      return 'motor_no_operation';
    }
    if (issueLower.includes('motor') && issueLower.includes('slow')) {
      return 'motor_slow_operation';
    }
    
    // Electrical failures
    if (issueLower.includes('no power') || issueLower.includes('dead')) {
      return 'no_electrical_power';
    }
    
    // Control board failures
    if (issueLower.includes('control') && issueLower.includes('board')) {
      return 'control_board_failure';
    }
    
    // Water heater specific
    if (issueLower.includes('won\'t ignite') || issueLower.includes('no ignition')) {
      return 'ignition_failure';
    }
    
    // Generic component failure
    return 'component_malfunction';
  }
  
  /**
   * GENERATE ADAPTIVE INITIAL STEP based on skill level and strategy
   */
  private async generateAdaptiveInitialStep(
    request: any, 
    strategy: string, 
    failurePoint: string
  ): Promise<TroubleshootingStep> {
    
    console.log(`🎯 ADAPTIVE STEP: ${request.technicianLevel} level, ${strategy} strategy for ${failurePoint}`);
    
    switch (request.technicianLevel) {
      case 'beginner':
        return await this.generateBeginnerStep(request, failurePoint);
      
      case 'master':
        return await this.generateMasterStep(request, failurePoint);
      
      case 'intermediate':
        return await this.generateIntermediateStep(request, failurePoint);
      
      default:
        return await this.generateBeginnerStep(request, failurePoint);
    }
  }
  
  /**
   * BEGINNER STEP - Start with absolute basics they might miss
   */
  private async generateBeginnerStep(request: any, failurePoint: string): Promise<TroubleshootingStep> {
    
    const beginnerPrompt = `
CREATE BEGINNER-LEVEL TROUBLESHOOTING STEP for:
Equipment: ${request.equipmentType}
Issue: "${request.issue}"
Failure Point: ${failurePoint}

BEGINNER technicians need to check BASIC things they often miss:
1. Main disconnect switches ON
2. Circuit breakers not tripped
3. Fuses not blown
4. Battery connections tight
5. Obvious visual damage
6. Safety switches engaged

Start with the most commonly missed basics for this equipment type.
Use simple language and explain WHY each check matters.
`;

    try {
      const aiResponse = await aiRouter.callAI({
        model: 'claude',
        messages: [
          { role: 'system', content: 'You are training a beginner RV technician. Always start with the basics they commonly forget and explain why each step matters for safety and troubleshooting.' },
          { role: 'user', content: beginnerPrompt }
        ],
        temperature: 0.2,
        systemName: 'beginner_troubleshooting'
      });
      
      return {
        id: 'beginner_basics',
        stepNumber: 1,
        instruction: `Let's start with the essential basics that are often overlooked. For ${request.equipmentType} issues, we need to verify these fundamentals first:`,
        options: [
          {
            id: 'power_disconnect_on',
            text: 'Main disconnect switch is ON',
            followUpQuestions: ['Is the 12V power disconnect switch in the ON position?']
          },
          {
            id: 'need_help_finding_disconnect',
            text: 'I need help finding the disconnect switch',
            diagnosticAction: 'Guide to typical disconnect locations'
          },
          {
            id: 'no_power_at_all',
            text: 'No power anywhere in the RV',
            nextStepId: 'check_main_power_source'
          }
        ],
        safetyWarning: '⚠️ SAFETY FIRST: Always verify power is OFF at the component before touching any wires or connections'
      };
      
    } catch (error) {
      console.error('🚨 Failed to generate beginner step:', error);
      return this.getDefaultBeginnerStep(request);
    }
  }
  
  /**
   * MASTER STEP - Start from failure point and work backwards
   */
  private async generateMasterStep(request: any, failurePoint: string): Promise<TroubleshootingStep> {
    
    const masterPrompt = `
CREATE MASTER-LEVEL TROUBLESHOOTING STEP for:
Equipment: ${request.equipmentType}
Issue: "${request.issue}"
Failure Point: ${failurePoint}

MASTER technicians can start from the POINT OF FAILURE and work backwards:
- Jack motor won't move → Check motor power directly, then work back through control circuits
- Control board dead → Check board power first, then upstream power sources
- Water heater won't ignite → Check ignition control signal first, then gas/power

Start at the EXACT failure point with immediate power/signal checks.
Assume master tech has tools and knows component locations.
`;

    try {
      const aiResponse = await aiRouter.callAI({
        model: 'claude',
        messages: [
          { role: 'system', content: 'You are working with a master RV technician. Start directly at the failure point and work systematically backwards through the system. Assume high skill level and proper tools.' },
          { role: 'user', content: masterPrompt }
        ],
        temperature: 0.2,
        systemName: 'master_troubleshooting'
      });
      
      return {
        id: 'master_failure_point',
        stepNumber: 1,
        instruction: `Let's start directly at the failure point and work backwards systematically:`,
        requiresReading: {
          type: 'voltage',
          location: 'Directly at the failed component',
          expectedRange: 'Per manual specifications',
          tools: ['Digital multimeter', 'Test leads']
        },
        options: [
          {
            id: 'power_at_component',
            text: 'Voltage present at component (specify reading)',
            nextStepId: 'check_component_internal'
          },
          {
            id: 'no_power_at_component',
            text: 'No voltage at component',
            nextStepId: 'trace_power_backwards'
          },
          {
            id: 'intermittent_power',
            text: 'Intermittent or incorrect voltage',
            nextStepId: 'analyze_power_quality'
          }
        ],
        safetyWarning: 'Working with live circuits - ensure proper PPE and test procedures'
      };
      
    } catch (error) {
      console.error('🚨 Failed to generate master step:', error);
      return this.getDefaultMasterStep(request);
    }
  }
  
  /**
   * INTERMEDIATE STEP - Hybrid approach: quick basics then failure analysis
   */
  private async generateIntermediateStep(request: any, failurePoint: string): Promise<TroubleshootingStep> {
    
    return {
      id: 'intermediate_hybrid',
      stepNumber: 1,
      instruction: `As an intermediate tech, let's do a quick verification of basics, then focus on the failure point:`,
      options: [
        {
          id: 'basics_confirmed',
          text: 'Basics verified (power, fuses, connections)',
          nextStepId: 'analyze_failure_point'
        },
        {
          id: 'found_basic_issue',
          text: 'Found basic issue (specify what)',
          nextStepId: 'resolve_basic_issue'
        },
        {
          id: 'need_guidance_on_basics',
          text: 'Need guidance on what basics to check',
          nextStepId: 'guided_basic_checks'
        }
      ],
      safetyWarning: 'Verify safety basics before proceeding to component-level diagnostics'
    };
  }
  
  /**
   * PROCESS USER RESPONSE - Navigate through the troubleshooting adventure
   */
  async processUserResponse(sessionId: string, response: {
    selectedOptionId?: string;
    diagnosticReading?: {
      type: string;
      value: string;
      location: string;
    };
    additionalInfo?: string;
  }): Promise<TroubleshootingSession> {
    
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error('Troubleshooting session not found');
    }
    
    console.log(`🔧 PROCESSING: User response for session ${sessionId}`);
    
    // Store diagnostic reading if provided
    if (response.diagnosticReading) {
      session.diagnosticData[response.diagnosticReading.type] = {
        value: response.diagnosticReading.value,
        location: response.diagnosticReading.location,
        timestamp: new Date()
      };
      
      console.log(`📊 RECORDED: ${response.diagnosticReading.type} = ${response.diagnosticReading.value} at ${response.diagnosticReading.location}`);
    }
    
    // Add current step to history
    session.stepHistory.push(session.currentStep.id);
    
    // Generate next step based on response
    if (response.selectedOptionId) {
      const selectedOption = session.currentStep.options.find(opt => opt.id === response.selectedOptionId);
      
      if (selectedOption) {
        if (selectedOption.nextStepId === 'RESOLVED') {
          session.status = 'resolved';
          session.currentStep = await this.generateResolutionStep(session, selectedOption);
        } else if (selectedOption.nextStepId === 'ESCALATE') {
          session.status = 'escalated';
          session.currentStep = await this.generateEscalationStep(session, selectedOption);
        } else {
          // Generate next diagnostic step
          session.currentStep = await this.generateNextStep(session, selectedOption, response);
        }
      }
    }
    
    // Update session
    this.activeSessions.set(sessionId, session);
    
    return session;
  }
  
  /**
   * Generate initial step when starting troubleshooting
   */
  private async generateInitialStep(request: any): Promise<TroubleshootingStep> {
    
    if (!request.modelNumber) {
      // Need equipment identification first
      return {
        id: 'identify_equipment',
        stepNumber: 1,
        instruction: `To provide accurate troubleshooting for your ${request.equipmentType} with the issue "${request.issue}", I need to know the exact model and serial number.`,
        options: [
          {
            id: 'provide_model',
            text: 'I can provide the model and serial number',
            followUpQuestions: [
              'What is the model number? (Usually on a label/sticker)',
              'What is the serial number? (Optional but helpful)'
            ]
          },
          {
            id: 'find_model',
            text: 'I need help finding the model number',
            diagnosticAction: 'Guide user to typical label locations'
          }
        ],
        safetyWarning: 'Ensure power is OFF before inspecting labels or components'
      };
    }
    
    // Generate problem-specific initial step using AI
    const initialStepPrompt = `
CREATE INITIAL TROUBLESHOOTING STEP for:
Equipment: ${request.equipmentType}
Model: ${request.modelNumber}
Issue: "${request.issue}"

Create the first diagnostic step that follows troubleshooting best practices:
1. Start with safety checks
2. Verify basic power/connections
3. Ask for obvious visual inspections
4. Request initial readings if needed

Format as interactive step with 2-4 response options.
`;

    try {
      const aiResponse = await aiRouter.callAI({
        model: 'claude',
        messages: [
          { role: 'system', content: 'You are an expert RV technician creating step-by-step troubleshooting procedures. Always start with safety and basic checks.' },
          { role: 'user', content: initialStepPrompt }
        ],
        temperature: 0.3,
        systemName: 'initial_troubleshooting_step'
      });
      
      return this.parseAIResponseToStep('initial_step', aiResponse);
      
    } catch (error) {
      console.error('🚨 Failed to generate initial step:', error);
      
      // Fallback generic step
      return {
        id: 'safety_check',
        stepNumber: 1,
        instruction: `Let's start troubleshooting your ${request.equipmentType}. First, let's ensure safety and check basics.`,
        options: [
          {
            id: 'power_off',
            text: 'Power is OFF and area is safe to work',
            nextStepId: 'basic_checks'
          },
          {
            id: 'need_safety_help',
            text: 'I need guidance on safety procedures',
            diagnosticAction: 'Provide safety guidance'
          }
        ],
        safetyWarning: 'Always turn OFF power before troubleshooting electrical equipment'
      };
    }
  }
  
  /**
   * Generate manual-based step using actual equipment documentation WITH IMAGES
   */
  private async generateManualBasedStep(request: any, manualData: any): Promise<TroubleshootingStep> {
    
    const manualStepPrompt = `
CREATE MANUAL-BASED TROUBLESHOOTING STEP using REAL MANUAL DATA:

Equipment: ${request.equipmentType} ${request.modelNumber}
Issue: "${request.issue}"

Manual Troubleshooting Section:
${manualData?.sections?.troubleshooting || 'Manual troubleshooting data not available'}

Manual Specifications:
${manualData?.sections?.specifications || 'Specifications not available'}

Using the ACTUAL MANUAL CONTENT, create the first troubleshooting step that:
1. References specific manual procedures
2. Uses exact voltage/measurement specifications from manual
3. References specific components mentioned in manual
4. Follows manual's diagnostic flow

This must be based on REAL manual data, not generic procedures.
`;

    try {
      const aiResponse = await aiRouter.callAI({
        model: 'claude',
        messages: [
          { role: 'system', content: 'You are creating troubleshooting steps based on actual equipment manuals. Use only the provided manual content, not generic knowledge.' },
          { role: 'user', content: manualStepPrompt }
        ],
        temperature: 0.2,
        systemName: 'manual_based_troubleshooting'
      });
      
      const step = this.parseAIResponseToStep('manual_step_1', aiResponse);
      step.manualReference = {
        section: 'Troubleshooting',
        page: 'See manual for details'
      };
      
      // Add relevant images from manual - ONLY if they exist
      step.manualImages = this.getRelevantManualImages(manualData, request.issue, 'initial_check');
      
      if (step.manualImages && step.manualImages.length > 0) {
        console.log(`🖼️ STEP IMAGES: Adding ${step.manualImages.length} manual images to help technician`);
      }
      
      return step;
      
    } catch (error) {
      console.error('🚨 Failed to generate manual-based step:', error);
      return await this.generateAdaptiveInitialStep(request, 'forward_basics', this.extractFailurePoint(request.issue));
    }
  }
  
  /**
   * Get relevant manual images for troubleshooting step - ONLY REAL IMAGES
   */
  private getRelevantManualImages(
    manualData: any, 
    issue: string, 
    stepType: string
  ): Array<{
    imageUrl: string;
    description: string;
    relevantFor: string[];
    verified: boolean;
  }> {
    
    if (!manualData?.images) {
      return [];
    }
    
    const relevantImages: Array<{
      imageUrl: string;
      description: string;
      relevantFor: string[];
      verified: boolean;
    }> = [];
    
    // Check different manual sections for relevant images
    const sectionsToCheck = ['troubleshooting', 'wiring', 'parts'];
    
    for (const section of sectionsToCheck) {
      const sectionImages = manualData.images[section] || [];
      
      for (const image of sectionImages) {
        // Only include if image is relevant to the current issue/step
        if (this.isImageRelevantForStep(image, issue, stepType)) {
          relevantImages.push({
            imageUrl: image.imageUrl,
            description: image.description,
            relevantFor: image.relevantFor,
            verified: true // Always true - only from actual manuals
          });
        }
      }
    }
    
    // Limit to most relevant images to avoid overwhelming technician
    return relevantImages.slice(0, 3);
  }
  
  /**
   * Check if manual image is relevant for current troubleshooting step
   */
  private isImageRelevantForStep(image: any, issue: string, stepType: string): boolean {
    const issueLower = issue.toLowerCase();
    const imageName = image.filename?.toLowerCase() || '';
    const imageDesc = image.description?.toLowerCase() || '';
    
    // Motor issues - show motor/control related images
    if (issueLower.includes('motor')) {
      return imageName.includes('motor') || 
             imageName.includes('control') || 
             imageDesc.includes('motor') ||
             image.relevantFor.some((proc: string) => proc.toLowerCase().includes('motor'));
    }
    
    // Electrical issues - show wiring diagrams
    if (issueLower.includes('power') || issueLower.includes('electrical')) {
      return imageName.includes('wiring') || 
             imageName.includes('electrical') || 
             imageName.includes('diagram') ||
             image.section === 'wiring';
    }
    
    // Control board issues - show control board images
    if (issueLower.includes('control') && issueLower.includes('board')) {
      return imageName.includes('control') || 
             imageName.includes('board') ||
             imageDesc.includes('control board');
    }
    
    // For initial steps, show general troubleshooting images
    if (stepType === 'initial_check') {
      return image.section === 'troubleshooting' || 
             image.relevantFor.includes('Troubleshooting');
    }
    
    return false;
  }
  
  /**
   * Generate step requesting manual upload
   */
  private async generateManualRequestStep(uploadRequest: any): Promise<TroubleshootingStep> {
    return {
      id: 'request_manual',
      stepNumber: 1,
      instruction: uploadRequest?.message || 'I need the manual for your equipment to provide accurate troubleshooting procedures.',
      options: [
        {
          id: 'upload_manual',
          text: 'I can upload the manual',
          diagnosticAction: 'Request file upload'
        },
        {
          id: 'no_manual',
          text: 'I don\'t have the manual',
          nextStepId: 'generic_troubleshooting'
        },
        {
          id: 'find_manual',
          text: 'Help me find the manual online',
          diagnosticAction: 'Provide manual search guidance'
        }
      ],
      safetyWarning: 'Without the specific manual, procedures may not be fully accurate for your exact model'
    };
  }
  
  /**
   * Generate next step based on previous response
   */
  private async generateNextStep(session: TroubleshootingSession, selectedOption: any, response: any): Promise<TroubleshootingStep> {
    
    const nextStepPrompt = `
GENERATE NEXT TROUBLESHOOTING STEP based on previous response:

Current Issue: ${session.equipmentInfo.issue}
Equipment: ${session.equipmentInfo.type} ${session.equipmentInfo.modelNumber}
Previous Step: ${session.currentStep.instruction}
User Selected: ${selectedOption.text}

Diagnostic Data Collected:
${JSON.stringify(session.diagnosticData, null, 2)}

Step History: ${session.stepHistory.join(' → ')}

Generate the logical next step that:
1. Builds on previous findings
2. Narrows down the problem systematically
3. Requests specific diagnostic readings if needed
4. Provides clear next actions based on manual procedures

If diagnostic readings were provided, analyze them and determine next steps accordingly.
`;

    try {
      const aiResponse = await aiRouter.callAI({
        model: 'claude',
        messages: [
          { role: 'system', content: 'You are guiding a technician through systematic troubleshooting. Each step should logically build on previous findings and narrow down the problem.' },
          { role: 'user', content: nextStepPrompt }
        ],
        temperature: 0.3,
        systemName: 'next_troubleshooting_step'
      });
      
      const stepId = `step_${session.stepHistory.length + 1}`;
      return this.parseAIResponseToStep(stepId, aiResponse);
      
    } catch (error) {
      console.error('🚨 Failed to generate next step:', error);
      
      // Fallback step
      return {
        id: `fallback_${Date.now()}`,
        stepNumber: session.stepHistory.length + 1,
        instruction: 'Let\'s continue with the next logical troubleshooting step.',
        options: [
          {
            id: 'continue',
            text: 'Ready to continue',
            nextStepId: 'continue_troubleshooting'
          }
        ]
      };
    }
  }
  
  /**
   * Parse AI response into structured troubleshooting step
   */
  private parseAIResponseToStep(stepId: string, aiResponse: string): TroubleshootingStep {
    // This would parse the AI response to extract structured step data
    // For now, create a basic structure
    
    return {
      id: stepId,
      stepNumber: 1,
      instruction: 'AI-generated troubleshooting instruction would go here',
      options: [
        {
          id: 'option_1',
          text: 'Option 1 from AI response',
          nextStepId: 'next_step'
        },
        {
          id: 'option_2', 
          text: 'Option 2 from AI response',
          nextStepId: 'alternate_step'
        }
      ]
    };
  }
  
  /**
   * DEFAULT BEGINNER STEP - Fallback for beginners
   */
  private getDefaultBeginnerStep(request: any): TroubleshootingStep {
    return {
      id: 'default_beginner',
      stepNumber: 1,
      instruction: `Let's start with the basics that are commonly missed. Before we diagnose the ${request.issue}, we need to verify these fundamentals:`,
      options: [
        {
          id: 'power_on',
          text: 'Main power disconnect is ON',
          nextStepId: 'check_circuit_breakers'
        },
        {
          id: 'no_main_power',
          text: 'No main power to RV',
          nextStepId: 'check_power_source'
        },
        {
          id: 'unsure_power_location',
          text: 'Not sure where main power controls are',
          diagnosticAction: 'Guide to power panel location'
        }
      ],
      safetyWarning: '⚠️ Always ensure power is OFF at the component before inspection'
    };
  }
  
  /**
   * DEFAULT MASTER STEP - Fallback for masters
   */
  private getDefaultMasterStep(request: any): TroubleshootingStep {
    return {
      id: 'default_master',
      stepNumber: 1,
      instruction: `Starting at the failure point. For "${request.issue}", let's immediately check the failed component:`,
      requiresReading: {
        type: 'voltage',
        location: 'At the failed component terminals',
        expectedRange: 'Check manual for specifications',
        tools: ['DMM', 'Test leads']
      },
      options: [
        {
          id: 'voltage_present',
          text: 'Voltage present at component',
          nextStepId: 'component_internal_test'
        },
        {
          id: 'no_voltage',
          text: 'No voltage at component',
          nextStepId: 'trace_upstream_power'
        }
      ]
    };
  }
  
  /**
   * Generate resolution step when issue is solved
   */
  private async generateResolutionStep(session: TroubleshootingSession, selectedOption: any): Promise<TroubleshootingStep> {
    return {
      id: 'resolved',
      stepNumber: session.stepHistory.length + 1,
      instruction: `Great! It looks like we've resolved the issue with your ${session.equipmentInfo.type}. The solution was: ${selectedOption.text}`,
      options: [
        {
          id: 'confirm_resolution',
          text: 'Yes, the issue is resolved',
          nextStepId: 'COMPLETE'
        },
        {
          id: 'still_issues',
          text: 'Still having problems',
          nextStepId: 'continue_troubleshooting'
        }
      ]
    };
  }
  
  /**
   * Generate escalation step for complex issues
   */
  private async generateEscalationStep(session: TroubleshootingSession, selectedOption: any): Promise<TroubleshootingStep> {
    return {
      id: 'escalated',
      stepNumber: session.stepHistory.length + 1,
      instruction: 'This issue requires professional service. Based on our troubleshooting, here\'s what to tell the technician:',
      options: [
        {
          id: 'schedule_service',
          text: 'Schedule professional service',
          nextStepId: 'COMPLETE'
        }
      ]
    };
  }
  
  /**
   * Get active session for user
   */
  getActiveSession(userId: string): TroubleshootingSession | null {
    for (const [sessionId, session] of this.activeSessions) {
      if (session.userId === userId && session.status === 'active_troubleshooting') {
        return session;
      }
    }
    return null;
  }
}

// Export singleton instance
export const interactiveTroubleshooting = new InteractiveTroubleshootingService();