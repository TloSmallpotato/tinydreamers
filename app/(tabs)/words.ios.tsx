
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, commonStyles } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { useChild } from '@/contexts/ChildContext';
import { useWordNavigation } from '@/contexts/WordNavigationContext';
import { supabase } from '@/app/integrations/supabase/client';
import AddWordBottomSheet from '@/components/AddWordBottomSheet';
import WordDetailBottomSheet from '@/components/WordDetailBottomSheet';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useFocusEffect } from '@react-navigation/native';

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
  const [words, setWords] = useState<Word[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWord, setSelectedWord] = useState<Word | null>(null);

  const addWordSheetRef = useRef<BottomSheetModal>(null);
  const wordDetailSheetRef = useRef<BottomSheetModal>(null);

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
        .from('words')
        .select('*')
        .eq('child_id', selectedChild.id)
        .order('word', { ascending: true});

      if (error) {
        console.error('Error fetching words:', error);
        throw error;
      }

      console.log('Fetched words:', data?.length || 0);
      setWords(data || []);
    } catch (error) {
      console.error('Error in fetchWords:', error);
      Alert.alert('Error', 'Failed to load words');
    } finally {
      setLoading(false);
    }
  }, [selectedChild]);

  useFocusEffect(
    useCallback(() => {
      fetchWords();
    }, [fetchWords])
  );

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
      return;
    }

    try {
      console.log('Adding word:', word);
      
      const { error } = await supabase
        .from('words')
        .insert({
          child_id: selectedChild.id,
          word,
          emoji,
          color,
        });

      if (error) {
        console.error('Error adding word:', error);
        throw error;
      }

      console.log('Word added successfully');
      addWordSheetRef.current?.dismiss();
      await fetchWords();
    } catch (error) {
      console.error('Error in handleAddWord:', error);
      Alert.alert('Error', 'Failed to add word');
    }
  };

  const handleWordPress = (word: Word) => {
    console.log('Word pressed:', word.word);
    setSelectedWord(word);
    wordDetailSheetRef.current?.present();
  };

  const handleOpenAddWord = () => {
    console.log('Opening add word bottom sheet');
    addWordSheetRef.current?.present();
  };

  const handleCloseWordDetail = () => {
    setSelectedWord(null);
  };

  const groupedWords = groupWordsByLetter(words);
  const sortedLetters = Object.keys(groupedWords).sort();

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={commonStyles.title}>Words</Text>
            <Text style={commonStyles.subtitle}>
              {selectedChild ? `${selectedChild.name}'s words` : 'Select a child'}
            </Text>
            
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{words.length} words</Text>
            </View>
          </View>

          <View style={styles.addButtonContainer}>
            <TouchableOpacity style={styles.addButton} onPress={handleOpenAddWord}>
              <IconSymbol 
                ios_icon_name="plus" 
                android_material_icon_name="add" 
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
                Tap the + button to add your first word
              </Text>
            </View>
          ) : (
            sortedLetters.map((letter, letterIndex) => (
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
                      <View style={styles.wordIcon}>
                        <Text style={styles.wordEmoji}>{word.emoji}</Text>
                      </View>
                      <Text style={styles.wordText}>{word.word}</Text>
                      <View style={styles.wordActions}>
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
                        <View style={styles.chevronButton}>
                          <IconSymbol 
                            ios_icon_name="chevron.right" 
                            android_material_icon_name="chevron-right" 
                            size={20} 
                            color={colors.primary} 
                          />
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </React.Fragment>
            ))
          )}
        </ScrollView>
      </SafeAreaView>

      <AddWordBottomSheet ref={addWordSheetRef} onAddWord={handleAddWord} />
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
  badge: {
    backgroundColor: colors.accent,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignSelf: 'flex-start',
    marginTop: 12,
  },
  badgeText: {
    color: colors.backgroundAlt,
    fontSize: 14,
    fontWeight: '600',
  },
  addButtonContainer: {
    alignItems: 'flex-end',
    marginBottom: 20,
  },
  addButton: {
    backgroundColor: colors.buttonBlue,
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.15)',
    elevation: 4,
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
  chevronButton: {
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
