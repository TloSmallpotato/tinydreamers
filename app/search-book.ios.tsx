
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TextInput, 
  Platform, 
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
import ToastNotification from '@/components/ToastNotification';
import { useRouter } from 'expo-router';

export default function SearchBookScreen() {
  const { selectedChild } = useChild();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<BookSearchResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isAddingBook, setIsAddingBook] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'info' | 'success' | 'warning' | 'error'>('info');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  const searchInputRef = useRef<TextInput>(null);
  const addBookTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = useCallback((message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  }, []);

  // Get current user ID
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      }
    };
    getCurrentUser();
  }, []);

  // Auto-focus search input on mount
  useEffect(() => {
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 300);
  }, []);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (addBookTimeoutRef.current) {
        clearTimeout(addBookTimeoutRef.current);
      }
    };
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.trim().length >= 2) {
        setIsSearching(true);
        const results = await searchGoogleBooks(searchQuery);
        console.log('[iOS] Search results:', results.length, 'books found');
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
    // Prevent duplicate additions
    if (isAddingBook) {
      console.log('[iOS] Already adding a book - ignoring duplicate request');
      return;
    }

    if (!selectedChild) {
      console.log('[iOS] No child selected');
      showToast('Please select a child before adding books.', 'warning');
      return;
    }

    try {
      // Set flag to prevent duplicate additions
      setIsAddingBook(true);
      console.log('[iOS] === ADDING BOOK PROCESS STARTED ===');
      console.log('[iOS] Book title:', book.title);
      console.log('[iOS] Google Books ID:', book.googleBooksId);

      // STEP 1: Check if book exists in books_library database
      console.log('[iOS] STEP 1: Checking if book exists in database...');
      let { data: existingBook, error: fetchError } = await supabase
        .from('books_library')
        .select('id, cover_url, thumbnail_url')
        .eq('google_books_id', book.googleBooksId)
        .single();

      let bookId: string;

      if (fetchError && fetchError.code === 'PGRST116') {
        // STEP 2: Book not found in database - create new entry
        console.log('[iOS] STEP 2: Book NOT found in database. Creating new entry...');
        console.log('[iOS] Cover URL:', book.coverUrl);
        console.log('[iOS] Thumbnail URL:', book.thumbnailUrl);
        console.log('[iOS] Source:', book.source);
        
        const { data: newBook, error: insertError } = await supabase
          .from('books_library')
          .insert({
            google_books_id: book.googleBooksId,
            title: book.title,
            authors: book.authors,
            cover_url: book.coverUrl,
            thumbnail_url: book.thumbnailUrl,
            description: book.description,
            published_date: book.publishedDate,
            page_count: book.pageCount,
            source: 'google_books',
          })
          .select('id')
          .single();

        if (insertError) {
          console.error('[iOS] Error creating book in database:', insertError);
          showToast('Failed to add book. Please try again.', 'error');
          setIsAddingBook(false);
          return;
        }

        bookId = newBook.id;
        console.log('[iOS] Book created successfully in database with ID:', bookId);
      } else if (existingBook) {
        // Book already exists in database - reuse it
        bookId = existingBook.id;
        console.log('[iOS] STEP 2: Book FOUND in database with ID:', bookId);
      } else {
        console.error('[iOS] Error fetching book from database:', fetchError);
        showToast('Failed to add book. Please try again.', 'error');
        setIsAddingBook(false);
        return;
      }

      // STEP 3: Check if user already has this book in their library
      console.log('[iOS] STEP 3: Checking if user already has this book...');
      const { data: existingUserBook } = await supabase
        .from('user_books')
        .select('id')
        .eq('child_id', selectedChild.id)
        .eq('book_id', bookId)
        .single();

      if (existingUserBook) {
        console.log('[iOS] User already has this book in their library');
        showToast('This book is already in your library.', 'info');
        setSearchQuery('');
        setShowDropdown(false);
        Keyboard.dismiss();
        setIsAddingBook(false);
        
        // Navigate back to books screen after a short delay
        setTimeout(() => {
          router.back();
        }, 1500);
        return;
      }

      // STEP 4: Create user_book relationship
      console.log('[iOS] STEP 4: Adding book to user library...');
      const { error: relationError } = await supabase
        .from('user_books')
        .insert({
          child_id: selectedChild.id,
          book_id: bookId,
          user_id: currentUserId,
          is_custom_for_user: false,
        });

      if (relationError) {
        console.error('[iOS] Error adding book to user library:', relationError);
        showToast('Failed to add book to library. Please try again.', 'error');
        setIsAddingBook(false);
        return;
      }

      console.log('[iOS] Book added to user library successfully');
      console.log('[iOS] === ADDING BOOK PROCESS COMPLETED ===');

      // Clear search
      setSearchQuery('');
      setShowDropdown(false);
      Keyboard.dismiss();

      // Show success message
      showToast('Book added to your library!', 'success');
      
      // Navigate back to books screen after a short delay
      setTimeout(() => {
        router.back();
      }, 1500);
    } catch (error) {
      console.error('[iOS] Error in handleSelectBook:', error);
      showToast('An unexpected error occurred. Please try again.', 'error');
    } finally {
      // Reset the flag after a short delay to prevent rapid re-additions
      addBookTimeoutRef.current = setTimeout(() => {
        console.log('[iOS] Resetting isAddingBook flag');
        setIsAddingBook(false);
      }, 2000);
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <IconSymbol
              ios_icon_name="chevron.left"
              android_material_icon_name="arrow-back"
              size={24}
              color={colors.text}
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Search a Book</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.searchContainer}>
          <View style={styles.searchBarWrapper}>
            <IconSymbol 
              ios_icon_name="magnifyingglass" 
              android_material_icon_name="search" 
              size={20} 
              color={colors.primary} 
            />
            <TextInput
              ref={searchInputRef}
              style={styles.searchInput}
              placeholder="Search for a book"
              placeholderTextColor={colors.primary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onFocus={() => {
                if (searchResults.length > 0) {
                  setShowDropdown(true);
                }
              }}
              editable={!isAddingBook}
            />
            {isSearching && (
              <ActivityIndicator size="small" color={colors.primary} />
            )}
          </View>
        </View>

        {showDropdown && searchResults.length > 0 && (
          <ScrollView 
            style={styles.dropdown}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {searchResults.map((book, index) => (
              <TouchableOpacity
                key={`${book.googleBooksId}-${index}`}
                style={styles.dropdownItem}
                onPress={() => handleSelectBook(book)}
                disabled={isAddingBook}
              >
                <View style={styles.bookCoverContainer}>
                  {book.thumbnailUrl || book.coverUrl ? (
                    <Image
                      source={{ uri: book.thumbnailUrl || book.coverUrl }}
                      style={styles.bookCoverSmall}
                      contentFit="cover"
                      cachePolicy="memory-disk"
                      priority="high"
                      transition={200}
                      onError={() => console.log('[iOS] Dropdown image error:', book.title)}
                    />
                  ) : (
                    <View style={[styles.bookCoverSmall, styles.placeholderCover]}>
                      <Text style={styles.placeholderText} numberOfLines={2}>
                        {book.title}
                      </Text>
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
        )}

        {!showDropdown && searchQuery.length === 0 && (
          <View style={styles.emptyState}>
            <IconSymbol
              ios_icon_name="magnifyingglass"
              android_material_icon_name="search"
              size={64}
              color={colors.textSecondary}
            />
            <Text style={styles.emptyText}>Search for a book</Text>
            <Text style={styles.emptySubtext}>
              Type the title or author to find books
            </Text>
          </View>
        )}

        {!showDropdown && searchQuery.length > 0 && !isSearching && searchResults.length === 0 && (
          <View style={styles.emptyState}>
            <IconSymbol
              ios_icon_name="book.closed"
              android_material_icon_name="book"
              size={64}
              color={colors.textSecondary}
            />
            <Text style={styles.emptyText}>No books found</Text>
            <Text style={styles.emptySubtext}>
              Try a different search term
            </Text>
          </View>
        )}
      </SafeAreaView>

      <ToastNotification
        visible={toastVisible}
        message={toastMessage}
        type={toastType}
        onHide={() => setToastVisible(false)}
      />
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 48 : 20,
    paddingBottom: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.backgroundAlt,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  headerSpacer: {
    width: 44,
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  searchBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundAlt,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    minHeight: 56,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: colors.primary,
  },
  dropdown: {
    flex: 1,
    paddingHorizontal: 20,
  },
  dropdownItem: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: colors.backgroundAlt,
    borderRadius: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  bookCoverContainer: {
    marginRight: 12,
    backgroundColor: colors.background,
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
    overflow: 'hidden',
  },
  bookCoverSmall: {
    width: 50,
    height: 75,
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
  },
  placeholderCover: {
    backgroundColor: '#EDEDFF',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
  },
  placeholderText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.primary,
    textAlign: 'center',
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
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
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
  },
});
