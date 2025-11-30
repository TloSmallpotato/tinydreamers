
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, commonStyles } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';

export default function ProfileScreen() {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
      >
        <View style={styles.header}>
          <Text style={styles.appTitle}>Tiny Dreamers</Text>
          <TouchableOpacity style={styles.settingsButton}>
            <IconSymbol 
              ios_icon_name="gearshape.fill" 
              android_material_icon_name="settings" 
              size={24} 
              color={colors.primary} 
            />
          </TouchableOpacity>
        </View>

        <View style={styles.profileSection}>
          <View style={styles.avatarPlaceholder} />
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>Scarlett Lo</Text>
            <View style={styles.ageDropdown}>
              <IconSymbol 
                ios_icon_name="chevron.down" 
                android_material_icon_name="arrow-drop-down" 
                size={20} 
                color={colors.primary} 
              />
            </View>
          </View>
          <Text style={styles.ageText}>1y 10m</Text>
        </View>

        <View style={styles.achievementBanner}>
          <IconSymbol 
            ios_icon_name="star.fill" 
            android_material_icon_name="star" 
            size={20} 
            color={colors.accent} 
          />
          <Text style={styles.achievementText}>Ava learned 2 new words this week!</Text>
        </View>

        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>This week</Text>
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: colors.buttonBlue }]}>
              <Text style={styles.statNumber}>1</Text>
              <Text style={styles.statLabel}>new word{'\n'}this week</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.cardPink }]}>
              <Text style={styles.statNumber}>1</Text>
              <Text style={styles.statLabel}>new book{'\n'}this week</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.secondary }]}>
              <Text style={styles.statNumber}>2</Text>
              <Text style={styles.statLabel}>new moments{'\n'}this week</Text>
            </View>
          </View>
        </View>

        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Total</Text>
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: colors.cardGreen }]}>
              <Text style={styles.statNumber}>21</Text>
              <Text style={styles.statLabel}>total words{'\n'}tracked</Text>
              <View style={styles.statIcon}>
                <IconSymbol 
                  ios_icon_name="text.bubble.fill" 
                  android_material_icon_name="chat-bubble" 
                  size={24} 
                  color={colors.backgroundAlt} 
                />
              </View>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.accent }]}>
              <Text style={styles.statNumber}>34</Text>
              <Text style={styles.statLabel}>total books{'\n'}added</Text>
              <View style={styles.statIcon}>
                <IconSymbol 
                  ios_icon_name="book.fill" 
                  android_material_icon_name="menu-book" 
                  size={24} 
                  color={colors.backgroundAlt} 
                />
              </View>
            </View>
          </View>
        </View>

        <View style={styles.momentsSection}>
          <Text style={styles.sectionTitle}>Moments</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.momentsScroll}>
            <View style={styles.momentCard}>
              <Image 
                source={{ uri: 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=400' }}
                style={styles.momentImage}
              />
            </View>
            <View style={styles.momentCard}>
              <Image 
                source={{ uri: 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=400' }}
                style={styles.momentImage}
              />
            </View>
            <View style={styles.momentCard}>
              <Image 
                source={{ uri: 'https://images.unsplash.com/photo-1544776193-352d25ca82cd?w=400' }}
                style={styles.momentImage}
              />
            </View>
          </ScrollView>
          <TouchableOpacity style={styles.viewMoreButton}>
            <Text style={styles.viewMoreText}>View more</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.suggestionsSection}>
          <Text style={styles.sectionTitle}>Suggestions</Text>
          <View style={styles.suggestionCard}>
            <Text style={styles.suggestionText}>Try recording a new word today: <Text style={styles.suggestionBold}>Ball</Text></Text>
            <TouchableOpacity style={styles.recordButton}>
              <Text style={styles.recordButtonText}>Record</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.analyticsSection}>
          <Text style={styles.sectionTitle}>Analytics</Text>
          <View style={styles.analyticsCard}>
            <View style={styles.analyticsRow}>
              <View style={[styles.analyticsDot, { backgroundColor: colors.backgroundAlt }]}>
                <Text style={styles.analyticsPercent}>51%</Text>
              </View>
              <View style={[styles.analyticsDot, { backgroundColor: colors.secondary }]}>
                <Text style={styles.analyticsPercent}>51%</Text>
              </View>
              <View style={[styles.analyticsDot, { backgroundColor: colors.cardGreen }]}>
                <Text style={styles.analyticsPercent}>51%</Text>
              </View>
              <View style={[styles.analyticsDot, { backgroundColor: colors.buttonBlue }]}>
                <Text style={styles.analyticsPercent}>51%</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.findOutButton}>
              <Text style={styles.findOutButtonText}>Find out more</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 120,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  appTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.backgroundAlt,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
    elevation: 2,
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.cardPurple,
    marginBottom: 16,
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  profileName: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.primary,
  },
  ageDropdown: {
    width: 24,
    height: 24,
  },
  ageText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
    marginTop: 4,
  },
  achievementBanner: {
    backgroundColor: colors.cardPurple,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  achievementText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    flex: 1,
  },
  statsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    minHeight: 100,
    boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.1)',
    elevation: 3,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.backgroundAlt,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.backgroundAlt,
    lineHeight: 16,
  },
  statIcon: {
    position: 'absolute',
    bottom: 12,
    right: 12,
  },
  momentsSection: {
    marginBottom: 24,
  },
  momentsScroll: {
    marginBottom: 12,
  },
  momentCard: {
    width: 160,
    height: 240,
    borderRadius: 16,
    marginRight: 12,
    overflow: 'hidden',
    backgroundColor: colors.cardPurple,
  },
  momentImage: {
    width: '100%',
    height: '100%',
  },
  viewMoreButton: {
    backgroundColor: colors.buttonBlue,
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: 'center',
  },
  viewMoreText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.backgroundAlt,
  },
  suggestionsSection: {
    marginBottom: 24,
  },
  suggestionCard: {
    backgroundColor: colors.accent,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  suggestionText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.primary,
    flex: 1,
    marginRight: 12,
  },
  suggestionBold: {
    fontWeight: '700',
  },
  recordButton: {
    backgroundColor: colors.buttonBlue,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  recordButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.backgroundAlt,
  },
  analyticsSection: {
    marginBottom: 24,
  },
  analyticsCard: {
    backgroundColor: colors.cardPink,
    borderRadius: 16,
    padding: 20,
  },
  analyticsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  analyticsDot: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  analyticsPercent: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  findOutButton: {
    backgroundColor: colors.secondary,
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: 'center',
  },
  findOutButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.backgroundAlt,
  },
});
