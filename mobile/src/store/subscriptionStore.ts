/**
 * Subscription Store (Zustand + MMKV)
 *
 * Fast, persistent state management for subscriptions
 * All subscription data is stored locally and synced with on-chain state
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '@/utils/storage';
import type { PublicKey } from '@solana/web3.js';

export interface Subscription {
  // On-chain data
  publicKey: string;
  user: string;
  merchant: string;
  merchantName: string;
  userTokenAccount: string;
  merchantTokenAccount: string;
  amount: number; // in USDC (with decimals)
  frequencySeconds: number;
  lastPayment: number;
  nextPayment: number;
  totalPaid: number;
  paymentCount: number;
  isActive: boolean;
  isPaused: boolean;
  maxPerTransaction: number;
  lifetimeCap: number;
  createdAt: number;

  // Local metadata (not on-chain)
  merchantLogo?: string;
  category?: string;
  color?: string; // UI theming
  lastSyncedAt: number;
}

export interface SubscriptionFilters {
  active?: boolean;
  paused?: boolean;
  merchant?: string;
  category?: string;
  sortBy?: 'amount' | 'nextPayment' | 'createdAt' | 'merchantName';
  sortOrder?: 'asc' | 'desc';
}

interface SubscriptionStore {
  // State
  subscriptions: Subscription[];
  isLoading: boolean;
  lastUpdated: number;
  error: string | null;

  // Actions
  addSubscription: (subscription: Subscription) => void;
  updateSubscription: (publicKey: string, updates: Partial<Subscription>) => void;
  deleteSubscription: (publicKey: string) => void;
  pauseSubscription: (publicKey: string) => void;
  resumeSubscription: (publicKey: string) => void;
  cancelSubscription: (publicKey: string) => void;
  setSubscriptions: (subscriptions: Subscription[]) => void;
  syncWithBlockchain: () => Promise<void>;

  // Selectors
  getSubscription: (publicKey: string) => Subscription | undefined;
  getActiveSubscriptions: () => Subscription[];
  getPausedSubscriptions: () => Subscription[];
  getSubscriptionsByMerchant: (merchant: string) => Subscription[];
  getMonthlyTotal: () => number;
  getUpcomingPayments: (days?: number) => Subscription[];
  filterSubscriptions: (filters: SubscriptionFilters) => Subscription[];

  // UI state
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useSubscriptionStore = create<SubscriptionStore>()(
  persist(
    (set, get) => ({
      // Initial state
      subscriptions: [],
      isLoading: false,
      lastUpdated: 0,
      error: null,

      // Actions
      addSubscription: (subscription) =>
        set((state) => ({
          subscriptions: [...state.subscriptions, subscription],
          lastUpdated: Date.now(),
        })),

      updateSubscription: (publicKey, updates) =>
        set((state) => ({
          subscriptions: state.subscriptions.map((sub) =>
            sub.publicKey === publicKey
              ? { ...sub, ...updates, lastSyncedAt: Date.now() }
              : sub
          ),
          lastUpdated: Date.now(),
        })),

      deleteSubscription: (publicKey) =>
        set((state) => ({
          subscriptions: state.subscriptions.filter(
            (sub) => sub.publicKey !== publicKey
          ),
          lastUpdated: Date.now(),
        })),

      pauseSubscription: (publicKey) =>
        set((state) => ({
          subscriptions: state.subscriptions.map((sub) =>
            sub.publicKey === publicKey
              ? { ...sub, isPaused: true, lastSyncedAt: Date.now() }
              : sub
          ),
          lastUpdated: Date.now(),
        })),

      resumeSubscription: (publicKey) =>
        set((state) => ({
          subscriptions: state.subscriptions.map((sub) =>
            sub.publicKey === publicKey
              ? {
                  ...sub,
                  isPaused: false,
                  nextPayment: Date.now() / 1000 + sub.frequencySeconds,
                  lastSyncedAt: Date.now(),
                }
              : sub
          ),
          lastUpdated: Date.now(),
        })),

      cancelSubscription: (publicKey) =>
        set((state) => ({
          subscriptions: state.subscriptions.map((sub) =>
            sub.publicKey === publicKey
              ? { ...sub, isActive: false, lastSyncedAt: Date.now() }
              : sub
          ),
          lastUpdated: Date.now(),
        })),

      setSubscriptions: (subscriptions) =>
        set(() => ({
          subscriptions,
          lastUpdated: Date.now(),
        })),

      syncWithBlockchain: async () => {
        set({ isLoading: true, error: null });
        try {
          const { blockchainService } = await import('@/services/blockchainService');
          const subscriptions = await blockchainService.fetchUserSubscriptions();
          set({
            subscriptions,
            isLoading: false,
            lastUpdated: Date.now(),
          });
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Sync failed',
          });
        }
      },

      // Selectors
      getSubscription: (publicKey) =>
        get().subscriptions.find((sub) => sub.publicKey === publicKey),

      getActiveSubscriptions: () =>
        get().subscriptions.filter((sub) => sub.isActive && !sub.isPaused),

      getPausedSubscriptions: () =>
        get().subscriptions.filter((sub) => sub.isActive && sub.isPaused),

      getSubscriptionsByMerchant: (merchant) =>
        get().subscriptions.filter(
          (sub) => sub.merchant === merchant && sub.isActive
        ),

      getMonthlyTotal: () => {
        return get()
          .getActiveSubscriptions()
          .reduce((total, sub) => {
            // Calculate monthly amount based on frequency
            const monthlyMultiplier = (30 * 24 * 60 * 60) / sub.frequencySeconds;
            return total + sub.amount * monthlyMultiplier;
          }, 0);
      },

      getUpcomingPayments: (days = 7) => {
        const now = Date.now() / 1000;
        const futureTimestamp = now + days * 24 * 60 * 60;

        return get()
          .getActiveSubscriptions()
          .filter(
            (sub) => sub.nextPayment >= now && sub.nextPayment <= futureTimestamp
          )
          .sort((a, b) => a.nextPayment - b.nextPayment);
      },

      filterSubscriptions: (filters) => {
        let filtered = get().subscriptions;

        if (filters.active !== undefined) {
          filtered = filtered.filter((sub) => sub.isActive === filters.active);
        }

        if (filters.paused !== undefined) {
          filtered = filtered.filter((sub) => sub.isPaused === filters.paused);
        }

        if (filters.merchant) {
          filtered = filtered.filter(
            (sub) => sub.merchant === filters.merchant
          );
        }

        if (filters.category) {
          filtered = filtered.filter(
            (sub) => sub.category === filters.category
          );
        }

        // Sorting
        if (filters.sortBy) {
          filtered.sort((a, b) => {
            const aVal = a[filters.sortBy!];
            const bVal = b[filters.sortBy!];

            if (typeof aVal === 'string' && typeof bVal === 'string') {
              return filters.sortOrder === 'desc'
                ? bVal.localeCompare(aVal)
                : aVal.localeCompare(bVal);
            }

            if (typeof aVal === 'number' && typeof bVal === 'number') {
              return filters.sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
            }

            return 0;
          });
        }

        return filtered;
      },

      // UI state
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),
    }),
    {
      name: 'lutrii-subscriptions',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        subscriptions: state.subscriptions,
        lastUpdated: state.lastUpdated,
      }),
    }
  )
);

/**
 * Subscription analytics helpers
 */
export const SubscriptionAnalytics = {
  getCategoryBreakdown: (subscriptions: Subscription[]) => {
    const breakdown: Record<string, { count: number; total: number }> = {};

    subscriptions
      .filter((sub) => sub.isActive && !sub.isPaused)
      .forEach((sub) => {
        const category = sub.category || 'Uncategorized';
        if (!breakdown[category]) {
          breakdown[category] = { count: 0, total: 0 };
        }
        breakdown[category].count += 1;
        breakdown[category].total += sub.amount;
      });

    return breakdown;
  },

  getSpendingTrend: (subscriptions: Subscription[], months = 6) => {
    // Generate monthly spending trend
    const trend: { month: string; amount: number }[] = [];
    const now = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = date.toLocaleString('default', {
        month: 'short',
        year: 'numeric',
      });

      // Calculate total for this month
      const monthTotal = subscriptions
        .filter((sub) => sub.isActive)
        .reduce((total, sub) => {
          const monthlyAmount =
            (30 * 24 * 60 * 60) / sub.frequencySeconds * sub.amount;
          return total + monthlyAmount;
        }, 0);

      trend.push({ month: monthName, amount: monthTotal });
    }

    return trend;
  },

  getSavingsVsTraditional: (subscriptions: Subscription[]) => {
    // Assume traditional subscriptions charge 2.9% + $0.30 per transaction
    const traditionalFee = 0.029;
    const traditionalFixed = 0.3;

    const lutriiTotal = subscriptions
      .filter((sub) => sub.isActive)
      .reduce((total, sub) => total + sub.amount, 0);

    const lutriiF ees = subscriptions
      .filter((sub) => sub.isActive)
      .reduce((total, sub) => {
        // Lutrii fee: 0.1% with $0.01 min and $0.50 max
        const fee = Math.max(0.01, Math.min(0.5, sub.amount * 0.001));
        return total + fee;
      }, 0);

    const traditionalFees = subscriptions
      .filter((sub) => sub.isActive)
      .reduce((total, sub) => {
        const fee = sub.amount * traditionalFee + traditionalFixed;
        return total + fee;
      }, 0);

    return {
      lutriiFees,
      traditionalFees,
      savings: traditionalFees - lutriiFees,
      savingsPercent: ((traditionalFees - lutriiFees) / traditionalFees) * 100,
    };
  },
};
