
import React, { forwardRef, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { BottomSheetBackdrop, BottomSheetScrollView, BottomSheetModal } from '@gorhom/bottom-sheet';
import { colors } from '@/styles/commonStyles';
import { ScallopedBadge } from './ScallopedBadge';

const { height: screenHeight } = Dimensions.get('window');

export interface Milestone {
  id: string;
  name: string;
  description: string;
  color: string;
  achieved: boolean;
  progress?: string;
  dateAchieved?: string;
}

interface BadgeDetailBottomSheetProps {
  milestone: Milestone | null;
  onClose: () => void;
}

const BadgeDetailBottomSheet = forwardRef<BottomSheetModal, BadgeDetailBottomSheetProps>(
  ({ milestone, onClose }, ref) => {
    const snapPoints = useMemo(() => [screenHeight * 0.6], []);

    const renderBackdrop = useCallback(
      (props: any) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          opacity={0.5}
          pressBehavior="close"
        />
      ),
      []
    );

    const handleDismiss = useCallback(() => {
      onClose();
    }, [onClose]);

    if (!milestone) return null;

    return (
      <BottomSheetModal
        ref={ref}
        index={0}
        snapPoints={snapPoints}
        enablePanDownToClose={true}
        enableDismissOnClose={true}
        enableDynamicSizing={false}
        backdropComponent={renderBackdrop}
        backgroundStyle={styles.bottomSheetBackground}
        handleIndicatorStyle={styles.handleIndicator}
        onDismiss={handleDismiss}
        animateOnMount={true}
        enableContentPanningGesture={true}
      >
        <BottomSheetScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.contentContainer}
        >
          {/* Large Badge */}
          <View style={styles.badgeContainer}>
            <ScallopedBadge
              color={milestone.color}
              size={180}
              locked={!milestone.achieved}
            />
          </View>

          {/* Milestone Name */}
          <Text style={styles.milestoneName}>{milestone.name}</Text>

          {/* Description */}
          <Text style={styles.description}>{milestone.description}</Text>

          {/* Progress or Date Achieved */}
          <View style={styles.statusContainer}>
            {milestone.achieved ? (
              <View style={styles.achievedContainer}>
                <Text style={styles.achievedLabel}>Achieved</Text>
                <Text style={styles.achievedDate}>
                  {milestone.dateAchieved || 'Recently'}
                </Text>
              </View>
            ) : (
              <View style={styles.progressContainer}>
                <Text style={styles.progressLabel}>Progress</Text>
                <Text style={styles.progressText}>
                  {milestone.progress || 'Not started'}
                </Text>
              </View>
            )}
          </View>
        </BottomSheetScrollView>
      </BottomSheetModal>
    );
  }
);

const styles = StyleSheet.create({
  bottomSheetBackground: {
    backgroundColor: colors.backgroundAlt,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  handleIndicator: {
    backgroundColor: colors.primary,
    width: 40,
    height: 4,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  badgeContainer: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  milestoneName: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.primary,
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: colors.text,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 24,
  },
  statusContainer: {
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: 20,
  },
  achievedContainer: {
    alignItems: 'center',
  },
  achievedLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  achievedDate: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
  progressContainer: {
    alignItems: 'center',
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  progressText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
});

export default BadgeDetailBottomSheet;
