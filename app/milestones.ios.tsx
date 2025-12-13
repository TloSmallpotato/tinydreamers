
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';

export default function MilestonesScreen() {
  const router = useRouter();

  const handleBack = () => {
    console.log('MilestonesScreen (iOS): Back button pressed');
    router.back();
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
          <View style={styles.milestonesSection}>
            <Text style={styles.sectionTitle}>Learning Progress</Text>
            <Text style={styles.sectionDescription}>
              Track your child&apos;s developmental milestones and learning achievements.
            </Text>

            <View style={styles.milestoneCard}>
              <View style={[styles.milestoneCircle, { backgroundColor: colors.backgroundAlt }]}>
                <Text style={styles.milestonePercent}>51%</Text>
              </View>
              <View style={styles.milestoneInfo}>
                <Text style={styles.milestoneTitle}>Reading Skills</Text>
                <Text style={styles.milestoneDescription}>
                  Your child is making great progress in reading comprehension.
                </Text>
              </View>
            </View>

            <View style={styles.milestoneCard}>
              <View style={[styles.milestoneCircle, { backgroundColor: colors.secondary }]}>
                <Text style={styles.milestonePercent}>51%</Text>
              </View>
              <View style={styles.milestoneInfo}>
                <Text style={styles.milestoneTitle}>Vocabulary Growth</Text>
                <Text style={styles.milestoneDescription}>
                  Expanding vocabulary with new words every week.
                </Text>
              </View>
            </View>

            <View style={styles.milestoneCard}>
              <View style={[styles.milestoneCircle, { backgroundColor: colors.cardGreen }]}>
                <Text style={styles.milestonePercent}>51%</Text>
              </View>
              <View style={styles.milestoneInfo}>
                <Text style={styles.milestoneTitle}>Learning Consistency</Text>
                <Text style={styles.milestoneDescription}>
                  Regular learning sessions help build strong habits.
                </Text>
              </View>
            </View>

            <View style={styles.milestoneCard}>
              <View style={[styles.milestoneCircle, { backgroundColor: colors.buttonBlue }]}>
                <Text style={styles.milestonePercent}>51%</Text>
              </View>
              <View style={styles.milestoneInfo}>
                <Text style={styles.milestoneTitle}>Engagement Level</Text>
                <Text style={styles.milestoneDescription}>
                  Active participation in learning activities.
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.infoSection}>
            <View style={styles.infoCard}>
              <IconSymbol 
                ios_icon_name="lightbulb.fill" 
                android_material_icon_name="lightbulb" 
                size={32} 
                color={colors.accent} 
              />
              <Text style={styles.infoTitle}>What are Milestones?</Text>
              <Text style={styles.infoText}>
                Milestones help you track your child&apos;s learning journey and celebrate their achievements along the way.
              </Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
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
    padding: 20,
    paddingBottom: 40,
  },
  milestonesSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 24,
    lineHeight: 20,
  },
  milestoneCard: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.08)',
    elevation: 2,
  },
  milestoneCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  milestonePercent: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
  milestoneInfo: {
    flex: 1,
  },
  milestoneTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 4,
  },
  milestoneDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  infoSection: {
    marginTop: 8,
  },
  infoCard: {
    backgroundColor: colors.cardPurple,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
    marginTop: 12,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
