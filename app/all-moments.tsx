
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { useChild } from '@/contexts/ChildContext';
import { supabase } from '@/app/integrations/supabase/client';
import FullScreenVideoPlayer from '@/components/FullScreenVideoPlayer';
import { processMomentsWithSignedUrls } from '@/utils/videoStorage';

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

export default function AllMomentsScreen() {
  const router = useRouter();
  const { selectedChild } = useChild();
  const [moments, setMoments] = useState<Moment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMoment, setSelectedMoment] = useState<Moment | null>(null);
  const [showVideoPlayer, setShowVideoPlayer] = useState(false);

  const fetchAllMoments = useCallback(async () => {
    if (!selectedChild) {
      console.log('AllMomentsScreen: No selected child');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      console.log('AllMomentsScreen: Fetching all moments for child:', selectedChild.id);

      const { data, error: fetchError } = await supabase
        .from('moments')
        .select('id, video_url, thumbnail_url, created_at, trim_start, trim_end')
        .eq('child_id', selectedChild.id)
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error('AllMomentsScreen: Error fetching moments:', fetchError);
        throw fetchError;
      }

      console.log('AllMomentsScreen: Fetched', data?.length || 0, 'moments');
      
      // Generate signed URLs for all moments
      if (data && data.length > 0) {
        console.log('AllMomentsScreen: Generating signed URLs for moments...');
        const momentsWithSignedUrls = await processMomentsWithSignedUrls(data);
        setMoments(momentsWithSignedUrls);
        console.log('AllMomentsScreen: ✓ Signed URLs generated');
      } else {
        setMoments([]);
      }
    } catch (err) {
      console.error('AllMomentsScreen: Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load moments');
    } finally {
      setLoading(false);
    }
  }, [selectedChild]);

  useEffect(() => {
    fetchAllMoments();
  }, [fetchAllMoments]);

  // Set up real-time subscription for moments updates
  useEffect(() => {
    if (!selectedChild) {
      console.log('AllMomentsScreen: No selected child, skipping subscription');
      return;
    }

    console.log('AllMomentsScreen: Setting up real-time subscription for child:', selectedChild.id);

    const momentsChannel = supabase
      .channel(`all_moments_page_${selectedChild.id}`, {
        config: {
          broadcast: { self: false },
        },
      })
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'moments',
          filter: `child_id=eq.${selectedChild.id}`,
        },
        (payload) => {
          console.log('AllMomentsScreen: moments change detected:', payload.eventType, payload);
          fetchAllMoments();
        }
      )
      .subscribe((status, err) => {
        console.log('AllMomentsScreen: subscription status:', status);
        if (err) {
          console.error('AllMomentsScreen: subscription error:', err);
        }
      });

    return () => {
      console.log('AllMomentsScreen: Cleaning up subscription');
      supabase.removeChannel(momentsChannel);
    };
  }, [selectedChild, fetchAllMoments]);

  const handleBack = () => {
    console.log('AllMomentsScreen: Back button pressed');
    router.back();
  };

  const handleMomentPress = (moment: Moment) => {
    console.log('AllMomentsScreen: Moment pressed:', moment.id);
    console.log('AllMomentsScreen: Trim metadata:', { trim_start: moment.trim_start, trim_end: moment.trim_end });
    
    // Store the full moment object with trim metadata
    setSelectedMoment(moment);
    setShowVideoPlayer(true);
  };

  const handleCloseVideoPlayer = () => {
    console.log('AllMomentsScreen: Closing video player');
    setShowVideoPlayer(false);
    setSelectedMoment(null);
  };

  const renderMomentItem = ({ item, index }: { item: Moment; index: number }) => {
    const isLeftColumn = index % 2 === 0;
    // Use signed thumbnail URL if available, fallback to original URL
    const thumbnailUrl = item.signedThumbnailUrl || item.thumbnail_url;
    
    return (
      <TouchableOpacity
        style={[styles.momentCard, isLeftColumn ? styles.momentCardLeft : styles.momentCardRight]}
        onPress={() => handleMomentPress(item)}
        activeOpacity={0.8}
      >
        {thumbnailUrl ? (
          <Image 
            source={{ uri: thumbnailUrl }}
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
        <View style={styles.playIconOverlay}>
          <View style={styles.playIconCircle}>
            <IconSymbol 
              ios_icon_name="play.fill" 
              android_material_icon_name="play-arrow" 
              size={24} 
              color={colors.backgroundAlt} 
            />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <IconSymbol 
        ios_icon_name="video.slash" 
        android_material_icon_name="videocam-off" 
        size={64} 
        color={colors.textSecondary} 
      />
      <Text style={styles.emptyText}>No moments yet</Text>
      <Text style={styles.emptySubtext}>Start recording to capture special moments!</Text>
    </View>
  );

  if (loading) {
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
            <Text style={styles.headerTitle}>All Moments</Text>
            <View style={styles.placeholder} />
          </View>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.buttonBlue} />
            <Text style={styles.loadingText}>Loading moments...</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  if (error) {
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
            <Text style={styles.headerTitle}>All Moments</Text>
            <View style={styles.placeholder} />
          </View>
          <View style={styles.errorContainer}>
            <IconSymbol 
              ios_icon_name="exclamationmark.triangle.fill" 
              android_material_icon_name="error" 
              size={48} 
              color={colors.textSecondary} 
            />
            <Text style={styles.errorText}>Failed to load moments</Text>
            <Text style={styles.errorSubtext}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchAllMoments}>
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
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <IconSymbol 
              ios_icon_name="chevron.left" 
              android_material_icon_name="arrow-back" 
              size={24} 
              color={colors.primary} 
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>All Moments</Text>
          <View style={styles.placeholder} />
        </View>

        <FlatList
          data={moments}
          renderItem={renderMomentItem}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.gridContainer}
          columnWrapperStyle={styles.columnWrapper}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmptyState}
        />
      </SafeAreaView>

      {selectedMoment && (
        <FullScreenVideoPlayer
          visible={showVideoPlayer}
          videoUri={selectedMoment.signedVideoUrl || selectedMoment.video_url}
          onClose={handleCloseVideoPlayer}
          trimStart={selectedMoment.trim_start}
          trimEnd={selectedMoment.trim_end}
        />
      )}
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
    paddingTop: Platform.OS === 'android' ? 48 : 16,
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
  gridContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  momentCard: {
    width: '48%',
    aspectRatio: 2 / 3,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: colors.cardPurple,
    position: 'relative',
  },
  momentCardLeft: {
    marginRight: 4,
  },
  momentCardRight: {
    marginLeft: 4,
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
  playIconOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  playIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.primary,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
});
