import { z } from 'zod';
import DOMPurify from 'isomorphic-dompurify';

// Security-focused input validation service
export class InputValidator {
  // Prevent SQL injection by validating and sanitizing inputs
  static sanitizeSQLInput(input: string): string {
    // Remove or escape dangerous SQL characters
    return input
      .replace(/['";\\]/g, '') // Remove quotes and backslashes
      .replace(/--/g, '') // Remove SQL comments
      .replace(/\/\*/g, '') // Remove multi-line comments
      .replace(/\*\//g, '')
      .replace(/\b(DROP|DELETE|INSERT|UPDATE|ALTER|CREATE|EXEC|EXECUTE)\b/gi, '') // Remove SQL keywords
      .trim();
  }

  // Prevent XSS attacks by sanitizing HTML content
  static sanitizeHTML(input: string): string {
    return DOMPurify.sanitize(input, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li', 'code', 'pre'],
      ALLOWED_ATTR: []
    });
  }

  // Validate and sanitize file uploads
  static validateFileUpload(file: any): { valid: boolean; error?: string } {
    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
    const ALLOWED_TYPES = [
      'application/pdf',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (!file) {
      return { valid: false, error: 'No file provided' };
    }

    if (file.size > MAX_FILE_SIZE) {
      return { valid: false, error: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit` };
    }

    if (!ALLOWED_TYPES.includes(file.mimetype)) {
      return { valid: false, error: 'Invalid file type. Only PDF, TXT, DOC, and DOCX files are allowed' };
    }

    // Check for suspicious file extensions
    const filename = file.originalname || file.name || '';
    const suspiciousExtensions = ['.exe', '.bat', '.cmd', '.sh', '.ps1', '.vbs', '.js', '.jar'];
    if (suspiciousExtensions.some(ext => filename.toLowerCase().endsWith(ext))) {
      return { valid: false, error: 'Potentially dangerous file type detected' };
    }

    return { valid: true };
  }

  // Validate SOP generation request
  static validateSOPRequest(data: any): { valid: boolean; sanitized?: any; error?: string } {
    const schema = z.object({
      topic: z.string().min(3).max(200),
      category: z.enum(['maintenance', 'repair', 'installation', 'troubleshooting', 'safety']),
      urgency: z.enum(['low', 'medium', 'high', 'critical']),
      equipment: z.string().max(100).optional(),
      manufacturer: z.string().max(100).optional(),
      model: z.string().max(100).optional(),
      context: z.string().max(5000).optional()
    });

    try {
      const validated = schema.parse(data);
      
      // Additional sanitization
      const sanitized = {
        ...validated,
        topic: this.sanitizeSQLInput(validated.topic),
        equipment: validated.equipment ? this.sanitizeSQLInput(validated.equipment) : undefined,
        manufacturer: validated.manufacturer ? this.sanitizeSQLInput(validated.manufacturer) : undefined,
        model: validated.model ? this.sanitizeSQLInput(validated.model) : undefined,
        context: validated.context ? this.sanitizeHTML(validated.context) : undefined
      };

      return { valid: true, sanitized };
    } catch (error: any) {
      return { valid: false, error: error.message };
    }
  }

  // Validate chat message
  static validateChatMessage(message: string): { valid: boolean; sanitized?: string; error?: string } {
    if (!message || typeof message !== 'string') {
      return { valid: false, error: 'Invalid message format' };
    }

    if (message.length > 2000) {
      return { valid: false, error: 'Message exceeds maximum length of 2000 characters' };
    }

    // Check for potential command injection attempts
    const dangerousPatterns = [
      /\$\{.*\}/g, // Template literals
      /`.*`/g, // Backticks
      /<script.*?>.*?<\/script>/gi, // Script tags
      /javascript:/gi, // JavaScript protocol
      /on\w+\s*=/gi // Event handlers
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(message)) {
        return { valid: false, error: 'Message contains potentially dangerous content' };
      }
    }

    const sanitized = this.sanitizeHTML(message);
    return { valid: true, sanitized };
  }

  // Validate API key format
  static validateAPIKey(key: string, service: string): boolean {
    const patterns: Record<string, RegExp> = {
      openai: /^sk-[a-zA-Z0-9]{48}$/,
      gemini: /^[a-zA-Z0-9_-]{39}$/,
      anthropic: /^sk-ant-[a-zA-Z0-9]{95}$/
    };

    const pattern = patterns[service.toLowerCase()];
    return pattern ? pattern.test(key) : false;
  }

  // Rate limit key validation
  static validateRateLimitKey(key: string): string {
    // Ensure the key is safe to use as a map key
    return key.replace(/[^a-zA-Z0-9_.-]/g, '_').substring(0, 100);
  }
}

export default InputValidator;