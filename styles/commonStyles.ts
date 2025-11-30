
import { StyleSheet } from 'react-native';

export const colors = {
  primary: '#1A1A1A',
  secondary: '#FF6B9D',
  accent: '#FFD93D',
  background: '#FFFFFF',
  backgroundAlt: '#FFFFFF',
  text: '#1A1A1A',
  textSecondary: '#666666',
  border: '#E0E0E0',
  buttonBlue: '#4A90E2',
  cardPink: '#FFB6C1',
  cardPurple: '#E6D5F5',
  cardGreen: '#A8E6CF',
};

export const commonStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  text: {
    color: colors.text,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
  },
  button: {
    backgroundColor: colors.buttonBlue,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: colors.backgroundAlt,
    fontSize: 16,
    fontWeight: '600',
  },
});
