/**
 * Wallet Store
 *
 * Manages Solana Mobile Wallet Adapter connection and wallet state
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '@/utils/storage';
import type { PublicKey } from '@solana/web3.js';

export interface WalletState {
  // Wallet connection
  connected: boolean;
  connecting: boolean;
  publicKey: string | null;
  walletName: string | null;

  // Balances
  solBalance: number;
  usdcBalance: number;
  balancesLoading: boolean;
  lastBalanceUpdate: number;

  // Session
  sessionToken: string | null;
  authToken: string | null;

  // Actions
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  setPublicKey: (publicKey: string, walletName?: string) => void;
  updateBalances: (sol: number, usdc: number) => void;
  refreshBalances: () => Promise<void>;
  setConnecting: (connecting: boolean) => void;
}

export const useWalletStore = create<WalletState>()(
  persist(
    (set, get) => ({
      // Initial state
      connected: false,
      connecting: false,
      publicKey: null,
      walletName: null,
      solBalance: 0,
      usdcBalance: 0,
      balancesLoading: false,
      lastBalanceUpdate: 0,
      sessionToken: null,
      authToken: null,

      // Actions
      connect: async () => {
        set({ connecting: true });
        try {
          const { walletService } = await import('@/services/walletService');
          const result = await walletService.connect();
          set({ connecting: false });
        } catch (error) {
          console.error('Wallet connection failed:', error);
          set({ connecting: false, connected: false });
          throw error;
        }
      },

      disconnect: async () => {
        try {
          const { walletService } = await import('@/services/walletService');
          await walletService.disconnect();
        } catch (error) {
          console.error('Wallet disconnection error:', error);
        }

        set({
          connected: false,
          publicKey: null,
          walletName: null,
          solBalance: 0,
          usdcBalance: 0,
          sessionToken: null,
          authToken: null,
        });
      },

      setPublicKey: (publicKey, walletName) => {
        set({
          connected: true,
          publicKey,
          walletName: walletName || 'Unknown Wallet',
        });
      },

      updateBalances: (sol, usdc) => {
        set({
          solBalance: sol,
          usdcBalance: usdc,
          lastBalanceUpdate: Date.now(),
        });
      },

      refreshBalances: async () => {
        const { publicKey } = get();
        if (!publicKey) return;

        set({ balancesLoading: true });
        try {
          const { walletService } = await import('@/services/walletService');
          const { PublicKey } = await import('@solana/web3.js');
          const pubkey = new PublicKey(publicKey);
          await walletService.refreshBalances(pubkey);
          set({ balancesLoading: false });
        } catch (error) {
          console.error('Failed to refresh balances:', error);
          set({ balancesLoading: false });
        }
      },

      setConnecting: (connecting) => set({ connecting }),
    }),
    {
      name: 'lutrii-wallet',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        connected: state.connected,
        publicKey: state.publicKey,
        walletName: state.walletName,
        solBalance: state.solBalance,
        usdcBalance: state.usdcBalance,
        lastBalanceUpdate: state.lastBalanceUpdate,
      }),
    }
  )
);
