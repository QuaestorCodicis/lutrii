/**
 * Subscriptions Screen
 *
 * List of all user subscriptions with filter/sort options
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useSubscriptionStore } from '@/store/subscriptionStore';
import { SubscriptionCard, LoadingSpinner } from '@/components';
import type { MainTabScreenProps } from '@/navigation/types';

type SubscriptionsScreenProps = MainTabScreenProps<'Subscriptions'>;

export const SubscriptionsScreen: React.FC<SubscriptionsScreenProps> = ({ navigation }) => {
  const { subscriptions, isLoading } = useSubscriptionStore();

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <LoadingSpinner text="Loading subscriptions..." />
      </View>
    );
  }

  if (subscriptions.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyIcon}>📋</Text>
        <Text style={styles.emptyTitle}>No Subscriptions</Text>
        <Text style={styles.emptyText}>
          Create your first subscription to get started
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {subscriptions.map((subscription, index) => (
        <SubscriptionCard
          key={subscription.publicKey}
          subscription={subscription}
          index={index}
          onPress={() =>
            navigation.navigate('SubscriptionDetails', {
              subscriptionId: subscription.publicKey,
            })
          }
        />
      ))}
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
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
  },
});
