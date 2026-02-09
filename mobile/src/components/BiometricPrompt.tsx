/**
 * BiometricPrompt Component
 *
 * Face ID / Touch ID / Fingerprint authentication prompt
 * Features: Biometric authentication with fallback to PIN
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Platform,
} from 'react-native';
import ReactNativeBiometrics, { BiometryTypes } from 'react-native-biometrics';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { BlurView } from '@react-native-community/blur';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

interface BiometricPromptProps {
  visible: boolean;
  onSuccess: () => void;
  onCancel: () => void;
  title?: string;
  subtitle?: string;
  cancelText?: string;
}

const hapticOptions = {
  enableVibrateFallback: true,
  ignoreAndroidSystemSettings: false,
};

const rnBiometrics = new ReactNativeBiometrics();

export const BiometricPrompt: React.FC<BiometricPromptProps> = ({
  visible,
  onSuccess,
  onCancel,
  title = 'Confirm Subscription',
  subtitle = 'Verify your identity to continue',
  cancelText = 'Cancel',
}) => {
  const [biometryType, setBiometryType] = useState<BiometryTypes | null>(null);
  const [authFailed, setAuthFailed] = useState(false);
  const shakeAnimation = useSharedValue(0);

  useEffect(() => {
    checkBiometrics();
  }, []);

  useEffect(() => {
    if (visible && biometryType) {
      // Auto-trigger biometric prompt when modal becomes visible
      setTimeout(() => {
        handleBiometricAuth();
      }, 300);
    }
  }, [visible, biometryType]);

  const checkBiometrics = async () => {
    try {
      const { available, biometryType: type } = await rnBiometrics.isSensorAvailable();

      if (available) {
        setBiometryType(type);
        console.log('[BiometricPrompt] Available biometry:', type);
      } else {
        console.log('[BiometricPrompt] No biometrics available');
      }
    } catch (error) {
      console.error('[BiometricPrompt] Error checking biometrics:', error);
    }
  };

  const handleBiometricAuth = async () => {
    try {
      setAuthFailed(false);

      const { success } = await rnBiometrics.simplePrompt({
        promptMessage: title,
        cancelButtonText: cancelText,
      });

      if (success) {
        ReactNativeHapticFeedback.trigger('notificationSuccess', hapticOptions);
        onSuccess();
      } else {
        handleAuthFailure();
      }
    } catch (error) {
      console.error('[BiometricPrompt] Authentication error:', error);
      handleAuthFailure();
    }
  };

  const handleAuthFailure = () => {
    setAuthFailed(true);
    ReactNativeHapticFeedback.trigger('notificationError', hapticOptions);

    // Shake animation
    shakeAnimation.value = withSequence(
      withTiming(-10, { duration: 50 }),
      withRepeat(withTiming(10, { duration: 50 }), 3, true),
      withTiming(0, { duration: 50 })
    );
  };

  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeAnimation.value }],
  }));

  const getBiometricIcon = () => {
    if (Platform.OS === 'ios') {
      return biometryType === BiometryTypes.FaceID ? '👤' : '👆';
    }
    return '🔐';
  };

  const getBiometricText = () => {
    if (Platform.OS === 'ios') {
      return biometryType === BiometryTypes.FaceID ? 'Face ID' : 'Touch ID';
    }
    return 'Fingerprint';
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onCancel}
    >
      <Animated.View
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(200)}
        style={styles.overlay}
      >
        <BlurView
          style={StyleSheet.absoluteFill}
          blurType="dark"
          blurAmount={10}
          reducedTransparencyFallbackColor="rgba(0,0,0,0.8)"
        />

        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onCancel}
        />

        <Animated.View
          entering={SlideInDown.springify().damping(20)}
          exiting={SlideOutDown.springify().damping(20)}
          style={styles.container}
        >
          <Animated.View style={[styles.content, shakeStyle]}>
            {/* Biometric Icon */}
            <View style={styles.iconContainer}>
              <Text style={styles.icon}>{getBiometricIcon()}</Text>
            </View>

            {/* Title and Subtitle */}
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>

            {/* Error Message */}
            {authFailed && (
              <Animated.View
                entering={FadeIn.duration(200)}
                style={styles.errorContainer}
              >
                <Text style={styles.errorText}>
                  Authentication failed. Please try again.
                </Text>
              </Animated.View>
            )}

            {/* Action Buttons */}
            <View style={styles.actions}>
              {biometryType && (
                <TouchableOpacity
                  style={[styles.button, styles.primaryButton]}
                  onPress={handleBiometricAuth}
                >
                  <Text style={styles.primaryButtonText}>
                    Use {getBiometricText()}
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.button, styles.secondaryButton]}
                onPress={onCancel}
              >
                <Text style={styles.secondaryButtonText}>{cancelText}</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 34, // Safe area for iPhone
  },
  content: {
    padding: 24,
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  icon: {
    fontSize: 40,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  errorContainer: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 20,
  },
  errorText: {
    fontSize: 14,
    color: '#DC2626',
    textAlign: 'center',
  },
  actions: {
    width: '100%',
    gap: 12,
  },
  button: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
  },
  secondaryButtonText: {
    fontSize: 17,
    fontWeight: '500',
    color: '#007AFF',
  },
});
