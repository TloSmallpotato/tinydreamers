
import React, { forwardRef, useMemo, useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { BottomSheetBackdrop, BottomSheetScrollView, BottomSheetModal } from '@gorhom/bottom-sheet';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';

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

    useEffect(() => {
      if (searchQuery.trim()) {
        const filtered = words.filter((word) =>
          word.word.toLowerCase().includes(searchQuery.toLowerCase())
        );
        setFilteredWords(filtered);
      } else {
        setFilteredWords(words);
      }
    }, [searchQuery, words]);

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

    return (
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
      >
        <BottomSheetScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.contentContainer}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>Select a Word</Text>
          <Text style={styles.subtitle}>Choose which word this video is for</Text>

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
    paddingBottom: 40,
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
  searchBar: {
    backgroundColor: colors.background,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: colors.primary,
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
