
import React, { useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { useAuth } from '@/contexts/AuthContext';
import { HapticFeedback } from '@/utils/haptics';
import SubscriptionStatusCard from '@/components/SubscriptionStatusCard';
import RevenueCatDiagnostics from '@/components/RevenueCatDiagnostics';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import NotificationSettingsBottomSheet from '@/components/NotificationSettingsBottomSheet';

export default function SettingsScreen() {
  const router = useRouter();
  const { signOut } = useAuth();
  const { restorePurchases } = useSubscription();
  const notificationBottomSheetRef = useRef<BottomSheetModal>(null);

  const handleSignOut = async () => {
    HapticFeedback.medium();
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
              router.replace('/(auth)/login');
            } catch (error) {
              console.error('Error signing out:', error);
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleRestorePurchases = async () => {
    HapticFeedback.medium();
    await restorePurchases();
  };

  const handleOpenNotifications = () => {
    HapticFeedback.light();
    notificationBottomSheetRef.current?.present();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <SubscriptionStatusCard />

        <TouchableOpacity 
          style={styles.menuItem} 
          onPress={handleOpenNotifications}
          activeOpacity={0.7}
        >
          <View style={styles.menuItemLeft}>
            <IconSymbol
              ios_icon_name="bell.fill"
              android_material_icon_name="notifications"
              size={24}
              color={colors.buttonBlue}
            />
            <Text style={styles.menuItemText}>Daily Reminders</Text>
          </View>
          <IconSymbol
            ios_icon_name="chevron.right"
            android_material_icon_name="chevron-right"
            size={20}
            color={colors.textSecondary}
          />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.menuItem} 
          onPress={handleRestorePurchases}
          activeOpacity={0.7}
        >
          <View style={styles.menuItemLeft}>
            <IconSymbol
              ios_icon_name="arrow.clockwise.circle.fill"
              android_material_icon_name="restore"
              size={24}
              color={colors.buttonBlue}
            />
            <Text style={styles.menuItemText}>Restore Purchases</Text>
          </View>
          <IconSymbol
            ios_icon_name="chevron.right"
            android_material_icon_name="chevron-right"
            size={20}
            color={colors.textSecondary}
          />
        </TouchableOpacity>

        <RevenueCatDiagnostics />

        <TouchableOpacity 
          style={[styles.menuItem, styles.signOutButton]} 
          onPress={handleSignOut}
          activeOpacity={0.7}
        >
          <View style={styles.menuItemLeft}>
            <IconSymbol
              ios_icon_name="rectangle.portrait.and.arrow.right"
              android_material_icon_name="logout"
              size={24}
              color={colors.secondary}
            />
            <Text style={[styles.menuItemText, styles.signOutText]}>Sign Out</Text>
          </View>
        </TouchableOpacity>
      </ScrollView>

      <NotificationSettingsBottomSheet bottomSheetRef={notificationBottomSheetRef} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    color: colors.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 120,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.backgroundAlt,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.05)',
    elevation: 2,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  signOutButton: {
    marginTop: 24,
  },
  signOutText: {
    color: colors.secondary,
  },
});
