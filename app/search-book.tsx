
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
  TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { colors, commonStyles } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { useChild } from '@/contexts/ChildContext';
import { useStats } from '@/contexts/StatsContext';
import { useProfileStats } from '@/contexts/ProfileStatsContext';
import { supabase } from '@/app/integrations/supabase/client';
import { searchGoogleBooks, getBookDetails, BookSearchResult } from '@/utils/googleBooksApi';
import ToastNotification from '@/components/ToastNotification';
import { useRouter } from 'expo-router';
import { getFirstValidImageUrl } from '@/utils/imageValidation';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import AddCustomBookBottomSheet from '@/components/AddCustomBookBottomSheet';

export default function SearchBookScreen() {
  const { selectedChild } = useChild();
  const { refreshStats } = useStats();
  const { fetchProfileStats } = useProfileStats();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<BookSearchResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isAddingBook, setIsAddingBook] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'info' | 'success' | 'warning' | 'error'>('info');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [selectedBook, setSelectedBook] = useState<BookSearchResult | null>(null);
  const [isCoverLoading, setIsCoverLoading] = useState(false);
  
  const searchInputRef = useRef<TextInput>(null);
  const addBookTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const addCustomBookBottomSheetRef = useRef<BottomSheetModal>(null);

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

  // Debounced search - OPTIMIZED: Reduced from 500ms to 300ms
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.trim().length >= 2) {
        setIsSearching(true);
        // OPTIMIZED: Limit to 5 results for faster rendering
        const results = await searchGoogleBooks(searchQuery, 5);
        console.log('Search results:', results.length, 'books found');
        setSearchResults(results);
        setShowDropdown(results.length > 0);
        setIsSearching(false);
      } else {
        setSearchResults([]);
        setShowDropdown(false);
      }
    }, 300); // OPTIMIZED: Reduced debounce time from 500ms to 300ms

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectBook = async (book: BookSearchResult) => {
    console.log('Book selected:', book.title);
    setShowDropdown(false);
    Keyboard.dismiss();
    
    // OPTIMIZED: Fetch detailed book info with high-quality cover AFTER selection
    setIsLoadingDetails(true);
    setIsCoverLoading(true);
    try {
      const detailedBook = await getBookDetails(book.googleBooksId);
      if (detailedBook) {
        setSelectedBook(detailedBook);
      } else {
        // Fallback to the basic book info if details fetch fails
        setSelectedBook(book);
      }
    } catch (error) {
      console.error('Error fetching book details:', error);
      // Fallback to the basic book info
      setSelectedBook(book);
    } finally {
      setIsLoadingDetails(false);
      // Keep cover loading state until image loads
    }
  };

  const handleAddToLibrary = async () => {
    if (!selectedBook) {
      console.log('No book selected');
      return;
    }

    // Prevent duplicate additions
    if (isAddingBook) {
      console.log('Already adding a book - ignoring duplicate request');
      return;
    }

    if (!selectedChild) {
      console.log('No child selected');
      showToast('Please select a child before adding books.', 'warning');
      return;
    }

    try {
      // Set flag to prevent duplicate additions
      setIsAddingBook(true);
      console.log('=== ADDING BOOK PROCESS STARTED ===');
      console.log('Book title:', selectedBook.title);
      console.log('Google Books ID:', selectedBook.googleBooksId);

      // STEP 1: Check if book exists in books_library database
      console.log('STEP 1: Checking if book exists in database...');
      let { data: existingBook, error: fetchError } = await supabase
        .from('books_library')
        .select('id, cover_url, thumbnail_url')
        .eq('google_books_id', selectedBook.googleBooksId)
        .single();

      let bookId: string;

      if (fetchError && fetchError.code === 'PGRST116') {
        // STEP 2: Book not found in database - create new entry
        console.log('STEP 2: Book NOT found in database. Creating new entry...');
        console.log('Cover URL:', selectedBook.coverUrl);
        console.log('Thumbnail URL:', selectedBook.thumbnailUrl);
        console.log('Source:', selectedBook.source);
        
        const { data: newBook, error: insertError } = await supabase
          .from('books_library')
          .insert({
            google_books_id: selectedBook.googleBooksId,
            title: selectedBook.title,
            authors: selectedBook.authors,
            cover_url: selectedBook.coverUrl,
            thumbnail_url: selectedBook.thumbnailUrl,
            description: selectedBook.description,
            published_date: selectedBook.publishedDate,
            page_count: selectedBook.pageCount,
            source: 'google_books',
          })
          .select('id')
          .single();

        if (insertError) {
          console.error('Error creating book in database:', insertError);
          showToast('Failed to add book. Please try again.', 'error');
          setIsAddingBook(false);
          return;
        }

        bookId = newBook.id;
        console.log('Book created successfully in database with ID:', bookId);
      } else if (existingBook) {
        // Book already exists in database - reuse it
        bookId = existingBook.id;
        console.log('STEP 2: Book FOUND in database with ID:', bookId);
      } else {
        console.error('Error fetching book from database:', fetchError);
        showToast('Failed to add book. Please try again.', 'error');
        setIsAddingBook(false);
        return;
      }

      // STEP 3: Check if user already has this book in their library
      console.log('STEP 3: Checking if user already has this book...');
      const { data: existingUserBook } = await supabase
        .from('user_books')
        .select('id')
        .eq('child_id', selectedChild.id)
        .eq('book_id', bookId)
        .single();

      if (existingUserBook) {
        console.log('User already has this book in their library');
        showToast('This book is already in your library.', 'info');
        setSelectedBook(null);
        setIsAddingBook(false);
        
        // Navigate back to books screen after a short delay
        setTimeout(() => {
          router.back();
        }, 1500);
        return;
      }

      // STEP 4: Create user_book relationship
      console.log('STEP 4: Adding book to user library...');
      const { error: relationError } = await supabase
        .from('user_books')
        .insert({
          child_id: selectedChild.id,
          book_id: bookId,
          user_id: currentUserId,
          is_custom_for_user: false,
        });

      if (relationError) {
        console.error('Error adding book to user library:', relationError);
        showToast('Failed to add book to library. Please try again.', 'error');
        setIsAddingBook(false);
        return;
      }

      console.log('Book added to user library successfully');
      console.log('=== ADDING BOOK PROCESS COMPLETED ===');

      // EXPO GO FIX: Add delay before refreshing stats to ensure database consistency
      console.log('📊 Waiting for database to commit changes...');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Silently refresh profile stats in the background (now awaited)
      console.log('📊 Silently refreshing profile stats after book addition');
      await Promise.all([
        refreshStats(),
        fetchProfileStats(),
      ]);

      // Show success message
      showToast('Book added to your library!', 'success');
      
      // EXPO GO FIX: Longer delay before navigating back to allow stats to update
      // IMPORTANT: Pass bookAdded parameter to trigger refresh on Books page
      setTimeout(() => {
        console.log('🔄 Navigating back to Books page with bookAdded=true parameter');
        router.push('/(tabs)/books?bookAdded=true');
      }, 2000);
    } catch (error) {
      console.error('Error in handleAddToLibrary:', error);
      showToast('An unexpected error occurred. Please try again.', 'error');
    } finally {
      // Reset the flag after a short delay to prevent rapid re-additions
      addBookTimeoutRef.current = setTimeout(() => {
        console.log('Resetting isAddingBook flag');
        setIsAddingBook(false);
      }, 2000);
    }
  };

  const handleSearchAgain = () => {
    console.log('Search again clicked');
    setSelectedBook(null);
    setIsCoverLoading(false);
    setShowDropdown(searchResults.length > 0);
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 100);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setShowDropdown(false);
    searchInputRef.current?.focus();
  };

  const handleTapOutside = () => {
    if (showDropdown) {
      setShowDropdown(false);
      Keyboard.dismiss();
    }
  };

  const handleOpenCustomBook = () => {
    if (!selectedChild) {
      showToast('Please select a child before adding books.', 'warning');
      return;
    }
    if (!currentUserId) {
      showToast('User not authenticated.', 'error');
      return;
    }
    addCustomBookBottomSheetRef.current?.present();
  };

  const handleCustomBookAdded = () => {
    showToast('Custom book added successfully!', 'success');
    setTimeout(() => {
      console.log('🔄 Navigating back to Books page with bookAdded=true parameter');
      router.push('/(tabs)/books?bookAdded=true');
    }, 1500);
  };

  const handleCoverLoad = () => {
    console.log('Cover image loaded successfully');
    setIsCoverLoading(false);
  };

  const handleCoverError = () => {
    console.log('Cover image failed to load');
    setIsCoverLoading(false);
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

        {/* Add Custom Book Button */}
        <View style={styles.customBookButtonContainer}>
          <TouchableOpacity
            style={styles.customBookButton}
            onPress={handleOpenCustomBook}
            activeOpacity={0.7}
          >
            <IconSymbol
              ios_icon_name="plus.circle.fill"
              android_material_icon_name="add-circle"
              size={20}
              color={colors.primary}
            />
            <Text style={styles.customBookButtonText}>Add custom book</Text>
          </TouchableOpacity>
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
            {!isSearching && searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={handleClearSearch}
                style={styles.clearButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <IconSymbol
                  ios_icon_name="xmark.circle.fill"
                  android_material_icon_name="cancel"
                  size={20}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <TouchableWithoutFeedback onPress={handleTapOutside}>
          <View style={styles.contentArea}>
            {/* Loading Details State */}
            {isLoadingDetails && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Loading book details...</Text>
              </View>
            )}

            {/* Selected Book Details */}
            {!isLoadingDetails && selectedBook && (
              <ScrollView 
                style={styles.selectedBookContainer}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.selectedBookContent}
              >
                <View style={styles.selectedBookCard}>
                  {/* Book Cover with Loading State */}
                  <View style={styles.selectedBookCoverContainer}>
                    {selectedBook.coverUrl || selectedBook.thumbnailUrl ? (
                      <View style={styles.coverWrapper}>
                        {isCoverLoading && (
                          <View style={styles.coverLoadingOverlay}>
                            <ActivityIndicator size="large" color={colors.primary} />
                            <Text style={styles.coverLoadingText}>Loading cover...</Text>
                          </View>
                        )}
                        <Image
                          source={{ uri: getFirstValidImageUrl([selectedBook.coverUrl, selectedBook.thumbnailUrl]) }}
                          style={[styles.selectedBookCover, isCoverLoading && styles.hiddenCover]}
                          contentFit="cover"
                          cachePolicy="memory-disk"
                          priority="high"
                          transition={300}
                          onLoad={handleCoverLoad}
                          onError={handleCoverError}
                        />
                      </View>
                    ) : (
                      <View style={[styles.selectedBookCover, styles.selectedPlaceholderCover]}>
                        <Text style={styles.selectedPlaceholderText} numberOfLines={3}>
                          {selectedBook.title}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Book Info */}
                  <View style={styles.selectedBookInfo}>
                    <Text style={styles.selectedBookTitle}>{selectedBook.title}</Text>
                    <Text style={styles.selectedBookAuthor}>{selectedBook.authors}</Text>
                    
                    {selectedBook.publishedDate && (
                      <Text style={styles.selectedBookMeta}>
                        Published: {selectedBook.publishedDate}
                      </Text>
                    )}
                    
                    {selectedBook.pageCount > 0 && (
                      <Text style={styles.selectedBookMeta}>
                        Pages: {selectedBook.pageCount}
                      </Text>
                    )}
                  </View>

                  {/* Action Buttons */}
                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.addButton]}
                      onPress={handleAddToLibrary}
                      disabled={isAddingBook}
                      activeOpacity={0.7}
                    >
                      {isAddingBook ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <>
                          <IconSymbol
                            ios_icon_name="plus.circle.fill"
                            android_material_icon_name="add-circle"
                            size={20}
                            color="#FFFFFF"
                          />
                          <Text style={styles.addButtonText}>Add to Library</Text>
                        </>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.actionButton, styles.searchAgainButton]}
                      onPress={handleSearchAgain}
                      disabled={isAddingBook}
                      activeOpacity={0.7}
                    >
                      <IconSymbol
                        ios_icon_name="magnifyingglass"
                        android_material_icon_name="search"
                        size={20}
                        color={colors.primary}
                      />
                      <Text style={styles.searchAgainButtonText}>Search Again</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </ScrollView>
            )}

            {/* Search Results Dropdown - OPTIMIZED: Only shows title and author */}
            {!isLoadingDetails && !selectedBook && showDropdown && searchResults.length > 0 && (
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

            {/* Empty States */}
            {!isLoadingDetails && !selectedBook && !showDropdown && searchQuery.length === 0 && (
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

            {!isLoadingDetails && !selectedBook && !showDropdown && searchQuery.length > 0 && !isSearching && searchResults.length === 0 && (
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
          </View>
        </TouchableWithoutFeedback>
      </SafeAreaView>

      <ToastNotification
        visible={toastVisible}
        message={toastMessage}
        type={toastType}
        onHide={() => setToastVisible(false)}
      />

      {selectedChild && currentUserId && (
        <AddCustomBookBottomSheet
          ref={addCustomBookBottomSheetRef}
          onClose={() => console.log('Custom book bottom sheet closed')}
          onBookAdded={handleCustomBookAdded}
          childId={selectedChild.id}
          userId={currentUserId}
        />
      )}
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
  customBookButtonContainer: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  customBookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundAlt,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
  },
  customBookButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary,
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
  clearButton: {
    marginLeft: 8,
    padding: 4,
  },
  contentArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 16,
  },
  dropdown: {
    flex: 1,
    paddingHorizontal: 20,
  },
  dropdownItem: {
    padding: 16,
    backgroundColor: colors.backgroundAlt,
    borderRadius: 16,
    marginBottom: 12,
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
  selectedBookContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  selectedBookContent: {
    paddingBottom: 40,
  },
  selectedBookCard: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
  },
  selectedBookCoverContainer: {
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  coverWrapper: {
    position: 'relative',
    width: 200,
    height: 300,
  },
  selectedBookCover: {
    width: 200,
    height: 300,
    borderRadius: 12,
  },
  hiddenCover: {
    opacity: 0,
  },
  coverLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.backgroundAlt,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  coverLoadingText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 12,
  },
  selectedPlaceholderCover: {
    backgroundColor: '#EDEDFF',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  selectedPlaceholderText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
    textAlign: 'center',
  },
  selectedBookInfo: {
    width: '100%',
    marginBottom: 24,
  },
  selectedBookTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  selectedBookAuthor: {
    fontSize: 18,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: 16,
    textAlign: 'center',
  },
  selectedBookMeta: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
    textAlign: 'center',
  },
  actionButtons: {
    width: '100%',
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    gap: 8,
  },
  addButton: {
    backgroundColor: colors.primary,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  searchAgainButton: {
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  searchAgainButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
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
