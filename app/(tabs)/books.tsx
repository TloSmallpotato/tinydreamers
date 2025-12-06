
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
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { colors, commonStyles } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { useChild } from '@/contexts/ChildContext';
import { useAddNavigation } from '@/contexts/AddNavigationContext';
import { supabase } from '@/app/integrations/supabase/client';
import { searchGoogleBooks, searchBookByISBN, BookSearchResult } from '@/utils/googleBooksApi';
import BookDetailBottomSheet from '@/components/BookDetailBottomSheet';
import BarcodeScannerModal from '@/components/BarcodeScannerModal';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';

interface SavedBook {
  id: string;
  book_id: string;
  rating: string | null;
  tags: string[];
  would_recommend: boolean;
  book: {
    id: string;
    google_books_id: string;
    title: string;
    authors: string;
    cover_url: string;
    thumbnail_url: string;
    description: string;
    published_date: string;
    page_count: number;
  };
}

export default function BooksScreen() {
  const { selectedChild } = useChild();
  const { shouldFocusBookSearch, resetBookSearch } = useAddNavigation();
  const params = useLocalSearchParams();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<BookSearchResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [savedBooks, setSavedBooks] = useState<SavedBook[]>([]);
  const [isLoadingBooks, setIsLoadingBooks] = useState(true);
  const [selectedBook, setSelectedBook] = useState<SavedBook | null>(null);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const [showScanner, setShowScanner] = useState(false);
  const [isAddingBook, setIsAddingBook] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const bookDetailRef = useRef<BottomSheetModal>(null);
  const searchInputRef = useRef<TextInput>(null);
  const hasProcessedAutoOpen = useRef(false);
  const addBookTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastClickedBookIdRef = useRef<string | null>(null);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (addBookTimeoutRef.current) {
        clearTimeout(addBookTimeoutRef.current);
      }
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
      }
    };
  }, []);

  // Handle autoOpen parameter from navigation - runs every time screen comes into focus
  useFocusEffect(
    useCallback(() => {
      const autoOpen = params.autoOpen;
      console.log('useFocusEffect - autoOpen:', autoOpen, 'hasProcessedAutoOpen:', hasProcessedAutoOpen.current);
      
      if (autoOpen === 'true' && !hasProcessedAutoOpen.current) {
        console.log('autoOpen parameter detected - focusing book search input');
        hasProcessedAutoOpen.current = true;
        
        // Clear the parameter immediately
        router.replace('/(tabs)/books');
        
        // Use requestAnimationFrame to ensure the screen is fully rendered
        requestAnimationFrame(() => {
          setTimeout(() => {
            searchInputRef.current?.focus();
          }, 100);
        });
      }
      
      // Reset the flag when leaving the screen
      return () => {
        console.log('Leaving books screen - resetting hasProcessedAutoOpen flag');
        hasProcessedAutoOpen.current = false;
      };
    }, [params.autoOpen, router])
  );

  // Reset the flag when search input loses focus (modal closed)
  const handleSearchBlur = useCallback(() => {
    console.log('Search input blurred - resetting hasProcessedAutoOpen flag');
    hasProcessedAutoOpen.current = false;
  }, []);

  // Handle focus trigger from Add modal (legacy method)
  useEffect(() => {
    if (shouldFocusBookSearch) {
      console.log('Focusing book search input from context');
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 300);
      resetBookSearch();
    }
  }, [shouldFocusBookSearch, resetBookSearch]);

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
        .from('user_books')
        .select(`
          id,
          book_id,
          rating,
          tags,
          would_recommend,
          book:books_library (
            id,
            google_books_id,
            title,
            authors,
            cover_url,
            thumbnail_url,
            description,
            published_date,
            page_count
          )
        `)
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
        console.log('Search results:', results.length, 'books found');
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
      console.log('Already adding a book - ignoring duplicate request');
      return;
    }

    if (!selectedChild) {
      console.log('No child selected');
      Alert.alert('No Child Selected', 'Please select a child before adding books.');
      return;
    }

    try {
      // Set flag to prevent duplicate additions
      setIsAddingBook(true);
      console.log('=== ADDING BOOK PROCESS STARTED ===');
      console.log('Book title:', book.title);
      console.log('Google Books ID:', book.googleBooksId);

      // STEP 1: Check if book exists in books_library database
      console.log('STEP 1: Checking if book exists in database...');
      let { data: existingBook, error: fetchError } = await supabase
        .from('books_library')
        .select('id, cover_url, thumbnail_url')
        .eq('google_books_id', book.googleBooksId)
        .single();

      let bookId: string;

      if (fetchError && fetchError.code === 'PGRST116') {
        // STEP 2: Book not found in database - create new entry
        console.log('STEP 2: Book NOT found in database. Creating new entry...');
        console.log('Cover URL from Google Custom Search:', book.coverUrl);
        console.log('Thumbnail URL from Google Custom Search:', book.thumbnailUrl);
        console.log('Source:', book.source);
        
        // The cover URLs have already been fetched via Google Custom Search API
        // in the googleBooksApi.ts file (cost: $0.005 per call)
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
          })
          .select('id')
          .single();

        if (insertError) {
          console.error('Error creating book in database:', insertError);
          Alert.alert('Error', 'Failed to add book. Please try again.');
          setIsAddingBook(false);
          return;
        }

        bookId = newBook.id;
        console.log('Book created successfully in database with ID:', bookId);
        console.log('Cover URLs saved to database:', {
          cover_url: book.coverUrl,
          thumbnail_url: book.thumbnailUrl,
        });
      } else if (existingBook) {
        // Book already exists in database - reuse it
        bookId = existingBook.id;
        console.log('STEP 2: Book FOUND in database with ID:', bookId);
        console.log('Existing cover URLs:', {
          cover_url: existingBook.cover_url,
          thumbnail_url: existingBook.thumbnail_url,
        });
        console.log('No Google Custom Search API call needed (saving $0.005)');
      } else {
        console.error('Error fetching book from database:', fetchError);
        Alert.alert('Error', 'Failed to add book. Please try again.');
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
        Alert.alert('Already Added', 'This book is already in your library.');
        setSearchQuery('');
        setShowDropdown(false);
        Keyboard.dismiss();
        setIsAddingBook(false);
        return;
      }

      // STEP 4: Create user_book relationship
      console.log('STEP 4: Adding book to user library...');
      const { error: relationError } = await supabase
        .from('user_books')
        .insert({
          child_id: selectedChild.id,
          book_id: bookId,
        });

      if (relationError) {
        console.error('Error adding book to user library:', relationError);
        Alert.alert('Error', 'Failed to add book to library. Please try again.');
        setIsAddingBook(false);
        return;
      }

      console.log('Book added to user library successfully');
      console.log('=== ADDING BOOK PROCESS COMPLETED ===');

      // Refresh the books list
      await fetchSavedBooks();

      // Clear search
      setSearchQuery('');
      setShowDropdown(false);
      Keyboard.dismiss();

      // Show success message
      Alert.alert('Success', 'Book added to your library!');
    } catch (error) {
      console.error('Error in handleSelectBook:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      // Reset the flag after a short delay to prevent rapid re-additions
      addBookTimeoutRef.current = setTimeout(() => {
        console.log('Resetting isAddingBook flag');
        setIsAddingBook(false);
      }, 2000);
    }
  };

  const handleBarcodeScanned = async (isbn: string) => {
    console.log('ISBN scanned:', isbn);
    
    // Prevent duplicate processing
    if (isAddingBook) {
      console.log('Already adding a book - ignoring barcode scan');
      return;
    }
    
    if (!selectedChild) {
      Alert.alert('No Child Selected', 'Please select a child before adding books.');
      return;
    }

    // Set flag immediately
    setIsAddingBook(true);
    setIsSearching(true);

    try {
      console.log('Searching for book by ISBN...');
      // Search for book by ISBN - this will call Google Custom Search API if needed
      const book = await searchBookByISBN(isbn);

      if (!book) {
        Alert.alert(
          'Book Not Found',
          'We couldn\'t find a book with this ISBN. Try searching manually or scanning a different barcode.',
          [{ text: 'OK' }]
        );
        setIsSearching(false);
        setIsAddingBook(false);
        return;
      }

      console.log('Book found by ISBN:', book.title);
      // Add the book (this will check DB first, then use the cover URLs from Google Custom Search)
      await handleSelectBook(book);
    } catch (error) {
      console.error('Error handling barcode scan:', error);
      Alert.alert('Error', 'An error occurred while searching for the book. Please try again.');
      setIsAddingBook(false);
    } finally {
      setIsSearching(false);
    }
  };

  const handleBookPress = useCallback((book: SavedBook) => {
    console.log('Book pressed:', book.book.title, 'Modal open:', isModalOpen, 'Last clicked:', lastClickedBookIdRef.current);
    
    // If modal is already open, ignore the press
    if (isModalOpen) {
      console.log('Modal already open - ignoring press');
      return;
    }

    // If clicking the same book within 500ms, ignore (debounce)
    if (lastClickedBookIdRef.current === book.id) {
      console.log('Same book clicked within debounce period - ignoring');
      return;
    }

    // Clear any existing timeout
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
    }

    // Set the last clicked book ID
    lastClickedBookIdRef.current = book.id;

    // Reset the last clicked book ID after 500ms
    clickTimeoutRef.current = setTimeout(() => {
      lastClickedBookIdRef.current = null;
    }, 500);

    // Set modal as opening
    setIsModalOpen(true);
    
    // Set the selected book
    setSelectedBook(book);
    
    // Use requestAnimationFrame to ensure state is set before presenting
    requestAnimationFrame(() => {
      bookDetailRef.current?.present();
    });
  }, [isModalOpen]);

  const handleCloseBookDetail = () => {
    console.log('Closing book detail modal');
    setSelectedBook(null);
    setIsModalOpen(false);
    lastClickedBookIdRef.current = null;
  };

  const handleImageError = (bookId: string) => {
    console.log('Image failed to load for book:', bookId);
    setImageErrors(prev => new Set(prev).add(bookId));
  };

  const getImageUrl = (book: SavedBook['book']) => {
    // Try cover_url first, then thumbnail_url as fallback
    if (book.cover_url && !imageErrors.has(book.id)) {
      return book.cover_url;
    }
    if (book.thumbnail_url && !imageErrors.has(`${book.id}-thumb`)) {
      return book.thumbnail_url;
    }
    return null;
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
            <View style={styles.searchRow}>
              <View style={commonStyles.searchBar}>
                <IconSymbol 
                  ios_icon_name="magnifyingglass" 
                  android_material_icon_name="search" 
                  size={20} 
                  color={colors.primary} 
                />
                <TextInput
                  ref={searchInputRef}
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
                  onBlur={handleSearchBlur}
                  editable={!isAddingBook}
                />
                {isSearching && (
                  <ActivityIndicator size="small" color={colors.primary} />
                )}
              </View>

              <TouchableOpacity
                style={[styles.cameraButton, isAddingBook && styles.cameraButtonDisabled]}
                onPress={() => setShowScanner(true)}
                activeOpacity={0.7}
                disabled={isAddingBook}
              >
                <IconSymbol
                  ios_icon_name="barcode.viewfinder"
                  android_material_icon_name="qr_code_scanner"
                  size={24}
                  color={isAddingBook ? colors.textSecondary : colors.backgroundAlt}
                />
              </TouchableOpacity>
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
                            onError={() => console.log('Dropdown image error:', book.title)}
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
              {savedBooks.map((savedBook, index) => {
                const imageUrl = getImageUrl(savedBook.book);
                return (
                  <TouchableOpacity
                    key={`${savedBook.id}-${index}`}
                    style={styles.bookCard}
                    onPress={() => handleBookPress(savedBook)}
                    activeOpacity={0.7}
                  >
                    {imageUrl ? (
                      <Image
                        source={{ uri: imageUrl }}
                        style={styles.bookCoverLarge}
                        contentFit="contain"
                        cachePolicy="memory-disk"
                        priority="high"
                        transition={200}
                        onError={() => handleImageError(savedBook.book.id)}
                      />
                    ) : (
                      <View style={[styles.bookCoverLarge, styles.placeholderCoverLarge]}>
                        <IconSymbol
                          ios_icon_name="book.fill"
                          android_material_icon_name="book"
                          size={48}
                          color={colors.textSecondary}
                        />
                        <Text style={styles.placeholderText} numberOfLines={3}>
                          {savedBook.book.title}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>

      <BookDetailBottomSheet
        ref={bookDetailRef}
        userBook={selectedBook}
        onClose={handleCloseBookDetail}
        onRefresh={fetchSavedBooks}
      />

      <BarcodeScannerModal
        visible={showScanner}
        onClose={() => setShowScanner(false)}
        onBarcodeScanned={handleBarcodeScanned}
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
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingTop: Platform.OS === 'android' ? 48 : 20,
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
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: colors.primary,
  },
  cameraButton: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.15)',
    elevation: 4,
  },
  cameraButtonDisabled: {
    backgroundColor: colors.backgroundAlt,
    opacity: 0.5,
  },
  dropdown: {
    position: 'absolute',
    top: 68,
    left: 0,
    right: 0,
    backgroundColor: colors.backgroundAlt,
    borderRadius: 16,
    maxHeight: 400,
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
    backgroundColor: colors.background,
    borderRadius: 8,
    overflow: 'hidden',
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
    marginBottom: 16,
    overflow: 'visible',
  },
  bookCoverLarge: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  placeholderCoverLarge: {
    backgroundColor: colors.backgroundAlt,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
  },
  placeholderText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
});
