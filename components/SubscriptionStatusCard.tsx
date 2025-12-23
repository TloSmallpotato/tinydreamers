
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from './IconSymbol';
import { HapticFeedback } from '@/utils/haptics';
import { useSubscription, QUOTA_LIMITS } from '@/contexts/SubscriptionContext';
import Constants from 'expo-constants';

const isExpoGo = Constants.appOwnership === 'expo';

export default function SubscriptionStatusCard() {
  const { 
    tier, 
    isSubscribed, 
    currentUsage, 
    remainingWords, 
    remainingBooks, 
    remainingChildren,
    showPaywall,
    showCustomerCenter,
  } = useSubscription();

  const handleUpgrade = async () => {
    console.log('========================================');
    console.log('SubscriptionStatusCard: Upgrade button pressed');
    console.log('Is Expo Go:', isExpoGo);
    console.log('========================================');
    
    HapticFeedback.medium();
    
    try {
      console.log('SubscriptionStatusCard: Calling showPaywall()...');
      await showPaywall();
      console.log('SubscriptionStatusCard: ✓ showPaywall() completed');
    } catch (error) {
      console.error('SubscriptionStatusCard: ✗ Error in handleUpgrade:', error);
    }
  };

  const handleManageSubscription = async () => {
    HapticFeedback.medium();
    await showCustomerCenter();
  };

  if (isSubscribed) {
    return (
      <View style={[styles.container, styles.proContainer]}>
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <IconSymbol
              ios_icon_name="crown.fill"
              android_material_icon_name="workspace-premium"
              size={32}
              color={colors.accent}
            />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.title}>Pro Member</Text>
            <Text style={styles.subtitle}>Unlimited access to all features</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <IconSymbol
              ios_icon_name="text.bubble.fill"
              android_material_icon_name="chat-bubble"
              size={20}
              color={colors.buttonBlue}
            />
            <Text style={styles.statText}>Unlimited words</Text>
          </View>
          <View style={styles.statItem}>
            <IconSymbol
              ios_icon_name="book.fill"
              android_material_icon_name="menu-book"
              size={20}
              color={colors.buttonBlue}
            />
            <Text style={styles.statText}>Unlimited books</Text>
          </View>
          <View style={styles.statItem}>
            <IconSymbol
              ios_icon_name="person.2.fill"
              android_material_icon_name="people"
              size={20}
              color={colors.buttonBlue}
            />
            <Text style={styles.statText}>2 children</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.manageButton} onPress={handleManageSubscription}>
          <IconSymbol
            ios_icon_name="gearshape.fill"
            android_material_icon_name="settings"
            size={18}
            color={colors.buttonBlue}
          />
          <Text style={styles.manageButtonText}>Manage Subscription</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>Free Plan</Text>
          <Text style={styles.subtitle}>Upgrade to unlock unlimited features</Text>
        </View>
      </View>

      {isExpoGo && (
        <View style={styles.expoGoWarning}>
          <IconSymbol
            ios_icon_name="exclamationmark.triangle.fill"
            android_material_icon_name="warning"
            size={20}
            color={colors.secondary}
          />
          <Text style={styles.expoGoWarningText}>
            Subscriptions don't work in Expo Go. Create a development build to test.
          </Text>
        </View>
      )}

      <View style={styles.quotaContainer}>
        <View style={styles.quotaItem}>
          <View style={styles.quotaHeader}>
            <IconSymbol
              ios_icon_name="text.bubble.fill"
              android_material_icon_name="chat-bubble"
              size={20}
              color={colors.buttonBlue}
            />
            <Text style={styles.quotaLabel}>Words</Text>
          </View>
          <View style={styles.quotaBar}>
            <View 
              style={[
                styles.quotaProgress, 
                { 
                  width: `${(currentUsage.words / QUOTA_LIMITS.free.words) * 100}%`,
                  backgroundColor: remainingWords > 5 ? colors.cardGreen : colors.secondary,
                }
              ]} 
            />
          </View>
          <Text style={styles.quotaText}>
            {currentUsage.words} / {QUOTA_LIMITS.free.words} used
            {remainingWords > 0 && ` (${remainingWords} remaining)`}
          </Text>
        </View>

        <View style={styles.quotaItem}>
          <View style={styles.quotaHeader}>
            <IconSymbol
              ios_icon_name="book.fill"
              android_material_icon_name="menu-book"
              size={20}
              color={colors.buttonBlue}
            />
            <Text style={styles.quotaLabel}>Books</Text>
          </View>
          <View style={styles.quotaBar}>
            <View 
              style={[
                styles.quotaProgress, 
                { 
                  width: `${(currentUsage.books / QUOTA_LIMITS.free.books) * 100}%`,
                  backgroundColor: remainingBooks > 3 ? colors.cardGreen : colors.secondary,
                }
              ]} 
            />
          </View>
          <Text style={styles.quotaText}>
            {currentUsage.books} / {QUOTA_LIMITS.free.books} used
            {remainingBooks > 0 && ` (${remainingBooks} remaining)`}
          </Text>
        </View>

        <View style={styles.quotaItem}>
          <View style={styles.quotaHeader}>
            <IconSymbol
              ios_icon_name="person.2.fill"
              android_material_icon_name="people"
              size={20}
              color={colors.buttonBlue}
            />
            <Text style={styles.quotaLabel}>Children</Text>
          </View>
          <View style={styles.quotaBar}>
            <View 
              style={[
                styles.quotaProgress, 
                { 
                  width: `${(currentUsage.children / QUOTA_LIMITS.free.children) * 100}%`,
                  backgroundColor: remainingChildren > 0 ? colors.cardGreen : colors.secondary,
                }
              ]} 
            />
          </View>
          <Text style={styles.quotaText}>
            {currentUsage.children} / {QUOTA_LIMITS.free.children} used
          </Text>
        </View>
      </View>

      <TouchableOpacity 
        style={[styles.upgradeButton, isExpoGo && styles.upgradeButtonDisabled]} 
        onPress={handleUpgrade}
        activeOpacity={0.7}
      >
        <IconSymbol
          ios_icon_name="crown.fill"
          android_material_icon_name="workspace-premium"
          size={20}
          color={colors.backgroundAlt}
        />
        <Text style={styles.upgradeButtonText}>
          {isExpoGo ? 'Upgrade (Dev Build Required)' : 'Upgrade to Pro'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.1)',
    elevation: 3,
  },
  proContainer: {
    backgroundColor: colors.cardPurple,
    borderWidth: 2,
    borderColor: colors.accent,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.primary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  expoGoWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardPink,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  expoGoWarningText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
    lineHeight: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.background,
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
    gap: 8,
  },
  statText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
    textAlign: 'center',
  },
  quotaContainer: {
    gap: 16,
    marginBottom: 16,
  },
  quotaItem: {
    gap: 8,
  },
  quotaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quotaLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  quotaBar: {
    height: 8,
    backgroundColor: colors.background,
    borderRadius: 4,
    overflow: 'hidden',
  },
  quotaProgress: {
    height: '100%',
    borderRadius: 4,
  },
  quotaText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  upgradeButton: {
    backgroundColor: colors.buttonBlue,
    borderRadius: 24,
    paddingVertical: 14,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  upgradeButtonDisabled: {
    opacity: 0.7,
  },
  upgradeButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.backgroundAlt,
  },
  manageButton: {
    backgroundColor: colors.background,
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  manageButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.buttonBlue,
  },
});
