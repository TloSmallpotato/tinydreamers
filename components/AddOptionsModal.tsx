
import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

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
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.8,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 50,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, fadeAnim, scaleAnim, slideAnim]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <Animated.View
            style={[
              styles.overlayBackground,
              {
                opacity: fadeAnim,
              },
            ]}
          >
            <BlurView intensity={20} style={StyleSheet.absoluteFill} />
          </Animated.View>

          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                styles.modalContainer,
                {
                  opacity: fadeAnim,
                  transform: [
                    { scale: scaleAnim },
                    { translateY: slideAnim },
                  ],
                },
              ]}
            >
              <View style={styles.modalContent}>
                <View style={styles.header}>
                  <Text style={styles.headerTitle}>Add New</Text>
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={onClose}
                    activeOpacity={0.7}
                  >
                    <IconSymbol
                      ios_icon_name="xmark"
                      android_material_icon_name="close"
                      size={24}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>
                </View>

                <View style={styles.optionsContainer}>
                  {/* First Row: Add Book and Add Word */}
                  <View style={styles.firstRow}>
                    <TouchableOpacity
                      style={styles.smallButton}
                      onPress={onAddBook}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.iconContainer, { backgroundColor: colors.secondary }]}>
                        <IconSymbol
                          ios_icon_name="book.fill"
                          android_material_icon_name="menu-book"
                          size={32}
                          color={colors.backgroundAlt}
                        />
                      </View>
                      <Text style={styles.buttonLabel}>Add a book</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.smallButton}
                      onPress={onAddWord}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.iconContainer, { backgroundColor: colors.accent }]}>
                        <IconSymbol
                          ios_icon_name="text.bubble.fill"
                          android_material_icon_name="chat-bubble"
                          size={32}
                          color={colors.backgroundAlt}
                        />
                      </View>
                      <Text style={styles.buttonLabel}>Add a word</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Second Row: Capture a Moment (Larger) */}
                  <TouchableOpacity
                    style={styles.largeButton}
                    onPress={onCaptureMoment}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.largeIconContainer, { backgroundColor: colors.primary }]}>
                      <IconSymbol
                        ios_icon_name="video.fill"
                        android_material_icon_name="videocam"
                        size={48}
                        color={colors.backgroundAlt}
                      />
                    </View>
                    <Text style={styles.largeButtonLabel}>Capture a moment</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    width: SCREEN_WIDTH * 0.85,
    maxWidth: 400,
    backgroundColor: colors.backgroundAlt,
    borderRadius: 24,
    overflow: 'hidden',
    boxShadow: '0px 10px 40px rgba(0, 0, 0, 0.3)',
    elevation: 10,
  },
  modalContent: {
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionsContainer: {
    gap: 16,
  },
  firstRow: {
    flexDirection: 'row',
    gap: 16,
  },
  smallButton: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 140,
    boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.08)',
    elevation: 3,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  largeButton: {
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 160,
    boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.08)',
    elevation: 3,
  },
  largeIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  largeButtonLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
});
