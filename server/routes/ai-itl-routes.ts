/**
 * AI-ITL ROUTES - Handle user interactions for information gathering
 */

import { Router } from 'express';
import { aiITLInformationGatherer } from '../services/ai-itl-information-gatherer';
import { unifiedSystemOrchestrator } from '../services/unified-system-orchestrator';

export const aiITLRoutes = Router();

/**
 * Get pending information request for user
 */
aiITLRoutes.get('/pending/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const pendingRequest = aiITLInformationGatherer.getPendingRequest(userId);
    
    if (!pendingRequest) {
      return res.json({
        success: true,
        hasPendingRequest: false
      });
    }
    
    res.json({
      success: true,
      hasPendingRequest: true,
      request: {
        id: pendingRequest.id,
        sopContext: pendingRequest.sopContext,
        requestedInfo: pendingRequest.requestedInfo,
        status: pendingRequest.status,
        completedFields: Object.keys(pendingRequest.responses)
      }
    });
    
  } catch (error) {
    console.error('🚨 AI-ITL: Failed to get pending request:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve information request'
    });
  }
});

/**
 * Submit response to information request
 */
aiITLRoutes.post('/submit-response', async (req, res) => {
  try {
    const { requestId, fieldId, value } = req.body;
    
    if (!requestId || !fieldId || value === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: requestId, fieldId, value'
      });
    }
    
    const result = await aiITLInformationGatherer.submitResponse(requestId, fieldId, value);
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error || 'Invalid response'
      });
    }
    
    if (result.completed) {
      // Information gathering is complete - continue with SOP generation
      const completedInfo = aiITLInformationGatherer.getCompletedInformation(requestId);
      
      res.json({
        success: true,
        completed: true,
        message: 'Information gathering completed',
        nextStep: 'generate_sop',
        completedInformation: completedInfo
      });
    } else {
      // More information needed
      res.json({
        success: true,
        completed: false,
        nextField: result.nextField,
        message: 'Response recorded, more information needed'
      });
    }
    
  } catch (error) {
    console.error('🚨 AI-ITL: Failed to submit response:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process response'
    });
  }
});

/**
 * Continue SOP generation after information gathering
 */
aiITLRoutes.post('/continue-sop-generation', async (req, res) => {
  try {
    const { requestId, userId, originalRequest } = req.body;
    
    if (!requestId || !userId || !originalRequest) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }
    
    // Get the completed information
    const completedInfo = aiITLInformationGatherer.getCompletedInformation(requestId);
    
    if (!completedInfo) {
      return res.status(400).json({
        success: false,
        error: 'Information request not completed'
      });
    }
    
    // Enhance the original request with specific information
    const enhancedRequest = {
      ...originalRequest,
      userId,
      specificInformation: completedInfo,
      informationGathered: true
    };
    
    // Generate SOP with specific information
    const sopResult = await unifiedSystemOrchestrator.generateSOP(enhancedRequest);
    
    res.json({
      success: true,
      sopResult,
      usedInformation: completedInfo
    });
    
  } catch (error) {
    console.error('🚨 AI-ITL: Failed to continue SOP generation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate SOP'
    });
  }
});

/**
 * Skip information gathering and proceed with general SOP
 */
aiITLRoutes.post('/skip-information', async (req, res) => {
  try {
    const { requestId, userId, originalRequest } = req.body;
    
    // Mark request as skipped and proceed with general SOP
    const sopResult = await unifiedSystemOrchestrator.generateSOP({
      ...originalRequest,
      userId,
      skipInformationGathering: true
    });
    
    res.json({
      success: true,
      sopResult,
      message: 'Generated general SOP without specific equipment information'
    });
    
  } catch (error) {
    console.error('🚨 AI-ITL: Failed to skip information gathering:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate SOP'
    });
  }
});