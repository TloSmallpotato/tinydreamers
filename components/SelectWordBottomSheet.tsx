
import React, { forwardRef, useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Platform, Alert } from 'react-native';
import { BottomSheetBackdrop, BottomSheetScrollView, BottomSheetModal } from '@gorhom/bottom-sheet';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import AddWordBottomSheet from '@/components/AddWordBottomSheet';
import { supabase } from '@/app/integrations/supabase/client';
import { useChild } from '@/contexts/ChildContext';

interface Word {
  id: string;
  word: string;
  emoji: string;
  color: string;
}

interface SelectWordBottomSheetProps {
  words: Word[];
  onSelectWord: (wordId: string) => void;
  onClose: () => void;
}

const SelectWordBottomSheet = forwardRef<BottomSheetModal, SelectWordBottomSheetProps>(
  ({ words, onSelectWord, onClose }, ref) => {
    const snapPoints = useMemo(() => ['75%'], []);
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredWords, setFilteredWords] = useState<Word[]>(words);
    const [localWords, setLocalWords] = useState<Word[]>(words);
    const addWordSheetRef = useRef<BottomSheetModal>(null);
    const { selectedChild } = useChild();

    useEffect(() => {
      setLocalWords(words);
    }, [words]);

    useEffect(() => {
      if (searchQuery.trim()) {
        const filtered = localWords.filter((word) =>
          word.word.toLowerCase().includes(searchQuery.toLowerCase())
        );
        setFilteredWords(filtered);
      } else {
        setFilteredWords(localWords);
      }
    }, [searchQuery, localWords]);

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

    const handleSelectWord = (wordId: string) => {
      console.log('Word selected:', wordId);
      onSelectWord(wordId);
      setSearchQuery('');
    };

    const handleAddWordPress = () => {
      console.log('Add word button pressed');
      addWordSheetRef.current?.present();
    };

    const handleAddWord = async (word: string, emoji: string, color: string) => {
      if (!selectedChild) {
        Alert.alert('Error', 'Please select a child first');
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
          addWordSheetRef.current?.dismiss();
          return;
        }

        // Create user_word association
        const { data: newUserWord, error: userWordError } = await supabase
          .from('user_words')
          .insert({
            word_id: wordLibraryId,
            child_id: selectedChild.id,
            color,
          })
          .select()
          .single();

        if (userWordError) {
          console.error('Error adding user word:', userWordError);
          throw userWordError;
        }

        console.log('Word added successfully, new user_word id:', newUserWord.id);
        
        // Add the new word to local state
        const newWord: Word = {
          id: newUserWord.id,
          word,
          emoji: wordEmoji,
          color,
        };
        setLocalWords([...localWords, newWord]);
        
        // Close the add word sheet
        addWordSheetRef.current?.dismiss();
        
        // Automatically select the newly added word
        setTimeout(() => {
          handleSelectWord(newUserWord.id);
        }, 300);
        
      } catch (error) {
        console.error('Error in handleAddWord:', error);
        Alert.alert('Error', 'Failed to add word');
      }
    };

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
          keyboardBehavior="interactive"
          keyboardBlurBehavior="restore"
          android_keyboardInputMode="adjustResize"
          animateOnMount={true}
          enableContentPanningGesture={true}
        >
          <BottomSheetScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.contentContainer}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.title}>Select a Word</Text>
            <Text style={styles.subtitle}>Choose which word this video is for</Text>

            <View style={styles.searchContainer}>
              <View style={styles.searchBar}>
                <IconSymbol
                  ios_icon_name="magnifyingglass"
                  android_material_icon_name="search"
                  size={20}
                  color={colors.primary}
                />
                <TextInput
                  style={styles.searchInput}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search words"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
              <TouchableOpacity 
                style={styles.addWordButton}
                onPress={handleAddWordPress}
              >
                <Text style={styles.addWordButtonText}>Add word +</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.wordsList}>
              {filteredWords.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>No words found</Text>
                  <Text style={styles.emptySubtext}>
                    {searchQuery ? 'Try a different search' : 'Add some words first'}
                  </Text>
                </View>
              ) : (
                filteredWords.map((word, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[styles.wordCard, { backgroundColor: word.color }]}
                    onPress={() => handleSelectWord(word.id)}
                  >
                    <View style={styles.wordIcon}>
                      <Text style={styles.wordEmoji}>{word.emoji}</Text>
                    </View>
                    <Text style={styles.wordText}>{word.word}</Text>
                    <IconSymbol
                      ios_icon_name="chevron.right"
                      android_material_icon_name="chevron-right"
                      size={24}
                      color={colors.primary}
                    />
                  </TouchableOpacity>
                ))
              )}
            </View>
          </BottomSheetScrollView>
        </BottomSheetModal>

        <AddWordBottomSheet
          ref={addWordSheetRef}
          onAddWord={handleAddWord}
          onDismiss={() => addWordSheetRef.current?.dismiss()}
        />
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
    paddingHorizontal: 20,
    paddingBottom: 300,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 20,
    textAlign: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  searchBar: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: colors.primary,
  },
  addWordButton: {
    backgroundColor: colors.buttonBlue,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addWordButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.backgroundAlt,
  },
  wordsList: {
    marginBottom: 20,
  },
  wordCard: {
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
    elevation: 2,
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
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
});

export default SelectWordBottomSheet;
