
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface AddOptionsModalProps {
  visible: boolean;
  onClose: () => void;
  onScanBook: () => void;
  onAddWord: () => void;
  onCaptureMoment: () => void;
}

export default function AddOptionsModal({
  visible,
  onClose,
  onScanBook,
  onAddWord,
  onCaptureMoment,
}: AddOptionsModalProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim1 = useRef(new Animated.Value(20)).current;
  const slideAnim2 = useRef(new Animated.Value(20)).current;
  const slideAnim3 = useRef(new Animated.Value(20)).current;
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (visible) {
      // Reset animations to initial state before animating in
      fadeAnim.setValue(0);
      slideAnim1.setValue(20);
      slideAnim2.setValue(20);
      slideAnim3.setValue(20);
      setIsProcessing(false);

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

  const handleScanBook = () => {
    if (isProcessing) return;
    
    console.log('[AddOptionsModal] Scan book pressed');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsProcessing(true);
    onScanBook();
  };

  const handleAddWord = () => {
    if (isProcessing) return;
    
    console.log('[AddOptionsModal] Add word pressed');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsProcessing(true);
    onAddWord();
  };

  const handleCaptureMoment = async () => {
    if (isProcessing) return;
    
    console.log('[AddOptionsModal] Capture moment pressed');
    console.log('[AddOptionsModal] Platform:', Platform.OS);
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Check if we're on web
    if (Platform.OS === 'web') {
      console.log('[AddOptionsModal] Web platform detected - showing alert');
      Alert.alert(
        'Camera Not Available',
        'Video recording is not supported on web. Please use Expo Go on your mobile device (scan the QR code) or build the app for iOS/Android to capture moments.',
        [{ text: 'OK' }]
      );
      onClose();
      return;
    }
    
    console.log('[AddOptionsModal] Mobile platform - proceeding with camera');
    setIsProcessing(true);
    
    // Don't close the modal immediately - let the parent handle it after camera opens
    try {
      console.log('[AddOptionsModal] Calling onCaptureMoment callback');
      await onCaptureMoment();
      console.log('[AddOptionsModal] onCaptureMoment callback completed');
    } catch (error) {
      console.error('[AddOptionsModal] Error in onCaptureMoment:', error);
      setIsProcessing(false);
      Alert.alert('Error', 'Failed to open camera. Please try again.');
    }
  };

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
                  onPress={handleScanBook}
                  activeOpacity={0.8}
                  disabled={isProcessing}
                >
                  <View style={[styles.solidButton, { backgroundColor: '#3330AF' }]}>
                    {isProcessing ? (
                      <ActivityIndicator color={colors.backgroundAlt} />
                    ) : (
                      <Text style={styles.buttonText}>Add new Book</Text>
                    )}
                  </View>
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
                  onPress={handleAddWord}
                  activeOpacity={0.8}
                  disabled={isProcessing}
                >
                  <View style={[styles.solidButton, { backgroundColor: '#F9B6E9' }]}>
                    {isProcessing ? (
                      <ActivityIndicator color="#3330AF" />
                    ) : (
                      <Text style={[styles.buttonText, { color: '#3330AF' }]}>Add new Word</Text>
                    )}
                  </View>
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
                onPress={handleCaptureMoment}
                activeOpacity={0.8}
                disabled={isProcessing}
              >
                <View style={[styles.solidButtonLarge, { backgroundColor: '#F54B02' }]}>
                  {isProcessing ? (
                    <ActivityIndicator color={colors.backgroundAlt} size="large" />
                  ) : (
                    <Text style={styles.largeButtonText}>
                      Capture new Moment{Platform.OS === 'web' ? ' (Mobile Only)' : ''}
                    </Text>
                  )}
                </View>
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
  solidButton: {
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
  solidButtonLarge: {
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
