
import React, { forwardRef, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import { colors } from '@/styles/commonStyles';

interface AddWordBottomSheetProps {
  onAddWord: (word: string, emoji: string, color: string) => void;
}

const EMOJI_OPTIONS = ['🍎', '🥯', '🍌', '🚗', '🐶', '🐱', '🏠', '⚽', '🎨', '📚', '🌟', '❤️'];
const COLOR_OPTIONS = [
  { name: 'Pink', value: colors.cardPink },
  { name: 'Purple', value: colors.cardPurple },
  { name: 'Yellow', value: colors.cardYellow },
  { name: 'Orange', value: colors.cardOrange },
];

const AddWordBottomSheet = forwardRef<BottomSheet, AddWordBottomSheetProps>(
  ({ onAddWord }, ref) => {
    const snapPoints = useMemo(() => ['75%'], []);
    const [word, setWord] = useState('');
    const [selectedEmoji, setSelectedEmoji] = useState('🍎');
    const [selectedColor, setSelectedColor] = useState(colors.cardPink);

    const renderBackdrop = (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
      />
    );

    const handleAdd = () => {
      if (word.trim()) {
        onAddWord(word.trim(), selectedEmoji, selectedColor);
        setWord('');
        setSelectedEmoji('🍎');
        setSelectedColor(colors.cardPink);
      }
    };

    return (
      <BottomSheet
        ref={ref}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={styles.bottomSheetBackground}
        handleIndicatorStyle={styles.handleIndicator}
      >
        <BottomSheetView style={styles.contentContainer}>
          <Text style={styles.title}>Add New Word</Text>

          <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
            <Text style={styles.label}>Word</Text>
            <TextInput
              style={styles.input}
              value={word}
              onChangeText={setWord}
              placeholder="Enter word"
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="words"
            />

            <Text style={styles.label}>Choose Emoji</Text>
            <View style={styles.emojiGrid}>
              {EMOJI_OPTIONS.map((emoji, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.emojiButton,
                    selectedEmoji === emoji && styles.emojiButtonSelected,
                  ]}
                  onPress={() => setSelectedEmoji(emoji)}
                >
                  <Text style={styles.emojiText}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Choose Color</Text>
            <View style={styles.colorGrid}>
              {COLOR_OPTIONS.map((colorOption, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.colorButton,
                    { backgroundColor: colorOption.value },
                    selectedColor === colorOption.value && styles.colorButtonSelected,
                  ]}
                  onPress={() => setSelectedColor(colorOption.value)}
                >
                  {selectedColor === colorOption.value && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <TouchableOpacity
            style={[styles.addButton, !word.trim() && styles.addButtonDisabled]}
            onPress={handleAdd}
            disabled={!word.trim()}
          >
            <Text style={styles.addButtonText}>Add Word</Text>
          </TouchableOpacity>
        </BottomSheetView>
      </BottomSheet>
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
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 24,
    textAlign: 'center',
  },
  form: {
    flex: 1,
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 12,
    marginTop: 8,
  },
  input: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: colors.primary,
    marginBottom: 20,
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  emojiButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  emojiButtonSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.backgroundAlt,
  },
  emojiText: {
    fontSize: 28,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  colorButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  colorButtonSelected: {
    borderColor: colors.primary,
  },
  checkmark: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.backgroundAlt,
  },
  addButton: {
    backgroundColor: colors.buttonBlue,
    borderRadius: 24,
    paddingVertical: 16,
    alignItems: 'center',
  },
  addButtonDisabled: {
    opacity: 0.5,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.backgroundAlt,
  },
});

export default AddWordBottomSheet;
