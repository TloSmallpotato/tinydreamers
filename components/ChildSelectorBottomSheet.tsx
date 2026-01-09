
import React, { forwardRef, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { BottomSheetBackdrop, BottomSheetScrollView, BottomSheetModal } from '@gorhom/bottom-sheet';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import * as Haptics from 'expo-haptics';

interface Child {
  id: string;
  name: string;
  birth_date: string;
  avatar_url?: string;
}

interface ChildSelectorBottomSheetProps {
  childrenList: Child[];
  selectedChildId: string | null;
  onSelectChild: (childId: string) => void;
  onAddChild: () => void;
}

const ChildSelectorBottomSheet = forwardRef<BottomSheetModal, ChildSelectorBottomSheetProps>(
  ({ childrenList, selectedChildId, onSelectChild, onAddChild }, ref) => {
    const snapPoints = useMemo(() => ['50%', '75%'], []);

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

    const handleSelectChild = (childId: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      console.log('Child selected:', childId);
      onSelectChild(childId);
    };

    const handleAddChild = () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onAddChild();
    };

    // Safely handle undefined or null childrenList
    const safeChildrenList = childrenList || [];

    return (
      <BottomSheetModal
        ref={ref}
        index={0}
        snapPoints={snapPoints}
        enablePanDownToClose={true}
        enableDismissOnClose={true}
        backdropComponent={renderBackdrop}
        backgroundStyle={styles.bottomSheetBackground}
        handleIndicatorStyle={styles.handleIndicator}
        animateOnMount={true}
        enableContentPanningGesture={true}
      >
        <BottomSheetScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.contentContainer}
        >
          <Text style={styles.title}>Select Child</Text>
          
          <View style={styles.childrenList}>
            {safeChildrenList.map((child) => (
              <TouchableOpacity
                key={child.id}
                style={[
                  styles.childItem,
                  selectedChildId === child.id && styles.childItemSelected,
                ]}
                onPress={() => handleSelectChild(child.id)}
              >
                <View style={styles.childAvatar}>
                  <Text style={styles.childAvatarText}>
                    {child.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.childName}>{child.name}</Text>
                {selectedChildId === child.id && (
                  <IconSymbol
                    ios_icon_name="checkmark.circle.fill"
                    android_material_icon_name="check-circle"
                    size={24}
                    color={colors.primary}
                  />
                )}
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={styles.addButton} onPress={handleAddChild}>
            <IconSymbol
              ios_icon_name="plus.circle.fill"
              android_material_icon_name="add-circle"
              size={24}
              color={colors.backgroundAlt}
            />
            <Text style={styles.addButtonText}>Add New Child</Text>
          </TouchableOpacity>
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
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 20,
    textAlign: 'center',
  },
  childrenList: {
    marginBottom: 16,
  },
  childItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.background,
    borderRadius: 16,
    marginBottom: 12,
  },
  childItemSelected: {
    backgroundColor: colors.cardPurple,
  },
  childAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.cardPurple,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  childAvatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
  },
  childName: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: colors.primary,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.buttonBlue,
    borderRadius: 24,
    paddingVertical: 16,
    gap: 8,
    marginTop: 8,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.backgroundAlt,
  },
});

export default ChildSelectorBottomSheet;
