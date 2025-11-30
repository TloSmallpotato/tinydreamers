
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, commonStyles } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';

export default function BooksScreen() {
  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={commonStyles.title}>Books</Text>
            <Text style={commonStyles.subtitle}>Scarlett&apos;s library</Text>
            
            <View style={styles.badge}>
              <Text style={styles.badgeText}>23 books</Text>
            </View>
          </View>

          <View style={commonStyles.searchBar}>
            <IconSymbol 
              ios_icon_name="magnifyingglass" 
              android_material_icon_name="search" 
              size={20} 
              color={colors.primary} 
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Search to add a book"
              placeholderTextColor={colors.primary}
            />
          </View>

          <View style={styles.booksGrid}>
            {[
              { color: colors.cardPink },
              { color: colors.cardPurple },
              { color: colors.cardYellow },
              { color: colors.cardPink },
              { color: colors.cardPink },
              { color: colors.cardOrange },
            ].map((book, index) => (
              <View key={index} style={[styles.bookCard, { backgroundColor: book.color }]} />
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
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
    paddingBottom: 120,
  },
  header: {
    marginBottom: 20,
  },
  badge: {
    backgroundColor: colors.secondary,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    alignSelf: 'flex-start',
    marginTop: 12,
  },
  badgeText: {
    color: colors.backgroundAlt,
    fontSize: 16,
    fontWeight: '700',
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: colors.primary,
  },
  booksGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  bookCard: {
    width: '47%',
    aspectRatio: 0.7,
    borderRadius: 16,
    marginBottom: 16,
    boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.1)',
    elevation: 3,
  },
});
