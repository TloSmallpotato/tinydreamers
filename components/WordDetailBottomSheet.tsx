
import React, { forwardRef, useMemo, useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Dimensions } from 'react-native';
import { BottomSheetBackdrop, BottomSheetScrollView, BottomSheetModal } from '@gorhom/bottom-sheet';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { supabase } from '@/app/integrations/supabase/client';
import { useVideoRecording } from '@/contexts/VideoRecordingContext';
import { useCameraTrigger } from '@/contexts/CameraTriggerContext';
import FullScreenVideoPlayer from '@/components/FullScreenVideoPlayer';
import { Image } from 'expo-image';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface Word {
  id: string;
  word: string;
  emoji: string;
  color: string;
  is_spoken: boolean;
  is_recognised: boolean;
  is_recorded: boolean;
}

interface Moment {
  id: string;
  video_url: string;
  thumbnail_url?: string;
  created_at: string;
}

interface WordDetailBottomSheetProps {
  word: Word | null;
  onClose: () => void;
  onRefresh: () => void;
}

const WordDetailBottomSheet = forwardRef<BottomSheetModal, WordDetailBottomSheetProps>(
  ({ word, onClose, onRefresh }, ref) => {
    const snapPoints = useMemo(() => [screenHeight * 0.85], []);
    const [moments, setMoments] = useState<Moment[]>([]);
    const [loading, setLoading] = useState(false);
    const [isSpoken, setIsSpoken] = useState(false);
    const [isRecognised, setIsRecognised] = useState(false);
    const [selectedVideoUri, setSelectedVideoUri] = useState<string | null>(null);
    const [showVideoPlayer, setShowVideoPlayer] = useState(false);
    
    const { setTargetWord, setIsRecordingFromWordDetail } = useVideoRecording();
    const { triggerCamera } = useCameraTrigger();

    const updateWordStatus = useCallback(async (field: 'is_spoken' | 'is_recognised' | 'is_recorded', value: boolean) => {
      if (!word) return;

      try {
        const { error } = await supabase
          .from('user_words')
          .update({ [field]: value, updated_at: new Date().toISOString() })
          .eq('id', word.id);

        if (error) {
          console.error('Error updating word status:', error);
          throw error;
        }

        onRefresh();
      } catch (error) {
        console.error('Error in updateWordStatus:', error);
        Alert.alert('Error', 'Failed to update status');
      }
    }, [word, onRefresh]);

    const fetchMoments = useCallback(async () => {
      if (!word) return;

      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('moments')
          .select('*')
          .eq('word_id', word.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching moments:', error);
          throw error;
        }

        setMoments(data || []);
        
        const hasMoments = data && data.length > 0;
        if (hasMoments && !word.is_recorded) {
          console.log('Auto-updating word to recorded status');
          await updateWordStatus('is_recorded', true);
        } else if (!hasMoments && word.is_recorded) {
          console.log('Auto-updating word to not recorded status');
          await updateWordStatus('is_recorded', false);
        }
      } catch (error) {
        console.error('Error in fetchMoments:', error);
        Alert.alert('Error', 'Failed to load videos');
      } finally {
        setLoading(false);
      }
    }, [word, updateWordStatus]);

    useEffect(() => {
      if (word) {
        setIsSpoken(word.is_spoken);
        setIsRecognised(word.is_recognised);
        fetchMoments();
      }
    }, [word, fetchMoments]);

    const toggleSpoken = useCallback(async () => {
      const newValue = !isSpoken;
      setIsSpoken(newValue);
      await updateWordStatus('is_spoken', newValue);
    }, [isSpoken, updateWordStatus]);

    const toggleRecognised = useCallback(async () => {
      const newValue = !isRecognised;
      setIsRecognised(newValue);
      await updateWordStatus('is_recognised', newValue);
    }, [isRecognised, updateWordStatus]);

    const handleOpenCamera = () => {
      if (!word) return;
      
      console.log('Opening camera from word detail for word:', word.id);
      
      setTargetWord(word.id);
      setIsRecordingFromWordDetail(true);
      
      if (ref && typeof ref !== 'function' && ref.current) {
        ref.current.dismiss();
      }
      
      triggerCamera();
    };

    const handlePlayVideo = (moment: Moment) => {
      console.log('Playing video:', moment.video_url);
      setSelectedVideoUri(moment.video_url);
      setShowVideoPlayer(true);
    };

    const handleCloseVideoPlayer = () => {
      setShowVideoPlayer(false);
      setSelectedVideoUri(null);
    };

    const handleDeleteMoment = (moment: Moment) => {
      Alert.alert(
        'Delete Video',
        'Are you sure you want to delete this video moment? This action cannot be undone.',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              await deleteMoment(moment);
            },
          },
        ]
      );
    };

    const deleteMoment = async (moment: Moment) => {
      try {
        console.log('Deleting moment:', moment.id);
        
        const urlParts = moment.video_url.split('/video-moments/');
        if (urlParts.length > 1) {
          const filePath = urlParts[1];
          
          const { error: storageError } = await supabase.storage
            .from('video-moments')
            .remove([filePath]);

          if (storageError) {
            console.error('Error deleting from storage:', storageError);
          }
        }
        
        if (moment.thumbnail_url) {
          const thumbUrlParts = moment.thumbnail_url.split('/video-moments/');
          if (thumbUrlParts.length > 1) {
            const thumbFilePath = thumbUrlParts[1];
            
            const { error: thumbStorageError } = await supabase.storage
              .from('video-moments')
              .remove([thumbFilePath]);

            if (thumbStorageError) {
              console.error('Error deleting thumbnail from storage:', thumbStorageError);
            }
          }
        }

        const { error: dbError } = await supabase
          .from('moments')
          .delete()
          .eq('id', moment.id);

        if (dbError) {
          console.error('Error deleting from database:', dbError);
          throw dbError;
        }

        console.log('Moment deleted successfully');
        
        await fetchMoments();
        
        Alert.alert('Success', 'Video deleted successfully');
      } catch (error) {
        console.error('Error in deleteMoment:', error);
        Alert.alert('Error', 'Failed to delete video');
      }
    };

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

    if (!word) return null;

    const containerPadding = 40;
    const columnGap = 12;
    const availableWidth = screenWidth - containerPadding;
    const columnWidth = (availableWidth - columnGap) / 2;
    const thumbnailHeight = columnWidth * (5 / 4);

    return (
      <>
        <BottomSheetModal
          ref={ref}
          index={0}
          snapPoints={snapPoints}
          enablePanDownToClose={true}
          enableDismissOnClose={true}
          backdropComponent={renderBackdrop}
          backgroundStyle={styles.bottomSheetBackground}
          handleIndicatorStyle={styles.handleIndicator}
          onDismiss={onClose}
        >
          <BottomSheetScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.contentContainer}
          >
            <View style={[styles.wordHeader, { backgroundColor: word.color }]}>
              <View style={styles.wordIcon}>
                <Text style={styles.wordEmoji}>{word.emoji}</Text>
              </View>
              <Text style={styles.wordTitle}>{word.word}</Text>
            </View>

            <View style={styles.statusSection}>
              <Text style={styles.sectionTitle}>Status</Text>
              <View style={styles.statusGrid}>
                <TouchableOpacity
                  style={[styles.statusButton, isSpoken && styles.statusButtonActive]}
                  onPress={toggleSpoken}
                >
                  <IconSymbol
                    ios_icon_name="speaker.wave.2"
                    android_material_icon_name="volume-up"
                    size={24}
                    color={isSpoken ? colors.backgroundAlt : colors.primary}
                  />
                  <Text style={[styles.statusText, isSpoken && styles.statusTextActive]}>
                    Spoken
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.statusButton, isRecognised && styles.statusButtonActive]}
                  onPress={toggleRecognised}
                >
                  <IconSymbol
                    ios_icon_name="eye"
                    android_material_icon_name="visibility"
                    size={24}
                    color={isRecognised ? colors.backgroundAlt : colors.primary}
                  />
                  <Text style={[styles.statusText, isRecognised && styles.statusTextActive]}>
                    Recognised
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.momentsSection}>
              <View style={styles.momentsHeader}>
                <Text style={styles.sectionTitle}>Moments ({moments.length})</Text>
                <TouchableOpacity style={styles.addMomentButton} onPress={handleOpenCamera}>
                  <IconSymbol
                    ios_icon_name="plus"
                    android_material_icon_name="add"
                    size={20}
                    color={colors.backgroundAlt}
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.momentsContainer}>
                {moments.length === 0 ? (
                  <View style={styles.emptyState}>
                    <IconSymbol
                      ios_icon_name="video.slash"
                      android_material_icon_name="videocam-off"
                      size={48}
                      color={colors.textSecondary}
                    />
                    <Text style={styles.emptyText}>No moments yet</Text>
                    <Text style={styles.emptySubtext}>
                      Tap the + button to record a video
                    </Text>
                  </View>
                ) : (
                  <View style={styles.momentsGrid}>
                    {moments.map((moment, index) => (
                      <View key={index} style={[styles.momentCard, { width: columnWidth }]}>
                        <TouchableOpacity
                          style={[styles.momentThumbnail, { height: thumbnailHeight }]}
                          onPress={() => handlePlayVideo(moment)}
                          activeOpacity={0.8}
                        >
                          {moment.thumbnail_url ? (
                            <Image
                              source={{ uri: moment.thumbnail_url }}
                              style={styles.thumbnailImage}
                              contentFit="cover"
                              transition={200}
                            />
                          ) : (
                            <View style={styles.thumbnailPlaceholder}>
                              <IconSymbol
                                ios_icon_name="play.circle.fill"
                                android_material_icon_name="play-circle-filled"
                                size={48}
                                color={colors.backgroundAlt}
                              />
                            </View>
                          )}
                          <View style={styles.playOverlay}>
                            <IconSymbol
                              ios_icon_name="play.circle.fill"
                              android_material_icon_name="play-circle-filled"
                              size={48}
                              color={colors.backgroundAlt}
                            />
                          </View>
                        </TouchableOpacity>
                        <View style={styles.momentInfo}>
                          <Text style={styles.momentDate}>
                            {new Date(moment.created_at).toLocaleDateString()}
                          </Text>
                          <TouchableOpacity
                            style={styles.deleteButton}
                            onPress={() => handleDeleteMoment(moment)}
                          >
                            <IconSymbol
                              ios_icon_name="trash"
                              android_material_icon_name="delete"
                              size={16}
                              color={colors.secondary}
                            />
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </View>
          </BottomSheetScrollView>
        </BottomSheetModal>

        {selectedVideoUri && (
          <FullScreenVideoPlayer
            visible={showVideoPlayer}
            videoUri={selectedVideoUri}
            onClose={handleCloseVideoPlayer}
          />
        )}
      </>
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
    paddingBottom: 40,
  },
  wordHeader: {
    padding: 20,
    alignItems: 'center',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  wordIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.backgroundAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  wordEmoji: {
    fontSize: 40,
  },
  wordTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.primary,
  },
  statusSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 12,
  },
  statusGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statusButton: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  statusButtonActive: {
    backgroundColor: colors.buttonBlue,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  statusTextActive: {
    color: colors.backgroundAlt,
  },
  momentsSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  momentsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  addMomentButton: {
    backgroundColor: colors.buttonBlue,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  momentsContainer: {
    minHeight: 300,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    minHeight: 300,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  momentsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  momentCard: {
    backgroundColor: colors.background,
    borderRadius: 12,
    overflow: 'hidden',
  },
  momentThumbnail: {
    width: '100%',
    backgroundColor: colors.primary,
    position: 'relative',
    overflow: 'hidden',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  thumbnailPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  momentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 8,
  },
  momentDate: {
    fontSize: 10,
    color: colors.textSecondary,
    flex: 1,
  },
  deleteButton: {
    padding: 4,
  },
});

export default WordDetailBottomSheet;
