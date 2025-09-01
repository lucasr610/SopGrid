/**
 * UNIFIED CHAT & TROUBLESHOOTING INTEGRATION
 * 
 * Integrates chat service and troubleshooting tree generation
 * through the Unified System Orchestrator with full safety gates
 */

import { unifiedSystemOrchestrator } from './unified-system-orchestrator';

/**
 * UNIFIED CHAT SERVICE - Routes through orchestrator with safety gates
 */
export async function processUnifiedChatMessage(request: {
  message: string;
  userId: string;
  sessionId: string;
  context?: any;
}): Promise<any> {
  console.log('💬 UNIFIED CHAT: Processing message through SOPGRID orchestrator...');
  
  // Route through unified system orchestrator for full integration
  return await unifiedSystemOrchestrator.processChatMessage(request);
}

/**
 * UNIFIED TROUBLESHOOTING - Routes through orchestrator with safety gates
 */
export async function generateUnifiedTroubleshootingTree(request: {
  failureDescription: string;
  component?: string;
  symptoms: string[];
  userId: string;
}): Promise<any> {
  console.log('🔧 UNIFIED TROUBLESHOOTING: Generating tree through SOPGRID orchestrator...');
  
  // Route through unified system orchestrator for full integration
  return await unifiedSystemOrchestrator.generateTroubleshootingTree(request);
}

/**
 * UNIFIED SOP GENERATION - Routes through orchestrator with all safety gates
 */
export async function generateUnifiedSOP(request: {
  topic: string;
  system: string;
  component: string;
  complexity?: 'basic' | 'intermediate' | 'advanced' | 'expert';
  userId: string;
}): Promise<any> {
  console.log('📋 UNIFIED SOP: Generating through SOPGRID orchestrator with full safety validation...');
  
  // Route through unified system orchestrator for coordinated multi-agent workflow
  return await unifiedSystemOrchestrator.processWorkflow({
    type: 'sop_generation',
    userId: request.userId,
    data: request,
    priority: 'high'
  });
}

// Export unified services
export const unifiedChatTroubleshooter = {
  processChat: processUnifiedChatMessage,
  generateTroubleshootingTree: generateUnifiedTroubleshootingTree,
  generateSOP: generateUnifiedSOP
};