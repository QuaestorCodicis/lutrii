/**
 * Subscription Details Screen
 *
 * Detailed view of a subscription with actions
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useSubscriptionStore } from '@/store/subscriptionStore';
import { blockchainService } from '@/services/blockchainService';
import { ApplePayButton } from '@/components';
import type { RootStackScreenProps } from '@/navigation/types';

type SubscriptionDetailsScreenProps = RootStackScreenProps<'SubscriptionDetails'>;

export const SubscriptionDetailsScreen: React.FC<SubscriptionDetailsScreenProps> = ({
  route,
  navigation,
}) => {
  const { subscriptionId } = route.params;
  const subscription = useSubscriptionStore((state) =>
    state.subscriptions.find((sub) => sub.publicKey === subscriptionId)
  );

  const [loading, setLoading] = useState(false);

  if (!subscription) {
    return (
      <View style={styles.container}>
        <Text style={styles.error}>Subscription not found</Text>
      </View>
    );
  }

  const handlePause = async () => {
    setLoading(true);
    try {
      await blockchainService.pauseSubscription(subscription.publicKey);
    } catch (error) {
      console.error('Failed to pause subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResume = async () => {
    setLoading(true);
    try {
      await blockchainService.resumeSubscription(subscription.publicKey);
    } catch (error) {
      console.error('Failed to resume subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    setLoading(true);
    try {
      await blockchainService.cancelSubscription(subscription.publicKey);
      navigation.goBack();
    } catch (error) {
      console.error('Failed to cancel subscription:', error);
      setLoading(false);
    }
  };

  const nextPaymentDate = new Date(subscription.nextPayment * 1000).toLocaleDateString();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.merchantName}>{subscription.merchantName}</Text>
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor: subscription.isPaused
                ? '#FFA500'
                : subscription.isActive
                ? '#4CAF50'
                : '#999',
            },
          ]}
        >
          <Text style={styles.statusText}>
            {subscription.isPaused ? 'Paused' : subscription.isActive ? 'Active' : 'Inactive'}
          </Text>
        </View>
      </View>

      {/* Amount */}
      <View style={styles.amountCard}>
        <Text style={styles.amount}>${subscription.amount.toFixed(2)}</Text>
        <Text style={styles.frequency}>
          Every {subscription.frequencySeconds / (24 * 60 * 60)} days
        </Text>
      </View>

      {/* Details */}
      <View style={styles.details}>
        <DetailRow label="Next Payment" value={nextPaymentDate} />
        <DetailRow label="Total Paid" value={`$${subscription.totalPaid.toFixed(2)}`} />
        <DetailRow label="Payment Count" value={subscription.paymentCount.toString()} />
        <DetailRow
          label="Lifetime Cap"
          value={`$${subscription.lifetimeCap.toFixed(2)}`}
        />
        <DetailRow label="Created" value={new Date(subscription.createdAt * 1000).toLocaleDateString()} />
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        {subscription.isPaused ? (
          <ApplePayButton
            title="Resume Subscription"
            onPress={handleResume}
            loading={loading}
            variant="success"
          />
        ) : (
          <ApplePayButton
            title="Pause Subscription"
            onPress={handlePause}
            loading={loading}
            variant="secondary"
          />
        )}

        <TouchableOpacity
          style={styles.dangerButton}
          onPress={handleCancel}
          disabled={loading}
        >
          <Text style={styles.dangerButtonText}>Cancel Subscription</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const DetailRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.detailRow}>
    <Text style={styles.detailLabel}>{label}</Text>
    <Text style={styles.detailValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    padding: 16,
  },
  error: {
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
    marginTop: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  merchantName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  amountCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  amount: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  frequency: {
    fontSize: 16,
    color: '#6B7280',
  },
  details: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  detailLabel: {
    fontSize: 15,
    color: '#6B7280',
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1F2937',
  },
  actions: {
    gap: 12,
  },
  dangerButton: {
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  dangerButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#EF4444',
  },
});
