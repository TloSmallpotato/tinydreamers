
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

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  childSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  childName: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.cardBackground,
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.background,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  profileAge: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  statsContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
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
  section: {
    paddingHorizontal: 20,
    paddingVertical: 16,
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
  viewMoreButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  viewMoreText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  momentsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  momentCard: {
    width: '31%',
    aspectRatio: 9 / 16,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.cardBackground,
  },
  momentThumbnail: {
    width: '100%',
    height: '100%',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyStateText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 12,
    textAlign: 'center',
  },
  recordButton: {
    marginTop: 16,
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  recordButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  adminButton: {
    marginTop: 16,
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    alignSelf: 'center',
  },
  adminButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

function getStartOfWeek(): Date {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

export default function ProfileScreen() {
  const { user, isAdmin } = useAuth();
  const router = useRouter();
  const { selectedChild, children, selectChild, addChild, loading: childLoading } = useChild();
  const { shouldOpenCamera, resetCameraTrigger } = useCameraTrigger();
  const { tier, isSubscribed } = useSubscription();
  const { fetchProfileStats } = useProfileStats();

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
  const [selectedMoment, setSelectedMoment] = useState<Moment | null>(null);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);

  const childSelectorRef = useRef<BottomSheetModal>(null);
  const addChildRef = useRef<BottomSheetModal>(null);

  // Check user role
  useEffect(() => {
    const checkUserRole = async () => {
      if (!user) {
        setRoleLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (error) throw error;
        setUserRole(data?.role || null);
      } catch (error) {
        console.error('Error checking user role:', error);
      } finally {
        setRoleLoading(false);
      }
    };

    checkUserRole();
  }, [user]);

  const fetchProfileData = useCallback(async (forceRefresh = false) => {
    if (!selectedChild) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const startOfWeek = getStartOfWeek();

      // Fetch total words count
      const { count: totalWordsCount, error: wordsError } = await supabase
        .from('words')
        .select('*', { count: 'exact', head: true })
        .eq('child_id', selectedChild.id);

      if (wordsError) throw wordsError;

      // Fetch total books count
      const { count: totalBooksCount, error: booksError } = await supabase
        .from('user_books')
        .select('*', { count: 'exact', head: true })
        .eq('child_id', selectedChild.id);

      if (booksError) throw booksError;

      // Fetch words this week
      const { count: wordsThisWeekCount, error: wordsWeekError } = await supabase
        .from('words')
        .select('*', { count: 'exact', head: true })
        .eq('child_id', selectedChild.id)
        .gte('created_at', startOfWeek.toISOString());

      if (wordsWeekError) throw wordsWeekError;

      // Fetch books this week
      const { count: booksThisWeekCount, error: booksWeekError } = await supabase
        .from('user_books')
        .select('*', { count: 'exact', head: true })
        .eq('child_id', selectedChild.id)
        .gte('created_at', startOfWeek.toISOString());

      if (booksWeekError) throw booksWeekError;

      // Fetch moments this week
      const { count: momentsThisWeekCount, error: momentsWeekError } = await supabase
        .from('moments')
        .select('*', { count: 'exact', head: true })
        .eq('child_id', selectedChild.id)
        .gte('created_at', startOfWeek.toISOString());

      if (momentsWeekError) throw momentsWeekError;

      // Fetch recent moments
      const { data: momentsData, error: momentsError } = await supabase
        .from('moments')
        .select('*')
        .eq('child_id', selectedChild.id)
        .order('created_at', { ascending: false })
        .limit(6);

      if (momentsError) throw momentsError;

      // Process moments with signed URLs
      const processedMoments = await processMomentsWithSignedUrls(momentsData || []);

      setStats({
        totalWords: totalWordsCount || 0,
        totalBooks: totalBooksCount || 0,
        wordsThisWeek: wordsThisWeekCount || 0,
        booksThisWeek: booksThisWeekCount || 0,
        momentsThisWeek: momentsThisWeekCount || 0,
        newWordsThisWeek: wordsThisWeekCount || 0,
      });
      setMoments(processedMoments);
    } catch (error) {
      console.error('Error fetching profile data:', error);
      Alert.alert('Error', 'Failed to load profile data');
    } finally {
      setLoading(false);
    }
  }, [selectedChild]);

  useEffect(() => {
    if (selectedChild && !childLoading) {
      fetchProfileData();
    }
  }, [selectedChild, childLoading, fetchProfileData]);

  // Refetch data when Profile tab comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log('📊 Profile tab focused - refreshing data');
      if (selectedChild) {
        fetchProfileData(true);
      }
    }, [selectedChild, fetchProfileData])
  );

  useEffect(() => {
    if (shouldOpenCamera) {
      handleRecordMoment();
      resetCameraTrigger();
    }
  }, [shouldOpenCamera, resetCameraTrigger]);

  useEffect(() => {
    if (selectedChild?.avatar_url) {
      console.log('Avatar URL:', selectedChild.avatar_url);
    }
  }, [selectedChild?.avatar_url]);

  const calculateAge = (birthDate: string): string => {
    const birth = new Date(birthDate);
    const today = new Date();
    const months = (today.getFullYear() - birth.getFullYear()) * 12 + (today.getMonth() - birth.getMonth());
    
    if (months < 12) {
      return `${months} months`;
    } else {
      const years = Math.floor(months / 12);
      const remainingMonths = months % 12;
      if (remainingMonths === 0) {
        return `${years} ${years === 1 ? 'year' : 'years'}`;
      }
      return `${years} ${years === 1 ? 'year' : 'years'} ${remainingMonths} ${remainingMonths === 1 ? 'month' : 'months'}`;
    }
  };

  const handleOpenChildSelector = () => {
    HapticFeedback.impact('light');
    childSelectorRef.current?.present();
  };

  const handleSelectChild = (childId: string) => {
    selectChild(childId);
    childSelectorRef.current?.dismiss();
  };

  const handleOpenAddChild = () => {
    HapticFeedback.impact('light');
    addChildRef.current?.present();
  };

  const handleAddChild = async (name: string, birthDate: Date) => {
    try {
      await addChild(name, birthDate);
      addChildRef.current?.dismiss();
    } catch (error) {
      console.error('Error adding child:', error);
      Alert.alert('Error', 'Failed to add child');
    }
  };

  const handleOpenSettings = () => {
    HapticFeedback.impact('light');
    router.push('/settings');
  };

  const handleOpenAdminPanel = () => {
    HapticFeedback.impact('light');
    router.push('/admin-panel');
  };

  const handleRecordMoment = () => {
    HapticFeedback.impact('medium');
    // Camera will be opened by the tab bar
  };

  const handleViewMoreMoments = () => {
    HapticFeedback.impact('light');
    router.push('/moments');
  };

  const handleFindOutMore = () => {
    HapticFeedback.impact('light');
    setShowUpgradePrompt(true);
  };

  const handleMomentPress = (moment: Moment) => {
    HapticFeedback.impact('light');
    setSelectedMoment(moment);
  };

  const handleCloseVideoPlayer = () => {
    setSelectedMoment(null);
  };

  const handleChangeAvatar = async () => {
    if (!selectedChild) return;

    try {
      HapticFeedback.impact('medium');
      
      Alert.alert(
        'Change Avatar',
        'Choose an option',
        [
          {
            text: 'Take Photo',
            onPress: async () => {
              const result = await pickProfileImage('camera');
              if (result) {
                const avatarUrl = await uploadProfileAvatar(result.uri, selectedChild.id);
                if (avatarUrl) {
                  await fetchProfileData(true);
                }
              }
            },
          },
          {
            text: 'Choose from Library',
            onPress: async () => {
              const result = await pickProfileImage('library');
              if (result) {
                const avatarUrl = await uploadProfileAvatar(result.uri, selectedChild.id);
                if (avatarUrl) {
                  await fetchProfileData(true);
                }
              }
            },
          },
          ...(selectedChild.avatar_url ? [{
            text: 'Remove Avatar',
            style: 'destructive' as const,
            onPress: async () => {
              await deleteProfileAvatar(selectedChild.id);
              await fetchProfileData(true);
            },
          }] : []),
          {
            text: 'Cancel',
            style: 'cancel' as const,
          },
        ]
      );
    } catch (error) {
      console.error('Error changing avatar:', error);
      Alert.alert('Error', 'Failed to change avatar');
    }
  };

  if (loading || childLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!selectedChild) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.loadingContainer}>
          <Text style={styles.emptyStateText}>No child selected</Text>
          <TouchableOpacity style={styles.recordButton} onPress={handleOpenAddChild}>
            <Text style={styles.recordButtonText}>Add Child</Text>
          </TouchableOpacity>
        </View>
        <AddChildBottomSheet
          ref={addChildRef}
          onAddChild={handleAddChild}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <TouchableOpacity style={styles.childSelector} onPress={handleOpenChildSelector}>
              <Text style={styles.childName}>{selectedChild.name}</Text>
              <IconSymbol ios_icon_name="chevron.down" android_material_icon_name="expand-more" size={24} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.settingsButton} onPress={handleOpenSettings}>
              <IconSymbol ios_icon_name="gearshape.fill" android_material_icon_name="settings" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.profileSection}>
            <View style={styles.avatarContainer}>
              <ProfileAvatar
                avatarUrl={selectedChild.avatar_url}
                name={selectedChild.name}
                size={80}
              />
              <TouchableOpacity style={styles.editAvatarButton} onPress={handleChangeAvatar}>
                <IconSymbol ios_icon_name="camera.fill" android_material_icon_name="camera-alt" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{selectedChild.name}</Text>
              <Text style={styles.profileAge}>{calculateAge(selectedChild.birth_date)}</Text>
            </View>
          </View>
        </View>

        <SubscriptionStatusCard />

        <View style={styles.statsContainer}>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.totalWords}</Text>
              <Text style={styles.statLabel}>Total Words</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.totalBooks}</Text>
              <Text style={styles.statLabel}>Total Books</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Moments</Text>
            {moments.length > 0 && (
              <TouchableOpacity style={styles.viewMoreButton} onPress={handleViewMoreMoments}>
                <Text style={styles.viewMoreText}>View All</Text>
              </TouchableOpacity>
            )}
          </View>

          {moments.length === 0 ? (
            <View style={styles.emptyState}>
              <IconSymbol ios_icon_name="video.slash" android_material_icon_name="videocam-off" size={48} color={colors.textSecondary} />
              <Text style={styles.emptyStateText}>No moments yet</Text>
              <TouchableOpacity style={styles.recordButton} onPress={handleRecordMoment}>
                <Text style={styles.recordButtonText}>Record First Moment</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.momentsGrid}>
              {moments.map((moment) => (
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
                    <View style={[styles.momentThumbnail, { backgroundColor: colors.cardBackground, justifyContent: 'center', alignItems: 'center' }]}>
                      <IconSymbol ios_icon_name="video.fill" android_material_icon_name="videocam" size={32} color={colors.textSecondary} />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {!roleLoading && userRole === 'admin' && isAdmin && (
          <TouchableOpacity style={styles.adminButton} onPress={handleOpenAdminPanel}>
            <Text style={styles.adminButtonText}>Admin Panel</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <ChildSelectorBottomSheet
        ref={childSelectorRef}
        childrenList={children || []}
        selectedChildId={selectedChild?.id || null}
        onSelectChild={handleSelectChild}
        onAddChild={handleOpenAddChild}
      />

      <AddChildBottomSheet
        ref={addChildRef}
        onAddChild={handleAddChild}
      />

      <UpgradePromptModal
        visible={showUpgradePrompt}
        onClose={() => setShowUpgradePrompt(false)}
        feature="unlimited moments"
      />

      {selectedMoment && (
        <FullScreenVideoPlayer
          moment={selectedMoment}
          onClose={handleCloseVideoPlayer}
        />
      )}
    </SafeAreaView>
  );
}
