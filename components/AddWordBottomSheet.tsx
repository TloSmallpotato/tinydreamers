
import React, { forwardRef, useMemo, useState, useCallback, useImperativeHandle } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Platform } from 'react-native';
import { BottomSheetBackdrop, BottomSheetScrollView, BottomSheetModal } from '@gorhom/bottom-sheet';
import { colors } from '@/styles/commonStyles';

interface AddWordBottomSheetProps {
  onAddWord: (word: string, emoji: string, color: string) => void;
  onDismiss?: () => void;
}

const COLOR_OPTIONS = [
  colors.cardPink,
  colors.cardPurple,
  colors.cardYellow,
  colors.cardOrange,
];

const getEmojiForWord = (word: string): string => {
  const lowerWord = word.toLowerCase().trim();
  
  const emojiMap: { [key: string]: string } = {
    'apple': '🍎', 'banana': '🍌', 'orange': '🍊', 'grape': '🍇', 'watermelon': '🍉',
    'strawberry': '🍓', 'cherry': '🍒', 'peach': '🍑', 'pineapple': '🍍', 'kiwi': '🥝',
    'bread': '🍞', 'cheese': '🧀', 'meat': '🍖', 'pizza': '🍕', 'burger': '🍔',
    'fries': '🍟', 'hotdog': '🌭', 'taco': '🌮', 'burrito': '🌯', 'sandwich': '🥪',
    'milk': '🥛', 'water': '💧', 'juice': '🧃', 'coffee': '☕', 'tea': '🍵',
    'cake': '🍰', 'cookie': '🍪', 'candy': '🍬', 'chocolate': '🍫', 'ice cream': '🍦',
    'egg': '🥚', 'carrot': '🥕', 'corn': '🌽', 'potato': '🥔', 'tomato': '🍅',
    'dog': '🐶', 'cat': '🐱', 'mouse': '🐭', 'hamster': '🐹', 'rabbit': '🐰',
    'fox': '🦊', 'bear': '🐻', 'panda': '🐼', 'koala': '🐨', 'tiger': '🐯',
    'lion': '🦁', 'cow': '🐮', 'pig': '🐷', 'frog': '🐸', 'monkey': '🐵',
    'chicken': '🐔', 'bird': '🐦', 'penguin': '🐧', 'duck': '🦆', 'owl': '🦉',
    'fish': '🐟', 'whale': '🐋', 'dolphin': '🐬', 'shark': '🦈', 'octopus': '🐙',
    'butterfly': '🦋', 'bee': '🐝', 'ladybug': '🐞', 'snail': '🐌', 'turtle': '🐢',
    'elephant': '🐘', 'giraffe': '🦒', 'zebra': '🦓', 'horse': '🐴', 'unicorn': '🦄',
    'car': '🚗', 'bus': '🚌', 'train': '🚂', 'plane': '✈️', 'boat': '⛵',
    'bike': '🚲', 'motorcycle': '🏍️', 'truck': '🚚', 'taxi': '🚕', 'ambulance': '🚑',
    'fire truck': '🚒', 'police': '🚓', 'helicopter': '🚁', 'rocket': '🚀', 'ship': '🚢',
    'tree': '🌳', 'flower': '🌸', 'rose': '🌹', 'sunflower': '🌻', 'tulip': '🌷',
    'sun': '☀️', 'moon': '🌙', 'star': '⭐', 'cloud': '☁️', 'rain': '🌧️',
    'snow': '❄️', 'fire': '🔥', 'water': '💧', 'wind': '💨', 'rainbow': '🌈',
    'mountain': '⛰️', 'beach': '🏖️', 'ocean': '🌊', 'leaf': '🍃', 'plant': '🌱',
    'ball': '⚽', 'book': '📚', 'pen': '✏️', 'pencil': '✏️', 'crayon': '🖍️',
    'phone': '📱', 'computer': '💻', 'tv': '📺', 'camera': '📷', 'watch': '⌚',
    'clock': '🕐', 'key': '🔑', 'door': '🚪', 'window': '🪟', 'chair': '🪑',
    'table': '🪑', 'bed': '🛏️', 'lamp': '💡', 'gift': '🎁', 'balloon': '🎈',
    'toy': '🧸', 'puzzle': '🧩', 'game': '🎮', 'music': '🎵', 'guitar': '🎸',
    'drum': '🥁', 'trumpet': '🎺', 'violin': '🎻', 'piano': '🎹', 'microphone': '🎤',
    'home': '🏠', 'house': '🏠', 'school': '🏫', 'hospital': '🏥', 'store': '🏪',
    'park': '🏞️', 'playground': '🛝', 'beach': '🏖️', 'castle': '🏰', 'church': '⛪',
    'hand': '✋', 'foot': '🦶', 'eye': '👁️', 'ear': '👂', 'nose': '👃',
    'mouth': '👄', 'teeth': '🦷', 'hair': '💇', 'heart': '❤️', 'brain': '🧠',
    'shirt': '👕', 'pants': '👖', 'dress': '👗', 'shoe': '👞', 'hat': '🎩',
    'sock': '🧦', 'glove': '🧤', 'coat': '🧥', 'scarf': '🧣', 'glasses': '👓',
    'happy': '😊', 'sad': '😢', 'love': '❤️', 'laugh': '😂', 'cry': '😭',
    'sleep': '😴', 'eat': '🍽️', 'drink': '🥤', 'play': '🎮', 'run': '🏃',
    'walk': '🚶', 'jump': '🦘', 'dance': '💃', 'sing': '🎤', 'read': '📖',
    'red': '🔴', 'blue': '🔵', 'green': '🟢', 'yellow': '🟡', 'orange': '🟠',
    'purple': '🟣', 'pink': '🩷', 'brown': '🟤', 'black': '⚫', 'white': '⚪',
    'one': '1️⃣', 'two': '2️⃣', 'three': '3️⃣', 'four': '4️⃣', 'five': '5️⃣',
    'six': '6️⃣', 'seven': '7️⃣', 'eight': '8️⃣', 'nine': '9️⃣', 'ten': '🔟',
    'mom': '👩', 'dad': '👨', 'baby': '👶', 'boy': '👦', 'girl': '👧',
    'grandma': '👵', 'grandpa': '👴', 'family': '👨‍👩‍👧‍👦', 'brother': '👦', 'sister': '👧',
    'sunny': '☀️', 'cloudy': '☁️', 'rainy': '🌧️', 'snowy': '❄️', 'windy': '💨',
    'storm': '⛈️', 'thunder': '⚡', 'hot': '🔥', 'cold': '🧊', 'warm': '🌡️',
    'morning': '🌅', 'day': '☀️', 'night': '🌙', 'evening': '🌆', 'today': '📅',
    'tomorrow': '📆', 'yesterday': '📅', 'time': '⏰', 'hour': '🕐', 'minute': '⏱️',
  };
  
  if (emojiMap[lowerWord]) {
    return emojiMap[lowerWord];
  }
  
  for (const [key, emoji] of Object.entries(emojiMap)) {
    if (lowerWord.includes(key) || key.includes(lowerWord)) {
      return emoji;
    }
  }
  
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
  const letterIndex = letter.toUpperCase().charCodeAt(0) - 65;
  return COLOR_OPTIONS[letterIndex % COLOR_OPTIONS.length];
};

const AddWordBottomSheet = forwardRef<BottomSheetModal, AddWordBottomSheetProps>(
  ({ onAddWord, onDismiss }, ref) => {
    const snapPoints = useMemo(() => ['75%'], []);
    const [word, setWord] = useState('');
    const inputRef = React.useRef<TextInput>(null);
    const internalRef = React.useRef<BottomSheetModal>(null);

    // Expose both present and dismiss methods
    useImperativeHandle(ref, () => ({
      present: () => {
        console.log('AddWordBottomSheet: present() called');
        internalRef.current?.present();
      },
      dismiss: () => {
        console.log('AddWordBottomSheet: dismiss() called');
        internalRef.current?.dismiss();
      },
      close: () => {
        console.log('AddWordBottomSheet: close() called');
        internalRef.current?.close();
      },
      snapToIndex: (index: number) => {
        internalRef.current?.snapToIndex(index);
      },
      snapToPosition: (position: string | number) => {
        internalRef.current?.snapToPosition(position);
      },
      expand: () => {
        internalRef.current?.expand();
      },
      collapse: () => {
        internalRef.current?.collapse();
      },
      forceClose: () => {
        internalRef.current?.forceClose();
      },
    }));

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

    const handleSheetChanges = useCallback((index: number) => {
      console.log('AddWordBottomSheet index changed:', index);
      if (index === 0) {
        // Focus the input with multiple attempts to ensure it works
        setTimeout(() => {
          inputRef.current?.focus();
        }, 100);
        setTimeout(() => {
          inputRef.current?.focus();
        }, 300);
        setTimeout(() => {
          inputRef.current?.focus();
        }, 500);
      } else if (index === -1) {
        // Sheet is closed, clear the word and call onDismiss
        setWord('');
        if (onDismiss) {
          onDismiss();
        }
      }
    }, [onDismiss]);

    const handleAdd = () => {
      if (word.trim()) {
        const trimmedWord = word.trim();
        const firstLetter = trimmedWord.charAt(0).toUpperCase();
        const emoji = getEmojiForWord(trimmedWord);
        const color = getColorForLetter(firstLetter);
        
        console.log('Adding word:', trimmedWord, emoji, color);
        onAddWord(trimmedWord, emoji, color);
        setWord('');
        internalRef.current?.dismiss();
      }
    };

    return (
      <BottomSheetModal
        ref={internalRef}
        index={0}
        snapPoints={snapPoints}
        enablePanDownToClose={true}
        enableDismissOnClose={true}
        backdropComponent={renderBackdrop}
        backgroundStyle={styles.bottomSheetBackground}
        handleIndicatorStyle={styles.handleIndicator}
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustResize"
        onChange={handleSheetChanges}
        animateOnMount={true}
        enableContentPanningGesture={true}
      >
        <BottomSheetScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.contentContainer}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>Add New Word</Text>

          <View style={styles.form}>
            <Text style={styles.label}>Word</Text>
            <TextInput
              ref={inputRef}
              style={styles.input}
              value={word}
              onChangeText={setWord}
              placeholder="Enter word"
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="words"
              autoFocus={true}
              returnKeyType="done"
              onSubmitEditing={handleAdd}
            />
          </View>

          <TouchableOpacity
            style={[styles.addButton, !word.trim() && styles.addButtonDisabled]}
            onPress={handleAdd}
            disabled={!word.trim()}
          >
            <Text style={styles.addButtonText}>Add Word</Text>
          </TouchableOpacity>
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
    paddingBottom: 300,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 24,
    textAlign: 'center',
  },
  form: {
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
    marginTop: 8,
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
