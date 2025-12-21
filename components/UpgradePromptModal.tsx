
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from './IconSymbol';
import { HapticFeedback } from '@/utils/haptics';
import { useSubscription, QUOTA_LIMITS } from '@/contexts/SubscriptionContext';

interface UpgradePromptModalProps {
  visible: boolean;
  onClose: () => void;
  quotaType: 'word' | 'book' | 'child';
}

const QUOTA_MESSAGES = {
  word: {
    title: 'Word Limit Reached',
    message: 'You\'ve reached the free tier limit of 20 words.',
    benefit: 'Upgrade to Plus for unlimited words!',
  },
  book: {
    title: 'Book Limit Reached',
    message: 'You\'ve reached the free tier limit of 10 books.',
    benefit: 'Upgrade to Plus for unlimited books!',
  },
  child: {
    title: 'Child Limit Reached',
    message: 'You\'ve reached the free tier limit of 1 child.',
    benefit: 'Upgrade to Plus to add up to 2 children!',
  },
};

export default function UpgradePromptModal({ visible, onClose, quotaType }: UpgradePromptModalProps) {
  const { showPaywall } = useSubscription();
  const message = QUOTA_MESSAGES[quotaType];

  const handleUpgrade = async () => {
    HapticFeedback.medium();
    onClose();
    
    // Show RevenueCat paywall
    await showPaywall();
  };

  const handleClose = () => {
    HapticFeedback.light();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <IconSymbol
              ios_icon_name="xmark"
              android_material_icon_name="close"
              size={24}
              color={colors.textSecondary}
            />
          </TouchableOpacity>

          <View style={styles.iconContainer}>
            <IconSymbol
              ios_icon_name="crown.fill"
              android_material_icon_name="workspace-premium"
              size={64}
              color={colors.accent}
            />
          </View>

          <Text style={styles.title}>{message.title}</Text>
          <Text style={styles.message}>{message.message}</Text>
          <Text style={styles.benefit}>{message.benefit}</Text>

          <View style={styles.comparisonContainer}>
            <View style={styles.tierCard}>
              <Text style={styles.tierTitle}>Free</Text>
              <View style={styles.tierFeature}>
                <IconSymbol
                  ios_icon_name="checkmark.circle.fill"
                  android_material_icon_name="check-circle"
                  size={20}
                  color={colors.cardGreen}
                />
                <Text style={styles.tierFeatureText}>20 words</Text>
              </View>
              <View style={styles.tierFeature}>
                <IconSymbol
                  ios_icon_name="checkmark.circle.fill"
                  android_material_icon_name="check-circle"
                  size={20}
                  color={colors.cardGreen}
                />
                <Text style={styles.tierFeatureText}>10 books</Text>
              </View>
              <View style={styles.tierFeature}>
                <IconSymbol
                  ios_icon_name="checkmark.circle.fill"
                  android_material_icon_name="check-circle"
                  size={20}
                  color={colors.cardGreen}
                />
                <Text style={styles.tierFeatureText}>1 child</Text>
              </View>
            </View>

            <View style={[styles.tierCard, styles.plusCard]}>
              <View style={styles.plusBadge}>
                <Text style={styles.plusBadgeText}>PLUS</Text>
              </View>
              <Text style={styles.tierTitle}>Plus</Text>
              <View style={styles.tierFeature}>
                <IconSymbol
                  ios_icon_name="checkmark.circle.fill"
                  android_material_icon_name="check-circle"
                  size={20}
                  color={colors.buttonBlue}
                />
                <Text style={styles.tierFeatureTextBold}>Unlimited words</Text>
              </View>
              <View style={styles.tierFeature}>
                <IconSymbol
                  ios_icon_name="checkmark.circle.fill"
                  android_material_icon_name="check-circle"
                  size={20}
                  color={colors.buttonBlue}
                />
                <Text style={styles.tierFeatureTextBold}>Unlimited books</Text>
              </View>
              <View style={styles.tierFeature}>
                <IconSymbol
                  ios_icon_name="checkmark.circle.fill"
                  android_material_icon_name="check-circle"
                  size={20}
                  color={colors.buttonBlue}
                />
                <Text style={styles.tierFeatureTextBold}>2 children</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity style={styles.upgradeButton} onPress={handleUpgrade}>
            <Text style={styles.upgradeButtonText}>Upgrade to Plus</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
            <Text style={styles.cancelButtonText}>Maybe Later</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  iconContainer: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: 8,
    textAlign: 'center',
  },
  benefit: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.buttonBlue,
    marginBottom: 24,
    textAlign: 'center',
  },
  comparisonContainer: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginBottom: 24,
  },
  tierCard: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: colors.background,
  },
  plusCard: {
    borderColor: colors.buttonBlue,
    position: 'relative',
  },
  plusBadge: {
    position: 'absolute',
    top: -8,
    right: 8,
    backgroundColor: colors.buttonBlue,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  plusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.backgroundAlt,
  },
  tierTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 12,
  },
  tierFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  tierFeatureText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  tierFeatureTextBold: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  upgradeButton: {
    backgroundColor: colors.buttonBlue,
    borderRadius: 24,
    paddingVertical: 16,
    paddingHorizontal: 32,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  upgradeButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.backgroundAlt,
  },
  cancelButton: {
    paddingVertical: 12,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
});
