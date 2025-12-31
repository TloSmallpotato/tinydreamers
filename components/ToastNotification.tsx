
import React, { useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';

interface ToastNotificationProps {
  visible: boolean;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error' | 'saving';
  duration?: number;
  onHide?: () => void;
  showViewButton?: boolean;
  onViewPress?: () => void;
}

export default function ToastNotification({
  visible,
  message,
  type = 'info',
  duration = 4000,
  onHide,
  showViewButton = false,
  onViewPress,
}: ToastNotificationProps) {
  const translateY = useSharedValue(-100);
  const opacity = useSharedValue(0);
  const gestureTranslateY = useSharedValue(0);
  const isMountedRef = useRef(true);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = null;
      }
    };
  }, []);

  const hideToast = useCallback(() => {
    'worklet';
    if (!isMountedRef.current) return;

    translateY.value = withTiming(-100, { duration: 300 });
    opacity.value = withTiming(0, { duration: 300 }, (finished) => {
      if (finished && isMountedRef.current) {
        gestureTranslateY.value = 0;
        if (onHide) {
          runOnJS(onHide)();
        }
      }
    });
  }, [translateY, opacity, gestureTranslateY, onHide]);

  useEffect(() => {
    // Clear any existing timeout
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }

    if (visible) {
      // Show animation
      translateY.value = withTiming(0, { duration: 300 });
      opacity.value = withTiming(1, { duration: 300 });

      // Only auto-hide if NOT in saving mode
      if (type !== 'saving') {
        hideTimeoutRef.current = setTimeout(() => {
          if (isMountedRef.current) {
            hideToast();
          }
        }, duration);
      }
    } else {
      hideToast();
    }

    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = null;
      }
    };
  }, [visible, duration, type, hideToast, translateY, opacity]);

  // Swipe up gesture to dismiss
  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      'worklet';
      // Only allow upward swipes (negative translationY)
      if (event.translationY < 0) {
        gestureTranslateY.value = event.translationY;
      }
    })
    .onEnd((event) => {
      'worklet';
      // If swiped up more than 50 pixels, dismiss
      if (event.translationY < -50) {
        gestureTranslateY.value = withTiming(-200, { duration: 200 });
        opacity.value = withTiming(0, { duration: 200 }, (finished) => {
          if (finished && isMountedRef.current) {
            gestureTranslateY.value = 0;
            if (onHide) {
              runOnJS(onHide)();
            }
          }
        });
      } else {
        // Spring back to original position
        gestureTranslateY.value = withSpring(0, {
          damping: 15,
          stiffness: 150,
        });
      }
    })
    .onFinalize(() => {
      'worklet';
      // Ensure we reset if gesture is cancelled
      if (gestureTranslateY.value !== 0 && gestureTranslateY.value > -50) {
        gestureTranslateY.value = withSpring(0, {
          damping: 15,
          stiffness: 150,
        });
      }
    });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateY: translateY.value + gestureTranslateY.value }
      ],
      opacity: opacity.value,
    };
  });

  const getIconName = () => {
    switch (type) {
      case 'success':
        return { ios: 'checkmark.circle.fill', android: 'check_circle' };
      case 'warning':
        return { ios: 'exclamationmark.triangle.fill', android: 'warning' };
      case 'error':
        return { ios: 'xmark.circle.fill', android: 'error' };
      case 'saving':
        return { ios: 'arrow.down.circle.fill', android: 'download' };
      default:
        return { ios: 'info.circle.fill', android: 'info' };
    }
  };

  const getBackgroundColor = () => {
    switch (type) {
      case 'success':
        return '#4CAF50';
      case 'warning':
        return '#FF9800';
      case 'error':
        return '#F44336';
      case 'saving':
        return colors.buttonBlue;
      default:
        return colors.primary;
    }
  };

  if (!visible) {
    return null;
  }

  const iconNames = getIconName();

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View
        style={[
          styles.container,
          {
            backgroundColor: getBackgroundColor(),
          },
          animatedStyle,
        ]}
      >
        <View style={styles.content}>
          <IconSymbol
            ios_icon_name={iconNames.ios}
            android_material_icon_name={iconNames.android}
            size={24}
            color={colors.backgroundAlt}
          />
          <Text style={styles.message}>{message}</Text>
        </View>
        {showViewButton && onViewPress && (
          <TouchableOpacity onPress={onViewPress} style={styles.viewButton}>
            <Text style={styles.viewButtonText}>View</Text>
          </TouchableOpacity>
        )}
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 9999,
    elevation: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: {
        elevation: 10,
      },
      web: {
        boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.3)',
      },
    }),
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  message: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.backgroundAlt,
    lineHeight: 20,
  },
  viewButton: {
    backgroundColor: colors.backgroundAlt,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 12,
  },
  viewButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
});
