import { Request, Response, NextFunction } from 'express';
import { IncomingMessage } from 'http';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  message?: string;
  skipSuccessfulRequests?: boolean;
  keyGenerator?: (req: Request) => string;
}

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

class MemoryStore {
  private store: RateLimitStore = {};
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      Object.keys(this.store).forEach(key => {
        if (this.store[key].resetTime <= now) {
          delete this.store[key];
        }
      });
    }, 60000);
  }

  hit(key: string, windowMs: number): { count: number; resetTime: number } {
    const now = Date.now();
    const resetTime = now + windowMs;
    
    if (!this.store[key] || this.store[key].resetTime <= now) {
      this.store[key] = {
        count: 1,
        resetTime
      };
    } else {
      this.store[key].count++;
    }
    
    return this.store[key];
  }

  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

const store = new MemoryStore();

export function createRateLimit(config: RateLimitConfig) {
  const {
    windowMs,
    maxRequests,
    message = 'Too many requests, please try again later.',
    skipSuccessfulRequests = false,
    keyGenerator = (req: Request) => {
      return req.ip || req.connection?.remoteAddress || 'unknown';
    }
  } = config;

  return (req: Request, res: Response, next: NextFunction) => {
    const key = keyGenerator(req);
    const { count, resetTime } = store.hit(key, windowMs);
    
    // Set standard rate limit headers
    res.set({
      'X-RateLimit-Limit': maxRequests.toString(),
      'X-RateLimit-Remaining': Math.max(0, maxRequests - count).toString(),
      'X-RateLimit-Reset': Math.ceil(resetTime / 1000).toString()
    });

    if (count > maxRequests) {
      res.status(429).json({
        error: 'Rate limit exceeded',
        message,
        retryAfter: Math.ceil((resetTime - Date.now()) / 1000)
      });
      return;
    }

    // Skip counting successful requests if configured
    if (skipSuccessfulRequests) {
      res.on('finish', () => {
        if (res.statusCode < 400) {
          // Reduce count for successful requests
          if (store.store[key]) {
            store.store[key].count = Math.max(0, store.store[key].count - 1);
          }
        }
      });
    }

    next();
  };
}

// Predefined rate limiters for different endpoints
export const generalRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100,
  message: 'Too many requests from this IP, please try again in 15 minutes.'
});

export const apiRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 1000,
  message: 'API rate limit exceeded, please try again later.',
  skipSuccessfulRequests: true
});

export const aiServiceRateLimit = createRateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  maxRequests: 20,
  message: 'AI service rate limit exceeded, please slow down your requests.',
  keyGenerator: (req: Request) => {
    // Rate limit per user for AI services
    return req.user?.id || req.ip || 'anonymous';
  }
});

export const bulkProcessingRateLimit = createRateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  maxRequests: 5,
  message: 'Bulk processing requests are limited to prevent server overload.'
});

export const authRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 10,
  message: 'Too many authentication attempts, please try again later.'
});