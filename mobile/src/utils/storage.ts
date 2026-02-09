/**
 * MMKV Storage Utility
 *
 * Ultra-fast encrypted storage (100x faster than SQLite)
 * Perfect for mobile-first apps with frequent reads/writes
 */

import { MMKV } from 'react-native-mmkv';

// Initialize MMKV with encryption
export const storage = new MMKV({
  id: 'lutrii-storage',
  encryptionKey: 'lutrii-encrypted-storage-key', // In production, derive from device keychain
});

/**
 * Zustand persistence storage adapter
 */
export const zustandStorage = {
  getItem: (name: string): string | null => {
    const value = storage.getString(name);
    return value ?? null;
  },
  setItem: (name: string, value: string): void => {
    storage.set(name, value);
  },
  removeItem: (name: string): void => {
    storage.delete(name);
  },
};

/**
 * Type-safe storage helpers
 */
export const StorageKeys = {
  // Wallet
  WALLET_ADDRESS: 'wallet_address',
  WALLET_CONNECTED: 'wallet_connected',

  // Subscriptions (stored locally for quick access)
  SUBSCRIPTIONS: 'subscriptions',
  SUBSCRIPTION_CACHE: 'subscription_cache',

  // User preferences
  NOTIFICATIONS_ENABLED: 'notifications_enabled',
  BIOMETRIC_ENABLED: 'biometric_enabled',
  SMS_ENABLED: 'sms_enabled',
  PHONE_NUMBER: 'phone_number',

  // Onboarding
  ONBOARDING_COMPLETED: 'onboarding_completed',
  FIRST_LAUNCH: 'first_launch',

  // Security
  FAILED_AUTH_ATTEMPTS: 'failed_auth_attempts',
  LAST_AUTH_TIME: 'last_auth_time',

  // Referral
  REFERRAL_CODE: 'referral_code',
  REFERRED_BY: 'referred_by',

  // Analytics cache
  SPENDING_ANALYTICS: 'spending_analytics',
  LAST_ANALYTICS_UPDATE: 'last_analytics_update',
} as const;

/**
 * Encrypted storage for sensitive data
 */
export class SecureStorage {
  /**
   * Store encrypted delivery address
   */
  static setDeliveryAddress(merchantPubkey: string, encryptedAddress: string): void {
    storage.set(`delivery_${merchantPubkey}`, encryptedAddress);
  }

  /**
   * Retrieve encrypted delivery address
   */
  static getDeliveryAddress(merchantPubkey: string): string | null {
    return storage.getString(`delivery_${merchantPubkey}`) ?? null;
  }

  /**
   * Delete delivery address
   */
  static deleteDeliveryAddress(merchantPubkey: string): void {
    storage.delete(`delivery_${merchantPubkey}`);
  }

  /**
   * Clear all sensitive data
   */
  static clearAll(): void {
    storage.clearAll();
  }
}

/**
 * Performance monitoring
 */
export class StorageMetrics {
  static getSize(): number {
    // MMKV doesn't provide size directly, but we can estimate
    const keys = storage.getAllKeys();
    return keys.length;
  }

  static logStats(): void {
    const keys = storage.getAllKeys();
    console.log('[Storage] Total keys:', keys.length);
    console.log('[Storage] Keys:', keys);
  }
}
