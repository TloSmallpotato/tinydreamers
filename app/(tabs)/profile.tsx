
import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, TouchableOpacity, Image, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { useChild } from '@/contexts/ChildContext';
import { useCameraTrigger } from '@/contexts/CameraTriggerContext';
import ChildSelectorBottomSheet from '@/components/ChildSelectorBottomSheet';
import AddChildBottomSheet from '@/components/AddChildBottomSheet';
import SettingsBottomSheet from '@/components/SettingsBottomSheet';
import ProfileAvatar from '@/components/ProfileAvatar';
import { supabase } from '@/app/integrations/supabase/client';
import { pickProfileImage, uploadProfileAvatar, deleteProfileAvatar } from '@/utils/profileAvatarUpload';

interface ProfileStats {
  totalWords: number;
  totalBooks: number;
  wordsThisWeek: number;
  booksThisWeek: number;
  momentsThisWeek: number;
  newWordsThisWeek: number;
}

interface Moment {
  id: string;
  video_url: string;
  thumbnail_url: string | null;
  created_at: string;
}

const getStartOfWeek = (): Date => {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
};

export default function ProfileScreen() {
  const router = useRouter();
  const { children, selectedChild, selectChild, addChild, updateChild, refreshChildren, loading: childLoading } = useChild();
  const { triggerCamera } = useCameraTrigger();
  const childSelectorRef = useRef<BottomSheetModal>(null);
  const addChildRef = useRef<BottomSheetModal>(null);
  const settingsRef = useRef<BottomSheetModal>(null);

  const [stats, setStats] = useState<ProfileStats>({
    totalWords: 0,
    totalBooks: 0,
    wordsThisWeek: 0,
    booksThisWeek: 0,
    momentsThisWeek: 0,
    newWordsThisWeek: 0,
  });
  const [moments, setMoments] = useState<Moment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const isFetchingRef = useRef(false);

  useEffect(() => {
    if (selectedChild && !isFetchingRef.current) {
      fetchProfileData();
    } else if (!childLoading && !selectedChild) {
      setLoading(false);
      setStats({
        totalWords: 0,
        totalBooks: 0,
        wordsThisWeek: 0,
        booksThisWeek: 0,
        momentsThisWeek: 0,
        newWordsThisWeek: 0,
      });
      setMoments([]);
    }
  }, [selectedChild, childLoading]);

  const fetchProfileData = async () => {
    if (!selectedChild || isFetchingRef.current) {
      console.log('ProfileScreen: Skipping fetch - no child or already fetching');
      return;
    }

    isFetchingRef.current = true;

    try {
      setLoading(true);
      setError(null);
      console.log('ProfileScreen: Fetching profile data for child:', selectedChild.id);

      await new Promise(resolve => setTimeout(resolve, 300));

      const startOfWeek = getStartOfWeek();
      const startOfWeekISO = startOfWeek.toISOString();
      console.log('ProfileScreen: Start of week (Monday):', startOfWeekISO);

      const [
        totalWordsResult,
        wordsThisWeekResult,
        totalBooksResult,
        booksThisWeekResult,
        momentsThisWeekResult,
        momentsDataResult,
      ] = await Promise.allSettled([
        supabase
          .from('user_words')
          .select('*', { count: 'exact', head: true })
          .eq('child_id', selectedChild.id),
        supabase
          .from('user_words')
          .select('*', { count: 'exact', head: true })
          .eq('child_id', selectedChild.id)
          .gte('created_at', startOfWeekISO),
        supabase
          .from('user_books')
          .select('*', { count: 'exact', head: true })
          .eq('child_id', selectedChild.id),
        supabase
          .from('user_books')
          .select('*', { count: 'exact', head: true })
          .eq('child_id', selectedChild.id)
          .gte('created_at', startOfWeekISO),
        supabase
          .from('moments')
          .select('*', { count: 'exact', head: true })
          .eq('child_id', selectedChild.id)
          .gte('created_at', startOfWeekISO),
        supabase
          .from('moments')
          .select('id, video_url, thumbnail_url, created_at')
          .eq('child_id', selectedChild.id)
          .order('created_at', { ascending: false })
          .limit(10),
      ]);

      const totalWordsCount = totalWordsResult.status === 'fulfilled' && !totalWordsResult.value.error
        ? totalWordsResult.value.count || 0
        : 0;

      const wordsThisWeekCount = wordsThisWeekResult.status === 'fulfilled' && !wordsThisWeekResult.value.error
        ? wordsThisWeekResult.value.count || 0
        : 0;

      const totalBooksCount = totalBooksResult.status === 'fulfilled' && !totalBooksResult.value.error
        ? totalBooksResult.value.count || 0
        : 0;

      const booksThisWeekCount = booksThisWeekResult.status === 'fulfilled' && !booksThisWeekResult.value.error
        ? booksThisWeekResult.value.count || 0
        : 0;

      const momentsThisWeekCount = momentsThisWeekResult.status === 'fulfilled' && !momentsThisWeekResult.value.error
        ? momentsThisWeekResult.value.count || 0
        : 0;

      const momentsData = momentsDataResult.status === 'fulfilled' && !momentsDataResult.value.error
        ? momentsDataResult.value.data || []
        : [];

      if (totalWordsResult.status === 'rejected') {
        console.error('ProfileScreen: Error fetching total words:', totalWordsResult.reason);
      }
      if (wordsThisWeekResult.status === 'rejected') {
        console.error('ProfileScreen: Error fetching words this week:', wordsThisWeekResult.reason);
      }
      if (totalBooksResult.status === 'rejected') {
        console.error('ProfileScreen: Error fetching total books:', totalBooksResult.reason);
      }
      if (booksThisWeekResult.status === 'rejected') {
        console.error('ProfileScreen: Error fetching books this week:', booksThisWeekResult.reason);
      }
      if (momentsThisWeekResult.status === 'rejected') {
        console.error('ProfileScreen: Error fetching moments this week:', momentsThisWeekResult.reason);
      }
      if (momentsDataResult.status === 'rejected') {
        console.error('ProfileScreen: Error fetching moments:', momentsDataResult.reason);
      }

      console.log('ProfileScreen: Profile data fetched successfully');

      setStats({
        totalWords: totalWordsCount,
        totalBooks: totalBooksCount,
        wordsThisWeek: wordsThisWeekCount,
        booksThisWeek: booksThisWeekCount,
        momentsThisWeek: momentsThisWeekCount,
        newWordsThisWeek: wordsThisWeekCount,
      });

      setMoments(momentsData);
    } catch (err) {
      console.error('ProfileScreen: Unexpected error fetching profile data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load profile data');
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  };

  const calculateAge = (birthDate: string) => {
    try {
      const birth = new Date(birthDate);
      const today = new Date();
      
      let years = today.getFullYear() - birth.getFullYear();
      let months = today.getMonth() - birth.getMonth();
      
      if (months < 0) {
        years--;
        months += 12;
      }
      
      return `${years}y ${months}m`;
    } catch (err) {
      console.error('ProfileScreen: Error calculating age:', err);
      return '';
    }
  };

  const handleOpenChildSelector = () => {
    try {
      console.log('ProfileScreen: Opening child selector bottom sheet');
      childSelectorRef.current?.present();
    } catch (err) {
      console.error('ProfileScreen: Error opening child selector:', err);
    }
  };

  const handleSelectChild = (childId: string) => {
    try {
      console.log('ProfileScreen: Selecting child:', childId);
      selectChild(childId);
      childSelectorRef.current?.dismiss();
    } catch (err) {
      console.error('ProfileScreen: Error selecting child:', err);
    }
  };

  const handleOpenAddChild = () => {
    try {
      console.log('ProfileScreen: Opening add child bottom sheet');
      childSelectorRef.current?.dismiss();
      setTimeout(() => {
        addChildRef.current?.present();
      }, 300);
    } catch (err) {
      console.error('ProfileScreen: Error opening add child sheet:', err);
    }
  };

  const handleAddChild = async (name: string, birthDate: Date) => {
    try {
      console.log('ProfileScreen: Adding child:', name, birthDate);
      await addChild(name, birthDate);
      addChildRef.current?.dismiss();
    } catch (err) {
      console.error('ProfileScreen: Error adding child:', err);
    }
  };

  const handleOpenSettings = () => {
    try {
      console.log('ProfileScreen: Settings button pressed - opening settings bottom sheet');
      settingsRef.current?.present();
    } catch (err) {
      console.error('ProfileScreen: Error opening settings:', err);
    }
  };

  const handleRecordMoment = () => {
    try {
      console.log('ProfileScreen: Record button pressed - triggering camera');
      triggerCamera();
    } catch (err) {
      console.error('ProfileScreen: Error triggering camera:', err);
    }
  };

  const handleViewMoreMoments = () => {
    console.log('ProfileScreen: View more moments pressed');
  };

  const handleChangeAvatar = async () => {
    if (!selectedChild) {
      console.log('ProfileScreen: No selected child for avatar change');
      Alert.alert('No Child Selected', 'Please select a child first');
      return;
    }

    if (uploadingAvatar) {
      console.log('ProfileScreen: Avatar upload already in progress');
      return;
    }

    try {
      console.log('ProfileScreen: Starting avatar change process');
      
      const imageUri = await pickProfileImage();
      
      if (!imageUri) {
        console.log('ProfileScreen: No image selected');
        return;
      }

      setUploadingAvatar(true);

      const oldAvatarUrl = selectedChild.avatar_url;

      const result = await uploadProfileAvatar(selectedChild.id, imageUri);

      if (!result.success) {
        console.error('ProfileScreen: Upload failed:', result.error);
        Alert.alert('Upload Failed', result.error || 'Failed to upload image');
        setUploadingAvatar(false);
        return;
      }

      console.log('ProfileScreen: Upload successful, updating database');

      await updateChild(selectedChild.id, {
        avatar_url: result.url,
      });

      console.log('ProfileScreen: Database updated, refreshing children');

      await refreshChildren();

      if (oldAvatarUrl && oldAvatarUrl !== result.url) {
        console.log('ProfileScreen: Deleting old avatar');
        await deleteProfileAvatar(oldAvatarUrl);
      }

      setUploadingAvatar(false);
      
      Alert.alert('Success', 'Profile photo updated successfully!');
    } catch (err) {
      console.error('ProfileScreen: Error changing avatar:', err);
      setUploadingAvatar(false);
      Alert.alert('Error', 'Failed to update profile photo. Please try again.');
    }
  };

  if (childLoading || loading) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.buttonBlue} />
            <Text style={styles.loadingText}>Loading profile...</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={styles.errorContainer}>
            <IconSymbol 
              ios_icon_name="exclamationmark.triangle.fill" 
              android_material_icon_name="error" 
              size={48} 
              color={colors.textSecondary} 
            />
            <Text style={styles.errorText}>Failed to load profile</Text>
            <Text style={styles.errorSubtext}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchProfileData}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <View style={styles.headerSpacer} />
            <Text style={styles.appTitle}>Tiny Dreamers</Text>
            <TouchableOpacity style={styles.settingsButton} onPress={handleOpenSettings}>
              <IconSymbol 
                ios_icon_name="gearshape.fill" 
                android_material_icon_name="settings" 
                size={24} 
                color={colors.primary} 
              />
            </TouchableOpacity>
          </View>

          <View style={styles.profileSection}>
            <ProfileAvatar 
              imageUri={selectedChild?.avatar_url}
              size={180}
              onPress={handleChangeAvatar}
              isUploading={uploadingAvatar}
            />
            <TouchableOpacity style={styles.profileInfo} onPress={handleOpenChildSelector}>
              <Text style={styles.profileName}>
                {selectedChild?.name || 'Add a child'}
              </Text>
              <View style={styles.ageDropdown}>
                <IconSymbol 
                  ios_icon_name="chevron.down" 
                  android_material_icon_name="arrow-drop-down" 
                  size={20} 
                  color={colors.primary} 
                />
              </View>
            </TouchableOpacity>
            {selectedChild && selectedChild.birth_date && (
              <Text style={styles.ageText}>{calculateAge(selectedChild.birth_date)}</Text>
            )}
          </View>

          {stats.newWordsThisWeek > 0 && (
            <View style={styles.achievementBanner}>
              <IconSymbol 
                ios_icon_name="star.fill" 
                android_material_icon_name="star" 
                size={20} 
                color={colors.accent} 
              />
              <Text style={styles.achievementText}>
                {selectedChild?.name || 'Your child'} learned {stats.newWordsThisWeek} new {stats.newWordsThisWeek === 1 ? 'word' : 'words'} this week!
              </Text>
            </View>
          )}

          <View style={styles.statsSection}>
            <Text style={styles.sectionTitle}>This week</Text>
            <View style={styles.statsRow}>
              <View style={[styles.statCard, { backgroundColor: colors.buttonBlue }]}>
                <Text style={styles.statNumber}>{stats.wordsThisWeek}</Text>
                <Text style={styles.statLabel}>new {stats.wordsThisWeek === 1 ? 'word' : 'words'}{'\n'}this week</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: colors.cardPink }]}>
                <Text style={styles.statNumber}>{stats.booksThisWeek}</Text>
                <Text style={[styles.statLabel, styles.highlightedStatLabel]}>new {stats.booksThisWeek === 1 ? 'book' : 'books'}{'\n'}this week</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: colors.secondary }]}>
                <Text style={styles.statNumber}>{stats.momentsThisWeek}</Text>
                <Text style={styles.statLabel}>new {stats.momentsThisWeek === 1 ? 'moment' : 'moments'}{'\n'}this week</Text>
              </View>
            </View>
          </View>

          <View style={styles.statsSection}>
            <Text style={styles.sectionTitle}>Total</Text>
            <View style={styles.statsRow}>
              <View style={[styles.statCard, { backgroundColor: colors.cardGreen }]}>
                <Text style={styles.statNumber}>{stats.totalWords}</Text>
                <Text style={styles.statLabel}>total {stats.totalWords === 1 ? 'word' : 'words'}{'\n'}tracked</Text>
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
                <Text style={styles.statNumber}>{stats.totalBooks}</Text>
                <Text style={[styles.statLabel, styles.highlightedStatLabel]}>total {stats.totalBooks === 1 ? 'book' : 'books'}{'\n'}added</Text>
                <View style={styles.statIcon}>
                  <IconSymbol 
                    ios_icon_name="book.fill" 
                    android_material_icon_name="menu-book" 
                    size={24} 
                    color="#3330AF" 
                  />
                </View>
              </View>
            </View>
          </View>

          <View style={styles.momentsSection}>
            <Text style={styles.sectionTitle}>Moments</Text>
            {moments.length > 0 ? (
              <>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.momentsScroll}>
                  {moments.map((moment, index) => (
                    <View key={index} style={styles.momentCard}>
                      {moment.thumbnail_url ? (
                        <Image 
                          source={{ uri: moment.thumbnail_url }}
                          style={styles.momentImage}
                        />
                      ) : (
                        <View style={styles.momentPlaceholder}>
                          <IconSymbol 
                            ios_icon_name="video.fill" 
                            android_material_icon_name="videocam" 
                            size={48} 
                            color={colors.backgroundAlt} 
                          />
                        </View>
                      )}
                    </View>
                  ))}
                </ScrollView>
                <TouchableOpacity style={styles.viewMoreButton} onPress={handleViewMoreMoments}>
                  <Text style={styles.viewMoreText}>View more</Text>
                </TouchableOpacity>
              </>
            ) : (
              <View style={styles.emptyMomentsContainer}>
                <IconSymbol 
                  ios_icon_name="video.slash" 
                  android_material_icon_name="videocam-off" 
                  size={48} 
                  color={colors.textSecondary} 
                />
                <Text style={styles.emptyMomentsText}>No moments yet</Text>
                <Text style={styles.emptyMomentsSubtext}>Start recording to capture special moments!</Text>
              </View>
            )}
          </View>

          <View style={styles.suggestionsSection}>
            <Text style={styles.sectionTitle}>Suggestions</Text>
            <View style={styles.suggestionCard}>
              <Text style={styles.suggestionText}>Capture a special moment today!</Text>
              <TouchableOpacity style={styles.recordButton} onPress={handleRecordMoment}>
                <Text style={styles.recordButtonText}>Record</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.analyticsSection}>
            <Text style={styles.sectionTitle}>Milestones</Text>
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

      <ChildSelectorBottomSheet
        ref={childSelectorRef}
        childrenList={children}
        selectedChildId={selectedChild?.id || null}
        onSelectChild={handleSelectChild}
        onAddChild={handleOpenAddChild}
      />

      <AddChildBottomSheet
        ref={addChildRef}
        onAddChild={handleAddChild}
      />

      <SettingsBottomSheet ref={settingsRef} />
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
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingTop: Platform.OS === 'android' ? 48 : 20,
    paddingBottom: 120,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.primary,
    marginTop: 16,
  },
  errorSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: colors.buttonBlue,
    borderRadius: 24,
    paddingHorizontal: 32,
    paddingVertical: 12,
    marginTop: 24,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.backgroundAlt,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerSpacer: {
    width: 40,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.primary,
    textAlign: 'center',
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
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
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
  highlightedStatLabel: {
    color: '#3330AF',
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
  momentPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cardPurple,
  },
  emptyMomentsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
    backgroundColor: colors.backgroundAlt,
    borderRadius: 16,
  },
  emptyMomentsText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.primary,
    marginTop: 12,
  },
  emptyMomentsSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
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
