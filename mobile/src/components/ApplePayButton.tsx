/**
 * ApplePayButton Component
 *
 * Familiar Apple Pay-style button with smooth animations
 * Features: Press animation, loading state, success animation
 */

import React, { useState } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

interface ApplePayButtonProps {
  onPress: () => Promise<void> | void;
  title?: string;
  subtitle?: string;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'success' | 'danger';
  style?: ViewStyle;
}

const hapticOptions = {
  enableVibrateFallback: true,
  ignoreAndroidSystemSettings: false,
};

const COLORS = {
  primary: '#007AFF',
  primaryDark: '#0051D5',
  secondary: '#6B7280',
  secondaryDark: '#4B5563',
  success: '#10B981',
  successDark: '#059669',
  danger: '#EF4444',
  dangerDark: '#DC2626',
  white: '#FFFFFF',
};

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export const ApplePayButton: React.FC<ApplePayButtonProps> = ({
  onPress,
  title = 'Confirm Payment',
  subtitle,
  disabled = false,
  loading: externalLoading = false,
  variant = 'primary',
  style,
}) => {
  const [internalLoading, setInternalLoading] = useState(false);
  const scale = useSharedValue(1);
  const progress = useSharedValue(0);

  const loading = externalLoading || internalLoading;

  const handlePress = async () => {
    if (disabled || loading) return;

    // Haptic feedback
    ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);

    // Press animation
    scale.value = withSequence(
      withSpring(0.95, { damping: 15 }),
      withSpring(1, { damping: 15 })
    );

    try {
      setInternalLoading(true);
      await onPress();

      // Success animation
      progress.value = withTiming(1, { duration: 300 });
      ReactNativeHapticFeedback.trigger('notificationSuccess', hapticOptions);

      // Reset after animation
      setTimeout(() => {
        progress.value = withTiming(0, { duration: 200 });
      }, 1500);
    } catch (error) {
      // Error animation
      scale.value = withSequence(
        withSpring(1.05, { damping: 15 }),
        withSpring(1, { damping: 15 })
      );
      ReactNativeHapticFeedback.trigger('notificationError', hapticOptions);
    } finally {
      setInternalLoading(false);
    }
  };

  const animatedButtonStyle = useAnimatedStyle(() => {
    const baseColor = COLORS[variant];
    const successColor = COLORS.success;

    return {
      transform: [{ scale: scale.value }],
      backgroundColor: interpolateColor(
        progress.value,
        [0, 1],
        [baseColor, successColor]
      ),
      opacity: disabled ? 0.5 : 1,
    };
  });

  const animatedCheckStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      { scale: withSpring(progress.value) },
    ],
  }));

  return (
    <AnimatedTouchable
      style={[styles.button, animatedButtonStyle, style]}
      onPress={handlePress}
      disabled={disabled || loading}
      activeOpacity={0.9}
    >
      {loading ? (
        <ActivityIndicator color={COLORS.white} size="small" />
      ) : (
        <>
          <Animated.View style={animatedCheckStyle}>
            <Text style={styles.checkmark}>✓</Text>
          </Animated.View>
          {progress.value === 0 && (
            <>
              <Text style={styles.title}>{title}</Text>
              {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
            </>
          )}
        </>
      )}
    </AnimatedTouchable>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
    minHeight: 56,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.white,
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '400',
    color: COLORS.white,
    opacity: 0.9,
    marginTop: 2,
  },
  checkmark: {
    fontSize: 24,
    color: COLORS.white,
    fontWeight: 'bold',
  },
});
