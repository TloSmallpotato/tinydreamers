
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useFocusEffect } from 'expo-router';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import AddChildBottomSheet from '@/components/AddChildBottomSheet';
import ChildSelectorBottomSheet from '@/components/ChildSelectorBottomSheet';
import { IconSymbol } from '@/components/IconSymbol';
import { processMomentsWithSignedUrls } from '@/utils/videoStorage';
import { useChild } from '@/contexts/ChildContext';
import { pickProfileImage, uploadProfileAvatar, deleteProfileAvatar } from '@/utils/profileAvatarUpload';
import { HapticFeedback } from '@/utils/haptics';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { colors } from '@/styles/commonStyles';
import UpgradePromptModal from '@/components/UpgradePromptModal';
import ProfileAvatar from '@/components/ProfileAvatar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCameraTrigger } from '@/contexts/CameraTriggerContext';
import { useProfileStats } from '@/contexts/ProfileStatsContext';
import SubscriptionStatusCard from '@/components/SubscriptionStatusCard';
import FullScreenVideoPlayer from '@/components/FullScreenVideoPlayer';
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, Alert } from 'react-native';
import { supabase } from '@/app/integrations/supabase/client';

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
  const diff = now.getDate() - dayOfWeek;
  const startOfWeek = new Date(now.setDate(diff));
  startOfWeek.setHours(0, 0, 0, 0);
  return startOfWeek.toISOString();
};

export default function ProfileScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { selectedChild, childrenList, selectChild, addChild, loading: childLoading } = useChild();
  const { tier, currentUsage, canAddChild, refreshUsage } = useSubscription();
  const { shouldOpenCamera, resetCameraTrigger } = useCameraTrigger();
  const { fetchProfileStats } = useProfileStats();

  const [stats, setStats] = useState<ProfileStats>({
    totalWords: 0,
    totalBooks: 0,
    wordsThisWeek: 0,
    booksThisWeek: 0,
    momentsThisWeek: 0,
    newWordsThisWeek: 0,
  });
  const [recentMoments, setRecentMoments] = useState<Moment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMoment, setSelectedMoment] = useState<Moment | null>(null);
  const [showVideoPlayer, setShowVideoPlayer] = useState(false);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [upgradePromptType, setUpgradePromptType] = useState<'word' | 'book' | 'child'>('child');

  const childSelectorRef = useRef<BottomSheetModal>(null);
  const addChildRef = useRef<BottomSheetModal>(null);

  // Fetch profile data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log('Profile screen focused, fetching data...');
      if (selectedChild?.id) {
        fetchProfileData();
      }
    }, [selectedChild?.id])
  );

  useEffect(() => {
    if (shouldOpenCamera) {
      resetCameraTrigger();
    }
  }, [shouldOpenCamera, resetCameraTrigger]);

  useEffect(() => {
    if (!user) {
      router.replace('/login');
    }
  }, [user]);

  useEffect(() => {
    if (selectedChild?.id && !childLoading) {
      console.log('Selected child changed, fetching profile data...');
      fetchProfileData();
    }
  }, [selectedChild?.id, childLoading]);

  useEffect(() => {
    if (selectedChild?.avatar_url) {
      // Avatar updated, no need to do anything as ProfileAvatar handles it
    }
  }, [selectedChild?.avatar_url]);

  const fetchProfileData = useCallback(async () => {
    if (!selectedChild?.id) {
      console.log('No selected child, skipping fetch');
      return;
    }

    try {
      console.log('Fetching profile data for child:', selectedChild.id);
      setLoading(true);

      // Fetch fresh stats from database
      const freshStats = await fetchProfileStats();
      
      console.log('Fetched stats:', freshStats);
      
      if (freshStats) {
        setStats(freshStats);
      }

      // Fetch recent moments
      const startOfWeek = getStartOfWeek();
      console.log('Fetching moments since:', startOfWeek);
      
      const { data: momentsData, error: momentsError } = await supabase
        .from('moments')
        .select('*')
        .eq('child_id', selectedChild.id)
        .gte('created_at', startOfWeek)
        .order('created_at', { ascending: false })
        .limit(3);

      if (momentsError) {
        console.error('Error fetching moments:', momentsError);
        throw momentsError;
      }

      console.log('Fetched moments:', momentsData?.length || 0);

      if (momentsData) {
        const processedMoments = await processMomentsWithSignedUrls(momentsData);
        console.log('Processed moments:', processedMoments.length);
        setRecentMoments(processedMoments);
      }

      // Refresh subscription usage
      await refreshUsage();
      
      console.log('Profile data fetch complete');
    } catch (error) {
      console.error('Error fetching profile data:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedChild?.id, fetchProfileStats, refreshUsage]);

  const calculateAge = (birthDate: string) => {
    const birth = new Date(birthDate);
    const today = new Date();
    let years = today.getFullYear() - birth.getFullYear();
    let months = today.getMonth() - birth.getMonth();

    if (months < 0) {
      years--;
      months += 12;
    }

    return `${years}y ${months}m`;
  };

  const handleOpenChildSelector = () => {
    HapticFeedback.light();
    childSelectorRef.current?.present();
  };

  const handleSelectChild = (childId: string) => {
    selectChild(childId);
    childSelectorRef.current?.dismiss();
  };

  const handleOpenAddChild = () => {
    HapticFeedback.light();
    if (!canAddChild) {
      setUpgradePromptType('child');
      setShowUpgradePrompt(true);
      return;
    }
    addChildRef.current?.present();
  };

  const handleAddChild = async (name: string, birthDate: Date) => {
    try {
      await addChild(name, birthDate);
      addChildRef.current?.dismiss();
      await fetchProfileData();
    } catch (error) {
      console.error('Error adding child:', error);
      Alert.alert('Error', 'Failed to add child. Please try again.');
    }
  };

  const handleOpenSettings = () => {
    HapticFeedback.light();
    router.push('/settings');
  };

  const handleOpenAdminPanel = () => {
    HapticFeedback.light();
    router.push('/admin-all-books');
  };

  const handleRecordMoment = () => {
    HapticFeedback.light();
    // This will be handled by the tab bar's camera functionality
  };

  const handleViewMoreMoments = () => {
    HapticFeedback.light();
    router.push('/all-moments');
  };

  const handleFindOutMore = () => {
    HapticFeedback.light();
    router.push('/settings');
  };

  const handleMomentPress = (moment: Moment) => {
    HapticFeedback.light();
    setSelectedMoment(moment);
    setShowVideoPlayer(true);
  };

  const handleCloseVideoPlayer = () => {
    setShowVideoPlayer(false);
    setSelectedMoment(null);
  };

  const handleChangeAvatar = async () => {
    if (!selectedChild?.id) return;

    try {
      HapticFeedback.light();
      
      Alert.alert(
        'Change Avatar',
        'Choose an option',
        [
          {
            text: 'Take Photo',
            onPress: async () => {
              const imageUri = await pickProfileImage('camera');
              if (imageUri) {
                const avatarUrl = await uploadProfileAvatar(imageUri, selectedChild.id);
                if (avatarUrl) {
                  await fetchProfileData();
                }
              }
            },
          },
          {
            text: 'Choose from Library',
            onPress: async () => {
              const imageUri = await pickProfileImage('library');
              if (imageUri) {
                const avatarUrl = await uploadProfileAvatar(imageUri, selectedChild.id);
                if (avatarUrl) {
                  await fetchProfileData();
                }
              }
            },
          },
          ...(selectedChild.avatar_url
            ? [
                {
                  text: 'Remove Photo',
                  style: 'destructive' as const,
                  onPress: async () => {
                    const success = await deleteProfileAvatar(selectedChild.id);
                    if (success) {
                      await fetchProfileData();
                    }
                  },
                },
              ]
            : []),
          {
            text: 'Cancel',
            style: 'cancel' as const,
          },
        ]
      );
    } catch (error) {
      console.error('Error changing avatar:', error);
      Alert.alert('Error', 'Failed to change avatar. Please try again.');
    }
  };

  if (loading && !selectedChild) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Header with Child Selector */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.childSelector}
            onPress={handleOpenChildSelector}
          >
            <Text style={styles.childName}>
              {selectedChild?.name || 'Select Child'}
            </Text>
            <IconSymbol
              ios_icon_name="chevron.down"
              android_material_icon_name="expand_more"
              size={24}
              color={colors.primary}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleOpenSettings}>
            <IconSymbol
              ios_icon_name="gearshape.fill"
              android_material_icon_name="settings"
              size={24}
              color={colors.primary}
            />
          </TouchableOpacity>
        </View>

        {selectedChild && (
          <>
            {/* Profile Avatar and Info */}
            <View style={styles.profileSection}>
              <ProfileAvatar
                avatarUrl={selectedChild.avatar_url}
                childName={selectedChild.name}
                size={120}
                onPress={handleChangeAvatar}
              />
              <Text style={styles.profileName}>{selectedChild.name}</Text>
              <Text style={styles.profileAge}>
                {calculateAge(selectedChild.birth_date)}
              </Text>
            </View>

            {/* Subscription Status */}
            <SubscriptionStatusCard
              tier={tier}
              currentUsage={currentUsage}
              onFindOutMore={handleFindOutMore}
            />

            {/* This Week Stats */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>This week</Text>
            </View>

            <View style={styles.statsGrid}>
              <View style={[styles.statCard, { backgroundColor: colors.primaryLight }]}>
                <IconSymbol
                  ios_icon_name="text.bubble.fill"
                  android_material_icon_name="chat_bubble"
                  size={32}
                  color={colors.primary}
                />
                <Text style={styles.statNumber}>{stats.wordsThisWeek}</Text>
                <Text style={styles.statLabel}>Words</Text>
              </View>

              <View style={[styles.statCard, { backgroundColor: colors.secondaryLight }]}>
                <IconSymbol
                  ios_icon_name="book.fill"
                  android_material_icon_name="menu_book"
                  size={32}
                  color={colors.secondary}
                />
                <Text style={styles.statNumber}>{stats.booksThisWeek}</Text>
                <Text style={styles.statLabel}>Books</Text>
              </View>

              <View style={[styles.statCard, { backgroundColor: colors.accentLight }]}>
                <IconSymbol
                  ios_icon_name="video.fill"
                  android_material_icon_name="videocam"
                  size={32}
                  color={colors.accent}
                />
                <Text style={styles.statNumber}>{stats.momentsThisWeek}</Text>
                <Text style={styles.statLabel}>Moments</Text>
              </View>
            </View>

            {/* Recent Moments */}
            {recentMoments.length > 0 && (
              <>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Recent moments</Text>
                  <TouchableOpacity onPress={handleViewMoreMoments}>
                    <Text style={styles.viewMoreText}>View all</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.momentsContainer}
                >
                  {recentMoments.map((moment) => (
                    <TouchableOpacity
                      key={moment.id}
                      style={styles.momentCard}
                      onPress={() => handleMomentPress(moment)}
                    >
                      {moment.signedThumbnailUrl ? (
                        <Image
                          source={{ uri: moment.signedThumbnailUrl }}
                          style={styles.momentThumbnail}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={[styles.momentThumbnail, styles.momentPlaceholder]}>
                          <IconSymbol
                            ios_icon_name="video.fill"
                            android_material_icon_name="videocam"
                            size={32}
                            color={colors.textSecondary}
                          />
                        </View>
                      )}
                      <View style={styles.playIconContainer}>
                        <IconSymbol
                          ios_icon_name="play.circle.fill"
                          android_material_icon_name="play_circle_filled"
                          size={40}
                          color="white"
                        />
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}
          </>
        )}
      </ScrollView>

      {/* Bottom Sheets */}
      <ChildSelectorBottomSheet
        ref={childSelectorRef}
        children={childrenList || []}
        selectedChildId={selectedChild?.id}
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
          videoUrl={selectedMoment.signedVideoUrl || selectedMoment.video_url}
          trimStart={selectedMoment.trim_start}
          trimEnd={selectedMoment.trim_end}
          onClose={handleCloseVideoPlayer}
        />
      )}

      {/* Upgrade Prompt */}
      <UpgradePromptModal
        visible={showUpgradePrompt}
        onClose={() => setShowUpgradePrompt(false)}
        quotaType={upgradePromptType}
      />
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
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
  },
  childSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  childName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.primary,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 16,
  },
  profileAge: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary,
  },
  viewMoreText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.text,
  },
  statLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  momentsContainer: {
    gap: 12,
    paddingRight: 20,
  },
  momentCard: {
    width: 160,
    height: 200,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  momentThumbnail: {
    width: '100%',
    height: '100%',
  },
  momentPlaceholder: {
    backgroundColor: colors.cardBackground,
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
