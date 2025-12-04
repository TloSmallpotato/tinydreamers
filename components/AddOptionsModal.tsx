
import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
} from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface AddOptionsModalProps {
  visible: boolean;
  onClose: () => void;
  onAddBook: () => void;
  onAddWord: () => void;
  onCaptureMoment: () => void;
}

export default function AddOptionsModal({
  visible,
  onClose,
  onAddBook,
  onAddWord,
  onCaptureMoment,
}: AddOptionsModalProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim1 = useRef(new Animated.Value(20)).current;
  const slideAnim2 = useRef(new Animated.Value(20)).current;
  const slideAnim3 = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim1, {
          toValue: 0,
          tension: 80,
          friction: 8,
          delay: 50,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim2, {
          toValue: 0,
          tension: 80,
          friction: 8,
          delay: 100,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim3, {
          toValue: 0,
          tension: 80,
          friction: 8,
          delay: 150,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim1, {
          toValue: 20,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim2, {
          toValue: 20,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim3, {
          toValue: 20,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, fadeAnim, slideAnim1, slideAnim2, slideAnim3]);

  if (!visible) {
    return null;
  }

  return (
    <TouchableWithoutFeedback onPress={onClose}>
      <Animated.View
        style={[
          styles.overlay,
          {
            opacity: fadeAnim,
          },
        ]}
      >
        <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
          <View style={styles.floatingButtonsContainer}>
            {/* First Row: Add Book and Add Word */}
            <View style={styles.firstRow}>
              <Animated.View
                style={[
                  styles.buttonWrapper,
                  {
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim1 }],
                  },
                ]}
              >
                <TouchableOpacity
                  style={styles.smallButton}
                  onPress={onAddBook}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#4A4A8A', '#6B5B95']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.gradientButton}
                  >
                    <Text style={styles.buttonText}>Add a new book</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>

              <Animated.View
                style={[
                  styles.buttonWrapper,
                  {
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim2 }],
                  },
                ]}
              >
                <TouchableOpacity
                  style={styles.smallButton}
                  onPress={onAddWord}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#8B4A5A', '#A0616A']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.gradientButton}
                  >
                    <Text style={styles.buttonText}>Add a new word</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>
            </View>

            {/* Second Row: Capture Moment */}
            <Animated.View
              style={[
                styles.largeButtonWrapper,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim3 }],
                },
              ]}
            >
              <TouchableOpacity
                style={styles.largeButton}
                onPress={onCaptureMoment}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#2C5F5F', '#4A7C7C', '#6B9999']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.gradientButtonLarge}
                >
                  <Text style={styles.largeButtonText}>Capture a new moment</Text>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </TouchableWithoutFeedback>
      </Animated.View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
    alignItems: 'center',
    zIndex: 9999,
  },
  floatingButtonsContainer: {
    position: 'absolute',
    bottom: 110,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    gap: 12,
  },
  firstRow: {
    flexDirection: 'row',
    gap: 12,
  },
  buttonWrapper: {
    flex: 1,
  },
  smallButton: {
    height: 80,
    borderRadius: 20,
    overflow: 'hidden',
    boxShadow: '0px 4px 16px rgba(0, 0, 0, 0.3)',
    elevation: 8,
  },
  gradientButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.backgroundAlt,
    textAlign: 'center',
  },
  largeButtonWrapper: {
    width: '100%',
  },
  largeButton: {
    height: 100,
    borderRadius: 20,
    overflow: 'hidden',
    boxShadow: '0px 4px 16px rgba(0, 0, 0, 0.3)',
    elevation: 8,
  },
  gradientButtonLarge: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  largeButtonText: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.backgroundAlt,
    textAlign: 'center',
  },
});
