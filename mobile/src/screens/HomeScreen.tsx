/**
 * Home Screen
 *
 * Dashboard showing overview of subscriptions, upcoming payments, and quick actions
 */

import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { MainTabScreenProps } from '@/navigation/types';
import { useWalletStore } from '@/store/walletStore';
import { useSubscriptionStore } from '@/store/subscriptionStore';
import { SubscriptionCard, LoadingSpinner } from '@/components';

type HomeScreenProps = MainTabScreenProps<'Home'>;

export const HomeScreen: React.FC<HomeScreenProps> = () => {
  const navigation = useNavigation();
  const { connected, publicKey, solBalance, usdcBalance } = useWalletStore();
  const {
    subscriptions,
    getActiveSubscriptions,
    getUpcomingPayments,
    getMonthlyTotal,
    syncWithBlockchain,
    isLoading,
  } = useSubscriptionStore();

  const [refreshing, setRefreshing] = React.useState(false);

  useEffect(() => {
    if (connected) {
      syncWithBlockchain();
    }
  }, [connected]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await syncWithBlockchain();
    setRefreshing(false);
  };

  const activeSubscriptions = getActiveSubscriptions();
  const upcomingPayments = getUpcomingPayments(7);
  const monthlyTotal = getMonthlyTotal();

  if (!connected) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🔐</Text>
          <Text style={styles.emptyTitle}>Connect Your Wallet</Text>
          <Text style={styles.emptyDescription}>
            Connect your Solana wallet to start managing subscriptions
          </Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      {/* Wallet Balance Card */}
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Total Balance</Text>
        <Text style={styles.balanceAmount}>
          ${(solBalance * 100 + usdcBalance).toFixed(2)}
        </Text>
        <View style={styles.balanceBreakdown}>
          <Text style={styles.balanceItem}>{solBalance.toFixed(4)} SOL</Text>
          <Text style={styles.balanceSeparator}>•</Text>
          <Text style={styles.balanceItem}>{usdcBalance.toFixed(2)} USDC</Text>
        </View>
      </View>

      {/* Monthly Spending Card */}
      <View style={styles.spendingCard}>
        <View style={styles.spendingHeader}>
          <Text style={styles.spendingLabel}>Monthly Spending</Text>
          <Text style={styles.spendingAmount}>
            ${monthlyTotal.toFixed(2)}
          </Text>
        </View>
        <View style={styles.spendingStats}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{activeSubscriptions.length}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{upcomingPayments.length}</Text>
            <Text style={styles.statLabel}>Due Soon</Text>
          </View>
        </View>
      </View>

      {/* Upcoming Payments */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Upcoming Payments</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Subscriptions')}>
            <Text style={styles.sectionAction}>View All</Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <LoadingSpinner text="Loading subscriptions..." />
        ) : upcomingPayments.length > 0 ? (
          upcomingPayments.slice(0, 3).map((subscription, index) => (
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
          ))
        ) : (
          <View style={styles.emptySection}>
            <Text style={styles.emptySectionText}>
              No upcoming payments in the next 7 days
            </Text>
          </View>
        )}
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={styles.quickAction}
          onPress={() => navigation.navigate('CreateSubscription', {})}
        >
          <Text style={styles.quickActionIcon}>➕</Text>
          <Text style={styles.quickActionText}>New Subscription</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickAction}
          onPress={() => navigation.navigate('ScanQR')}
        >
          <Text style={styles.quickActionIcon}>📱</Text>
          <Text style={styles.quickActionText}>Scan QR</Text>
        </TouchableOpacity>
      </View>
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
  balanceCard: {
    backgroundColor: '#6366F1',
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
  },
  balanceLabel: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.8,
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  balanceBreakdown: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  balanceItem: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  balanceSeparator: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.5,
    marginHorizontal: 8,
  },
  spendingCard: {
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
  spendingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  spendingLabel: {
    fontSize: 16,
    color: '#6B7280',
  },
  spendingAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  spendingStats: {
    flexDirection: 'row',
    gap: 24,
  },
  stat: {
    flex: 1,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
  },
  sectionAction: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  emptySection: {
    padding: 32,
    alignItems: 'center',
  },
  emptySectionText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  quickAction: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  quickActionIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  emptyState: {
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
  emptyDescription: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
  },
});
