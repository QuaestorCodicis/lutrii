/**
 * Solana Mobile Wallet Adapter Service
 *
 * Handles all wallet interactions using Solana Mobile Wallet Adapter (MWA)
 * Supports: Connection, Authorization, Transaction Signing, Balance Fetching
 */

import {
  transact,
  Web3MobileWallet,
} from '@solana-mobile/mobile-wallet-adapter-protocol-web3js';
import {
  Connection,
  PublicKey,
  Transaction,
  VersionedTransaction,
  LAMPORTS_PER_SOL,
  clusterApiUrl,
} from '@solana/web3.js';
import { getAssociatedTokenAddress, getAccount } from '@solana/spl-token';
import { useWalletStore } from '@/store/walletStore';

// Constants
const APP_IDENTITY = {
  name: 'Lutrii',
  uri: 'https://lutrii.app',
  icon: 'favicon.ico', // Relative path to your app icon
};

// USDC Token Mint (Token-2022 on mainnet)
const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');

// RPC Connection
const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || clusterApiUrl('devnet');
const connection = new Connection(SOLANA_RPC_URL, 'confirmed');

export class WalletService {
  private static instance: WalletService;
  private authToken: string | null = null;
  private walletPublicKey: PublicKey | null = null;

  private constructor() {}

  static getInstance(): WalletService {
    if (!WalletService.instance) {
      WalletService.instance = new WalletService();
    }
    return WalletService.instance;
  }

  /**
   * Connect to Solana Mobile Wallet
   * Opens wallet selector and requests authorization
   */
  async connect(): Promise<{ publicKey: PublicKey; walletName: string }> {
    const store = useWalletStore.getState();
    store.setConnecting(true);

    try {
      const result = await transact(async (wallet: Web3MobileWallet) => {
        // Request authorization from the wallet
        const authResult = await wallet.authorize({
          cluster: SOLANA_RPC_URL.includes('devnet') ? 'devnet' : 'mainnet-beta',
          identity: APP_IDENTITY,
        });

        // Store authorization token for future use
        this.authToken = authResult.auth_token;
        this.walletPublicKey = authResult.accounts[0].publicKey;

        return {
          publicKey: authResult.accounts[0].publicKey,
          walletName: authResult.wallet_uri_base || 'Solana Wallet',
          authToken: authResult.auth_token,
        };
      });

      // Update store
      store.setPublicKey(result.publicKey.toBase58(), result.walletName);
      store.setConnecting(false);

      // Fetch initial balances
      await this.refreshBalances(result.publicKey);

      console.log('[WalletService] Connected:', result.publicKey.toBase58());
      return result;
    } catch (error) {
      store.setConnecting(false);
      store.disconnect();
      console.error('[WalletService] Connection failed:', error);
      throw new Error(`Failed to connect wallet: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Disconnect wallet and clear session
   */
  async disconnect(): Promise<void> {
    const store = useWalletStore.getState();

    try {
      // Deauthorize with wallet if we have an auth token
      if (this.authToken) {
        await transact(async (wallet: Web3MobileWallet) => {
          await wallet.deauthorize({ auth_token: this.authToken! });
        });
      }
    } catch (error) {
      console.error('[WalletService] Deauthorization error:', error);
      // Continue with disconnect even if deauthorize fails
    }

    // Clear local state
    this.authToken = null;
    this.walletPublicKey = null;
    store.disconnect();

    console.log('[WalletService] Disconnected');
  }

  /**
   * Reauthorize existing session
   * Use this when app resumes from background
   */
  async reauthorize(): Promise<boolean> {
    if (!this.authToken) {
      console.log('[WalletService] No auth token, cannot reauthorize');
      return false;
    }

    try {
      await transact(async (wallet: Web3MobileWallet) => {
        const result = await wallet.reauthorize({
          auth_token: this.authToken!,
          identity: APP_IDENTITY,
        });

        this.authToken = result.auth_token;
        this.walletPublicKey = result.accounts[0].publicKey;
      });

      console.log('[WalletService] Reauthorized successfully');
      return true;
    } catch (error) {
      console.error('[WalletService] Reauthorization failed:', error);
      this.authToken = null;
      this.walletPublicKey = null;
      return false;
    }
  }

  /**
   * Sign a transaction
   * @param transaction - Transaction or VersionedTransaction to sign
   * @returns Signed transaction
   */
  async signTransaction<T extends Transaction | VersionedTransaction>(
    transaction: T
  ): Promise<T> {
    if (!this.authToken) {
      throw new Error('Wallet not authorized. Please connect first.');
    }

    try {
      const signedTransaction = await transact(async (wallet: Web3MobileWallet) => {
        // Reauthorize to ensure valid session
        await wallet.reauthorize({
          auth_token: this.authToken!,
          identity: APP_IDENTITY,
        });

        // Sign the transaction
        const signed = await wallet.signTransactions({
          transactions: [transaction],
        });

        return signed[0];
      });

      console.log('[WalletService] Transaction signed');
      return signedTransaction as T;
    } catch (error) {
      console.error('[WalletService] Transaction signing failed:', error);
      throw new Error(`Failed to sign transaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Sign multiple transactions at once
   */
  async signAllTransactions<T extends Transaction | VersionedTransaction>(
    transactions: T[]
  ): Promise<T[]> {
    if (!this.authToken) {
      throw new Error('Wallet not authorized. Please connect first.');
    }

    try {
      const signedTransactions = await transact(async (wallet: Web3MobileWallet) => {
        await wallet.reauthorize({
          auth_token: this.authToken!,
          identity: APP_IDENTITY,
        });

        return await wallet.signTransactions({ transactions });
      });

      console.log('[WalletService] Batch signed', signedTransactions.length, 'transactions');
      return signedTransactions as T[];
    } catch (error) {
      console.error('[WalletService] Batch signing failed:', error);
      throw new Error(`Failed to sign transactions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Sign and send a transaction
   * @param transaction - Transaction to sign and send
   * @returns Transaction signature
   */
  async signAndSendTransaction(
    transaction: Transaction | VersionedTransaction
  ): Promise<string> {
    if (!this.authToken) {
      throw new Error('Wallet not authorized. Please connect first.');
    }

    try {
      const signature = await transact(async (wallet: Web3MobileWallet) => {
        await wallet.reauthorize({
          auth_token: this.authToken!,
          identity: APP_IDENTITY,
        });

        const signed = await wallet.signAndSendTransactions({
          transactions: [transaction],
        });

        return signed[0];
      });

      console.log('[WalletService] Transaction sent:', signature);

      // Wait for confirmation
      const confirmation = await connection.confirmTransaction(signature, 'confirmed');

      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
      }

      return signature;
    } catch (error) {
      console.error('[WalletService] Transaction failed:', error);
      throw new Error(`Failed to send transaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Sign a message with the wallet
   */
  async signMessage(message: Uint8Array): Promise<Uint8Array> {
    if (!this.authToken) {
      throw new Error('Wallet not authorized. Please connect first.');
    }

    try {
      const signature = await transact(async (wallet: Web3MobileWallet) => {
        await wallet.reauthorize({
          auth_token: this.authToken!,
          identity: APP_IDENTITY,
        });

        const signed = await wallet.signMessages({
          addresses: [this.walletPublicKey!.toBase58()],
          payloads: [message],
        });

        return signed[0];
      });

      console.log('[WalletService] Message signed');
      return signature;
    } catch (error) {
      console.error('[WalletService] Message signing failed:', error);
      throw new Error(`Failed to sign message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Fetch SOL and USDC balances
   */
  async refreshBalances(publicKey: PublicKey): Promise<{ sol: number; usdc: number }> {
    const store = useWalletStore.getState();
    store.setConnecting(true);

    try {
      // Fetch SOL balance
      const solBalance = await connection.getBalance(publicKey);
      const solAmount = solBalance / LAMPORTS_PER_SOL;

      // Fetch USDC balance (Token-2022)
      let usdcAmount = 0;
      try {
        const usdcTokenAccount = await getAssociatedTokenAddress(
          USDC_MINT,
          publicKey
        );

        const accountInfo = await getAccount(connection, usdcTokenAccount);
        usdcAmount = Number(accountInfo.amount) / 1_000_000; // USDC has 6 decimals
      } catch (error) {
        // Token account doesn't exist yet, balance is 0
        console.log('[WalletService] USDC account not found, balance: 0');
      }

      // Update store
      store.updateBalances(solAmount, usdcAmount);
      store.setConnecting(false);

      console.log('[WalletService] Balances:', { sol: solAmount, usdc: usdcAmount });
      return { sol: solAmount, usdc: usdcAmount };
    } catch (error) {
      store.setConnecting(false);
      console.error('[WalletService] Balance fetch failed:', error);
      throw new Error(`Failed to fetch balances: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get current wallet public key
   */
  getPublicKey(): PublicKey | null {
    return this.walletPublicKey;
  }

  /**
   * Check if wallet is connected
   */
  isConnected(): boolean {
    return this.authToken !== null && this.walletPublicKey !== null;
  }

  /**
   * Get connection instance
   */
  getConnection(): Connection {
    return connection;
  }
}

// Export singleton instance
export const walletService = WalletService.getInstance();
