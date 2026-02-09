/**
 * Profile Screen
 *
 * User profile and settings
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useWalletStore } from '@/store/walletStore';
import type { MainTabScreenProps } from '@/navigation/types';

type ProfileScreenProps = MainTabScreenProps<'Profile'>;

export const ProfileScreen: React.FC<ProfileScreenProps> = () => {
  const { connected, publicKey, disconnect } = useWalletStore();

  const handleDisconnect = async () => {
    await disconnect();
  };

  return (
    <View style={styles.container}>
      {connected && publicKey ? (
        <View style={styles.content}>
          <View style={styles.walletInfo}>
            <Text style={styles.label}>Connected Wallet</Text>
            <Text style={styles.address}>
              {publicKey.slice(0, 4)}...{publicKey.slice(-4)}
            </Text>
          </View>

          <TouchableOpacity style={styles.disconnectButton} onPress={handleDisconnect}>
            <Text style={styles.disconnectButtonText}>Disconnect</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.centered}>
          <Text style={styles.icon}>👤</Text>
          <Text style={styles.title}>Profile</Text>
          <Text style={styles.subtitle}>Connect wallet to view profile</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    padding: 16,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  walletInfo: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  label: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  address: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  disconnectButton: {
    backgroundColor: '#EF4444',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  disconnectButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  icon: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#6B7280',
  },
});
