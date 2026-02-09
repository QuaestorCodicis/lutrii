/**
 * LoadingSpinner Component
 *
 * Smooth animated loading spinner with optional text
 * Features: Rotation animation, fade in/out, skeleton loader variant
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  text?: string;
  color?: string;
  variant?: 'spinner' | 'dots' | 'pulse';
  style?: ViewStyle;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'medium',
  text,
  color = '#007AFF',
  variant = 'spinner',
  style,
}) => {
  const rotation = useSharedValue(0);
  const scale1 = useSharedValue(1);
  const scale2 = useSharedValue(1);
  const scale3 = useSharedValue(1);

  // Start rotation animation
  React.useEffect(() => {
    if (variant === 'spinner') {
      rotation.value = withRepeat(
        withTiming(360, {
          duration: 1000,
          easing: Easing.linear,
        }),
        -1,
        false
      );
    } else if (variant === 'pulse') {
      const pulseAnimation = withRepeat(
        withTiming(1.2, {
          duration: 800,
          easing: Easing.inOut(Easing.ease),
        }),
        -1,
        true
      );

      scale1.value = pulseAnimation;
    } else if (variant === 'dots') {
      scale1.value = withRepeat(
        withTiming(1.5, {
          duration: 600,
          easing: Easing.inOut(Easing.ease),
        }),
        -1,
        true
      );

      setTimeout(() => {
        scale2.value = withRepeat(
          withTiming(1.5, {
            duration: 600,
            easing: Easing.inOut(Easing.ease),
          }),
          -1,
          true
        );
      }, 200);

      setTimeout(() => {
        scale3.value = withRepeat(
          withTiming(1.5, {
            duration: 600,
            easing: Easing.inOut(Easing.ease),
          }),
          -1,
          true
        );
      }, 400);
    }
  }, [variant]);

  const spinnerStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale1.value }],
  }));

  const dot1Style = useAnimatedStyle(() => ({
    transform: [{ scale: scale1.value }],
  }));

  const dot2Style = useAnimatedStyle(() => ({
    transform: [{ scale: scale2.value }],
  }));

  const dot3Style = useAnimatedStyle(() => ({
    transform: [{ scale: scale3.value }],
  }));

  // Size mappings
  const sizes = {
    small: { spinner: 20, dot: 6, container: 32 },
    medium: { spinner: 32, dot: 8, container: 48 },
    large: { spinner: 48, dot: 10, container: 64 },
  };

  const currentSize = sizes[size];

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(200)}
      style={[styles.container, style]}
    >
      {/* Spinner Variant */}
      {variant === 'spinner' && (
        <Animated.View
          style={[
            styles.spinner,
            spinnerStyle,
            {
              width: currentSize.spinner,
              height: currentSize.spinner,
              borderColor: `${color}30`,
              borderTopColor: color,
            },
          ]}
        />
      )}

      {/* Pulse Variant */}
      {variant === 'pulse' && (
        <Animated.View
          style={[
            styles.pulse,
            pulseStyle,
            {
              width: currentSize.container,
              height: currentSize.container,
              backgroundColor: color,
            },
          ]}
        />
      )}

      {/* Dots Variant */}
      {variant === 'dots' && (
        <View style={styles.dotsContainer}>
          <Animated.View
            style={[
              styles.dot,
              dot1Style,
              {
                width: currentSize.dot,
                height: currentSize.dot,
                backgroundColor: color,
              },
            ]}
          />
          <Animated.View
            style={[
              styles.dot,
              dot2Style,
              {
                width: currentSize.dot,
                height: currentSize.dot,
                backgroundColor: color,
              },
            ]}
          />
          <Animated.View
            style={[
              styles.dot,
              dot3Style,
              {
                width: currentSize.dot,
                height: currentSize.dot,
                backgroundColor: color,
              },
            ]}
          />
        </View>
      )}

      {/* Loading Text */}
      {text && (
        <Text style={[styles.text, { color }]} numberOfLines={1}>
          {text}
        </Text>
      )}
    </Animated.View>
  );
};

/**
 * Skeleton Loader Component
 * Shimmer effect for loading states
 */
export const SkeletonLoader: React.FC<{ width?: number; height?: number; style?: ViewStyle }> = ({
  width = 100,
  height = 20,
  style,
}) => {
  const shimmer = useSharedValue(0);

  React.useEffect(() => {
    shimmer.value = withRepeat(
      withTiming(1, {
        duration: 1500,
        easing: Easing.linear,
      }),
      -1,
      false
    );
  }, []);

  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: 0.3 + shimmer.value * 0.4,
  }));

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
        },
        shimmerStyle,
        style,
      ]}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  spinner: {
    borderWidth: 3,
    borderRadius: 999,
  },
  pulse: {
    borderRadius: 999,
    opacity: 0.6,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    borderRadius: 999,
  },
  text: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 4,
  },
  skeleton: {
    backgroundColor: '#E5E7EB',
    borderRadius: 8,
  },
});
