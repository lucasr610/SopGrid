import { Request, Response, NextFunction } from 'express';
import { evidenceLedger } from './evidence-ledger';

// Custom error types for better error handling
export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;
  details?: any;

  constructor(message: string, statusCode: number, isOperational = true, details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, true, details);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed') {
    super(message, 401, true);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 403, true);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, true);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded', retryAfter?: number) {
    super(message, 429, true, { retryAfter });
  }
}

export class ServiceError extends AppError {
  constructor(message: string, service: string) {
    super(message, 503, true, { service });
  }
}

// Error recovery strategies
export class ErrorRecovery {
  private static retryDelays = [1000, 2000, 5000, 10000]; // Exponential backoff

  static async withRetry<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    onError?: (error: any, attempt: number) => void
  ): Promise<T> {
    let lastError: any;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        
        if (onError) {
          onError(error, attempt);
        }

        if (attempt < maxRetries) {
          const delay = this.retryDelays[Math.min(attempt, this.retryDelays.length - 1)];
          console.log(`⚠️ Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }

  static async withFallback<T>(
    primary: () => Promise<T>,
    fallback: () => Promise<T>,
    logError?: boolean
  ): Promise<T> {
    try {
      return await primary();
    } catch (error) {
      if (logError) {
        console.error('Primary operation failed, using fallback:', error);
      }
      return await fallback();
    }
  }

  static async withTimeout<T>(
    fn: () => Promise<T>,
    timeoutMs: number,
    timeoutMessage?: string
  ): Promise<T> {
    return Promise.race([
      fn(),
      new Promise<T>((_, reject) =>
        setTimeout(
          () => reject(new Error(timeoutMessage || `Operation timed out after ${timeoutMs}ms`)),
          timeoutMs
        )
      )
    ]);
  }
}

// Global error handler middleware
export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Log error to evidence ledger for critical failures
  if (err instanceof AppError && !err.isOperational) {
    evidenceLedger.appendAsync({
      type: 'SYSTEM_ERROR',
      payload: {
        error: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
        user: (req as any).session?.userId
      }
    }).catch(console.error);
  }

  // Determine error response
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message,
      details: err.details,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
  }

  // Handle mongoose/database errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation error',
      details: err.message
    });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({
      error: 'Invalid data format',
      details: err.message
    });
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Invalid token'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'Token expired'
    });
  }

  // Default error response
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { 
      message: err.message,
      stack: err.stack 
    })
  });
};

// Async error wrapper for route handlers
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Circuit breaker for external service calls
export class CircuitBreaker {
  private failures = 0;
  private lastFailTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  
  constructor(
    private threshold: number = 5,
    private timeout: number = 60000, // 1 minute
    private resetTimeout: number = 30000 // 30 seconds
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailTime > this.resetTimeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new ServiceError('Service temporarily unavailable', 'circuit_breaker');
      }
    }

    try {
      const result = await fn();
      if (this.state === 'HALF_OPEN') {
        this.state = 'CLOSED';
        this.failures = 0;
      }
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  private recordFailure() {
    this.failures++;
    this.lastFailTime = Date.now();
    
    if (this.failures >= this.threshold) {
      this.state = 'OPEN';
      console.error(`Circuit breaker opened after ${this.failures} failures`);
    }
  }
}

export default {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  RateLimitError,
  ServiceError,
  ErrorRecovery,
  errorHandler,
  asyncHandler,
  CircuitBreaker
};