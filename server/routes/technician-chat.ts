import { Router, Request, Response, NextFunction } from 'express';
import { technicianLLM } from '../services/technician-llm';
import multer from 'multer';
import { evidenceLedger } from '../services/evidence-ledger';
import { inputValidationService } from '../services/input-validation-service';

// Extend Express Request type for session
interface SessionRequest extends Request {
  session?: any;
}

const router = Router();
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// Middleware to check authentication (hardcoded for now like /api/auth/user)
const requireAuth = (req: any, res: any, next: any) => {
  // For now, use the same hardcoded user as /api/auth/user endpoint
  req.user = { 
    id: '1756341735989', 
    username: 'Lucas.Reynolds', 
    role: 'super_admin' 
  };
  next();
};

// Get user role from session
const getUserRole = (user: any): string => {
  if (user.role === 'super_admin') return 'super_admin';
  if (user.role === 'admin') return 'admin';
  return 'technician';
};

/**
 * Main chat endpoint - handles all conversational interactions
 */
router.post('/chat', requireAuth, upload.array('attachments', 10), async (req: any, res) => {
  try {
    const { message } = req.body;
    const userId = req.user.id;
    const role = getUserRole(req.user);
    
    // Process any file attachments
    const attachments = req.files ? (req.files as Express.Multer.File[]).map(file => ({
      filename: file.originalname,
      content: file.buffer.toString('utf-8'),
      mimetype: file.mimetype,
      size: file.size
    })) : undefined;

    console.log(`💬 Chat request from ${userId} (${role}): ${message}`);
    if (attachments) {
      console.log(`📎 With ${attachments.length} attachments`);
    }

    // ENHANCED: Validate input before processing with LLMs/databases
    const validation = inputValidationService.validateInput(message);
    
    if (!validation.isValid) {
      // Return clarifying questions instead of error
      const clarificationResponse = inputValidationService.formatMissingInfoResponse(validation);
      console.log(`🔍 INPUT VALIDATION: Requesting clarification - Missing: ${validation.missingInfo.join(', ')}`);
      
      return res.json({
        message: clarificationResponse,
        needsMoreInfo: true,
        missingInfo: validation.missingInfo,
        suggestions: validation.suggestedInputs
      });
    }

    console.log(`✅ INPUT VALIDATION: Complete - Processing with validated input`);
    
    // Process message through Technician LLM with validated input
    const response = await technicianLLM.processMessage(
      userId,
      message,
      role,
      attachments,
      validation.validatedInput
    );

    // Log interaction
    console.log('💬 Chat interaction logged:', {
      action: 'chat_interaction',
      userId,
      role,
      message: message.substring(0, 100) + '...',
      timestamp: new Date()
    });

    res.json(response);
  } catch (error: any) {
    console.error('Chat processing error:', error);
    res.status(500).json({ 
      message: 'I encountered an error processing your request. Please try again.',
      error: error.message 
    });
  }
});

/**
 * Get conversation history
 */
router.get('/chat/history', requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const history = technicianLLM.getConversationHistory(userId);
    
    res.json({ history });
  } catch (error: any) {
    console.error('History retrieval error:', error);
    res.status(500).json({ error: 'Failed to retrieve conversation history' });
  }
});

/**
 * Clear conversation context
 */
router.post('/chat/clear', requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    technicianLLM.clearContext(userId);
    
    console.log('🔄 Chat context cleared for user:', userId);
    
    res.json({ message: 'Conversation context cleared. Starting fresh!' });
  } catch (error: any) {
    console.error('Context clear error:', error);
    res.status(500).json({ error: 'Failed to clear context' });
  }
});

/**
 * Quick actions endpoint for common tasks
 */
router.post('/chat/quick-action', requireAuth, async (req: any, res) => {
  try {
    const { action } = req.body;
    const userId = req.user.id;
    const role = getUserRole(req.user);
    
    let message = '';
    
    switch (action) {
      case 'system_status':
        message = 'Show me the system status';
        break;
      case 'recent_sops':
        message = 'Show me recent SOPs';
        break;
      case 'upload_manual':
        message = 'I want to upload a manual';
        break;
      case 'troubleshoot':
        message = 'I need help troubleshooting an issue';
        break;
      case 'generate_sop':
        message = 'Generate a new SOP';
        break;
      default:
        return res.status(400).json({ error: 'Unknown quick action' });
    }
    
    const response = await technicianLLM.processMessage(userId, message, role);
    res.json(response);
  } catch (error: any) {
    console.error('Quick action error:', error);
    res.status(500).json({ error: 'Failed to process quick action' });
  }
});

/**
 * Training mode endpoint (admin only)
 */
router.post('/chat/train', requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const role = getUserRole(req.user);
    
    if (role !== 'admin' && role !== 'super_admin') {
      return res.status(403).json({ error: 'Training requires admin privileges' });
    }
    
    const { correction, sopId, feedback } = req.body;
    
    const message = `Training correction for ${sopId}: ${correction}. Feedback: ${feedback}`;
    const response = await technicianLLM.processMessage(userId, message, role);
    
    console.log('📚 Training correction logged:', {
      action: 'training_correction',
      userId,
      sopId,
      correction: correction.substring(0, 100) + '...',
      feedback: feedback.substring(0, 50) + '...',
      timestamp: new Date()
    });
    
    res.json(response);
  } catch (error: any) {
    console.error('Training error:', error);
    res.status(500).json({ error: 'Failed to process training' });
  }
});

export { router as default };