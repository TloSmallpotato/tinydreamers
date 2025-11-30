
import { StyleSheet } from 'react-native';

// Colors extracted from the design images
export const colors = {
  // Main colors from design
  primary: '#3D3FB5',        // Deep blue for titles and active states
  secondary: '#FF5722',      // Orange/red for active tabs and accents
  accent: '#FFB800',         // Yellow for badges
  background: '#F5EDE4',     // Beige/cream background
  backgroundAlt: '#FFFFFF',  // White for cards
  text: '#3D3FB5',          // Blue text for titles
  textSecondary: '#666666',  // Gray text for subtitles
  
  // Tab colors
  tabActive: '#FF5722',      // Orange for active tab background
  tabInactive: '#E8DFD6',    // Light beige for inactive tabs
  tabIconActive: '#FFFFFF',  // White icon when active
  tabIconInactive: '#666666', // Gray icon when inactive
  
  // Card colors
  cardPink: '#F5B5D5',       // Pink for cards
  cardPurple: '#D5C5F5',     // Purple for cards
  cardYellow: '#FFD700',     // Yellow for cards
  cardOrange: '#FF5722',     // Orange for cards
  cardGreen: '#4CAF50',      // Green for stats
  
  // Button colors
  buttonBlue: '#3D3FB5',     // Blue for add button
  buttonOrange: '#FF5722',   // Orange for action buttons
};

export const buttonStyles = StyleSheet.create({
  instructionsButton: {
    backgroundColor: colors.buttonBlue,
    alignSelf: 'center',
    width: '100%',
  },
  backButton: {
    backgroundColor: colors.backgroundAlt,
    alignSelf: 'center',
    width: '100%',
  },
});

export const commonStyles = StyleSheet.create({
  wrapper: {
    backgroundColor: colors.background,
    width: '100%',
    height: '100%',
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
    width: '100%',
    height: '100%',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: 800,
    width: '100%',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'left',
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '400',
    color: colors.textSecondary,
    marginBottom: 16,
  },
  text: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 8,
    lineHeight: 24,
  },
  section: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 16,
    padding: 16,
    marginVertical: 8,
    width: '100%',
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
    elevation: 3,
  },
  searchBar: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.05)',
    elevation: 2,
  },
});
