
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Dimensions } from 'react-native';
import { colors } from '@/styles/commonStyles';
import { ScallopedBadge } from './ScallopedBadge';
import ConfettiCannon from 'react-native-confetti-cannon';
import * as Haptics from 'expo-haptics';
import type { Milestone } from './BadgeDetailBottomSheet';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface AchievementUnlockModalProps {
  visible: boolean;
  milestone: Milestone | null;
  onClose: () => void;
}

export const AchievementUnlockModal: React.FC<AchievementUnlockModalProps> = ({
  visible,
  milestone,
  onClose,
}) => {
  const confettiRef = useRef<any>(null);

  useEffect(() => {
    if (visible && milestone) {
      console.log('AchievementUnlockModal: Showing achievement modal');
      // Trigger haptic feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Trigger confetti
      if (confettiRef.current) {
        confettiRef.current.start();
      }
    }
  }, [visible, milestone]);

  if (!milestone) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Confetti */}
          <ConfettiCannon
            ref={confettiRef}
            count={200}
            origin={{ x: screenWidth / 2, y: screenHeight / 2 }}
            autoStart={false}
            fadeOut={true}
            fallSpeed={3000}
          />

          {/* Content */}
          <View style={styles.content}>
            <Text style={styles.header}>🎉 Milestone Unlocked!</Text>
            
            {/* Large Badge */}
            <View style={styles.badgeContainer}>
              <ScallopedBadge
                color={milestone.color}
                size={200}
                locked={false}
                lockedImage={milestone.lockedImage}
                unlockedImage={milestone.unlockedImage}
              />
            </View>

            {/* Milestone Name */}
            <Text style={styles.milestoneName}>{milestone.name}</Text>

            {/* Description */}
            <Text style={styles.description}>{milestone.description}</Text>

            {/* Continue Button */}
            <TouchableOpacity
              style={styles.continueButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                onClose();
              }}
            >
              <Text style={styles.continueButtonText}>Continue</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: screenWidth * 0.9,
    maxWidth: 400,
    backgroundColor: colors.backgroundAlt,
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    width: '100%',
  },
  header: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.primary,
    textAlign: 'center',
    marginBottom: 24,
  },
  badgeContainer: {
    marginBottom: 24,
  },
  milestoneName: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: colors.text,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  continueButton: {
    backgroundColor: colors.buttonBlue,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 48,
    width: '100%',
  },
  continueButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.backgroundAlt,
    textAlign: 'center',
  },
});
