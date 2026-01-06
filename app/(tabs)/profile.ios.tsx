
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { colors } from '@/styles/commonStyles';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useChild } from '@/contexts/ChildContext';
import { useProfileStats } from '@/contexts/ProfileStatsContext';
import { useCameraTrigger } from '@/contexts/CameraTriggerContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { supabase } from '@/app/integrations/supabase/client';
import { HapticFeedback } from '@/utils/haptics';
import { processMomentsWithSignedUrls, getSignedVideoUrl } from '@/utils/videoStorage';
import { pickProfileImage, uploadProfileAvatar, deleteProfileAvatar } from '@/utils/profileAvatarUpload';
import { IconSymbol } from '@/components/IconSymbol';
import ProfileAvatar from '@/components/ProfileAvatar';
import ChildSelectorBottomSheet from '@/components/ChildSelectorBottomSheet';
import AddChildBottomSheet from '@/components/AddChildBottomSheet';
import SubscriptionStatusCard from '@/components/SubscriptionStatusCard';
import UpgradePromptModal from '@/components/UpgradePromptModal';
import FullScreenVideoPlayer from '@/components/FullScreenVideoPlayer';

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
  trim_start?: number;
  trim_end?: number;
  signedVideoUrl?: string | null;
  signedThumbnailUrl?: string | null;
}

const getStartOfWeek = () => {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - diff);
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString();
};

export default function ProfileScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { selectedChild, children: childrenList, loading: childLoading, selectChild, addChild } = useChild();
  const { profileStats, fetchProfileStats } = useProfileStats();
  const { refreshUsage } = useSubscription();
  const { triggerCamera } = useCameraTrigger();
  
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
  const [refreshing, setRefreshing] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [selectedMoment, setSelectedMoment] = useState<Moment | null>(null);
  const [showVideoPlayer, setShowVideoPlayer] = useState(false);
  const [thumbnailErrors, setThumbnailErrors] = useState<Set<string>>(new Set());

  const childSelectorRef = useRef<BottomSheetModal>(null);
  const addChildRef = useRef<BottomSheetModal>(null);

  // Update avatar when selected child changes
  useEffect(() => {
    if (selectedChild?.avatar_url) {
      setAvatarUrl(selectedChild.avatar_url);
    } else {
      setAvatarUrl(null);
    }
  }, [selectedChild?.avatar_url]);

  // Fetch profile data from database
  const fetchProfileData = useCallback(async (forceRefresh = false) => {
    if (!selectedChild) {
      setStats({
        totalWords: 0,
        totalBooks: 0,
        wordsThisWeek: 0,
        booksThisWeek: 0,
        momentsThisWeek: 0,
        newWordsThisWeek: 0,
      });
      setMoments([]);
      setLoading(false);
      return;
    }

    try {
      if (forceRefresh) {
        console.log('🔄 Force refreshing profile data');
      }
      setLoading(true);

      const startOfWeek = getStartOfWeek();

      // Fetch total counts directly from database (not from context)
      const [
        { count: totalWordsCount },
        { count: totalBooksCount },
        { count: wordsThisWeekCount },
        { count: booksThisWeekCount },
        { count: momentsThisWeekCount },
        { data: momentsData }
      ] = await Promise.all([
        supabase
          .from('user_words')
          .select('*', { count: 'exact', head: true })
          .eq('child_id', selectedChild.id),
        supabase
          .from('user_books')
          .select('*', { count: 'exact', head: true })
          .eq('child_id', selectedChild.id),
        supabase
          .from('user_words')
          .select('*', { count: 'exact', head: true })
          .eq('child_id', selectedChild.id)
          .gte('created_at', startOfWeek),
        supabase
          .from('user_books')
          .select('*', { count: 'exact', head: true })
          .eq('child_id', selectedChild.id)
          .gte('created_at', startOfWeek),
        supabase
          .from('moments')
          .select('*', { count: 'exact', head: true })
          .eq('child_id', selectedChild.id)
          .gte('created_at', startOfWeek),
        supabase
          .from('moments')
          .select('*')
          .eq('child_id', selectedChild.id)
          .order('created_at', { ascending: false })
          .limit(6)
      ]);

      // Update stats with fresh data from database
      setStats({
        totalWords: totalWordsCount || 0,
        totalBooks: totalBooksCount || 0,
        wordsThisWeek: wordsThisWeekCount || 0,
        booksThisWeek: booksThisWeekCount || 0,
        momentsThisWeek: momentsThisWeekCount || 0,
        newWordsThisWeek: wordsThisWeekCount || 0,
      });

      // Process moments with signed URLs
      if (momentsData) {
        const processedMoments = await processMomentsWithSignedUrls(momentsData);
        setMoments(processedMoments);
      }

      console.log('✅ Profile data refreshed:', {
        totalWords: totalWordsCount,
        totalBooks: totalBooksCount,
        wordsThisWeek: wordsThisWeekCount,
        booksThisWeek: booksThisWeekCount,
        momentsThisWeek: momentsThisWeekCount,
      });
    } catch (error) {
      console.error('❌ Error fetching profile data:', error);
      Alert.alert('Error', 'Failed to load profile data');
    } finally {
      setLoading(false);
    }
  }, [selectedChild]);

  // Initial load - fetch data when component mounts or child changes
  useEffect(() => {
    console.log('📊 Initial load - fetching profile data for child:', selectedChild?.id);
    fetchProfileData();
  }, [selectedChild, childLoading, fetchProfileData]);

  // 🔥 NEW: Refetch data whenever the Profile tab comes into focus
  // This replaces the unreliable Supabase subscriptions
  useFocusEffect(
    useCallback(() => {
      console.log('📊 Profile tab focused - refreshing data');
      if (selectedChild) {
        fetchProfileData(true); // Force refresh
        fetchProfileStats(); // Also refresh the context stats
        refreshUsage(); // Refresh subscription usage
      }
    }, [selectedChild, fetchProfileData, fetchProfileStats, refreshUsage])
  );

  // Pull to refresh handler
  const onRefresh = useCallback(async () => {
    console.log('🔄 Pull to refresh triggered');
    HapticFeedback.impact('light');
    setRefreshing(true);
    await Promise.all([
      fetchProfileData(true),
      fetchProfileStats(),
      refreshUsage(),
    ]);
    setRefreshing(false);
    HapticFeedback.success();
  }, [fetchProfileData, fetchProfileStats, refreshUsage]);

  const calculateAge = (birthDate: string) => {
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const handleOpenChildSelector = () => {
    HapticFeedback.impact('medium');
    childSelectorRef.current?.present();
  };

  const handleSelectChild = async (childId: string) => {
    HapticFeedback.impact('light');
    await selectChild(childId);
    childSelectorRef.current?.dismiss();
  };

  const handleOpenAddChild = () => {
    HapticFeedback.impact('medium');
    childSelectorRef.current?.dismiss();
    setTimeout(() => {
      addChildRef.current?.present();
    }, 300);
  };

  const handleAddChild = async (name: string, birthDate: Date) => {
    try {
      await addChild(name, birthDate);
      HapticFeedback.success();
      addChildRef.current?.dismiss();
    } catch (error) {
      console.error('Error adding child:', error);
      HapticFeedback.error();
      Alert.alert('Error', 'Failed to add child');
    }
  };

  const handleOpenSettings = () => {
    HapticFeedback.impact('medium');
    router.push('/settings');
  };

  const handleOpenAdminPanel = () => {
    HapticFeedback.impact('medium');
    router.push('/admin-panel');
  };

  const handleRecordMoment = () => {
    HapticFeedback.impact('medium');
    triggerCamera();
  };

  const handleViewMoreMoments = () => {
    HapticFeedback.impact('medium');
    router.push('/all-moments');
  };

  const handleFindOutMore = () => {
    HapticFeedback.impact('medium');
    router.push('/milestones');
  };

  const handleMomentPress = async (moment: Moment) => {
    HapticFeedback.impact('medium');
    
    try {
      let videoUrl = moment.signedVideoUrl;
      
      if (!videoUrl) {
        console.log('Generating signed URL for moment:', moment.id);
        videoUrl = await getSignedVideoUrl(moment.video_url);
      }
      
      if (!videoUrl) {
        Alert.alert('Error', 'Unable to load video');
        return;
      }
      
      setSelectedMoment({ ...moment, signedVideoUrl: videoUrl });
      setShowVideoPlayer(true);
    } catch (error) {
      console.error('Error loading moment video:', error);
      Alert.alert('Error', 'Failed to load video');
    }
  };

  const handleCloseVideoPlayer = () => {
    setShowVideoPlayer(false);
    setSelectedMoment(null);
  };

  const handleThumbnailError = (momentId: string) => {
    console.log('Thumbnail failed to load for moment:', momentId);
    setThumbnailErrors(prev => new Set(prev).add(momentId));
  };

  const handleChangeAvatar = async () => {
    if (!selectedChild) {
      Alert.alert('Error', 'Please select a child first');
      return;
    }

    try {
      HapticFeedback.impact('medium');
      
      const result = await pickProfileImage();
      if (!result) return;

      // Delete old avatar if exists
      if (selectedChild.avatar_url) {
        await deleteProfileAvatar(selectedChild.avatar_url);
      }

      // Upload new avatar
      const newAvatarUrl = await uploadProfileAvatar(result.uri, selectedChild.id);
      
      // Update database
      const { error } = await supabase
        .from('children')
        .update({ avatar_url: newAvatarUrl })
        .eq('id', selectedChild.id);

      if (error) throw error;

      setAvatarUrl(newAvatarUrl);
      HapticFeedback.success();
      Alert.alert('Success', 'Profile photo updated!');
    } catch (error) {
      console.error('Error changing avatar:', error);
      HapticFeedback.error();
      Alert.alert('Error', 'Failed to update profile photo');
    }
  };

  if (loading && !selectedChild) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
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
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handleOpenSettings} style={styles.settingsButton}>
              <IconSymbol
                ios_icon_name="gearshape.fill"
                android_material_icon_name="settings"
                size={24}
                color={colors.text}
              />
            </TouchableOpacity>
            
            {user?.email === 'admin@natively.app' && (
              <TouchableOpacity onPress={handleOpenAdminPanel} style={styles.adminButton}>
                <IconSymbol
                  ios_icon_name="shield.fill"
                  android_material_icon_name="admin-panel-settings"
                  size={24}
                  color={colors.accent}
                />
              </TouchableOpacity>
            )}
          </View>

          {/* Profile Section */}
          <View style={styles.profileSection}>
            <TouchableOpacity onPress={handleChangeAvatar} activeOpacity={0.7}>
              <ProfileAvatar
                avatarUrl={avatarUrl}
                name={selectedChild?.name || 'Select Child'}
                size={100}
              />
            </TouchableOpacity>
            
            <TouchableOpacity onPress={handleOpenChildSelector} style={styles.nameContainer}>
              <Text style={styles.name}>{selectedChild?.name || 'Select a child'}</Text>
              <IconSymbol
                ios_icon_name="chevron.down"
                android_material_icon_name="expand-more"
                size={20}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
            
            {selectedChild?.birth_date && (
              <Text style={styles.age}>{calculateAge(selectedChild.birth_date)} years old</Text>
            )}
          </View>

          {/* Subscription Status */}
          <SubscriptionStatusCard />

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.totalWords}</Text>
              <Text style={styles.statLabel}>Total Words</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.totalBooks}</Text>
              <Text style={styles.statLabel}>Total Books</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.wordsThisWeek}</Text>
              <Text style={styles.statLabel}>Words This Week</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.booksThisWeek}</Text>
              <Text style={styles.statLabel}>Books This Week</Text>
            </View>
          </View>

          {/* Moments Section */}
          <View style={styles.momentsSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Moments</Text>
              {moments.length > 0 && (
                <TouchableOpacity onPress={handleViewMoreMoments}>
                  <Text style={styles.viewMore}>View All</Text>
                </TouchableOpacity>
              )}
            </View>

            {moments.length === 0 ? (
              <View style={styles.emptyMoments}>
                <IconSymbol
                  ios_icon_name="video.fill"
                  android_material_icon_name="videocam"
                  size={48}
                  color={colors.textSecondary}
                />
                <Text style={styles.emptyText}>No moments yet</Text>
                <TouchableOpacity style={styles.recordButton} onPress={handleRecordMoment}>
                  <Text style={styles.recordButtonText}>Record First Moment</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.momentsGrid}>
                {moments.map((moment, index) => (
                  <TouchableOpacity
                    key={`${moment.id}-${index}`}
                    style={styles.momentCard}
                    onPress={() => handleMomentPress(moment)}
                    activeOpacity={0.7}
                  >
                    {moment.signedThumbnailUrl && !thumbnailErrors.has(moment.id) ? (
                      <Image
                        source={{ uri: moment.signedThumbnailUrl }}
                        style={styles.momentThumbnail}
                        onError={() => handleThumbnailError(moment.id)}
                      />
                    ) : (
                      <View style={[styles.momentThumbnail, styles.momentPlaceholder]}>
                        <IconSymbol
                          ios_icon_name="play.circle.fill"
                          android_material_icon_name="play-circle-filled"
                          size={32}
                          color={colors.backgroundAlt}
                        />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Milestones CTA */}
          <TouchableOpacity style={styles.milestonesCard} onPress={handleFindOutMore}>
            <View style={styles.milestonesContent}>
              <IconSymbol
                ios_icon_name="star.fill"
                android_material_icon_name="star"
                size={32}
                color={colors.accent}
              />
              <View style={styles.milestonesText}>
                <Text style={styles.milestonesTitle}>Milestones</Text>
                <Text style={styles.milestonesSubtitle}>Track your child&apos;s progress</Text>
              </View>
            </View>
            <IconSymbol
              ios_icon_name="chevron.right"
              android_material_icon_name="chevron-right"
              size={24}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>

      {/* Bottom Sheets */}
      <ChildSelectorBottomSheet
        ref={childSelectorRef}
        children={childrenList}
        selectedChildId={selectedChild?.id || null}
        onSelectChild={handleSelectChild}
        onAddChild={handleOpenAddChild}
      />

      <AddChildBottomSheet
        ref={addChildRef}
        onAddChild={handleAddChild}
      />

      {/* Video Player */}
      {showVideoPlayer && selectedMoment && (
        <FullScreenVideoPlayer
          videoUri={selectedMoment.signedVideoUrl || ''}
          onClose={handleCloseVideoPlayer}
          trimStart={selectedMoment.trim_start}
          trimEnd={selectedMoment.trim_end}
        />
      )}

      <UpgradePromptModal />
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
    paddingBottom: 120,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  settingsButton: {
    padding: 8,
  },
  adminButton: {
    padding: 8,
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
  },
  name: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
  },
  age: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 32,
  },
  statCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: colors.backgroundAlt,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
    elevation: 2,
  },
  statValue: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  momentsSection: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  viewMore: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  emptyMoments: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 12,
    marginBottom: 20,
  },
  recordButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  recordButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.backgroundAlt,
  },
  momentsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  momentCard: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  momentThumbnail: {
    width: '100%',
    height: '100%',
  },
  momentPlaceholder: {
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  milestonesCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.backgroundAlt,
    borderRadius: 16,
    padding: 20,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
    elevation: 2,
  },
  milestonesContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  milestonesText: {
    gap: 4,
  },
  milestonesTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  milestonesSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});
