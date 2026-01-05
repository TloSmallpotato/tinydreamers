
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { router } from 'expo-router';
import { GlassView } from 'expo-glass-effect';
import { useTheme } from '@react-navigation/native';

export default function FormSheetModal() {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: theme.colors.text }]}>Form Sheet Modal</Text>
      <Text style={[styles.text, { color: theme.colors.text }]}>Drag the grabber to resize!</Text>

      <Pressable onPress={() => router.back()}>
        <GlassView style={styles.button} glassEffectStyle="clear">
          <Text style={[styles.buttonText, { color: theme.colors.primary }]}>Close Modal</Text>
        </GlassView>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'transparent',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  text: {
    fontSize: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  button: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
