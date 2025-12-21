
import React, { forwardRef, useMemo, useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Dimensions, Platform, TextInput, TouchableWithoutFeedback } from 'react-native';
import { BottomSheetBackdrop, BottomSheetScrollView, BottomSheetModal } from '@gorhom/bottom-sheet';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { supabase } from '@/app/integrations/supabase/client';
import { useVideoRecording } from '@/contexts/VideoRecordingContext';
import { useCameraTrigger } from '@/contexts/CameraTriggerContext';
import FullScreenVideoPlayer from '@/components/FullScreenVideoPlayer';
import { Image } from 'expo-image';
import { processMomentsWithSignedUrls } from '@/utils/videoStorage';
import * as Haptics from 'expo-haptics';

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
  signedVideoUrl?: string | null;
  signedThumbnailUrl?: string | null;
}

interface WordDetailBottomSheetProps {
  word: Word | null;
  onClose: () => void;
  onRefresh: () => void;
}

const WordDetailBottomSheet = forwardRef<BottomSheetModal, WordDetailBottomSheetProps>(
  ({ word, onClose, onRefresh }, ref) => {
    const [moments, setMoments] = useState<Moment[]>([]);
    const [loading, setLoading] = useState(false);
    const [isSpoken, setIsSpoken] = useState(false);
    const [isRecognised, setIsRecognised] = useState(false);
    const [selectedVideoUri, setSelectedVideoUri] = useState<string | null>(null);
    const [showVideoPlayer, setShowVideoPlayer] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editedWord, setEditedWord] = useState('');
    const [editedEmoji, setEditedEmoji] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);
    
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
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    }, [word, onRefresh]);

    const fetchMoments = useCallback(async () => {
      if (!word) return;

      try {
        setLoading(true);
        console.log('[WordDetail] Fetching moments for word:', word.id);
        
        const { data, error } = await supabase
          .from('moments')
          .select('*')
          .eq('word_id', word.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('[WordDetail] Error fetching moments:', error);
          throw error;
        }

        console.log('[WordDetail] Fetched', data?.length || 0, 'moments');

        // Process moments to generate signed URLs
        if (data && data.length > 0) {
          console.log('[WordDetail] Processing moments with signed URLs...');
          const processedMoments = await processMomentsWithSignedUrls(data);
          console.log('[WordDetail] Processed moments:', processedMoments.length);
          setMoments(processedMoments);
        } else {
          setMoments([]);
        }
        
        const hasMoments = data && data.length > 0;
        if (hasMoments && !word.is_recorded) {
          console.log('[WordDetail] Auto-updating word to recorded status');
          await updateWordStatus('is_recorded', true);
        } else if (!hasMoments && word.is_recorded) {
          console.log('[WordDetail] Auto-updating word to not recorded status');
          await updateWordStatus('is_recorded', false);
        }
      } catch (error) {
        console.error('[WordDetail] Error in fetchMoments:', error);
        Alert.alert('Error', 'Failed to load videos');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } finally {
        setLoading(false);
      }
    }, [word, updateWordStatus]);

    useEffect(() => {
      if (word) {
        setIsSpoken(word.is_spoken);
        setIsRecognised(word.is_recognised);
        setEditedWord(word.word);
        setEditedEmoji(word.emoji);
        setIsEditMode(false);
        setShowDropdown(false);
        fetchMoments();
      }
    }, [word, fetchMoments]);

    const toggleSpoken = useCallback(async () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const newValue = !isSpoken;
      setIsSpoken(newValue);
      await updateWordStatus('is_spoken', newValue);
    }, [isSpoken, updateWordStatus]);

    const toggleRecognised = useCallback(async () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const newValue = !isRecognised;
      setIsRecognised(newValue);
      await updateWordStatus('is_recognised', newValue);
    }, [isRecognised, updateWordStatus]);

    const handleOpenCamera = () => {
      if (!word) return;
      
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      console.log('[WordDetail] Opening camera from word detail for word:', word.id);
      
      setTargetWord(word.id);
      setIsRecordingFromWordDetail(true);
      
      if (ref && typeof ref !== 'function' && ref.current) {
        ref.current.dismiss();
      }
      
      triggerCamera();
    };

    const handlePlayVideo = (moment: Moment) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      // Use signed URL if available, otherwise fall back to original URL
      const videoUrl = moment.signedVideoUrl || moment.video_url;
      console.log('[WordDetail] Playing video:', videoUrl);
      setSelectedVideoUri(videoUrl);
      setShowVideoPlayer(true);
    };

    const handleCloseVideoPlayer = () => {
      setShowVideoPlayer(false);
      setSelectedVideoUri(null);
    };

    const handleDeleteMoment = (moment: Moment) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
        console.log('[WordDetail] Deleting moment:', moment.id);
        
        // Extract storage path from video_url (not signed URL)
        const videoPath = moment.video_url;
        
        // If it's a full URL, extract the path
        if (videoPath.includes('/video-moments/')) {
          const urlParts = videoPath.split('/video-moments/');
          if (urlParts.length > 1) {
            const filePath = urlParts[1];
            
            const { error: storageError } = await supabase.storage
              .from('video-moments')
              .remove([filePath]);

            if (storageError) {
              console.error('[WordDetail] Error deleting from storage:', storageError);
            }
          }
        } else {
          // It's already a storage path
          const { error: storageError } = await supabase.storage
            .from('video-moments')
            .remove([videoPath]);

          if (storageError) {
            console.error('[WordDetail] Error deleting from storage:', storageError);
          }
        }
        
        // Delete thumbnail if exists
        if (moment.thumbnail_url) {
          const thumbnailPath = moment.thumbnail_url;
          
          if (thumbnailPath.includes('/video-moments/')) {
            const thumbUrlParts = thumbnailPath.split('/video-moments/');
            if (thumbUrlParts.length > 1) {
              const thumbFilePath = thumbUrlParts[1];
              
              const { error: thumbStorageError } = await supabase.storage
                .from('video-moments')
                .remove([thumbFilePath]);

              if (thumbStorageError) {
                console.error('[WordDetail] Error deleting thumbnail from storage:', thumbStorageError);
              }
            }
          } else {
            // It's already a storage path
            const { error: thumbStorageError } = await supabase.storage
              .from('video-moments')
              .remove([thumbnailPath]);

            if (thumbStorageError) {
              console.error('[WordDetail] Error deleting thumbnail from storage:', thumbStorageError);
            }
          }
        }

        const { error: dbError } = await supabase
          .from('moments')
          .delete()
          .eq('id', moment.id);

        if (dbError) {
          console.error('[WordDetail] Error deleting from database:', dbError);
          throw dbError;
        }

        console.log('[WordDetail] Moment deleted successfully');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        await fetchMoments();
        
        Alert.alert('Success', 'Video deleted successfully');
      } catch (error) {
        console.error('[WordDetail] Error in deleteMoment:', error);
        Alert.alert('Error', 'Failed to delete video');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    };

    const handleMenuPress = () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setShowDropdown(!showDropdown);
    };

    const handleEditPress = () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setShowDropdown(false);
      setIsEditMode(true);
    };

    const handleCancelEdit = () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setEditedWord(word?.word || '');
      setEditedEmoji(word?.emoji || '');
      setIsEditMode(false);
    };

    const handleSaveEdit = async () => {
      if (!word) return;

      // Validate inputs
      if (!editedWord.trim()) {
        Alert.alert('Error', 'Word cannot be empty');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }

      if (!editedEmoji.trim()) {
        Alert.alert('Error', 'Emoji cannot be empty');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }

      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        console.log('[WordDetail] Saving word edit:', editedWord, editedEmoji);

        const { error } = await supabase
          .from('user_words')
          .update({
            custom_word: editedWord.trim(),
            custom_emoji: editedEmoji.trim(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', word.id);

        if (error) {
          console.error('[WordDetail] Error updating word:', error);
          throw error;
        }

        console.log('[WordDetail] Word updated successfully');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setIsEditMode(false);
        onRefresh();
        
        // Close and reopen the sheet to show updated data
        if (ref && typeof ref !== 'function' && ref.current) {
          ref.current.dismiss();
        }
      } catch (error) {
        console.error('[WordDetail] Error in handleSaveEdit:', error);
        Alert.alert('Error', 'Failed to update word');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    };

    const handleDeleteWord = () => {
      if (!word) return;

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      setShowDropdown(false);

      const momentCount = moments.length;
      const warningMessage = momentCount > 0
        ? `This will permanently delete the word "${word.word}" and all ${momentCount} video${momentCount > 1 ? 's' : ''} associated with it. This action cannot be undone.`
        : `This will permanently delete the word "${word.word}". This action cannot be undone.`;

      Alert.alert(
        'Delete Word',
        warningMessage,
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              await deleteWord();
            },
          },
        ]
      );
    };

    const deleteWord = async () => {
      if (!word) return;

      try {
        console.log('[WordDetail] Deleting word:', word.id);

        // First, delete all associated videos from storage
        for (const moment of moments) {
          console.log('[WordDetail] Deleting moment:', moment.id);
          
          // Delete video file
          const videoPath = moment.video_url;
          if (videoPath.includes('/video-moments/')) {
            const urlParts = videoPath.split('/video-moments/');
            if (urlParts.length > 1) {
              const filePath = urlParts[1];
              await supabase.storage.from('video-moments').remove([filePath]);
            }
          } else {
            await supabase.storage.from('video-moments').remove([videoPath]);
          }

          // Delete thumbnail file
          if (moment.thumbnail_url) {
            const thumbnailPath = moment.thumbnail_url;
            if (thumbnailPath.includes('/video-moments/')) {
              const thumbUrlParts = thumbnailPath.split('/video-moments/');
              if (thumbUrlParts.length > 1) {
                const thumbFilePath = thumbUrlParts[1];
                await supabase.storage.from('video-moments').remove([thumbFilePath]);
              }
            } else {
              await supabase.storage.from('video-moments').remove([thumbnailPath]);
            }
          }
        }

        // Delete all moments from database (cascade should handle this, but being explicit)
        const { error: momentsError } = await supabase
          .from('moments')
          .delete()
          .eq('word_id', word.id);

        if (momentsError) {
          console.error('[WordDetail] Error deleting moments:', momentsError);
          throw momentsError;
        }

        // Delete the word from database
        const { error: wordError } = await supabase
          .from('user_words')
          .delete()
          .eq('id', word.id);

        if (wordError) {
          console.error('[WordDetail] Error deleting word:', wordError);
          throw wordError;
        }

        console.log('[WordDetail] Word and all associated videos deleted successfully');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        // Close the bottom sheet
        if (ref && typeof ref !== 'function' && ref.current) {
          ref.current.dismiss();
        }

        // Refresh the words list
        onRefresh();

        Alert.alert('Success', 'Word and all associated videos deleted successfully');
      } catch (error) {
        console.error('[WordDetail] Error in deleteWord:', error);
        Alert.alert('Error', 'Failed to delete word');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    };

    const handleCloseDropdown = () => {
      if (showDropdown) {
        setShowDropdown(false);
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
          enableDynamicSizing={true}
          enablePanDownToClose={true}
          enableDismissOnClose={true}
          backdropComponent={renderBackdrop}
          backgroundStyle={[styles.bottomSheetBackground, { backgroundColor: word.color }]}
          handleIndicatorStyle={styles.handleIndicator}
          onDismiss={onClose}
          animateOnMount={true}
          enableContentPanningGesture={false}
          maxDynamicContentSize={screenHeight * 0.9}
        >
          <TouchableWithoutFeedback onPress={handleCloseDropdown}>
            <View style={styles.touchableContainer}>
              <BottomSheetScrollView 
                style={styles.scrollView}
                contentContainerStyle={styles.contentContainer}
              >
                <View style={[styles.wordHeader, { backgroundColor: word.color }]}>
                  <View style={styles.headerActions}>
                    <TouchableOpacity
                      style={styles.menuButton}
                      onPress={handleMenuPress}
                    >
                      <IconSymbol
                        ios_icon_name="ellipsis.circle"
                        android_material_icon_name="more-vert"
                        size={24}
                        color={colors.primary}
                      />
                    </TouchableOpacity>
                  </View>

                  {/* Dropdown Menu - Positioned absolutely above content */}
                  {showDropdown && (
                    <View style={styles.dropdownMenu}>
                      <TouchableOpacity
                        style={styles.dropdownItem}
                        onPress={handleEditPress}
                      >
                        <IconSymbol
                          ios_icon_name="pencil"
                          android_material_icon_name="edit"
                          size={20}
                          color={colors.primary}
                        />
                        <Text style={styles.dropdownText}>Edit Word</Text>
                      </TouchableOpacity>
                      <View style={styles.dropdownDivider} />
                      <TouchableOpacity
                        style={styles.dropdownItem}
                        onPress={handleDeleteWord}
                      >
                        <IconSymbol
                          ios_icon_name="trash"
                          android_material_icon_name="delete"
                          size={20}
                          color={colors.secondary}
                        />
                        <Text style={[styles.dropdownText, styles.dropdownTextDanger]}>Delete Word</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {isEditMode ? (
                    <View style={styles.editContainer}>
                      <View style={styles.wordIcon}>
                        <TextInput
                          style={styles.emojiInput}
                          value={editedEmoji}
                          onChangeText={setEditedEmoji}
                          maxLength={4}
                          placeholder="🌟"
                          placeholderTextColor={colors.textSecondary}
                        />
                      </View>
                      <TextInput
                        style={styles.wordInput}
                        value={editedWord}
                        onChangeText={setEditedWord}
                        placeholder="Enter word"
                        placeholderTextColor={colors.textSecondary}
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                      <View style={styles.editActions}>
                        <TouchableOpacity
                          style={styles.cancelButton}
                          onPress={handleCancelEdit}
                        >
                          <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.saveButton}
                          onPress={handleSaveEdit}
                        >
                          <Text style={styles.saveButtonText}>Save Changes</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <>
                      <View style={styles.wordIcon}>
                        <Text style={styles.wordEmoji}>{word.emoji}</Text>
                      </View>
                      <Text style={styles.wordTitle}>{word.word}</Text>
                    </>
                  )}
                </View>

                <View style={styles.whiteContentSection}>
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
                          {moments.map((moment, index) => {
                            // Use signed thumbnail URL if available, otherwise fall back to original
                            const thumbnailUrl = moment.signedThumbnailUrl || moment.thumbnail_url;
                            
                            return (
                              <View key={index} style={[styles.momentCard, { width: columnWidth }]}>
                                <TouchableOpacity
                                  style={[styles.momentThumbnail, { height: thumbnailHeight }]}
                                  onPress={() => handlePlayVideo(moment)}
                                  activeOpacity={0.8}
                                >
                                  {thumbnailUrl ? (
                                    <Image
                                      source={{ uri: thumbnailUrl }}
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
                                    style={styles.deleteMomentButton}
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
                            );
                          })}
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              </BottomSheetScrollView>
            </View>
          </TouchableWithoutFeedback>
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
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  handleIndicator: {
    width: 40,
    height: 4,
    backgroundColor: colors.backgroundAlt,
  },
  touchableContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 0,
  },
  wordHeader: {
    paddingTop: 24,
    paddingBottom: 32,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  headerActions: {
    flexDirection: 'row',
    alignSelf: 'flex-end',
    marginBottom: 12,
  },
  menuButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.backgroundAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdownMenu: {
    position: 'absolute',
    top: 60,
    right: 20,
    backgroundColor: colors.backgroundAlt,
    borderRadius: 12,
    minWidth: 180,
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
    zIndex: 1000,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  dropdownDivider: {
    height: 1,
    backgroundColor: colors.background,
    marginHorizontal: 12,
  },
  dropdownText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  dropdownTextDanger: {
    color: colors.secondary,
  },
  editContainer: {
    width: '100%',
    alignItems: 'center',
    gap: 12,
  },
  wordIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.backgroundAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordEmoji: {
    fontSize: 40,
  },
  emojiInput: {
    fontSize: 40,
    textAlign: 'center',
    color: colors.primary,
    width: '100%',
  },
  wordTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.primary,
  },
  wordInput: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.primary,
    backgroundColor: colors.backgroundAlt,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
    width: '100%',
    textAlign: 'center',
  },
  editActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    backgroundColor: colors.background,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 16,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  saveButton: {
    backgroundColor: colors.buttonBlue,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 16,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.backgroundAlt,
  },
  whiteContentSection: {
    backgroundColor: colors.backgroundAlt,
    paddingTop: 20,
    paddingBottom: 40,
  },
  statusSection: {
    paddingHorizontal: 20,
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
    minHeight: 200,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
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
  deleteMomentButton: {
    padding: 4,
  },
});

export default WordDetailBottomSheet;
