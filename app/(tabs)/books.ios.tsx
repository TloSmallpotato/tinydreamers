
import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TextInput, 
  TouchableOpacity,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { colors, commonStyles } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { useChild } from '@/contexts/ChildContext';
import { supabase } from '@/app/integrations/supabase/client';
import { searchGoogleBooks, BookSearchResult } from '@/utils/googleBooksApi';

interface SavedBook {
  id: string;
  google_books_id: string;
  title: string;
  authors: string;
  cover_url: string;
  thumbnail_url: string;
  description: string;
  published_date: string;
  page_count: number;
}

export default function BooksScreen() {
  const { selectedChild } = useChild();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<BookSearchResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [savedBooks, setSavedBooks] = useState<SavedBook[]>([]);
  const [isLoadingBooks, setIsLoadingBooks] = useState(true);

  // Fetch saved books for the selected child
  const fetchSavedBooks = useCallback(async () => {
    if (!selectedChild) {
      setSavedBooks([]);
      setIsLoadingBooks(false);
      return;
    }

    try {
      setIsLoadingBooks(true);
      const { data, error } = await supabase
        .from('books')
        .select('*')
        .eq('child_id', selectedChild.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching books:', error);
        return;
      }

      setSavedBooks(data || []);
    } catch (error) {
      console.error('Error in fetchSavedBooks:', error);
    } finally {
      setIsLoadingBooks(false);
    }
  }, [selectedChild]);

  useEffect(() => {
    fetchSavedBooks();
  }, [fetchSavedBooks]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.trim().length >= 2) {
        setIsSearching(true);
        const results = await searchGoogleBooks(searchQuery);
        setSearchResults(results);
        setShowDropdown(results.length > 0);
        setIsSearching(false);
      } else {
        setSearchResults([]);
        setShowDropdown(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectBook = async (book: BookSearchResult) => {
    if (!selectedChild) {
      console.log('No child selected');
      return;
    }

    try {
      // Check if book already exists for this child
      const { data: existingBook } = await supabase
        .from('books')
        .select('id')
        .eq('child_id', selectedChild.id)
        .eq('google_books_id', book.googleBooksId)
        .single();

      if (existingBook) {
        console.log('Book already added');
        setSearchQuery('');
        setShowDropdown(false);
        Keyboard.dismiss();
        return;
      }

      // Add book to database
      const { error } = await supabase
        .from('books')
        .insert({
          child_id: selectedChild.id,
          google_books_id: book.googleBooksId,
          title: book.title,
          authors: book.authors,
          cover_url: book.coverUrl,
          thumbnail_url: book.thumbnailUrl,
          description: book.description,
          published_date: book.publishedDate,
          page_count: book.pageCount,
        });

      if (error) {
        console.error('Error adding book:', error);
        return;
      }

      // Refresh the books list
      await fetchSavedBooks();

      // Clear search
      setSearchQuery('');
      setShowDropdown(false);
      Keyboard.dismiss();
    } catch (error) {
      console.error('Error in handleSelectBook:', error);
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={commonStyles.title}>Books</Text>
            <Text style={commonStyles.subtitle}>
              {selectedChild ? `${selectedChild.name}'s library` : 'Select a child'}
            </Text>
            
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {savedBooks.length} {savedBooks.length === 1 ? 'book' : 'books'}
              </Text>
            </View>
          </View>

          <View style={styles.searchContainer}>
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
                value={searchQuery}
                onChangeText={setSearchQuery}
                onFocus={() => {
                  if (searchResults.length > 0) {
                    setShowDropdown(true);
                  }
                }}
              />
              {isSearching && (
                <ActivityIndicator size="small" color={colors.primary} />
              )}
            </View>

            {showDropdown && searchResults.length > 0 && (
              <View style={styles.dropdown}>
                <ScrollView 
                  style={styles.dropdownScroll}
                  nestedScrollEnabled
                  keyboardShouldPersistTaps="handled"
                >
                  {searchResults.map((book, index) => (
                    <TouchableOpacity
                      key={`${book.googleBooksId}-${index}`}
                      style={styles.dropdownItem}
                      onPress={() => handleSelectBook(book)}
                    >
                      <View style={styles.bookCoverContainer}>
                        {book.thumbnailUrl ? (
                          <Image
                            source={{ uri: book.thumbnailUrl }}
                            style={styles.bookCoverSmall}
                            contentFit="cover"
                          />
                        ) : (
                          <View style={[styles.bookCoverSmall, styles.placeholderCover]}>
                            <IconSymbol
                              ios_icon_name="book.fill"
                              android_material_icon_name="book"
                              size={24}
                              color={colors.textSecondary}
                            />
                          </View>
                        )}
                      </View>
                      <View style={styles.bookInfo}>
                        <Text style={styles.bookTitle} numberOfLines={2}>
                          {book.title}
                        </Text>
                        <Text style={styles.bookAuthor} numberOfLines={1}>
                          {book.authors}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          {isLoadingBooks ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : savedBooks.length === 0 ? (
            <View style={styles.emptyState}>
              <IconSymbol
                ios_icon_name="book.fill"
                android_material_icon_name="book"
                size={64}
                color={colors.textSecondary}
              />
              <Text style={styles.emptyText}>No books yet</Text>
              <Text style={styles.emptySubtext}>
                Search and add books to start building your library
              </Text>
            </View>
          ) : (
            <View style={styles.booksGrid}>
              {savedBooks.map((book, index) => (
                <View key={`${book.id}-${index}`} style={styles.bookCard}>
                  {book.cover_url ? (
                    <Image
                      source={{ uri: book.cover_url }}
                      style={styles.bookCoverLarge}
                      contentFit="cover"
                    />
                  ) : (
                    <View style={[styles.bookCoverLarge, styles.placeholderCoverLarge]}>
                      <IconSymbol
                        ios_icon_name="book.fill"
                        android_material_icon_name="book"
                        size={48}
                        color={colors.textSecondary}
                      />
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}
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
  searchContainer: {
    position: 'relative',
    zIndex: 1000,
    marginBottom: 20,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: colors.primary,
  },
  dropdown: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    backgroundColor: colors.backgroundAlt,
    borderRadius: 16,
    maxHeight: 400,
    boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.15)',
    elevation: 5,
    zIndex: 1001,
  },
  dropdownScroll: {
    maxHeight: 400,
  },
  dropdownItem: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.background,
    alignItems: 'center',
  },
  bookCoverContainer: {
    marginRight: 12,
  },
  bookCoverSmall: {
    width: 50,
    height: 75,
    borderRadius: 8,
  },
  placeholderCover: {
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookInfo: {
    flex: 1,
  },
  bookTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  bookAuthor: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 40,
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
    overflow: 'hidden',
  },
  bookCoverLarge: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
  },
  placeholderCoverLarge: {
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
