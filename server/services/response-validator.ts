// Universal Response Validator for SOPGRID
// ALL outgoing information must be validated by Mother and Father

import { safetyLogicValidator } from '../middleware/safety-logic-validator.js';

export class ResponseValidator {
  // Validate ALL responses before sending to client
  validateAllResponses() {
    return (req: any, res: any, next: any) => {
      const originalSend = res.json;
      
      res.json = async function(data: any) {
        try {
          // ALL data must be validated by Mother (Safety) and Father (Logic)
          console.log(`🔍 Validating response for: ${req.path}`);
          const validatedData = await safetyLogicValidator.validateResponse(
            data, 
            `${req.method} ${req.path}`
          );
          
          return originalSend.call(this, validatedData);
        } catch (error) {
          console.error('Response validation failed:', error);
          return originalSend.call(this, {
            error: 'Response validation failed',
            message: 'Information could not be validated for safety and logic'
          });
        }
      };
      
      next();
    };
  }
}

export const responseValidator = new ResponseValidator();