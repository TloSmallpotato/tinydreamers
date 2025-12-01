
import React, { forwardRef, useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Dimensions } from 'react-native';
import { BottomSheetBackdrop, BottomSheetView, BottomSheetModal } from '@gorhom/bottom-sheet';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { supabase } from '@/app/integrations/supabase/client';

const { width: screenWidth } = Dimensions.get('window');

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
  onOpenCamera: () => void;
  onRefresh: () => void;
}

const WordDetailBottomSheet = forwardRef<BottomSheetModal, WordDetailBottomSheetProps>(
  ({ word, onClose, onOpenCamera, onRefresh }, ref) => {
    const snapPoints = useMemo(() => ['85%'], []);
    const [moments, setMoments] = useState<Moment[]>([]);
    const [loading, setLoading] = useState(false);
    const [isSpoken, setIsSpoken] = useState(false);
    const [isRecognised, setIsRecognised] = useState(false);
    const [isRecorded, setIsRecorded] = useState(false);

    useEffect(() => {
      if (word) {
        setIsSpoken(word.is_spoken);
        setIsRecognised(word.is_recognised);
        setIsRecorded(word.is_recorded);
        fetchMoments();
      }
    }, [word]);

    const fetchMoments = async () => {
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
      } catch (error) {
        console.error('Error in fetchMoments:', error);
        Alert.alert('Error', 'Failed to load videos');
      } finally {
        setLoading(false);
      }
    };

    const updateWordStatus = async (field: 'is_spoken' | 'is_recognised' | 'is_recorded', value: boolean) => {
      if (!word) return;

      try {
        const { error } = await supabase
          .from('words')
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
    };

    const toggleSpoken = async () => {
      const newValue = !isSpoken;
      setIsSpoken(newValue);
      await updateWordStatus('is_spoken', newValue);
    };

    const toggleRecognised = async () => {
      const newValue = !isRecognised;
      setIsRecognised(newValue);
      await updateWordStatus('is_recognised', newValue);
    };

    const toggleRecorded = async () => {
      const newValue = !isRecorded;
      setIsRecorded(newValue);
      await updateWordStatus('is_recorded', newValue);
    };

    const renderBackdrop = (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
      />
    );

    if (!word) return null;

    return (
      <BottomSheetModal
        ref={ref}
        index={0}
        snapPoints={snapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={styles.bottomSheetBackground}
        handleIndicatorStyle={styles.handleIndicator}
        onDismiss={onClose}
      >
        <BottomSheetView style={styles.contentContainer}>
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

              <TouchableOpacity
                style={[styles.statusButton, isRecorded && styles.statusButtonActive]}
                onPress={toggleRecorded}
              >
                <IconSymbol
                  ios_icon_name="video"
                  android_material_icon_name="videocam"
                  size={24}
                  color={isRecorded ? colors.backgroundAlt : colors.primary}
                />
                <Text style={[styles.statusText, isRecorded && styles.statusTextActive]}>
                  Recorded
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.momentsSection}>
            <View style={styles.momentsHeader}>
              <Text style={styles.sectionTitle}>Moments ({moments.length})</Text>
              <TouchableOpacity style={styles.addMomentButton} onPress={onOpenCamera}>
                <IconSymbol
                  ios_icon_name="plus"
                  android_material_icon_name="add"
                  size={20}
                  color={colors.backgroundAlt}
                />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.momentsList} showsVerticalScrollIndicator={false}>
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
                    <View key={index} style={styles.momentCard}>
                      <View style={styles.momentThumbnail}>
                        <IconSymbol
                          ios_icon_name="play.circle.fill"
                          android_material_icon_name="play-circle-filled"
                          size={32}
                          color={colors.backgroundAlt}
                        />
                      </View>
                      <Text style={styles.momentDate}>
                        {new Date(moment.created_at).toLocaleDateString()}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>
          </View>
        </BottomSheetView>
      </BottomSheetModal>
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
  contentContainer: {
    flex: 1,
    paddingBottom: 20,
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
    flex: 1,
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
  momentsList: {
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
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
    width: (screenWidth - 64) / 3,
    aspectRatio: 1,
    backgroundColor: colors.background,
    borderRadius: 12,
    overflow: 'hidden',
  },
  momentThumbnail: {
    flex: 1,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  momentDate: {
    fontSize: 10,
    color: colors.textSecondary,
    padding: 8,
    textAlign: 'center',
  },
});

export default WordDetailBottomSheet;
