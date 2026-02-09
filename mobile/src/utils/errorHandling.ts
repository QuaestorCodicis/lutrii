/**
 * Error Handling Utilities
 *
 * Provides user-friendly error messages and retry logic
 */

import { SendTransactionError } from '@solana/web3.js';

export enum ErrorSeverity {
  Info = 'info',
  Warning = 'warning',
  Error = 'error',
  Critical = 'critical',
}

export interface LutriiError {
  code: string;
  message: string;
  severity: ErrorSeverity;
  retryable: boolean;
  userMessage: string;
  technicalDetails?: string;
}

/**
 * Parse and categorize errors
 */
export function parseError(error: unknown): LutriiError {
  // Solana transaction errors
  if (error instanceof SendTransactionError) {
    return {
      code: 'TX_FAILED',
      message: 'Transaction failed',
      severity: ErrorSeverity.Error,
      retryable: true,
      userMessage: 'Transaction failed. Please try again.',
      technicalDetails: error.message,
    };
  }

  // Network errors
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return {
      code: 'NETWORK_ERROR',
      message: 'Network error',
      severity: ErrorSeverity.Warning,
      retryable: true,
      userMessage: 'Network connection issue. Please check your connection and try again.',
      technicalDetails: error.message,
    };
  }

  // Timeout errors
  if (error instanceof Error && error.message.includes('timeout')) {
    return {
      code: 'TIMEOUT',
      message: 'Request timeout',
      severity: ErrorSeverity.Warning,
      retryable: true,
      userMessage: 'Request timed out. Please try again.',
      technicalDetails: error.message,
    };
  }

  // Wallet errors
  if (error instanceof Error && error.message.includes('User rejected')) {
    return {
      code: 'USER_REJECTED',
      message: 'User rejected transaction',
      severity: ErrorSeverity.Info,
      retryable: false,
      userMessage: 'Transaction was cancelled.',
    };
  }

  // Insufficient funds
  if (
    error instanceof Error &&
    (error.message.includes('Insufficient funds') ||
      error.message.includes('InsufficientBalance'))
  ) {
    return {
      code: 'INSUFFICIENT_FUNDS',
      message: 'Insufficient funds',
      severity: ErrorSeverity.Error,
      retryable: false,
      userMessage: 'Insufficient funds to complete this transaction.',
      technicalDetails: error.message,
    };
  }

  // Blockhash expired
  if (error instanceof Error && error.message.includes('Blockhash not found')) {
    return {
      code: 'BLOCKHASH_EXPIRED',
      message: 'Transaction expired',
      severity: ErrorSeverity.Warning,
      retryable: true,
      userMessage: 'Transaction expired. Please try again.',
    };
  }

  // Generic error
  return {
    code: 'UNKNOWN',
    message: 'Unknown error',
    severity: ErrorSeverity.Error,
    retryable: false,
    userMessage: 'An unexpected error occurred. Please try again.',
    technicalDetails: error instanceof Error ? error.message : String(error),
  };
}

/**
 * Retry logic with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: unknown;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      const lutriiError = parseError(error);

      // Don't retry if error is not retryable
      if (!lutriiError.retryable) {
        throw error;
      }

      // Don't retry on last attempt
      if (i === maxRetries - 1) {
        throw error;
      }

      // Exponential backoff: 1s, 2s, 4s, etc.
      const delay = baseDelay * Math.pow(2, i);
      await sleep(delay);
    }
  }

  throw lastError;
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Rate limiter
 */
export class RateLimiter {
  private requests: number[] = [];
  private maxRequests: number;
  private windowMs: number;

  constructor(maxRequests: number = 10, windowMs: number = 1000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  async waitIfNeeded(): Promise<void> {
    const now = Date.now();

    // Remove old requests outside the window
    this.requests = this.requests.filter(time => now - time < this.windowMs);

    // If at limit, wait until oldest request expires
    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = this.requests[0];
      const waitTime = this.windowMs - (now - oldestRequest);

      if (waitTime > 0) {
        await sleep(waitTime);
      }
    }

    this.requests.push(now);
  }

  reset(): void {
    this.requests = [];
  }
}

/**
 * Log error to monitoring service
 */
export function logError(error: LutriiError, context?: Record<string, any>): void {
  // In production, this would send to a monitoring service like Sentry
  console.error('[Lutrii Error]', {
    ...error,
    context,
    timestamp: new Date().toISOString(),
  });

  // TODO: Implement actual error logging to monitoring service
  // Example: Sentry.captureException(error, { contexts: { lutrii: context } });
}

/**
 * Create user-friendly error message
 */
export function formatErrorForUser(error: unknown): string {
  const lutriiError = parseError(error);
  return lutriiError.userMessage;
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  const lutriiError = parseError(error);
  return lutriiError.retryable;
}

/**
 * Error reporting for debugging
 */
export function getErrorReport(error: unknown): string {
  const lutriiError = parseError(error);

  return `
Error Report
============
Code: ${lutriiError.code}
Message: ${lutriiError.message}
Severity: ${lutriiError.severity}
Retryable: ${lutriiError.retryable}
User Message: ${lutriiError.userMessage}
${lutriiError.technicalDetails ? `Technical Details: ${lutriiError.technicalDetails}` : ''}
Timestamp: ${new Date().toISOString()}
  `.trim();
}
