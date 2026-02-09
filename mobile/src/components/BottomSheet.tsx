/**
 * BottomSheet Component
 *
 * Smooth bottom sheet modal with gesture support
 * Features: Drag to dismiss, snap points, backdrop
 */

import React, { useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { BlurView } from '@react-native-community/blur';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MAX_TRANSLATE_Y = -SCREEN_HEIGHT + 50;

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  snapPoints?: number[]; // Percentages: [25, 50, 90]
  initialSnapPoint?: number;
  showHandle?: boolean;
  showBackdrop?: boolean;
  enablePanDownToClose?: boolean;
}

const hapticOptions = {
  enableVibrateFallback: true,
  ignoreAndroidSystemSettings: false,
};

const springConfig = {
  damping: 50,
  mass: 0.3,
  stiffness: 120,
  overshootClamping: false,
  restSpeedThreshold: 0.3,
  restDisplacementThreshold: 0.3,
};

export const BottomSheet: React.FC<BottomSheetProps> = ({
  visible,
  onClose,
  title,
  children,
  snapPoints = [50], // Default to 50% screen height
  initialSnapPoint = 0,
  showHandle = true,
  showBackdrop = true,
  enablePanDownToClose = true,
}) => {
  const translateY = useSharedValue(0);
  const context = useSharedValue({ y: 0 });
  const backdropOpacity = useSharedValue(0);

  // Calculate snap point positions
  const snapPositions = snapPoints.map((point) => -(SCREEN_HEIGHT * point) / 100);

  useEffect(() => {
    if (visible) {
      // Animate in
      translateY.value = withSpring(
        snapPositions[initialSnapPoint],
        springConfig
      );
      backdropOpacity.value = withTiming(1, { duration: 250 });
    } else {
      // Animate out
      translateY.value = withTiming(0, { duration: 250 });
      backdropOpacity.value = withTiming(0, { duration: 250 });
    }
  }, [visible]);

  const handleClose = () => {
    translateY.value = withTiming(0, { duration: 250 }, () => {
      runOnJS(onClose)();
    });
    backdropOpacity.value = withTiming(0, { duration: 250 });
  };

  // Snap to nearest snap point
  const snapToPoint = (velocity: number) => {
    'worklet';

    const currentY = translateY.value;

    // Find nearest snap point
    let nearestPoint = snapPositions[0];
    let minDistance = Math.abs(currentY - nearestPoint);

    snapPositions.forEach((point) => {
      const distance = Math.abs(currentY - point);
      if (distance < minDistance) {
        minDistance = distance;
        nearestPoint = point;
      }
    });

    // If dragging down past threshold, close
    if (
      enablePanDownToClose &&
      currentY > -SCREEN_HEIGHT * 0.2 &&
      velocity > 500
    ) {
      translateY.value = withSpring(0, springConfig, () => {
        runOnJS(handleClose)();
      });
      backdropOpacity.value = withTiming(0, { duration: 250 });
    } else {
      translateY.value = withSpring(nearestPoint, springConfig);
      runOnJS(ReactNativeHapticFeedback.trigger)('impactLight', hapticOptions);
    }
  };

  // Pan gesture
  const pan = Gesture.Pan()
    .onStart(() => {
      context.value = { y: translateY.value };
    })
    .onUpdate((event) => {
      const newY = context.value.y + event.translationY;

      // Constrain movement
      if (newY > 0) {
        // Add resistance when dragging down past closed position
        translateY.value = newY * 0.3;
      } else {
        translateY.value = Math.max(newY, MAX_TRANSLATE_Y);
      }

      // Update backdrop opacity
      const progress = interpolate(
        translateY.value,
        [snapPositions[snapPositions.length - 1], 0],
        [1, 0],
        Extrapolate.CLAMP
      );
      backdropOpacity.value = progress;
    })
    .onEnd((event) => {
      snapToPoint(event.velocityY);
    });

  const bottomSheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        {/* Backdrop */}
        {showBackdrop && (
          <>
            <Animated.View style={[StyleSheet.absoluteFill, backdropStyle]}>
              <BlurView
                style={StyleSheet.absoluteFill}
                blurType={Platform.OS === 'ios' ? 'dark' : 'dark'}
                blurAmount={10}
                reducedTransparencyFallbackColor="rgba(0,0,0,0.8)"
              />
            </Animated.View>

            <TouchableOpacity
              style={styles.backdrop}
              activeOpacity={1}
              onPress={handleClose}
            />
          </>
        )}

        {/* Bottom Sheet */}
        <GestureDetector gesture={pan}>
          <Animated.View style={[styles.bottomSheet, bottomSheetStyle]}>
            {/* Handle */}
            {showHandle && (
              <View style={styles.handleContainer}>
                <View style={styles.handle} />
              </View>
            )}

            {/* Title */}
            {title && (
              <View style={styles.header}>
                <Text style={styles.title}>{title}</Text>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={handleClose}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Content */}
            <View style={styles.content}>{children}</View>
          </Animated.View>
        </GestureDetector>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  bottomSheet: {
    position: 'absolute',
    top: SCREEN_HEIGHT,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: '#6B7280',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
});
