/**
 * MMKV Storage Utility - SECURE VERSION
 *
 * Ultra-fast encrypted storage (100x faster than SQLite)
 * Perfect for mobile-first apps with frequent reads/writes
 *
 * SECURITY: Uses device-unique encryption key stored in system keychain
 */

import { MMKV } from 'react-native-mmkv';
import * as Keychain from 'react-native-keychain';
import { randomBytes } from 'react-native-randombytes';

const SERVICE_NAME = 'lutrii-storage-encryption';

/**
 * Generate or retrieve device-unique encryption key from secure keychain
 *
 * SECURITY FEATURES:
 * - Device-unique 256-bit (32-byte) random key
 * - Stored in iOS Keychain / Android Keystore
 * - Hardware-backed security (when available)
 * - Only accessible when device unlocked
 */
async function getOrCreateEncryptionKey(): Promise<string> {
  try {
    // Try to retrieve existing key
    const credentials = await Keychain.getGenericPassword({
      service: SERVICE_NAME,
    });

    if (credentials) {
      return credentials.password;
    }

    // Generate new 256-bit encryption key
    const keyBytes = await new Promise<Uint8Array>((resolve, reject) => {
      randomBytes(32, (error: Error | null, bytes: Uint8Array) => {
        if (error) reject(error);
        else resolve(bytes);
      });
    });

    const key = Buffer.from(keyBytes).toString('base64');

    // Store in secure keychain
    await Keychain.setGenericPassword('encryption', key, {
      service: SERVICE_NAME,
      accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED,
      securityLevel: Keychain.SECURITY_LEVEL.SECURE_HARDWARE,
    });

    return key;
  } catch (error) {
    console.error('Encryption key generation failed:', error);
    throw new Error('Storage initialization failed');
  }
}

let storageInstance: MMKV | null = null;

/**
 * Initialize secure storage with device-unique encryption
 *
 * MUST be called before using storage (typically in App.tsx on startup)
 *
 * @example
 * ```typescript
 * useEffect(() => {
 *   async function init() {
 *     await initializeStorage();
 *     // Now safe to use storage
 *   }
 *   init();
 * }, []);
 * ```
 */
export async function initializeStorage(): Promise<MMKV> {
  if (storageInstance) return storageInstance;

  const encryptionKey = await getOrCreateEncryptionKey();

  storageInstance = new MMKV({
    id: 'lutrii-storage',
    encryptionKey: encryptionKey, // ✅ Device-unique encryption!
  });

  return storageInstance;
}

/**
 * Get storage instance (must call initializeStorage() first)
 *
 * @throws Error if storage not initialized
 */
export function getStorage(): MMKV {
  if (!storageInstance) {
    throw new Error('Storage not initialized. Call initializeStorage() first.');
  }
  return storageInstance;
}

/**
 * Zustand persistence storage adapter
 *
 * NOTE: Zustand stores should only be created AFTER initializeStorage() completes
 */
export const zustandStorage = {
  getItem: (name: string): string | null => {
    const value = getStorage().getString(name);
    return value ?? null;
  },
  setItem: (name: string, value: string): void => {
    getStorage().set(name, value);
  },
  removeItem: (name: string): void => {
    getStorage().delete(name);
  },
};

/**
 * Type-safe storage keys
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
    getStorage().set(`delivery_${merchantPubkey}`, encryptedAddress);
  }

  /**
   * Retrieve encrypted delivery address
   */
  static getDeliveryAddress(merchantPubkey: string): string | null {
    return getStorage().getString(`delivery_${merchantPubkey}`) ?? null;
  }

  /**
   * Delete delivery address
   */
  static deleteDeliveryAddress(merchantPubkey: string): void {
    getStorage().delete(`delivery_${merchantPubkey}`);
  }

  /**
   * Clear all sensitive data
   */
  static clearAll(): void {
    getStorage().clearAll();
  }
}

/**
 * Performance monitoring
 */
export class StorageMetrics {
  static getSize(): number {
    // MMKV doesn't provide size directly, but we can estimate
    const keys = getStorage().getAllKeys();
    return keys.length;
  }

  static logStats(): void {
    const keys = getStorage().getAllKeys();
    console.log('[Storage] Total keys:', keys.length);
    console.log('[Storage] Keys:', keys);
  }
}
