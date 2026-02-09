/**
 * SubscriptionCard Component
 *
 * Animated card displaying subscription details
 * Features: Smooth animations, haptic feedback, swipe actions
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  withSpring,
  useSharedValue,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import type { Subscription } from '@/store/subscriptionStore';

interface SubscriptionCardProps {
  subscription: Subscription;
  onPress?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onCancel?: () => void;
  index?: number;
}

const hapticOptions = {
  enableVibrateFallback: true,
  ignoreAndroidSystemSettings: false,
};

export const SubscriptionCard: React.FC<SubscriptionCardProps> = ({
  subscription,
  onPress,
  onPause,
  onResume,
  onCancel,
  index = 0,
}) => {
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const pressed = useSharedValue(false);

  // Calculate days until next payment
  const daysUntilPayment = Math.ceil(
    (subscription.nextPayment * 1000 - Date.now()) / (1000 * 60 * 60 * 24)
  );

  // Format next payment date
  const nextPaymentDate = new Date(subscription.nextPayment * 1000).toLocaleDateString(
    'en-US',
    { month: 'short', day: 'numeric', year: 'numeric' }
  );

  // Format frequency
  const frequencyText = (() => {
    const days = subscription.frequencySeconds / (24 * 60 * 60);
    if (days === 1) return 'Daily';
    if (days === 7) return 'Weekly';
    if (days === 14) return 'Bi-weekly';
    if (days === 30 || days === 31) return 'Monthly';
    if (days === 365) return 'Yearly';
    return `Every ${Math.round(days)} days`;
  })();

  // Press animation
  const tap = Gesture.Tap()
    .onBegin(() => {
      pressed.value = true;
      scale.value = withSpring(0.95);
      ReactNativeHapticFeedback.trigger('impactLight', hapticOptions);
    })
    .onFinalize(() => {
      pressed.value = false;
      scale.value = withSpring(1);
      if (onPress) onPress();
    });

  // Swipe gesture for actions
  const pan = Gesture.Pan()
    .onUpdate((event) => {
      translateX.value = Math.max(-100, Math.min(0, event.translationX));
    })
    .onEnd(() => {
      if (translateX.value < -50) {
        // Show action buttons
        translateX.value = withSpring(-80);
        ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
      } else {
        translateX.value = withSpring(0);
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { translateX: translateX.value },
    ],
    opacity: subscription.isPaused ? 0.7 : 1,
  }));

  const actionButtonsStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [-80, 0],
      [1, 0],
      Extrapolate.CLAMP
    ),
  }));

  // Get status color
  const statusColor = subscription.isPaused
    ? '#FFA500'
    : subscription.isActive
    ? '#4CAF50'
    : '#999';

  return (
    <View style={styles.container}>
      <GestureDetector gesture={pan}>
        <Animated.View
          entering={FadeInDown.delay(index * 100)}
          style={[styles.card, animatedStyle]}
        >
          <GestureDetector gesture={tap}>
            <View style={styles.content}>
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.merchantInfo}>
                  <View
                    style={[
                      styles.logo,
                      { backgroundColor: subscription.color || '#6366F1' },
                    ]}
                  >
                    <Text style={styles.logoText}>
                      {subscription.merchantName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.merchantDetails}>
                    <Text style={styles.merchantName}>
                      {subscription.merchantName}
                    </Text>
                    <Text style={styles.frequency}>{frequencyText}</Text>
                  </View>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
                  <Text style={styles.statusText}>
                    {subscription.isPaused ? 'Paused' : 'Active'}
                  </Text>
                </View>
              </View>

              {/* Amount */}
              <View style={styles.amountSection}>
                <Text style={styles.amount}>${subscription.amount.toFixed(2)}</Text>
                <Text style={styles.amountLabel}>per payment</Text>
              </View>

              {/* Next Payment */}
              <View style={styles.footer}>
                <View style={styles.nextPayment}>
                  <Text style={styles.nextPaymentLabel}>Next payment</Text>
                  <Text style={styles.nextPaymentDate}>
                    {subscription.isPaused ? 'Paused' : nextPaymentDate}
                  </Text>
                </View>
                {!subscription.isPaused && (
                  <View
                    style={[
                      styles.daysIndicator,
                      {
                        backgroundColor:
                          daysUntilPayment <= 3 ? '#FEE2E2' : '#E0E7FF',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.daysText,
                        {
                          color: daysUntilPayment <= 3 ? '#DC2626' : '#4F46E5',
                        },
                      ]}
                    >
                      {daysUntilPayment}d
                    </Text>
                  </View>
                )}
              </View>

              {/* Payment Count */}
              <View style={styles.stats}>
                <Text style={styles.statsText}>
                  {subscription.paymentCount} payments • $
                  {subscription.totalPaid.toFixed(2)} total
                </Text>
              </View>
            </View>
          </GestureDetector>
        </Animated.View>
      </GestureDetector>

      {/* Action Buttons (shown on swipe) */}
      <Animated.View style={[styles.actionButtons, actionButtonsStyle]}>
        {subscription.isPaused ? (
          <TouchableOpacity
            style={[styles.actionButton, styles.resumeButton]}
            onPress={() => {
              translateX.value = withSpring(0);
              ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
              onResume?.();
            }}
          >
            <Text style={styles.actionButtonText}>Resume</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.actionButton, styles.pauseButton]}
            onPress={() => {
              translateX.value = withSpring(0);
              ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
              onPause?.();
            }}
          >
            <Text style={styles.actionButtonText}>Pause</Text>
          </TouchableOpacity>
        )}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  content: {
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  merchantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  logo: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  merchantDetails: {
    flex: 1,
  },
  merchantName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  frequency: {
    fontSize: 14,
    color: '#6B7280',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  amountSection: {
    paddingVertical: 8,
  },
  amount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  amountLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nextPayment: {
    flex: 1,
  },
  nextPaymentLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  nextPaymentDate: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  daysIndicator: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  daysText: {
    fontSize: 14,
    fontWeight: '600',
  },
  stats: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  statsText: {
    fontSize: 12,
    color: '#6B7280',
  },
  actionButtons: {
    position: 'absolute',
    right: 16,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 70,
    alignItems: 'center',
  },
  pauseButton: {
    backgroundColor: '#FFA500',
  },
  resumeButton: {
    backgroundColor: '#4CAF50',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
