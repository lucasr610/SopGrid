import zlib from 'zlib';
import { promisify } from 'util';

const gzip = promisify(zlib.gzip);
const deflate = promisify(zlib.deflate);

export class ResponseOptimizer {
  // Compress large responses
  static async compressResponse(data: any, acceptEncoding: string = ''): Promise<{
    data: Buffer | string;
    encoding?: string;
  }> {
    const jsonString = JSON.stringify(data);
    
    // Don't compress small responses (< 1KB)
    if (jsonString.length < 1024) {
      return { data: jsonString };
    }

    // Check what compression the client accepts
    if (acceptEncoding.includes('gzip')) {
      const compressed = await gzip(jsonString);
      return { data: compressed, encoding: 'gzip' };
    }
    
    if (acceptEncoding.includes('deflate')) {
      const compressed = await deflate(jsonString);
      return { data: compressed, encoding: 'deflate' };
    }

    return { data: jsonString };
  }

  // Paginate large result sets
  static paginate<T>(
    items: T[],
    page: number = 1,
    limit: number = 20
  ): {
    data: T[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  } {
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const totalPages = Math.ceil(items.length / limit);

    return {
      data: items.slice(startIndex, endIndex),
      pagination: {
        page,
        limit,
        total: items.length,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };
  }

  // Filter sensitive data from responses
  static sanitizeResponse(data: any, sensitiveFields: string[] = []): any {
    const defaultSensitiveFields = [
      'password',
      'apiKey',
      'secret',
      'token',
      'creditCard',
      'ssn',
      'privateKey'
    ];

    const allSensitiveFields = [...defaultSensitiveFields, ...sensitiveFields];

    const sanitize = (obj: any): any => {
      if (Array.isArray(obj)) {
        return obj.map(item => sanitize(item));
      }

      if (obj && typeof obj === 'object') {
        const sanitized: any = {};
        
        for (const [key, value] of Object.entries(obj)) {
          const lowerKey = key.toLowerCase();
          
          if (allSensitiveFields.some(field => lowerKey.includes(field.toLowerCase()))) {
            sanitized[key] = '[REDACTED]';
          } else if (typeof value === 'object') {
            sanitized[key] = sanitize(value);
          } else {
            sanitized[key] = value;
          }
        }
        
        return sanitized;
      }

      return obj;
    };

    return sanitize(data);
  }

  // Create consistent API response format
  static formatResponse(
    success: boolean,
    data?: any,
    message?: string,
    metadata?: any
  ): {
    success: boolean;
    timestamp: string;
    data?: any;
    message?: string;
    metadata?: any;
  } {
    return {
      success,
      timestamp: new Date().toISOString(),
      ...(data !== undefined && { data }),
      ...(message && { message }),
      ...(metadata && { metadata })
    };
  }

  // Stream large responses
  static createStreamResponse(data: any[], chunkSize: number = 100): ReadableStream {
    let index = 0;

    return new ReadableStream({
      async pull(controller) {
        const chunk = data.slice(index, index + chunkSize);
        
        if (chunk.length === 0) {
          controller.close();
          return;
        }

        controller.enqueue(JSON.stringify(chunk) + '\n');
        index += chunkSize;
      }
    });
  }

  // Add ETag support for caching
  static generateETag(data: any): string {
    const crypto = require('crypto');
    const content = JSON.stringify(data);
    return crypto.createHash('md5').update(content).digest('hex');
  }

  // Response time tracking
  static trackResponseTime(startTime: number): {
    duration: number;
    formatted: string;
  } {
    const duration = Date.now() - startTime;
    const formatted = duration < 1000 
      ? `${duration}ms`
      : `${(duration / 1000).toFixed(2)}s`;

    return { duration, formatted };
  }
}

// Middleware for automatic response optimization
export const optimizeResponse = (options: {
  compress?: boolean;
  sanitize?: boolean;
  paginate?: boolean;
  format?: boolean;
} = {}) => {
  return async (req: any, res: any, next: any) => {
    const originalJson = res.json;
    const startTime = Date.now();

    res.json = async function(data: any) {
      try {
        let optimized = data;

        // Sanitize sensitive data
        if (options.sanitize !== false) {
          optimized = ResponseOptimizer.sanitizeResponse(optimized);
        }

        // Apply pagination if requested
        if (options.paginate && Array.isArray(optimized) && req.query.page) {
          const page = parseInt(req.query.page) || 1;
          const limit = parseInt(req.query.limit) || 20;
          optimized = ResponseOptimizer.paginate(optimized, page, limit);
        }

        // Format response
        if (options.format !== false) {
          const responseTime = ResponseOptimizer.trackResponseTime(startTime);
          optimized = ResponseOptimizer.formatResponse(
            true,
            optimized,
            undefined,
            { responseTime: responseTime.formatted }
          );
        }

        // Add ETag
        const etag = ResponseOptimizer.generateETag(optimized);
        res.setHeader('ETag', etag);

        // Check if client has cached version
        if (req.headers['if-none-match'] === etag) {
          return res.status(304).end();
        }

        // Compress if enabled and supported
        if (options.compress !== false) {
          const acceptEncoding = req.headers['accept-encoding'] || '';
          const compressed = await ResponseOptimizer.compressResponse(optimized, acceptEncoding);
          
          if (compressed.encoding) {
            res.setHeader('Content-Encoding', compressed.encoding);
            return res.send(compressed.data);
          }
        }

        return originalJson.call(this, optimized);
      } catch (error) {
        console.error('Response optimization error:', error);
        return originalJson.call(this, data);
      }
    };

    next();
  };
};

export default ResponseOptimizer;