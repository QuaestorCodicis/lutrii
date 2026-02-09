/**
 * Blockchain Service
 *
 * Handles all interactions with Lutrii smart contracts
 * Programs: lutrii-recurring, lutrii-merchant-registry
 */

import * as anchor from '@coral-xyz/anchor';
import { AnchorProvider, Program, BN, web3 } from '@coral-xyz/anchor';
import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
  SYSVAR_CLOCK_PUBKEY,
} from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  TOKEN_2022_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { walletService } from './walletService';
import { useSubscriptionStore } from '@/store/subscriptionStore';

// Program IDs - Updated with actual deployed addresses
const LUTRII_RECURRING_PROGRAM_ID = new PublicKey(
  '146BGDDLG4yRYXfNCCDdRRmCAYTrGddCgY14n4ekxJyF'
);
const LUTRII_MERCHANT_REGISTRY_PROGRAM_ID = new PublicKey(
  '3RkcL88V6dyHRCJFyGZ54R1u1KcHqeYB24MA38894Eex'
);

// Note: Clockwork integration removed - using manual payment execution for MVP
// Future: Integrate Clockwork or custom automation for automated payments

// USDC Token-2022 Mint
const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');

// Platform state PDA seeds
const PLATFORM_STATE_SEED = 'platform_state';
const SUBSCRIPTION_SEED = 'subscription';
const MERCHANT_SEED = 'merchant';

export interface CreateSubscriptionParams {
  merchantPublicKey: string;
  amount: number; // In USDC (with decimals)
  frequencyDays: number;
  merchantName: string;
  maxPerTransaction?: number;
  lifetimeCap?: number;
}

export interface Subscription {
  publicKey: string;
  user: string;
  merchant: string;
  amount: number;
  frequencySeconds: number;
  nextPayment: number;
  totalPaid: number;
  paymentCount: number;
  isActive: boolean;
  isPaused: boolean;
  merchantName: string;
  createdAt: number;
  maxPerTransaction: number;
  lifetimeCap: number;
}

export class BlockchainService {
  private static instance: BlockchainService;
  private connection: Connection;
  private recurringProgram: Program | null = null;
  private merchantProgram: Program | null = null;

  private constructor() {
    this.connection = walletService.getConnection();
  }

  static getInstance(): BlockchainService {
    if (!BlockchainService.instance) {
      BlockchainService.instance = new BlockchainService();
    }
    return BlockchainService.instance;
  }

  /**
   * Initialize programs with IDLs
   * Call this after wallet connection to set up Anchor programs
   */
  async initializePrograms(): Promise<void> {
    try {
      const publicKey = walletService.getPublicKey();
      if (!publicKey) {
        throw new Error('Wallet not connected');
      }

      // Create a minimal wallet adapter for Anchor
      const wallet = {
        publicKey,
        signTransaction: walletService.signTransaction.bind(walletService),
        signAllTransactions: walletService.signAllTransactions.bind(walletService),
      };

      const provider = new AnchorProvider(
        this.connection,
        wallet as any,
        { commitment: 'confirmed' }
      );

      // TODO: Load IDLs and initialize programs
      // This will be completed after building the programs
      /*
      const recurringIdl = await Program.fetchIdl(LUTRII_RECURRING_PROGRAM_ID, provider);
      if (recurringIdl) {
        this.recurringProgram = new Program(recurringIdl, LUTRII_RECURRING_PROGRAM_ID, provider);
      }

      const merchantIdl = await Program.fetchIdl(LUTRII_MERCHANT_REGISTRY_PROGRAM_ID, provider);
      if (merchantIdl) {
        this.merchantProgram = new Program(merchantIdl, LUTRII_MERCHANT_REGISTRY_PROGRAM_ID, provider);
      }
      */

      console.log('[BlockchainService] Programs initialized');
    } catch (error) {
      console.error('[BlockchainService] Failed to initialize programs:', error);
      throw error;
    }
  }

  /**
   * Create a new subscription
   */
  async createSubscription(params: CreateSubscriptionParams): Promise<string> {
    const userPublicKey = walletService.getPublicKey();
    if (!userPublicKey) {
      throw new Error('Wallet not connected');
    }

    try {
      const merchantPubkey = new PublicKey(params.merchantPublicKey);
      const amountLamports = Math.floor(params.amount * 1_000_000); // USDC has 6 decimals
      const frequencySeconds = params.frequencyDays * 24 * 60 * 60;

      // Set defaults if not provided
      const maxPerTransaction = params.maxPerTransaction
        ? Math.floor(params.maxPerTransaction * 1_000_000)
        : amountLamports * 2;
      const lifetimeCap = params.lifetimeCap
        ? Math.floor(params.lifetimeCap * 1_000_000)
        : amountLamports * 100; // Default to 100 payments

      // Derive PDAs
      const [platformState] = PublicKey.findProgramAddressSync(
        [Buffer.from(PLATFORM_STATE_SEED)],
        LUTRII_RECURRING_PROGRAM_ID
      );

      const [subscription] = PublicKey.findProgramAddressSync(
        [
          Buffer.from(SUBSCRIPTION_SEED),
          userPublicKey.toBuffer(),
          merchantPubkey.toBuffer(),
        ],
        LUTRII_RECURRING_PROGRAM_ID
      );

      // Get token accounts
      const userTokenAccount = await getAssociatedTokenAddress(
        USDC_MINT,
        userPublicKey,
        false,
        TOKEN_2022_PROGRAM_ID
      );

      const merchantTokenAccount = await getAssociatedTokenAddress(
        USDC_MINT,
        merchantPubkey,
        false,
        TOKEN_2022_PROGRAM_ID
      );

      // Derive Clockwork thread PDA
      const threadId = `lutrii_sub_${subscription.toBase58()}`;
      const [thread] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('thread'),
          userPublicKey.toBuffer(),
          Buffer.from(threadId),
        ],
        CLOCKWORK_PROGRAM_ID
      );

      // ============================================================================
      // TRANSACTION BUILDING - See TRANSACTION_BUILDING_GUIDE.md for full implementation
      // ============================================================================

      // Required: Install @coral-xyz/borsh for instruction serialization
      // npm install @coral-xyz/borsh @noble/hashes

      // Derive merchant account PDA from merchant registry (NEW: Week 2 enhancement)
      const [merchantAccount] = PublicKey.findProgramAddressSync(
        [Buffer.from(MERCHANT_SEED), merchantPubkey.toBuffer()],
        LUTRII_MERCHANT_REGISTRY_PROGRAM_ID
      );

      // Build transaction
      const tx = new Transaction();

      // TODO: Implement instruction data serialization with borsh
      // See TRANSACTION_BUILDING_GUIDE.md Section 1 for complete implementation
      //
      // Required accounts (in order):
      // 1. subscription (mut) - PDA
      // 2. platformState (mut) - PDA
      // 3. user (signer, mut) - userPublicKey
      // 4. merchant - merchantAccount from registry (NEW: validated)
      // 5. userTokenAccount (mut)
      // 6. merchantTokenAccount (mut)
      // 7. mint
      // 8. tokenProgram - TOKEN_2022_PROGRAM_ID
      // 9. systemProgram
      //
      // Instruction data:
      // - discriminator (8 bytes): sha256("global:create_subscription")[:8]
      // - amount (u64)
      // - frequencySeconds (i64)
      // - maxPerTransaction (u64)
      // - lifetimeCap (u64)
      // - merchantName (string)

      console.log('[BlockchainService] Creating subscription:', {
        user: userPublicKey.toBase58(),
        merchant: merchantPubkey.toBase58(),
        merchantAccount: merchantAccount.toBase58(), // NEW: Validated merchant from registry
        amount: params.amount,
        frequency: params.frequencyDays,
      });

      // Sign and send transaction
      const signature = await walletService.signAndSendTransaction(tx);

      // Update local store
      const subscriptionData: Subscription = {
        publicKey: subscription.toBase58(),
        user: userPublicKey.toBase58(),
        merchant: merchantPubkey.toBase58(),
        amount: params.amount,
        frequencySeconds,
        nextPayment: Date.now() / 1000 + frequencySeconds,
        totalPaid: 0,
        paymentCount: 0,
        isActive: true,
        isPaused: false,
        merchantName: params.merchantName,
        createdAt: Date.now() / 1000,
        maxPerTransaction: params.maxPerTransaction || params.amount * 2,
        lifetimeCap: params.lifetimeCap || params.amount * 100,
      };

      const store = useSubscriptionStore.getState();
      store.addSubscription(subscriptionData);

      console.log('[BlockchainService] Subscription created:', signature);
      return signature;
    } catch (error) {
      console.error('[BlockchainService] Failed to create subscription:', error);
      throw new Error(
        `Failed to create subscription: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Pause a subscription
   */
  async pauseSubscription(subscriptionPublicKey: string): Promise<string> {
    const userPublicKey = walletService.getPublicKey();
    if (!userPublicKey) {
      throw new Error('Wallet not connected');
    }

    try {
      const subscriptionPubkey = new PublicKey(subscriptionPublicKey);

      // Derive platform state PDA
      const [platformState] = PublicKey.findProgramAddressSync(
        [Buffer.from(PLATFORM_STATE_SEED)],
        LUTRII_RECURRING_PROGRAM_ID
      );

      // Build transaction
      const tx = new Transaction();

      // TODO: Implement pause instruction
      // See TRANSACTION_BUILDING_GUIDE.md Section 2
      // Accounts: subscription (mut), platformState, user (signer)
      // Data: discriminator only (no parameters)

      const signature = await walletService.signAndSendTransaction(tx);

      // Update local store
      const store = useSubscriptionStore.getState();
      store.updateSubscription(subscriptionPublicKey, { isPaused: true });

      console.log('[BlockchainService] Subscription paused:', signature);
      return signature;
    } catch (error) {
      console.error('[BlockchainService] Failed to pause subscription:', error);
      throw new Error(
        `Failed to pause subscription: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Resume a paused subscription
   */
  async resumeSubscription(subscriptionPublicKey: string): Promise<string> {
    const userPublicKey = walletService.getPublicKey();
    if (!userPublicKey) {
      throw new Error('Wallet not connected');
    }

    try {
      const subscriptionPubkey = new PublicKey(subscriptionPublicKey);

      const [platformState] = PublicKey.findProgramAddressSync(
        [Buffer.from(PLATFORM_STATE_SEED)],
        LUTRII_RECURRING_PROGRAM_ID
      );

      const tx = new Transaction();

      // TODO: Implement resume instruction
      // See TRANSACTION_BUILDING_GUIDE.md Section 3
      // Accounts: subscription (mut), platformState, user (signer), clock sysvar
      // Data: discriminator only

      const signature = await walletService.signAndSendTransaction(tx);

      const store = useSubscriptionStore.getState();
      store.updateSubscription(subscriptionPublicKey, { isPaused: false });

      console.log('[BlockchainService] Subscription resumed:', signature);
      return signature;
    } catch (error) {
      console.error('[BlockchainService] Failed to resume subscription:', error);
      throw new Error(
        `Failed to resume subscription: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Cancel a subscription permanently
   */
  async cancelSubscription(subscriptionPublicKey: string): Promise<string> {
    const userPublicKey = walletService.getPublicKey();
    if (!userPublicKey) {
      throw new Error('Wallet not connected');
    }

    try {
      const subscriptionPubkey = new PublicKey(subscriptionPublicKey);

      const [platformState] = PublicKey.findProgramAddressSync(
        [Buffer.from(PLATFORM_STATE_SEED)],
        LUTRII_RECURRING_PROGRAM_ID
      );

      const tx = new Transaction();

      // TODO: Implement cancel instruction
      // See TRANSACTION_BUILDING_GUIDE.md Section 4
      // Accounts: subscription (mut), platformState (mut), user (signer, mut),
      //           userTokenAccount (mut), merchant, tokenProgram
      // Data: discriminator only

      const signature = await walletService.signAndSendTransaction(tx);

      const store = useSubscriptionStore.getState();
      store.deleteSubscription(subscriptionPublicKey);

      console.log('[BlockchainService] Subscription cancelled:', signature);
      return signature;
    } catch (error) {
      console.error('[BlockchainService] Failed to cancel subscription:', error);
      throw new Error(
        `Failed to cancel subscription: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Fetch all subscriptions for the connected user
   */
  async fetchUserSubscriptions(): Promise<Subscription[]> {
    const userPublicKey = walletService.getPublicKey();
    if (!userPublicKey) {
      throw new Error('Wallet not connected');
    }

    try {
      // TODO: Fetch subscriptions from blockchain
      // For now, return from local store
      const store = useSubscriptionStore.getState();

      console.log('[BlockchainService] Fetching subscriptions for:', userPublicKey.toBase58());

      // This will be replaced with actual on-chain data fetch:
      // const subscriptions = await this.recurringProgram.account.subscription.all([
      //   { memcmp: { offset: 8, bytes: userPublicKey.toBase58() } }
      // ]);

      return store.subscriptions;
    } catch (error) {
      console.error('[BlockchainService] Failed to fetch subscriptions:', error);
      throw new Error(
        `Failed to fetch subscriptions: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Fetch a single subscription by public key
   */
  async fetchSubscription(subscriptionPublicKey: string): Promise<Subscription | null> {
    try {
      const subscriptionPubkey = new PublicKey(subscriptionPublicKey);

      // TODO: Fetch from blockchain
      // const subscription = await this.recurringProgram.account.subscription.fetch(subscriptionPubkey);

      // For now, get from local store
      const store = useSubscriptionStore.getState();
      const subscription = store.subscriptions.find(
        (sub) => sub.publicKey === subscriptionPublicKey
      );

      return subscription || null;
    } catch (error) {
      console.error('[BlockchainService] Failed to fetch subscription:', error);
      return null;
    }
  }

  /**
   * Update subscription limits
   */
  async updateSubscriptionLimits(
    subscriptionPublicKey: string,
    maxPerTransaction: number,
    lifetimeCap: number
  ): Promise<string> {
    const userPublicKey = walletService.getPublicKey();
    if (!userPublicKey) {
      throw new Error('Wallet not connected');
    }

    try {
      const subscriptionPubkey = new PublicKey(subscriptionPublicKey);
      const maxLamports = Math.floor(maxPerTransaction * 1_000_000);
      const capLamports = Math.floor(lifetimeCap * 1_000_000);

      const [platformState] = PublicKey.findProgramAddressSync(
        [Buffer.from(PLATFORM_STATE_SEED)],
        LUTRII_RECURRING_PROGRAM_ID
      );

      const tx = new Transaction();

      // TODO: Implement update_limits instruction
      // See TRANSACTION_BUILDING_GUIDE.md Section 5
      // Accounts: subscription (mut), platformState, user (signer)
      // Data: discriminator + maxPerTransaction (u64) + lifetimeCap (u64)

      const signature = await walletService.signAndSendTransaction(tx);

      const store = useSubscriptionStore.getState();
      store.updateSubscription(subscriptionPublicKey, {
        maxPerTransaction,
        lifetimeCap,
      });

      console.log('[BlockchainService] Subscription limits updated:', signature);
      return signature;
    } catch (error) {
      console.error('[BlockchainService] Failed to update limits:', error);
      throw new Error(
        `Failed to update limits: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get connection instance
   */
  getConnection(): Connection {
    return this.connection;
  }
}

// Export singleton instance
export const blockchainService = BlockchainService.getInstance();
