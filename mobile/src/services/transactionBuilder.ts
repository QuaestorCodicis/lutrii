/**
 * Transaction Builder for Lutrii Operations
 *
 * Builds transactions for all Lutrii program interactions
 */

import {
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
} from '@solana/web3.js';
import {
  TOKEN_2022_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
} from '@solana/spl-token';
import {
  getProgramIds,
  getSubscriptionPDA,
  getMerchantPDA,
  getPlatformStatePDA,
  getRegistryStatePDA,
  getCurrentCluster,
  TOKEN_MINTS,
} from '../config/programIds';
import BN from 'bn.js';

/**
 * Build create subscription transaction
 */
export async function buildCreateSubscriptionTx(
  user: PublicKey,
  merchant: PublicKey,
  amount: BN,
  frequencySeconds: number,
  lifetimeCap: BN,
  merchantName: string
): Promise<Transaction> {
  const cluster = getCurrentCluster();
  const programIds = getProgramIds();
  const mint = TOKEN_MINTS[cluster].usdc;

  // Derive PDAs
  const subscription = getSubscriptionPDA(user, merchant, cluster);
  const platformState = getPlatformStatePDA(cluster);
  const merchantRegistry = getMerchantPDA(merchant, cluster);

  // Get token accounts
  const userTokenAccount = getAssociatedTokenAddressSync(
    mint,
    user,
    false,
    TOKEN_2022_PROGRAM_ID
  );

  const merchantTokenAccount = getAssociatedTokenAddressSync(
    mint,
    merchant,
    false,
    TOKEN_2022_PROGRAM_ID
  );

  const tx = new Transaction();

  // Add instruction (will be generated from IDL)
  // For now, this is a placeholder structure
  const instruction = {
    programId: programIds.recurring,
    keys: [
      { pubkey: user, isSigner: true, isWritable: true },
      { pubkey: merchant, isSigner: false, isWritable: false },
      { pubkey: subscription, isSigner: false, isWritable: true },
      { pubkey: platformState, isSigner: false, isWritable: true },
      { pubkey: merchantRegistry, isSigner: false, isWritable: false },
      { pubkey: userTokenAccount, isSigner: false, isWritable: true },
      { pubkey: merchantTokenAccount, isSigner: false, isWritable: false },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.from([]), // Will be encoded from IDL
  };

  // tx.add(instruction as TransactionInstruction);

  return tx;
}

/**
 * Build execute payment transaction
 */
export async function buildExecutePaymentTx(
  subscription: PublicKey,
  feeCollector: PublicKey
): Promise<Transaction> {
  const cluster = getCurrentCluster();
  const programIds = getProgramIds();
  const mint = TOKEN_MINTS[cluster].usdc;

  const platformState = getPlatformStatePDA(cluster);

  const tx = new Transaction();

  // Instruction will be built from IDL
  // This is a placeholder structure

  return tx;
}

/**
 * Build pause subscription transaction
 */
export async function buildPauseSubscriptionTx(
  user: PublicKey,
  subscription: PublicKey
): Promise<Transaction> {
  const programIds = getProgramIds();
  const tx = new Transaction();

  // Instruction structure
  const instruction = {
    programId: programIds.recurring,
    keys: [
      { pubkey: user, isSigner: true, isWritable: false },
      { pubkey: subscription, isSigner: false, isWritable: true },
    ],
    data: Buffer.from([]), // Encoded instruction
  };

  // tx.add(instruction as TransactionInstruction);

  return tx;
}

/**
 * Build resume subscription transaction
 */
export async function buildResumeSubscriptionTx(
  user: PublicKey,
  subscription: PublicKey
): Promise<Transaction> {
  const programIds = getProgramIds();
  const tx = new Transaction();

  const instruction = {
    programId: programIds.recurring,
    keys: [
      { pubkey: user, isSigner: true, isWritable: false },
      { pubkey: subscription, isSigner: false, isWritable: true },
    ],
    data: Buffer.from([]),
  };

  // tx.add(instruction as TransactionInstruction);

  return tx;
}

/**
 * Build cancel subscription transaction
 */
export async function buildCancelSubscriptionTx(
  user: PublicKey,
  subscription: PublicKey,
  userTokenAccount: PublicKey,
  mint: PublicKey
): Promise<Transaction> {
  const programIds = getProgramIds();
  const tx = new Transaction();

  const instruction = {
    programId: programIds.recurring,
    keys: [
      { pubkey: user, isSigner: true, isWritable: true },
      { pubkey: subscription, isSigner: false, isWritable: true },
      { pubkey: userTokenAccount, isSigner: false, isWritable: true },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data: Buffer.from([]),
  };

  // tx.add(instruction as TransactionInstruction);

  return tx;
}

/**
 * Build register merchant transaction
 */
export async function buildRegisterMerchantTx(
  owner: PublicKey,
  businessName: string,
  category: string,
  webhookUrl: string
): Promise<Transaction> {
  const cluster = getCurrentCluster();
  const programIds = getProgramIds();
  const merchant = getMerchantPDA(owner, cluster);
  const registryState = getRegistryStatePDA(cluster);

  const tx = new Transaction();

  const instruction = {
    programId: programIds.merchantRegistry,
    keys: [
      { pubkey: owner, isSigner: true, isWritable: true },
      { pubkey: merchant, isSigner: false, isWritable: true },
      { pubkey: registryState, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.from([]),
  };

  // tx.add(instruction as TransactionInstruction);

  return tx;
}

/**
 * Build submit review transaction
 */
export async function buildSubmitReviewTx(
  reviewer: PublicKey,
  merchant: PublicKey,
  subscription: PublicKey,
  rating: number,
  comment: string
): Promise<Transaction> {
  const cluster = getCurrentCluster();
  const programIds = getProgramIds();
  const registryState = getRegistryStatePDA(cluster);

  const tx = new Transaction();

  const instruction = {
    programId: programIds.merchantRegistry,
    keys: [
      { pubkey: reviewer, isSigner: true, isWritable: true },
      { pubkey: merchant, isSigner: false, isWritable: true },
      { pubkey: subscription, isSigner: false, isWritable: false },
      { pubkey: registryState, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.from([]),
  };

  // tx.add(instruction as TransactionInstruction);

  return tx;
}

/**
 * Create associated token account if needed
 */
export async function ensureTokenAccount(
  payer: PublicKey,
  owner: PublicKey,
  mint: PublicKey
): Promise<TransactionInstruction | null> {
  const ata = getAssociatedTokenAddressSync(
    mint,
    owner,
    false,
    TOKEN_2022_PROGRAM_ID
  );

  // In a real implementation, you would check if the account exists
  // For now, return the create instruction
  return createAssociatedTokenAccountInstruction(
    payer,
    ata,
    owner,
    mint,
    TOKEN_2022_PROGRAM_ID
  );
}

/**
 * Estimate transaction fees
 */
export function estimateFees(signatures: number = 1): number {
  // Base fee is 5000 lamports per signature
  return 5000 * signatures;
}

/**
 * Calculate subscription total cost
 */
export function calculateSubscriptionCost(
  amount: BN,
  frequencySeconds: number,
  durationDays: number
): {
  totalPayments: number;
  totalCost: BN;
  avgCostPerDay: BN;
} {
  const paymentsPerDay = (24 * 60 * 60) / frequencySeconds;
  const totalPayments = Math.floor(paymentsPerDay * durationDays);
  const totalCost = amount.muln(totalPayments);
  const avgCostPerDay = totalCost.divn(durationDays);

  return {
    totalPayments,
    totalCost,
    avgCostPerDay,
  };
}

/**
 * Validate subscription parameters
 */
export function validateSubscriptionParams(
  amount: BN,
  frequencySeconds: number,
  lifetimeCap: BN,
  merchantName: string
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Minimum frequency: 1 hour (3600 seconds)
  if (frequencySeconds < 3600) {
    errors.push('Frequency must be at least 1 hour');
  }

  // Maximum frequency: 1 year (31536000 seconds)
  if (frequencySeconds > 31536000) {
    errors.push('Frequency cannot exceed 1 year');
  }

  // Amount must be positive
  if (amount.lten(0)) {
    errors.push('Amount must be greater than 0');
  }

  // Lifetime cap must be >= amount
  if (lifetimeCap.lt(amount)) {
    errors.push('Lifetime cap must be at least equal to payment amount');
  }

  // Merchant name length (1-32 characters)
  if (!merchantName || merchantName.length === 0) {
    errors.push('Merchant name is required');
  }
  if (merchantName.length > 32) {
    errors.push('Merchant name must be 32 characters or less');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Format amount for display (USDC has 6 decimals)
 */
export function formatAmount(amount: BN): string {
  const USDC_DECIMALS = 6;
  const divisor = new BN(10).pow(new BN(USDC_DECIMALS));
  const whole = amount.div(divisor);
  const remainder = amount.mod(divisor);
  const decimal = remainder.toString().padStart(USDC_DECIMALS, '0');

  return `${whole.toString()}.${decimal}`;
}

/**
 * Parse amount from string to BN (USDC has 6 decimals)
 */
export function parseAmount(amountStr: string): BN {
  const USDC_DECIMALS = 6;
  const [whole = '0', decimal = '0'] = amountStr.split('.');
  const paddedDecimal = decimal.padEnd(USDC_DECIMALS, '0').slice(0, USDC_DECIMALS);
  const combinedStr = whole + paddedDecimal;
  return new BN(combinedStr);
}
