/**
 * Transaction Simulation Utilities
 *
 * Simulates transactions before sending to catch errors early
 */

import {
  Connection,
  Transaction,
  PublicKey,
  SimulatedTransactionResponse,
} from '@solana/web3.js';

export interface SimulationResult {
  success: boolean;
  error?: string;
  logs?: string[];
  unitsConsumed?: number;
}

/**
 * Simulate a transaction before sending
 */
export async function simulateTransaction(
  connection: Connection,
  transaction: Transaction,
  signers: PublicKey[]
): Promise<SimulationResult> {
  try {
    // Set recent blockhash if not already set
    if (!transaction.recentBlockhash) {
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = signers[0];
    }

    const simulation = await connection.simulateTransaction(transaction);

    if (simulation.value.err) {
      return {
        success: false,
        error: parseSimulationError(simulation.value),
        logs: simulation.value.logs || [],
        unitsConsumed: simulation.value.unitsConsumed,
      };
    }

    return {
      success: true,
      logs: simulation.value.logs || [],
      unitsConsumed: simulation.value.unitsConsumed,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown simulation error',
    };
  }
}

/**
 * Parse simulation error into user-friendly message
 */
function parseSimulationError(
  simulationValue: SimulatedTransactionResponse['value']
): string {
  const err = simulationValue.err;

  if (!err) {
    return 'Unknown error';
  }

  // Handle different error types
  if (typeof err === 'string') {
    return err;
  }

  if ('InstructionError' in err) {
    const [index, instructionError] = err.InstructionError;

    if (typeof instructionError === 'string') {
      return `Instruction ${index} failed: ${instructionError}`;
    }

    if ('Custom' in instructionError) {
      return `Instruction ${index} failed with custom error: ${instructionError.Custom}`;
    }

    return `Instruction ${index} failed`;
  }

  // Check logs for Anchor errors
  const logs = simulationValue.logs || [];
  for (const log of logs) {
    if (log.includes('Error:')) {
      const match = log.match(/Error: (.+)/);
      if (match) {
        return match[1];
      }
    }

    // Anchor program errors
    if (log.includes('AnchorError')) {
      return parseAnchorError(log);
    }
  }

  return JSON.stringify(err);
}

/**
 * Parse Anchor program errors from logs
 */
function parseAnchorError(log: string): string {
  // Common Anchor error patterns
  const patterns = [
    /Error Code: (\w+)/,
    /Error Message: (.+)/,
    /AnchorError caused by account: (\w+)/,
  ];

  for (const pattern of patterns) {
    const match = log.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return 'Anchor program error';
}

/**
 * Extract error code from Lutrii program errors
 */
export function parseLutriiError(errorCode: number): string {
  const errorMessages: Record<number, string> = {
    6000: 'Platform is paused',
    6001: 'Subscription is not active',
    6002: 'Subscription is paused',
    6003: 'Payment not due yet',
    6004: 'Insufficient balance',
    6005: 'Lifetime cap exceeded',
    6006: 'Price variance exceeded (max 10%)',
    6007: 'Daily volume limit exceeded',
    6008: 'Frequency too short (min 1 hour)',
    6009: 'Frequency too long (max 1 year)',
    6010: 'Invalid merchant name',
    6011: 'Amount too low',
    6012: 'Fee too low',
    6013: 'Fee too high',
    6014: 'Invalid token account owner',
    6015: 'Invalid mint',
    6016: 'Invalid token account',
    6017: 'Subscription still active',
    6018: 'Unauthorized user',
    6019: 'Unauthorized admin',
    6020: 'Unauthorized CPI caller',
    6021: 'No active subscription',
    6022: 'No payment history',
    6023: 'Arithmetic overflow',
    6024: 'Arithmetic underflow',
  };

  return errorMessages[errorCode] || `Unknown error code: ${errorCode}`;
}

/**
 * Estimate compute units needed for a transaction
 */
export async function estimateComputeUnits(
  connection: Connection,
  transaction: Transaction,
  signers: PublicKey[]
): Promise<number | null> {
  const result = await simulateTransaction(connection, transaction, signers);

  if (result.success && result.unitsConsumed) {
    // Add 20% buffer for safety
    return Math.ceil(result.unitsConsumed * 1.2);
  }

  return null;
}

/**
 * Validate transaction before sending
 */
export async function validateTransaction(
  connection: Connection,
  transaction: Transaction,
  signers: PublicKey[]
): Promise<{
  valid: boolean;
  errors: string[];
  warnings: string[];
}> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Simulate transaction
  const simulation = await simulateTransaction(connection, transaction, signers);

  if (!simulation.success) {
    errors.push(simulation.error || 'Transaction simulation failed');
  }

  // Check compute units
  if (simulation.unitsConsumed && simulation.unitsConsumed > 1_000_000) {
    warnings.push('Transaction may exceed compute unit limit');
  }

  // Check if transaction is too large
  const txSize = transaction.serialize({ requireAllSignatures: false }).length;
  if (txSize > 1232) {
    errors.push(`Transaction too large: ${txSize} bytes (max 1232)`);
  }

  // Check for signers
  if (signers.length === 0) {
    errors.push('No signers provided');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Preflight check for common issues
 */
export async function preflightCheck(
  connection: Connection,
  feePayer: PublicKey
): Promise<{
  solBalance: number;
  hasEnoughForFees: boolean;
  warnings: string[];
}> {
  const warnings: string[] = [];

  // Check SOL balance for fees
  const balance = await connection.getBalance(feePayer);
  const solBalance = balance / 1e9; // Convert to SOL

  // Minimum 0.001 SOL for fees
  const hasEnoughForFees = balance >= 1_000_000;

  if (!hasEnoughForFees) {
    warnings.push('Insufficient SOL for transaction fees');
  }

  if (solBalance < 0.005) {
    warnings.push('Low SOL balance, consider adding more for future transactions');
  }

  return {
    solBalance,
    hasEnoughForFees,
    warnings,
  };
}
