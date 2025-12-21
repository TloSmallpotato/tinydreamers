
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from './IconSymbol';
import { HapticFeedback } from '@/utils/haptics';
import { useSubscription, QUOTA_LIMITS } from '@/contexts/SubscriptionContext';

export default function SubscriptionStatusCard() {
  const { 
    tier, 
    isSubscribed, 
    currentUsage, 
    remainingWords, 
    remainingBooks, 
    remainingChildren,
    showPaywall 
  } = useSubscription();

  const handleUpgrade = async () => {
    HapticFeedback.medium();
    await showPaywall('profile_upgrade');
  };

  if (isSubscribed) {
    return (
      <View style={[styles.container, styles.plusContainer]}>
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
            <Text style={styles.title}>Plus Member</Text>
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

      <TouchableOpacity style={styles.upgradeButton} onPress={handleUpgrade}>
        <IconSymbol
          ios_icon_name="crown.fill"
          android_material_icon_name="workspace-premium"
          size={20}
          color={colors.backgroundAlt}
        />
        <Text style={styles.upgradeButtonText}>Upgrade to Plus</Text>
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
  plusContainer: {
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
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.background,
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
  upgradeButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.backgroundAlt,
  },
});
