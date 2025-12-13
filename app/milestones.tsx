
import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { ScallopedBadge } from '@/components/ScallopedBadge';
import BadgeDetailBottomSheet from '@/components/BadgeDetailBottomSheet';
import { AchievementUnlockModal } from '@/components/AchievementUnlockModal';
import { milestonesData } from '@/data/milestonesData';
import type { Milestone } from '@/components/BadgeDetailBottomSheet';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import * as Haptics from 'expo-haptics';

export default function MilestonesScreen() {
  const router = useRouter();
  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(null);
  const [achievementMilestone, setAchievementMilestone] = useState<Milestone | null>(null);
  const [showAchievementModal, setShowAchievementModal] = useState(false);
  const bottomSheetRef = useRef<BottomSheetModal>(null);

  const handleBack = () => {
    console.log('MilestonesScreen: Back button pressed');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const handleBadgePress = (milestone: Milestone) => {
    console.log('MilestonesScreen: Badge pressed:', milestone.name);
    // Fire haptics immediately and synchronously
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Set state and present bottom sheet
    setSelectedMilestone(milestone);
    // Use setTimeout to ensure state is set before presenting
    setTimeout(() => {
      bottomSheetRef.current?.present();
    }, 0);
  };

  const handleCloseBottomSheet = () => {
    console.log('MilestonesScreen: Closing bottom sheet');
    setSelectedMilestone(null);
  };

  const handleCloseAchievementModal = () => {
    console.log('MilestonesScreen: Closing achievement modal');
    setShowAchievementModal(false);
    setAchievementMilestone(null);
  };

  // Example function to trigger achievement unlock (for testing)
  // You can call this when a milestone is actually achieved
  const triggerAchievement = (milestone: Milestone) => {
    console.log('MilestonesScreen: Triggering achievement:', milestone.name);
    const achievedMilestone = { ...milestone, achieved: true, dateAchieved: new Date().toLocaleDateString() };
    setAchievementMilestone(achievedMilestone);
    setShowAchievementModal(true);
  };

  const renderBadgeGrid = () => {
    const rows: Milestone[][] = [];
    for (let i = 0; i < milestonesData.length; i += 3) {
      rows.push(milestonesData.slice(i, i + 3));
    }

    return (
      <View style={styles.badgeGrid}>
        {rows.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.badgeRow}>
            {row.map((milestone, colIndex) => (
              <TouchableOpacity
                key={milestone.id}
                style={styles.badgeItem}
                onPress={() => handleBadgePress(milestone)}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <ScallopedBadge
                  color={milestone.color}
                  size={100}
                  locked={!milestone.achieved}
                />
                <Text style={styles.badgeLabel}>{milestone.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <IconSymbol 
              ios_icon_name="chevron.left" 
              android_material_icon_name="arrow-back" 
              size={24} 
              color={colors.primary} 
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Milestones</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {renderBadgeGrid()}
        </ScrollView>
      </SafeAreaView>

      {/* Badge Detail Bottom Sheet */}
      <BadgeDetailBottomSheet
        ref={bottomSheetRef}
        milestone={selectedMilestone}
        onClose={handleCloseBottomSheet}
      />

      {/* Achievement Unlock Modal */}
      <AchievementUnlockModal
        visible={showAchievementModal}
        milestone={achievementMilestone}
        onClose={handleCloseAchievementModal}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: Platform.OS === 'android' ? 48 : 16,
    backgroundColor: colors.background,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 40,
  },
  badgeGrid: {
    width: '100%',
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  badgeItem: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  badgeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 16,
  },
});
