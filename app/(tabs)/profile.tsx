
import { useChild } from '@/contexts/ChildContext';
import UpgradePromptModal from '@/components/UpgradePromptModal';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import ProfileAvatar from '@/components/ProfileAvatar';
import { IconSymbol } from '@/components/IconSymbol';
import { View, Text, StyleSheet, ScrollView, Platform, TouchableOpacity, Image, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import FullScreenVideoPlayer from '@/components/FullScreenVideoPlayer';
import { useProfileStats } from '@/contexts/ProfileStatsContext';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { supabase } from '@/app/integrations/supabase/client';
import ChildSelectorBottomSheet from '@/components/ChildSelectorBottomSheet';
import { processMomentsWithSignedUrls, getSignedVideoUrl } from '@/utils/videoStorage';
import { colors } from '@/styles/commonStyles';
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { pickProfileImage, uploadProfileAvatar, deleteProfileAvatar } from '@/utils/profileAvatarUpload';
import { HapticFeedback } from '@/utils/haptics';
import { useCameraTrigger } from '@/contexts/CameraTriggerContext';
import AddChildBottomSheet from '@/components/AddChildBottomSheet';
import SubscriptionStatusCard from '@/components/SubscriptionStatusCard';
import { useSubscription } from '@/contexts/SubscriptionContext';

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
  const { selectedChild, children: childrenList, loading: childLoading } = useChild();
  const { user, userRole, isAdmin, roleLoading } = useAuth();
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
  const [failedThumbnails, setFailedThumbnails] = useState<Set<string>>(new Set());
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);

  const childSelectorRef = useRef<BottomSheetModal>(null);
  const addChildRef = useRef<BottomSheetModal>(null);

  const { shouldOpenCamera, resetCameraTrigger } = useCameraTrigger();
  const router = useRouter();
  const { stats: profileStats, fetchProfileStats } = useProfileStats();
  const { refreshUsage } = useSubscription();

  // Fetch profile data from database
  const fetchProfileData = useCallback(async (forceRefresh = false) => {
    if (!selectedChild) {
      console.log('ProfileScreen: No child selected, skipping fetch');
      setLoading(false);
      return;
    }

    try {
      if (forceRefresh) {
        console.log('ProfileScreen: Force refreshing profile data');
      } else {
        console.log('ProfileScreen: Fetching profile data for child:', selectedChild.id);
      }

      setLoading(true);

      const startOfWeek = getStartOfWeek();

      // Fetch all data in parallel - fetch total counts directly from database
      const [
        { count: totalWordsCount },
        { count: totalBooksCount },
        { data: wordsThisWeekData },
        { data: booksThisWeekData },
        { data: momentsData },
        { data: momentsThisWeekData },
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
          .select('id, created_at')
          .eq('child_id', selectedChild.id)
          .gte('created_at', startOfWeek.toISOString()),
        supabase
          .from('user_books')
          .select('id, created_at')
          .eq('child_id', selectedChild.id)
          .gte('created_at', startOfWeek.toISOString()),
        supabase
          .from('moments')
          .select('*')
          .eq('child_id', selectedChild.id)
          .order('created_at', { ascending: false })
          .limit(3),
        supabase
          .from('moments')
          .select('id, created_at')
          .eq('child_id', selectedChild.id)
          .gte('created_at', startOfWeek.toISOString()),
      ]);

      const wordsThisWeekCount = wordsThisWeekData?.length || 0;
      const booksThisWeekCount = booksThisWeekData?.length || 0;
      const momentsThisWeekCount = momentsThisWeekData?.length || 0;

      console.log('ProfileScreen: Stats fetched - Total Words:', totalWordsCount, 'Total Books:', totalBooksCount);

      setStats({
        totalWords: totalWordsCount || 0,
        totalBooks: totalBooksCount || 0,
        wordsThisWeek: wordsThisWeekCount,
        booksThisWeek: booksThisWeekCount,
        momentsThisWeek: momentsThisWeekCount,
        newWordsThisWeek: wordsThisWeekCount,
      });

      // Process moments with signed URLs
      if (momentsData && momentsData.length > 0) {
        const processedMoments = await processMomentsWithSignedUrls(momentsData);
        setMoments(processedMoments);
      } else {
        setMoments([]);
      }
    } catch (error) {
      console.error('ProfileScreen: Error fetching profile data:', error);
      Alert.alert('Error', 'Failed to load profile data. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedChild]);

  // Debounced fetch to prevent too many calls
  const debouncedFetchProfileData = useCallback(
    (() => {
      let timeoutId: NodeJS.Timeout | null = null;
      return (forceRefresh = false) => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        timeoutId = setTimeout(() => {
          fetchProfileData(forceRefresh);
        }, 300);
      };
    })(),
    [fetchProfileData]
  );

  // Initial fetch when component mounts or child changes
  useEffect(() => {
    if (selectedChild && !childLoading) {
      fetchProfileData();
    }
  }, [selectedChild, childLoading, fetchProfileData]);

  // 🎯 CRITICAL: Refetch data whenever the Profile tab comes into focus
  // This ensures stats are updated after adding books/words from other tabs
  useFocusEffect(
    useCallback(() => {
      console.log('📊 Profile tab focused - refreshing data');
      if (selectedChild) {
        // Force refresh profile data from database
        fetchProfileData(true);
        // Refresh profile stats context
        fetchProfileStats();
        // Refresh subscription usage
        refreshUsage();
      }
    }, [selectedChild, fetchProfileData, fetchProfileStats, refreshUsage])
  );

  // Update avatar URL when child changes
  useEffect(() => {
    if (selectedChild?.avatar_url) {
      setAvatarUrl(selectedChild.avatar_url);
    } else {
      setAvatarUrl(null);
    }
  }, [selectedChild?.avatar_url]);

  // Handle camera trigger
  useEffect(() => {
    if (shouldOpenCamera) {
      console.log('ProfileScreen: Camera trigger detected, opening camera');
      handleRecordMoment();
      resetCameraTrigger();
    }
  }, [shouldOpenCamera, resetCameraTrigger]);

  const calculateAge = (birthDate: string): string => {
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return `${age} years old`;
  };

  const handleOpenChildSelector = () => {
    HapticFeedback.light();
    childSelectorRef.current?.present();
  };

  const handleSelectChild = (childId: string) => {
    console.log('ProfileScreen: Child selected:', childId);
    childSelectorRef.current?.dismiss();
  };

  const handleOpenAddChild = () => {
    HapticFeedback.light();
    addChildRef.current?.present();
  };

  const handleAddChild = async (name: string, birthDate: Date) => {
    console.log('ProfileScreen: Adding child:', name);
    addChildRef.current?.dismiss();
  };

  const handleOpenSettings = () => {
    HapticFeedback.light();
    router.push('/settings');
  };

  const handleOpenAdminPanel = () => {
    HapticFeedback.light();
    router.push('/admin-panel');
  };

  const handleRecordMoment = () => {
    console.log('ProfileScreen: Record moment pressed');
    HapticFeedback.medium();
  };

  const handleViewMoreMoments = () => {
    HapticFeedback.light();
    router.push('/all-moments');
  };

  const handleFindOutMore = () => {
    HapticFeedback.light();
    setShowUpgradePrompt(true);
  };

  const handleMomentPress = async (moment: Moment) => {
    HapticFeedback.light();
    console.log('ProfileScreen: Moment pressed:', moment.id);

    try {
      let videoUrl = moment.signedVideoUrl;

      if (!videoUrl) {
        console.log('ProfileScreen: No signed URL, generating new one');
        videoUrl = await getSignedVideoUrl(moment.video_url);
      }

      if (videoUrl) {
        setSelectedMoment({ ...moment, signedVideoUrl: videoUrl });
        setShowVideoPlayer(true);
      } else {
        Alert.alert('Error', 'Unable to load video. Please try again.');
      }
    } catch (error) {
      console.error('ProfileScreen: Error loading video:', error);
      Alert.alert('Error', 'Failed to load video. Please try again.');
    }
  };

  const handleCloseVideoPlayer = () => {
    setShowVideoPlayer(false);
    setSelectedMoment(null);
  };

  const handleThumbnailError = (momentId: string) => {
    console.log('ProfileScreen: Thumbnail failed to load for moment:', momentId);
    setFailedThumbnails(prev => new Set(prev).add(momentId));
  };

  const handleChangeAvatar = async () => {
    if (!selectedChild) {
      console.log('ProfileScreen: No child selected');
      return;
    }

    HapticFeedback.light();

    try {
      const result = await pickProfileImage();
      
      if (result) {
        console.log('ProfileScreen: Image picked, uploading...');
        const newAvatarUrl = await uploadProfileAvatar(result.uri, selectedChild.id);
        
        if (newAvatarUrl) {
          console.log('ProfileScreen: Avatar uploaded successfully');
          setAvatarUrl(newAvatarUrl);
          
          // Update child in database
          const { error } = await supabase
            .from('children')
            .update({ avatar_url: newAvatarUrl })
            .eq('id', selectedChild.id);

          if (error) {
            console.error('ProfileScreen: Error updating avatar in database:', error);
            Alert.alert('Error', 'Failed to update avatar. Please try again.');
          } else {
            HapticFeedback.success();
          }
        }
      }
    } catch (error) {
      console.error('ProfileScreen: Error changing avatar:', error);
      Alert.alert('Error', 'Failed to change avatar. Please try again.');
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchProfileData(true);
    fetchProfileStats();
    refreshUsage();
  }, [fetchProfileData, fetchProfileStats, refreshUsage]);

  if (childLoading || loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!selectedChild) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.emptyContainer}>
          <IconSymbol ios_icon_name="person.circle" android_material_icon_name="person" size={80} color={colors.textSecondary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No Child Selected</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Add a child to get started
          </Text>
          <TouchableOpacity style={[styles.addButton, { backgroundColor: colors.primary }]} onPress={handleOpenAddChild}>
            <Text style={styles.addButtonText}>Add Child</Text>
          </TouchableOpacity>
        </View>

        <AddChildBottomSheet ref={addChildRef} onAddChild={handleAddChild} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.contentContainer,
          Platform.OS !== 'ios' && styles.contentContainerWithTabBar
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* Header with Settings */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleOpenSettings} style={styles.settingsButton}>
            <IconSymbol ios_icon_name="gearshape.fill" android_material_icon_name="settings" size={24} color={colors.text} />
          </TouchableOpacity>
          {isAdmin && (
            <TouchableOpacity onPress={handleOpenAdminPanel} style={styles.adminButton}>
              <IconSymbol ios_icon_name="shield.fill" android_material_icon_name="admin-panel-settings" size={24} color={colors.primary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Subscription Status Card */}
        <SubscriptionStatusCard onFindOutMore={handleFindOutMore} />

        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <TouchableOpacity onPress={handleChangeAvatar}>
            <ProfileAvatar
              avatarUrl={avatarUrl}
              name={selectedChild.name}
              size={100}
            />
          </TouchableOpacity>
          
          <TouchableOpacity onPress={handleOpenChildSelector} style={styles.nameContainer}>
            <Text style={[styles.name, { color: colors.text }]}>{selectedChild.name}</Text>
            <IconSymbol ios_icon_name="chevron.down" android_material_icon_name="arrow-drop-down" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          
          <Text style={[styles.age, { color: colors.textSecondary }]}>
            {calculateAge(selectedChild.birth_date)}
          </Text>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: colors.cardBackground }]}>
            <Text style={[styles.statNumber, { color: colors.primary }]}>{stats.totalWords}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Words</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.cardBackground }]}>
            <Text style={[styles.statNumber, { color: colors.primary }]}>{stats.totalBooks}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Books</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.cardBackground }]}>
            <Text style={[styles.statNumber, { color: colors.primary }]}>{stats.wordsThisWeek}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Words This Week</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.cardBackground }]}>
            <Text style={[styles.statNumber, { color: colors.primary }]}>{stats.booksThisWeek}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Books This Week</Text>
          </View>
        </View>

        {/* Recent Moments */}
        <View style={styles.momentsSection}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Moments</Text>
            {moments.length > 0 && (
              <TouchableOpacity onPress={handleViewMoreMoments}>
                <Text style={[styles.viewMoreText, { color: colors.primary }]}>View All</Text>
              </TouchableOpacity>
            )}
          </View>

          {moments.length === 0 ? (
            <View style={[styles.emptyMomentsCard, { backgroundColor: colors.cardBackground }]}>
              <IconSymbol ios_icon_name="video.circle" android_material_icon_name="videocam" size={48} color={colors.textSecondary} />
              <Text style={[styles.emptyMomentsText, { color: colors.textSecondary }]}>
                No moments yet. Start recording!
              </Text>
            </View>
          ) : (
            <View style={styles.momentsGrid}>
              {moments.map((moment) => (
                <TouchableOpacity
                  key={moment.id}
                  style={styles.momentCard}
                  onPress={() => handleMomentPress(moment)}
                >
                  {moment.signedThumbnailUrl && !failedThumbnails.has(moment.id) ? (
                    <Image
                      source={{ uri: moment.signedThumbnailUrl }}
                      style={styles.momentThumbnail}
                      onError={() => handleThumbnailError(moment.id)}
                    />
                  ) : (
                    <View style={[styles.momentPlaceholder, { backgroundColor: colors.cardBackground }]}>
                      <IconSymbol ios_icon_name="video.fill" android_material_icon_name="videocam" size={32} color={colors.textSecondary} />
                    </View>
                  )}
                  <View style={styles.playIconContainer}>
                    <IconSymbol ios_icon_name="play.circle.fill" android_material_icon_name="play-circle-filled" size={40} color="rgba(255,255,255,0.9)" />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Child Selector Bottom Sheet */}
      <ChildSelectorBottomSheet
        ref={childSelectorRef}
        onSelectChild={handleSelectChild}
        onAddChild={handleOpenAddChild}
      />

      {/* Add Child Bottom Sheet */}
      <AddChildBottomSheet ref={addChildRef} onAddChild={handleAddChild} />

      {/* Video Player */}
      {showVideoPlayer && selectedMoment && (
        <FullScreenVideoPlayer
          videoUri={selectedMoment.signedVideoUrl || ''}
          onClose={handleCloseVideoPlayer}
          trimStart={selectedMoment.trim_start}
          trimEnd={selectedMoment.trim_end}
        />
      )}

      {/* Upgrade Prompt Modal */}
      <UpgradePromptModal
        visible={showUpgradePrompt}
        onClose={() => setShowUpgradePrompt(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  contentContainerWithTabBar: {
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 16,
    marginTop: 8,
    textAlign: 'center',
  },
  addButton: {
    marginTop: 24,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 12,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
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
  profileHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    gap: 4,
  },
  name: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  age: {
    fontSize: 16,
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 14,
    marginTop: 4,
  },
  momentsSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  viewMoreText: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyMomentsCard: {
    padding: 40,
    borderRadius: 16,
    alignItems: 'center',
  },
  emptyMomentsText: {
    fontSize: 16,
    marginTop: 12,
    textAlign: 'center',
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
    position: 'relative',
  },
  momentThumbnail: {
    width: '100%',
    height: '100%',
  },
  momentPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIconContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -20 }, { translateY: -20 }],
  },
});
