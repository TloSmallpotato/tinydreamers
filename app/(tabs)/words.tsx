
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, TouchableOpacity, Alert, Animated, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, commonStyles } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { useChild } from '@/contexts/ChildContext';
import { useWordNavigation } from '@/contexts/WordNavigationContext';
import { supabase } from '@/app/integrations/supabase/client';
import AddWordBottomSheet from '@/components/AddWordBottomSheet';
import WordDetailBottomSheet from '@/components/WordDetailBottomSheet';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

interface UserWord {
  id: string;
  word_id: string;
  child_id: string;
  color: string;
  is_spoken: boolean;
  is_recognised: boolean;
  is_recorded: boolean;
  created_at: string;
  updated_at: string;
  word_library: {
    word: string;
    emoji: string;
  };
}

interface Word {
  id: string;
  child_id: string;
  word: string;
  emoji: string;
  color: string;
  is_spoken: boolean;
  is_recognised: boolean;
  is_recorded: boolean;
  created_at: string;
  updated_at: string;
}

interface GroupedWords {
  [letter: string]: Word[];
}

export default function WordsScreen() {
  const { selectedChild } = useChild();
  const { targetWordIdToOpen, clearTargetWordIdToOpen } = useWordNavigation();
  const params = useLocalSearchParams();
  const router = useRouter();
  const [words, setWords] = useState<Word[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWord, setSelectedWord] = useState<Word | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const addWordSheetRef = useRef<BottomSheetModal>(null);
  const wordDetailSheetRef = useRef<BottomSheetModal>(null);
  const hasProcessedAutoOpen = useRef(false);

  // Trigger fade-in animation when words are loaded
  useEffect(() => {
    if (!loading && words.length > 0) {
      // Reset animation
      fadeAnim.setValue(0);
      
      // Start fade-in animation
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }).start();
    }
  }, [loading, words.length, fadeAnim]);

  // Handle autoOpen parameter from navigation - runs every time screen comes into focus
  useFocusEffect(
    useCallback(() => {
      const autoOpen = params.autoOpen;
      console.log('useFocusEffect - autoOpen:', autoOpen, 'hasProcessedAutoOpen:', hasProcessedAutoOpen.current);
      
      if (autoOpen === 'true' && !hasProcessedAutoOpen.current) {
        console.log('autoOpen parameter detected - opening add word bottom sheet');
        hasProcessedAutoOpen.current = true;
        
        // Clear the parameter immediately
        router.replace('/(tabs)/words');
        
        // Use requestAnimationFrame to ensure the screen is fully rendered
        requestAnimationFrame(() => {
          setTimeout(() => {
            addWordSheetRef.current?.present();
          }, 100);
        });
      }
      
      // Reset the flag when leaving the screen
      return () => {
        console.log('Leaving words screen - resetting hasProcessedAutoOpen flag');
        hasProcessedAutoOpen.current = false;
      };
    }, [params.autoOpen, router])
  );

  const fetchWords = useCallback(async () => {
    if (!selectedChild) {
      setWords([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log('Fetching words for child:', selectedChild.id);
      
      const { data, error } = await supabase
        .from('user_words')
        .select(`
          id,
          word_id,
          child_id,
          color,
          is_spoken,
          is_recognised,
          is_recorded,
          created_at,
          updated_at,
          word_library (
            word,
            emoji
          )
        `)
        .eq('child_id', selectedChild.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching words:', error);
        throw error;
      }

      console.log('Fetched user_words:', data?.length || 0);
      
      // Transform the data to match the Word interface
      const transformedWords: Word[] = (data || []).map((uw: UserWord) => ({
        id: uw.id,
        child_id: uw.child_id,
        word: uw.word_library.word,
        emoji: uw.word_library.emoji || '⭐',
        color: uw.color,
        is_spoken: uw.is_spoken,
        is_recognised: uw.is_recognised,
        is_recorded: uw.is_recorded,
        created_at: uw.created_at,
        updated_at: uw.updated_at,
      }));

      // Sort by word alphabetically
      transformedWords.sort((a, b) => a.word.localeCompare(b.word));
      
      setWords(transformedWords);
    } catch (error) {
      console.error('Error in fetchWords:', error);
      Alert.alert('Error', 'Failed to load words');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  }, [selectedChild]);

  useFocusEffect(
    useCallback(() => {
      fetchWords();
    }, [fetchWords])
  );

  // Pull to refresh handler
  const onRefresh = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRefreshing(true);
    await fetchWords();
    setRefreshing(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [fetchWords]);

  // Handle opening a specific word detail when navigating from toast
  useEffect(() => {
    if (targetWordIdToOpen && words.length > 0) {
      console.log('Opening word detail for:', targetWordIdToOpen);
      const wordToOpen = words.find(w => w.id === targetWordIdToOpen);
      if (wordToOpen) {
        setSelectedWord(wordToOpen);
        // Small delay to ensure the page is fully loaded
        setTimeout(() => {
          wordDetailSheetRef.current?.present();
        }, 300);
      }
      clearTargetWordIdToOpen();
    }
  }, [targetWordIdToOpen, words, clearTargetWordIdToOpen]);

  const groupWordsByLetter = (wordsList: Word[]): GroupedWords => {
    const grouped: GroupedWords = {};
    
    wordsList.forEach((word) => {
      const firstLetter = word.word.charAt(0).toUpperCase();
      if (!grouped[firstLetter]) {
        grouped[firstLetter] = [];
      }
      grouped[firstLetter].push(word);
    });

    return grouped;
  };

  const handleAddWord = async (word: string, emoji: string, color: string) => {
    if (!selectedChild) {
      Alert.alert('Error', 'Please select a child first');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    try {
      console.log('Adding word:', word);
      
      // First, check if the word exists in word_library (case-insensitive)
      const { data: existingWords, error: searchError } = await supabase
        .from('word_library')
        .select('id, word, emoji')
        .ilike('word', word);

      if (searchError) {
        console.error('Error searching word library:', searchError);
        throw searchError;
      }

      let wordLibraryId: string;
      let wordEmoji = emoji;

      if (existingWords && existingWords.length > 0) {
        // Word exists in library, use it
        console.log('Word exists in library:', existingWords[0]);
        wordLibraryId = existingWords[0].id;
        wordEmoji = existingWords[0].emoji || emoji;
      } else {
        // Word doesn't exist, create it in word_library
        console.log('Creating new word in library');
        const { data: newWord, error: insertError } = await supabase
          .from('word_library')
          .insert({
            word,
            emoji,
          })
          .select()
          .single();

        if (insertError) {
          console.error('Error inserting word to library:', insertError);
          throw insertError;
        }

        wordLibraryId = newWord.id;
      }

      // Check if user already has this word
      const { data: existingUserWord, error: userWordCheckError } = await supabase
        .from('user_words')
        .select('id')
        .eq('word_id', wordLibraryId)
        .eq('child_id', selectedChild.id)
        .maybeSingle();

      if (userWordCheckError) {
        console.error('Error checking user word:', userWordCheckError);
        throw userWordCheckError;
      }

      if (existingUserWord) {
        Alert.alert('Word Already Added', 'This word is already in your list');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        addWordSheetRef.current?.dismiss();
        return;
      }

      // Create user_word association
      const { error: userWordError } = await supabase
        .from('user_words')
        .insert({
          word_id: wordLibraryId,
          child_id: selectedChild.id,
          color,
        });

      if (userWordError) {
        console.error('Error adding user word:', userWordError);
        throw userWordError;
      }

      console.log('Word added successfully');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      addWordSheetRef.current?.dismiss();
      await fetchWords();
    } catch (error) {
      console.error('Error in handleAddWord:', error);
      Alert.alert('Error', 'Failed to add word');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleWordPress = useCallback((word: Word) => {
    console.log('🔵 Word pressed:', word.word);
    
    // Fire haptic FIRST, synchronously
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    setSelectedWord(word);
    // Use requestAnimationFrame to ensure the state is set before presenting
    requestAnimationFrame(() => {
      wordDetailSheetRef.current?.present();
    });
  }, []);

  const handleOpenAddWord = () => {
    console.log('🔵 Add word button pressed');
    
    // Fire haptic FIRST, synchronously
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    console.log('Opening add word bottom sheet from + button');
    addWordSheetRef.current?.present();
  };

  const handleCloseWordDetail = useCallback(() => {
    console.log('Closing word detail');
    setSelectedWord(null);
  }, []);

  // Reset the flag when the bottom sheet is dismissed
  const handleAddWordSheetDismiss = useCallback(() => {
    console.log('Add word bottom sheet dismissed - resetting hasProcessedAutoOpen flag');
    hasProcessedAutoOpen.current = false;
  }, []);

  const groupedWords = groupWordsByLetter(words);
  const sortedLetters = Object.keys(groupedWords).sort();

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
          <View style={styles.header}>
            <View style={styles.headerRow}>
              <View style={styles.headerLeft}>
                <Text style={commonStyles.title}>Words</Text>
                <Text style={commonStyles.subtitle}>
                  {selectedChild ? `${selectedChild.name}'s words` : 'Select a child'}
                </Text>
              </View>
              
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{words.length} words</Text>
              </View>
            </View>
          </View>

          <View style={styles.addButtonContainer}>
            <TouchableOpacity style={styles.addButton} onPress={handleOpenAddWord}>
              <Text style={styles.addButtonText}>Add new Word</Text>
              <IconSymbol
                ios_icon_name="plus.circle.fill"
                android_material_icon_name="add-circle"
                size={24}
                color={colors.backgroundAlt}
              />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>Loading words...</Text>
            </View>
          ) : words.length === 0 ? (
            <View style={styles.emptyState}>
              <IconSymbol
                ios_icon_name="text.bubble"
                android_material_icon_name="chat-bubble-outline"
                size={64}
                color={colors.textSecondary}
              />
              <Text style={styles.emptyText}>No words yet</Text>
              <Text style={styles.emptySubtext}>
                Tap the button above to add your first word
              </Text>
            </View>
          ) : (
            <Animated.View style={{ opacity: fadeAnim }}>
              {sortedLetters.map((letter, letterIndex) => (
                <React.Fragment key={letterIndex}>
                  <View style={styles.letterSection}>
                    <View style={styles.letterBadge}>
                      <Text style={styles.letterText}>{letter}</Text>
                    </View>
                  </View>

                  <View style={styles.wordsList}>
                    {groupedWords[letter].map((word, wordIndex) => (
                      <TouchableOpacity
                        key={wordIndex}
                        style={[styles.wordCard, { backgroundColor: word.color }]}
                        onPress={() => handleWordPress(word)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.wordIcon} pointerEvents="none">
                          <Text style={styles.wordEmoji}>{word.emoji}</Text>
                        </View>
                        <Text style={styles.wordText} pointerEvents="none">{word.word}</Text>
                        <View style={styles.wordActions} pointerEvents="none">
                          {word.is_spoken && (
                            <View style={styles.statusIndicator}>
                              <IconSymbol 
                                ios_icon_name="speaker.wave.2.fill" 
                                android_material_icon_name="volume-up" 
                                size={16} 
                                color={colors.primary} 
                              />
                            </View>
                          )}
                          {word.is_recognised && (
                            <View style={styles.statusIndicator}>
                              <IconSymbol 
                                ios_icon_name="eye.fill" 
                                android_material_icon_name="visibility" 
                                size={16} 
                                color={colors.primary} 
                              />
                            </View>
                          )}
                          {word.is_recorded && (
                            <View style={styles.statusIndicator}>
                              <IconSymbol 
                                ios_icon_name="video.fill" 
                                android_material_icon_name="videocam" 
                                size={16} 
                                color={colors.primary} 
                              />
                            </View>
                          )}
                          <IconSymbol 
                            ios_icon_name="chevron.right" 
                            android_material_icon_name="chevron-right" 
                            size={20} 
                            color={colors.primary} 
                          />
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                </React.Fragment>
              ))}
            </Animated.View>
          )}
        </ScrollView>
      </SafeAreaView>

      <AddWordBottomSheet 
        ref={addWordSheetRef} 
        onAddWord={handleAddWord}
        onDismiss={handleAddWordSheetDismiss}
      />
      <WordDetailBottomSheet
        ref={wordDetailSheetRef}
        word={selectedWord}
        onClose={handleCloseWordDetail}
        onRefresh={fetchWords}
      />
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
    marginBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flex: 1,
  },
  badge: {
    backgroundColor: colors.accent,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginLeft: 12,
  },
  badgeText: {
    color: colors.backgroundAlt,
    fontSize: 14,
    fontWeight: '600',
  },
  addButtonContainer: {
    marginBottom: 20,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.buttonBlue,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 16,
    gap: 12,
    boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.15)',
    elevation: 4,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.backgroundAlt,
  },
  letterSection: {
    marginVertical: 16,
  },
  letterBadge: {
    backgroundColor: colors.backgroundAlt,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
    elevation: 2,
  },
  letterText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
  wordsList: {
    gap: 12,
  },
  wordCard: {
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.1)',
    elevation: 3,
  },
  wordIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.backgroundAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  wordEmoji: {
    fontSize: 24,
  },
  wordText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
    flex: 1,
  },
  wordActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  statusIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.backgroundAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
});
