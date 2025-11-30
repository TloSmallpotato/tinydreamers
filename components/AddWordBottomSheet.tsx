
import React, { forwardRef, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import { colors } from '@/styles/commonStyles';

interface AddWordBottomSheetProps {
  onAddWord: (word: string, emoji: string, color: string) => void;
}

const COLOR_OPTIONS = [
  colors.cardPink,
  colors.cardPurple,
  colors.cardYellow,
  colors.cardOrange,
];

// Simple emoji mapping based on common words
const getEmojiForWord = (word: string): string => {
  const lowerWord = word.toLowerCase().trim();
  
  // Common word to emoji mappings
  const emojiMap: { [key: string]: string } = {
    // Food & Drink
    'apple': '🍎', 'banana': '🍌', 'orange': '🍊', 'grape': '🍇', 'watermelon': '🍉',
    'strawberry': '🍓', 'cherry': '🍒', 'peach': '🍑', 'pineapple': '🍍', 'kiwi': '🥝',
    'bread': '🍞', 'cheese': '🧀', 'meat': '🍖', 'pizza': '🍕', 'burger': '🍔',
    'fries': '🍟', 'hotdog': '🌭', 'taco': '🌮', 'burrito': '🌯', 'sandwich': '🥪',
    'milk': '🥛', 'water': '💧', 'juice': '🧃', 'coffee': '☕', 'tea': '🍵',
    'cake': '🍰', 'cookie': '🍪', 'candy': '🍬', 'chocolate': '🍫', 'ice cream': '🍦',
    'egg': '🥚', 'carrot': '🥕', 'corn': '🌽', 'potato': '🥔', 'tomato': '🍅',
    
    // Animals
    'dog': '🐶', 'cat': '🐱', 'mouse': '🐭', 'hamster': '🐹', 'rabbit': '🐰',
    'fox': '🦊', 'bear': '🐻', 'panda': '🐼', 'koala': '🐨', 'tiger': '🐯',
    'lion': '🦁', 'cow': '🐮', 'pig': '🐷', 'frog': '🐸', 'monkey': '🐵',
    'chicken': '🐔', 'bird': '🐦', 'penguin': '🐧', 'duck': '🦆', 'owl': '🦉',
    'fish': '🐟', 'whale': '🐋', 'dolphin': '🐬', 'shark': '🦈', 'octopus': '🐙',
    'butterfly': '🦋', 'bee': '🐝', 'ladybug': '🐞', 'snail': '🐌', 'turtle': '🐢',
    'elephant': '🐘', 'giraffe': '🦒', 'zebra': '🦓', 'horse': '🐴', 'unicorn': '🦄',
    
    // Transportation
    'car': '🚗', 'bus': '🚌', 'train': '🚂', 'plane': '✈️', 'boat': '⛵',
    'bike': '🚲', 'motorcycle': '🏍️', 'truck': '🚚', 'taxi': '🚕', 'ambulance': '🚑',
    'fire truck': '🚒', 'police': '🚓', 'helicopter': '🚁', 'rocket': '🚀', 'ship': '🚢',
    
    // Nature
    'tree': '🌳', 'flower': '🌸', 'rose': '🌹', 'sunflower': '🌻', 'tulip': '🌷',
    'sun': '☀️', 'moon': '🌙', 'star': '⭐', 'cloud': '☁️', 'rain': '🌧️',
    'snow': '❄️', 'fire': '🔥', 'water': '💧', 'wind': '💨', 'rainbow': '🌈',
    'mountain': '⛰️', 'beach': '🏖️', 'ocean': '🌊', 'leaf': '🍃', 'plant': '🌱',
    
    // Objects
    'ball': '⚽', 'book': '📚', 'pen': '✏️', 'pencil': '✏️', 'crayon': '🖍️',
    'phone': '📱', 'computer': '💻', 'tv': '📺', 'camera': '📷', 'watch': '⌚',
    'clock': '🕐', 'key': '🔑', 'door': '🚪', 'window': '🪟', 'chair': '🪑',
    'table': '🪑', 'bed': '🛏️', 'lamp': '💡', 'gift': '🎁', 'balloon': '🎈',
    'toy': '🧸', 'puzzle': '🧩', 'game': '🎮', 'music': '🎵', 'guitar': '🎸',
    'drum': '🥁', 'trumpet': '🎺', 'violin': '🎻', 'piano': '🎹', 'microphone': '🎤',
    
    // Places
    'home': '🏠', 'house': '🏠', 'school': '🏫', 'hospital': '🏥', 'store': '🏪',
    'park': '🏞️', 'playground': '🛝', 'beach': '🏖️', 'castle': '🏰', 'church': '⛪',
    
    // Body Parts
    'hand': '✋', 'foot': '🦶', 'eye': '👁️', 'ear': '👂', 'nose': '👃',
    'mouth': '👄', 'teeth': '🦷', 'hair': '💇', 'heart': '❤️', 'brain': '🧠',
    
    // Clothing
    'shirt': '👕', 'pants': '👖', 'dress': '👗', 'shoe': '👞', 'hat': '🎩',
    'sock': '🧦', 'glove': '🧤', 'coat': '🧥', 'scarf': '🧣', 'glasses': '👓',
    
    // Actions & Emotions
    'happy': '😊', 'sad': '😢', 'love': '❤️', 'laugh': '😂', 'cry': '😭',
    'sleep': '😴', 'eat': '🍽️', 'drink': '🥤', 'play': '🎮', 'run': '🏃',
    'walk': '🚶', 'jump': '🦘', 'dance': '💃', 'sing': '🎤', 'read': '📖',
    
    // Colors
    'red': '🔴', 'blue': '🔵', 'green': '🟢', 'yellow': '🟡', 'orange': '🟠',
    'purple': '🟣', 'pink': '🩷', 'brown': '🟤', 'black': '⚫', 'white': '⚪',
    
    // Numbers
    'one': '1️⃣', 'two': '2️⃣', 'three': '3️⃣', 'four': '4️⃣', 'five': '5️⃣',
    'six': '6️⃣', 'seven': '7️⃣', 'eight': '8️⃣', 'nine': '9️⃣', 'ten': '🔟',
    
    // Family
    'mom': '👩', 'dad': '👨', 'baby': '👶', 'boy': '👦', 'girl': '👧',
    'grandma': '👵', 'grandpa': '👴', 'family': '👨‍👩‍👧‍👦', 'brother': '👦', 'sister': '👧',
    
    // Weather
    'sunny': '☀️', 'cloudy': '☁️', 'rainy': '🌧️', 'snowy': '❄️', 'windy': '💨',
    'storm': '⛈️', 'thunder': '⚡', 'hot': '🔥', 'cold': '🧊', 'warm': '🌡️',
    
    // Time
    'morning': '🌅', 'day': '☀️', 'night': '🌙', 'evening': '🌆', 'today': '📅',
    'tomorrow': '📆', 'yesterday': '📅', 'time': '⏰', 'hour': '🕐', 'minute': '⏱️',
  };
  
  // Check for exact match
  if (emojiMap[lowerWord]) {
    return emojiMap[lowerWord];
  }
  
  // Check for partial matches
  for (const [key, emoji] of Object.entries(emojiMap)) {
    if (lowerWord.includes(key) || key.includes(lowerWord)) {
      return emoji;
    }
  }
  
  // Default emoji based on first letter
  const firstChar = lowerWord.charAt(0);
  const defaultEmojis: { [key: string]: string } = {
    'a': '🍎', 'b': '🎈', 'c': '🐱', 'd': '🐶', 'e': '🥚',
    'f': '🌸', 'g': '🎁', 'h': '🏠', 'i': '🍦', 'j': '🧃',
    'k': '🔑', 'l': '💡', 'm': '🎵', 'n': '🌙', 'o': '🍊',
    'p': '🎨', 'q': '👑', 'r': '🌈', 's': '⭐', 't': '🌳',
    'u': '☂️', 'v': '🎻', 'w': '🌊', 'x': '❌', 'y': '🟡',
    'z': '🦓',
  };
  
  return defaultEmojis[firstChar] || '⭐';
};

const getColorForLetter = (letter: string): string => {
  const letterIndex = letter.toUpperCase().charCodeAt(0) - 65; // A=0, B=1, etc.
  return COLOR_OPTIONS[letterIndex % COLOR_OPTIONS.length];
};

const AddWordBottomSheet = forwardRef<BottomSheet, AddWordBottomSheetProps>(
  ({ onAddWord }, ref) => {
    const snapPoints = useMemo(() => ['40%'], []);
    const [word, setWord] = useState('');

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
        const trimmedWord = word.trim();
        const firstLetter = trimmedWord.charAt(0).toUpperCase();
        const emoji = getEmojiForWord(trimmedWord);
        const color = getColorForLetter(firstLetter);
        
        onAddWord(trimmedWord, emoji, color);
        setWord('');
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
        style={styles.bottomSheet}
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
  bottomSheet: {
    zIndex: 999999,
    elevation: 999999,
  },
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
