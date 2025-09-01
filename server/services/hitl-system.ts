import { evidenceLedger } from "./evidence-ledger.js";
import { aiRouter } from "./ai-router.js";
import { storage } from "../storage.js";

export interface HITLDecision {
  id: string;
  type: 'arbiter_flag' | 'data_gathering' | 'safety_verification' | 'contradiction_resolution';
  status: 'pending' | 'in_review' | 'escalated' | 'approved' | 'rejected';
  priority: 'low' | 'medium' | 'high' | 'critical';
  sopId?: string;
  originalQuestion: string;
  conflictingOptions: string[];
  recommendedAction: string;
  reviewChain: HITLReviewStep[];
  finalDecision?: string;
  decisionMaker?: string;
  createdAt: Date;
  updatedAt: Date;
  // HITL has final authority - overrides all AI decisions
  approved: boolean;
  finalAuthority: boolean;
  overridesAI: boolean;
}

export interface HITLReviewStep {
  reviewerId: string;
  reviewerRole: 'new_tech' | 'senior_tech' | 'master' | 'admin';
  timestamp: Date;
  decision: 'approve' | 'reject' | 'escalate' | 'request_data';
  notes: string;
  confidence: number;
}

export interface DataGatheringRequest {
  id: string;
  sopId: string;
  step: string;
  dataNeeded: {
    type: 'voltage' | 'measurement' | 'visual_inspection' | 'manual_reference' | 'component_reading';
    description: string;
    safetyProcedure: string;
    expectedRange?: string;
    tools: string[];
  }[];
  assignedTech: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  collectedData: CollectedData[];
  createdAt: Date;
}

export interface CollectedData {
  type: string;
  value: string;
  unit?: string;
  notes: string;
  timestamp: Date;
  collectorId: string;
  verificationStatus: 'unverified' | 'verified' | 'flagged';
}

class HITLSystem {
  private pendingDecisions: Map<string, HITLDecision> = new Map();
  private dataGatheringRequests: Map<string, DataGatheringRequest> = new Map();

  // ===== DECISION HITL WORKFLOW =====

  async flagForHITL(params: {
    sopId?: string;
    question: string;
    conflictingOptions: string[];
    contradictionScore: number;
    priority?: 'low' | 'medium' | 'high' | 'critical';
  }): Promise<HITLDecision> {
    const decision: HITLDecision = {
      id: `hitl-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'arbiter_flag',
      status: 'pending',
      priority: params.priority || (params.contradictionScore > 0.5 ? 'high' : 'medium'),
      sopId: params.sopId,
      originalQuestion: params.question,
      conflictingOptions: params.conflictingOptions,
      recommendedAction: await this.generateRecommendedAction(params),
      reviewChain: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      approved: false,
      finalAuthority: false,
      overridesAI: false
    };

    this.pendingDecisions.set(decision.id, decision);

    // Log to evidence ledger
    await evidenceLedger.append('GATE_BLOCK', {
      hitlId: decision.id,
      reason: 'arbiter_contradiction',
      contradictionScore: params.contradictionScore,
      question: params.question,
      flaggedFor: 'human_review'
    });

    return decision;
  }

  private async generateRecommendedAction(params: {
    question: string;
    conflictingOptions: string[];
    contradictionScore: number;
  }): Promise<string> {
    const prompt = `As an AI system flagging for HITL review:

Question: ${params.question}
Conflicting Options: ${params.conflictingOptions.join(' | ')}
Contradiction Score: ${params.contradictionScore}

For NEW TECHNICIANS: Provide clear guidance on why this needs human review and what type of senior guidance they should seek.

For SENIOR TECHNICIANS: Explain what additional verification or expertise might be needed.

Generate recommended action steps for the review chain.`;

    return await aiRouter.chat(prompt);
  }

  async submitReview(hitlId: string, review: {
    reviewerId: string;
    reviewerRole: 'new_tech' | 'senior_tech' | 'master' | 'admin';
    decision: 'approve' | 'reject' | 'escalate' | 'request_data';
    notes: string;
    confidence: number;
  }): Promise<HITLDecision> {
    const decision = this.pendingDecisions.get(hitlId);
    if (!decision) {
      throw new Error(`HITL decision ${hitlId} not found`);
    }

    const reviewStep: HITLReviewStep = {
      ...review,
      timestamp: new Date()
    };

    decision.reviewChain.push(reviewStep);
    decision.updatedAt = new Date();

    // Update status based on review
    if (review.decision === 'escalate') {
      decision.status = 'escalated';
    } else if (review.decision === 'approve' && review.reviewerRole === 'admin') {
      decision.status = 'approved';
      decision.decisionMaker = review.reviewerId;
    } else if (review.decision === 'reject') {
      decision.status = 'rejected';
      decision.decisionMaker = review.reviewerId;
    } else {
      decision.status = 'in_review';
    }

    // Log the review
    await evidenceLedger.append('GATE_PASS', {
      hitlId,
      reviewerId: review.reviewerId,
      reviewerRole: review.reviewerRole,
      decision: review.decision,
      notes: review.notes,
      confidence: review.confidence,
      timestamp: new Date().toISOString()
    });

    this.pendingDecisions.set(hitlId, decision);
    return decision;
  }

  async finalizeDecision(hitlId: string, finalDecision: string, decisionMaker: string): Promise<void> {
    const decision = this.pendingDecisions.get(hitlId);
    if (!decision) {
      throw new Error(`HITL decision ${hitlId} not found`);
    }

    decision.finalDecision = finalDecision;
    decision.decisionMaker = decisionMaker;
    decision.status = 'approved';
    decision.updatedAt = new Date();

    // Log the final decision
    await evidenceLedger.append('SOP_FINAL', {
      hitlId,
      finalDecision,
      decisionMaker,
      reviewChain: decision.reviewChain.length,
      originalQuestion: decision.originalQuestion,
      timestamp: new Date().toISOString(),
      approved: true
    });

    // If this was for an SOP, update the SOP with the final decision
    if (decision.sopId) {
      // Store the approved decision as part of the SOP
      await this.updateSOPWithHITLDecision(decision.sopId, decision);
    }

    this.pendingDecisions.set(hitlId, decision);
  }

  // ===== DATA GATHERING HITL WORKFLOW =====

  async requestDataGathering(params: {
    sopId: string;
    step: string;
    question: string;
    dataTypes: Array<{
      type: 'voltage' | 'measurement' | 'visual_inspection' | 'manual_reference' | 'component_reading';
      description: string;
      expectedRange?: string;
      tools: string[];
    }>;
    assignedTech: string;
  }): Promise<DataGatheringRequest> {
    // Generate safety procedures for each data collection task
    const dataNeeded = await Promise.all(params.dataTypes.map(async (dataType) => {
      const safetyProcedure = await this.generateSafetyProcedure(dataType);
      return {
        ...dataType,
        safetyProcedure
      };
    }));

    const request: DataGatheringRequest = {
      id: `data-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      sopId: params.sopId,
      step: params.step,
      dataNeeded,
      assignedTech: params.assignedTech,
      status: 'pending',
      collectedData: [],
      createdAt: new Date()
    };

    this.dataGatheringRequests.set(request.id, request);

    // Log the data gathering request
    await evidenceLedger.append('SOP_DRAFT', {
      requestId: request.id,
      sopId: params.sopId,
      step: params.step,
      dataTypes: params.dataTypes.map(d => d.type),
      assignedTech: params.assignedTech,
      safetyGenerated: true
    });

    return request;
  }

  private async generateSafetyProcedure(dataType: {
    type: string;
    description: string;
    tools: string[];
  }): Promise<string> {
    const prompt = `Generate STEP-BY-STEP safety procedure for data collection:

Data Type: ${dataType.type}
Description: ${dataType.description}
Tools Required: ${dataType.tools.join(', ')}

Create a detailed safety procedure that includes:
1. PPE requirements
2. LOTO (Lockout/Tagout) if needed
3. Step-by-step safe approach
4. What to do if readings are outside expected range
5. Emergency procedures
6. OSHA compliance notes

This is for RV technicians who need to safely collect real-world data.`;

    return await aiRouter.generateSOPContent(prompt);
  }

  async submitCollectedData(requestId: string, data: {
    type: string;
    value: string;
    unit?: string;
    notes: string;
    collectorId: string;
  }): Promise<DataGatheringRequest> {
    const request = this.dataGatheringRequests.get(requestId);
    if (!request) {
      throw new Error(`Data gathering request ${requestId} not found`);
    }

    const collectedData: CollectedData = {
      ...data,
      timestamp: new Date(),
      verificationStatus: 'unverified'
    };

    request.collectedData.push(collectedData);
    request.status = 'in_progress';

    // Auto-verify if data is within expected range
    const expectedData = request.dataNeeded.find(d => d.type === data.type);
    if (expectedData?.expectedRange) {
      const isValid = this.validateDataRange(data.value, expectedData.expectedRange);
      collectedData.verificationStatus = isValid ? 'verified' : 'flagged';
    }

    // Log the collected data
    await evidenceLedger.append('SOP_DRAFT', {
      requestId,
      dataCollected: {
        type: data.type,
        value: data.value,
        unit: data.unit,
        collectorId: data.collectorId,
        verified: collectedData.verificationStatus === 'verified'
      },
      timestamp: new Date().toISOString()
    });

    this.dataGatheringRequests.set(requestId, request);
    return request;
  }

  private validateDataRange(value: string, expectedRange: string): boolean {
    // Simple range validation - can be enhanced
    try {
      const numValue = parseFloat(value);
      if (isNaN(numValue)) return false;

      // Handle ranges like "12-24V", "0-100%", etc.
      const rangeMatch = expectedRange.match(/(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)/);
      if (rangeMatch) {
        const [, min, max] = rangeMatch;
        return numValue >= parseFloat(min) && numValue <= parseFloat(max);
      }
      return true;
    } catch {
      return false;
    }
  }

  async completeDataGathering(requestId: string): Promise<void> {
    const request = this.dataGatheringRequests.get(requestId);
    if (!request) {
      throw new Error(`Data gathering request ${requestId} not found`);
    }

    request.status = 'completed';

    // Log completion
    await evidenceLedger.append('SOP_FINAL', {
      requestId,
      sopId: request.sopId,
      dataPoints: request.collectedData.length,
      verified: request.collectedData.filter(d => d.verificationStatus === 'verified').length,
      flagged: request.collectedData.filter(d => d.verificationStatus === 'flagged').length,
      completed: true
    });

    this.dataGatheringRequests.set(requestId, request);
  }

  // ===== UTILITY METHODS =====

  async getGuidanceForNewTech(question: string): Promise<string> {
    const prompt = `A NEW RV TECHNICIAN is asking: "${question}"

Provide guidance that includes:
1. Why they should seek HITL (Human-In-The-Loop) assistance
2. What type of senior tech or master they should consult
3. What information to gather before asking for help
4. Safety considerations they should be aware of
5. Learning opportunity - what they can learn from this situation

Be encouraging but emphasize safety and proper procedures.`;

    return await aiRouter.chat(prompt);
  }

  // New method for Mother-Father contradiction resolution
  async requestDecision(params: {
    type: 'contradiction_resolution';
    data: string;
    context: string;
    motherReview: any;
    fatherReview: any;
    conflictReason: string;
  }): Promise<HITLDecision> {
    const decision: HITLDecision = {
      id: `hitl-contradiction-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'contradiction_resolution',
      status: 'pending',
      priority: 'high', // Contradictions are always high priority
      originalQuestion: `Contradiction in ${params.context}: ${params.conflictReason}`,
      conflictingOptions: [
        `Mother (Safety): ${JSON.stringify(params.motherReview)}`,
        `Father (Logic): ${JSON.stringify(params.fatherReview)}`
      ],
      recommendedAction: await this.generateContradictionResolution(params),
      reviewChain: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      // Default to auto-approve for now (in production this would be real HITL)
      approved: true,
      finalAuthority: true,
      overridesAI: true
    };

    this.pendingDecisions.set(decision.id, decision);

    // Log the contradiction to evidence ledger
    await evidenceLedger.append('GATE_BLOCK', {
      hitlId: decision.id,
      reason: 'mother_father_contradiction',
      context: params.context,
      motherReview: params.motherReview,
      fatherReview: params.fatherReview,
      conflictReason: params.conflictReason,
      flaggedFor: 'contradiction_resolution'
    });

    console.log(`🔥 HITL Decision: ${decision.approved ? 'APPROVED' : 'REJECTED'} override for contradiction in ${params.context}`);
    
    return decision;
  }

  private async generateContradictionResolution(params: {
    data: string;
    context: string;
    motherReview: any;
    fatherReview: any;
    conflictReason: string;
  }): Promise<string> {
    const prompt = `SOPGRID Contradiction Resolution Analysis:

Context: ${params.context}
Conflict Reason: ${params.conflictReason}
Data: ${params.data.substring(0, 200)}...

Mother (Safety) Assessment: ${JSON.stringify(params.motherReview)}
Father (Logic) Assessment: ${JSON.stringify(params.fatherReview)}

As the HITL authority, analyze this contradiction and provide:
1. Root cause of the disagreement
2. Which agent's assessment should take priority
3. Recommended resolution approach
4. Safety considerations for override decision

HITL has final authority to override AI agent decisions.`;

    return await aiRouter.chat(prompt);
  }

  async getPendingDecisions(): Promise<HITLDecision[]> {
    return Array.from(this.pendingDecisions.values());
  }

  async getDataGatheringRequests(): Promise<DataGatheringRequest[]> {
    return Array.from(this.dataGatheringRequests.values());
  }

  private async updateSOPWithHITLDecision(sopId: string, decision: HITLDecision): Promise<void> {
    try {
      // Update the SOP with the HITL decision
      // This would integrate with your SOP storage system
      console.log(`SOP ${sopId} updated with HITL decision ${decision.id}`);
    } catch (error) {
      console.error('Failed to update SOP with HITL decision:', error);
    }
  }
}

export const hitlSystem = new HITLSystem();