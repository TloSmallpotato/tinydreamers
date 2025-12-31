
import React, { useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';

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
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const gestureTranslateY = useRef(new Animated.Value(0)).current;

  const hideToast = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      gestureTranslateY.setValue(0);
      if (onHide) {
        onHide();
      }
    });
  }, [translateY, opacity, gestureTranslateY, onHide]);

  useEffect(() => {
    if (visible) {
      // Show animation
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Only auto-hide if NOT in saving mode
      if (type !== 'saving') {
        const timer = setTimeout(() => {
          hideToast();
        }, duration);

        return () => clearTimeout(timer);
      }
    } else {
      hideToast();
    }
  }, [visible, duration, hideToast, translateY, opacity, type]);

  // Swipe up gesture to dismiss
  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      // Only allow upward swipes (negative translationY)
      if (event.translationY < 0) {
        gestureTranslateY.setValue(event.translationY);
      }
    })
    .onEnd((event) => {
      // If swiped up more than 50 pixels, dismiss
      if (event.translationY < -50) {
        Animated.parallel([
          Animated.timing(gestureTranslateY, {
            toValue: -200,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start(() => {
          gestureTranslateY.setValue(0);
          if (onHide) {
            onHide();
          }
        });
      } else {
        // Spring back to original position
        Animated.spring(gestureTranslateY, {
          toValue: 0,
          useNativeDriver: true,
          damping: 15,
          stiffness: 150,
        }).start();
      }
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
            transform: [
              { translateY: Animated.add(translateY, gestureTranslateY) }
            ],
            opacity,
          },
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
    boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.3)',
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
