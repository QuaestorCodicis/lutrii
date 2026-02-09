/**
 * Create Subscription Screen
 *
 * Form to create a new subscription
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView } from 'react-native';
import { ApplePayButton, BiometricPrompt } from '@/components';
import { blockchainService } from '@/services/blockchainService';
import type { RootStackScreenProps } from '@/navigation/types';

type CreateSubscriptionScreenProps = RootStackScreenProps<'CreateSubscription'>;

export const CreateSubscriptionScreen: React.FC<CreateSubscriptionScreenProps> = ({
  navigation,
  route,
}) => {
  const { prefilled } = route.params || {};

  const [merchantPublicKey, setMerchantPublicKey] = useState('');
  const [merchantName, setMerchantName] = useState(prefilled?.merchantName || '');
  const [amount, setAmount] = useState(prefilled?.amount?.toString() || '');
  const [frequency, setFrequency] = useState(prefilled?.frequency?.toString() || '30');
  const [showBiometric, setShowBiometric] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    setShowBiometric(true);
  };

  const handleBiometricSuccess = async () => {
    setShowBiometric(false);
    setLoading(true);

    try {
      await blockchainService.createSubscription({
        merchantPublicKey,
        merchantName,
        amount: parseFloat(amount),
        frequencyDays: parseInt(frequency, 10),
      });

      navigation.goBack();
    } catch (error) {
      console.error('Failed to create subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.form}>
        <View style={styles.field}>
          <Text style={styles.label}>Merchant Name</Text>
          <TextInput
            style={styles.input}
            value={merchantName}
            onChangeText={setMerchantName}
            placeholder="e.g., Netflix"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Merchant Public Key</Text>
          <TextInput
            style={styles.input}
            value={merchantPublicKey}
            onChangeText={setMerchantPublicKey}
            placeholder="Solana public key"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Amount (USDC)</Text>
          <TextInput
            style={styles.input}
            value={amount}
            onChangeText={setAmount}
            placeholder="0.00"
            keyboardType="decimal-pad"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Frequency (days)</Text>
          <TextInput
            style={styles.input}
            value={frequency}
            onChangeText={setFrequency}
            placeholder="30"
            keyboardType="number-pad"
          />
        </View>
      </View>

      <ApplePayButton
        title="Create Subscription"
        subtitle={`$${amount || '0.00'} every ${frequency || '30'} days`}
        onPress={handleCreate}
        loading={loading}
        disabled={!merchantPublicKey || !merchantName || !amount || !frequency}
        style={styles.button}
      />

      <BiometricPrompt
        visible={showBiometric}
        onSuccess={handleBiometricSuccess}
        onCancel={() => setShowBiometric(false)}
        title="Confirm Subscription"
        subtitle={`${merchantName} - $${amount} every ${frequency} days`}
      />
    </ScrollView>
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
  form: {
    gap: 16,
    marginBottom: 24,
  },
  field: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1F2937',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  button: {
    marginTop: 8,
  },
});
