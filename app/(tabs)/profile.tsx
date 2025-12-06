
import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, TouchableOpacity, Image } from 'react-native';
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
import * as ImagePicker from 'expo-image-picker';

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
  const { children, selectedChild, selectChild, addChild, updateChild } = useChild();
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

  useEffect(() => {
    if (selectedChild) {
      fetchProfileData();
    }
  }, [selectedChild]);

  const fetchProfileData = async () => {
    if (!selectedChild) return;

    try {
      setLoading(true);
      console.log('Fetching profile data for child:', selectedChild.id);

      const startOfWeek = getStartOfWeek();
      const startOfWeekISO = startOfWeek.toISOString();
      console.log('Start of week (Monday):', startOfWeekISO);

      const { count: totalWordsCount, error: totalWordsError } = await supabase
        .from('user_words')
        .select('*', { count: 'exact', head: true })
        .eq('child_id', selectedChild.id);

      if (totalWordsError) {
        console.error('Error fetching total words:', totalWordsError);
        throw totalWordsError;
      }

      const { count: wordsThisWeekCount, error: wordsThisWeekError } = await supabase
        .from('user_words')
        .select('*', { count: 'exact', head: true })
        .eq('child_id', selectedChild.id)
        .gte('created_at', startOfWeekISO);

      if (wordsThisWeekError) {
        console.error('Error fetching words this week:', wordsThisWeekError);
        throw wordsThisWeekError;
      }

      const { count: totalBooksCount, error: totalBooksError } = await supabase
        .from('user_books')
        .select('*', { count: 'exact', head: true })
        .eq('child_id', selectedChild.id);

      if (totalBooksError) {
        console.error('Error fetching total books:', totalBooksError);
        throw totalBooksError;
      }

      const { count: booksThisWeekCount, error: booksThisWeekError } = await supabase
        .from('user_books')
        .select('*', { count: 'exact', head: true })
        .eq('child_id', selectedChild.id)
        .gte('created_at', startOfWeekISO);

      if (booksThisWeekError) {
        console.error('Error fetching books this week:', booksThisWeekError);
        throw booksThisWeekError;
      }

      const { count: momentsThisWeekCount, error: momentsThisWeekError } = await supabase
        .from('moments')
        .select('*', { count: 'exact', head: true })
        .eq('child_id', selectedChild.id)
        .gte('created_at', startOfWeekISO);

      if (momentsThisWeekError) {
        console.error('Error fetching moments this week:', momentsThisWeekError);
        throw momentsThisWeekError;
      }

      const { data: momentsData, error: momentsError } = await supabase
        .from('moments')
        .select('id, video_url, thumbnail_url, created_at')
        .eq('child_id', selectedChild.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (momentsError) {
        console.error('Error fetching moments:', momentsError);
        throw momentsError;
      }

      console.log('Profile data fetched successfully');
      console.log('Total words:', totalWordsCount);
      console.log('Words this week:', wordsThisWeekCount);
      console.log('Total books:', totalBooksCount);
      console.log('Books this week:', booksThisWeekCount);
      console.log('Moments this week:', momentsThisWeekCount);
      console.log('Moments:', momentsData?.length || 0);

      setStats({
        totalWords: totalWordsCount || 0,
        totalBooks: totalBooksCount || 0,
        wordsThisWeek: wordsThisWeekCount || 0,
        booksThisWeek: booksThisWeekCount || 0,
        momentsThisWeek: momentsThisWeekCount || 0,
        newWordsThisWeek: wordsThisWeekCount || 0,
      });

      setMoments(momentsData || []);
    } catch (error) {
      console.error('Error fetching profile data:', error);
    } finally {
      setLoading(false);
    }
  };

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
    console.log('Opening child selector bottom sheet');
    childSelectorRef.current?.present();
  };

  const handleSelectChild = (childId: string) => {
    console.log('Selecting child:', childId);
    selectChild(childId);
    childSelectorRef.current?.dismiss();
  };

  const handleOpenAddChild = () => {
    console.log('Opening add child bottom sheet');
    childSelectorRef.current?.dismiss();
    setTimeout(() => {
      addChildRef.current?.present();
    }, 300);
  };

  const handleAddChild = async (name: string, birthDate: Date) => {
    try {
      console.log('Adding child:', name, birthDate);
      await addChild(name, birthDate);
      addChildRef.current?.dismiss();
    } catch (error) {
      console.error('Error adding child:', error);
    }
  };

  const handleOpenSettings = () => {
    console.log('Settings button pressed - opening settings bottom sheet');
    settingsRef.current?.present();
  };

  const handleRecordMoment = () => {
    console.log('Record button pressed - triggering camera');
    triggerCamera();
  };

  const handleViewMoreMoments = () => {
    console.log('View more moments pressed');
  };

  const handleChangeAvatar = async () => {
    if (!selectedChild) return;

    try {
      console.log('Opening image picker for avatar');
      
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        console.log('Permission to access media library was denied');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        console.log('Image selected:', imageUri);

        const fileExt = imageUri.split('.').pop();
        const fileName = `${selectedChild.id}-${Date.now()}.${fileExt}`;
        const filePath = `avatars/${fileName}`;

        const response = await fetch(imageUri);
        const blob = await response.blob();

        const { error: uploadError } = await supabase.storage
          .from('profile-avatars')
          .upload(filePath, blob, {
            contentType: `image/${fileExt}`,
            upsert: true,
          });

        if (uploadError) {
          console.error('Error uploading avatar:', uploadError);
          throw uploadError;
        }

        const { data: urlData } = supabase.storage
          .from('profile-avatars')
          .getPublicUrl(filePath);

        await updateChild(selectedChild.id, {
          avatar_url: urlData.publicUrl,
        });

        console.log('Avatar updated successfully');
      }
    } catch (error) {
      console.error('Error changing avatar:', error);
    }
  };

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
            {selectedChild && (
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
