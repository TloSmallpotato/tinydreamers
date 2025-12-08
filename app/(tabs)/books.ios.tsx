
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
import { searchGoogleBooks, searchBookByISBN, BookSearchResult, getQuotaStatus } from '@/utils/googleBooksApi';
import BookDetailBottomSheet from '@/components/BookDetailBottomSheet';
import AddCustomBookBottomSheet from '@/components/AddCustomBookBottomSheet';
import BarcodeScannerModal from '@/components/BarcodeScannerModal';
import ISBNNotFoundModal from '@/components/ISBNNotFoundModal';
import ToastNotification from '@/components/ToastNotification';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';

interface SavedBook {
  id: string;
  book_id: string;
  rating: string | null;
  tags: string[];
  would_recommend: boolean;
  is_custom_for_user: boolean;
  cover_url_private: string | null;
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
    source: string;
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
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'info' | 'success' | 'warning' | 'error'>('info');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [signedUrls, setSignedUrls] = useState<Map<string, string>>(new Map());
  const [showISBNNotFoundModal, setShowISBNNotFoundModal] = useState(false);
  const [notFoundISBN, setNotFoundISBN] = useState('');
  
  const bookDetailRef = useRef<BottomSheetModal>(null);
  const addCustomBookRef = useRef<BottomSheetModal>(null);
  const searchInputRef = useRef<TextInput>(null);
  const hasProcessedAutoOpen = useRef(false);
  const addBookTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastClickedBookIdRef = useRef<string | null>(null);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  const checkQuotaStatus = useCallback(async () => {
    try {
      const status = await getQuotaStatus();
      if (status.exceeded) {
        showToast(
          `Google Custom Search quota exceeded. Using free alternatives for the next ${status.hoursUntilReset} hours.`,
          'warning'
        );
      }
    } catch (error) {
      console.error('Error checking quota status:', error);
    }
  }, [showToast]);

  // Check quota status on mount
  useEffect(() => {
    checkQuotaStatus();
  }, [checkQuotaStatus]);

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
      console.log('[iOS] useFocusEffect - autoOpen:', autoOpen, 'hasProcessedAutoOpen:', hasProcessedAutoOpen.current);
      
      if (autoOpen === 'true' && !hasProcessedAutoOpen.current) {
        console.log('[iOS] autoOpen parameter detected - focusing book search input');
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
        console.log('[iOS] Leaving books screen - resetting hasProcessedAutoOpen flag');
        hasProcessedAutoOpen.current = false;
      };
    }, [params.autoOpen, router])
  );

  // Reset the flag when search input loses focus (modal closed)
  const handleSearchBlur = useCallback(() => {
    console.log('[iOS] Search input blurred - resetting hasProcessedAutoOpen flag');
    hasProcessedAutoOpen.current = false;
  }, []);

  // Handle focus trigger from Add modal (legacy method)
  useEffect(() => {
    if (shouldFocusBookSearch) {
      console.log('[iOS] Focusing book search input from context');
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 300);
      resetBookSearch();
    }
  }, [shouldFocusBookSearch, resetBookSearch]);

  // Generate signed URLs for private covers
  const generateSignedUrl = useCallback(async (path: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase.storage
        .from('user-covers')
        .createSignedUrl(path, 3600); // 1 hour expiry

      if (error) {
        console.error('[iOS] Error generating signed URL:', error);
        return null;
      }

      return data.signedUrl;
    } catch (error) {
      console.error('[iOS] Error in generateSignedUrl:', error);
      return null;
    }
  }, []);

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
          is_custom_for_user,
          cover_url_private,
          book:books_library (
            id,
            google_books_id,
            title,
            authors,
            cover_url,
            thumbnail_url,
            description,
            published_date,
            page_count,
            source
          )
        `)
        .eq('child_id', selectedChild.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[iOS] Error fetching books:', error);
        return;
      }

      console.log('[iOS] Fetched books count:', data?.length || 0);
      setSavedBooks(data || []);

      // Generate signed URLs for custom books with private covers
      const urlMap = new Map<string, string>();
      for (const book of data || []) {
        if (book.is_custom_for_user && book.cover_url_private) {
          const signedUrl = await generateSignedUrl(book.cover_url_private);
          if (signedUrl) {
            urlMap.set(book.id, signedUrl);
          }
        }
      }
      setSignedUrls(urlMap);
    } catch (error) {
      console.error('[iOS] Error in fetchSavedBooks:', error);
    } finally {
      setIsLoadingBooks(false);
    }
  }, [selectedChild, generateSignedUrl]);

  useEffect(() => {
    fetchSavedBooks();
  }, [fetchSavedBooks]);

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

      // Refresh the books list
      await fetchSavedBooks();

      // Clear search
      setSearchQuery('');
      setShowDropdown(false);
      Keyboard.dismiss();

      // Show success message
      showToast('Book added to your library!', 'success');
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

  const handleBarcodeScanned = async (isbn: string) => {
    console.log('[iOS] ISBN scanned:', isbn);
    
    // Prevent duplicate processing
    if (isAddingBook) {
      console.log('[iOS] Already adding a book - ignoring barcode scan');
      return;
    }
    
    if (!selectedChild) {
      showToast('Please select a child before adding books.', 'warning');
      return;
    }

    // Set flag immediately
    setIsAddingBook(true);
    setIsSearching(true);

    try {
      console.log('[iOS] Searching for book by ISBN...');
      // Search for book by ISBN - this will use fallback methods if quota exceeded
      const book = await searchBookByISBN(isbn);

      if (!book) {
        // Book not found - show options modal
        console.log('[iOS] Book not found - showing options modal');
        setNotFoundISBN(isbn);
        setShowISBNNotFoundModal(true);
        setIsSearching(false);
        setIsAddingBook(false);
        return;
      }

      console.log('[iOS] Book found by ISBN:', book.title);
      // Add the book
      await handleSelectBook(book);
    } catch (error) {
      console.error('[iOS] Error handling barcode scan:', error);
      showToast('An error occurred while searching for the book. Please try again.', 'error');
      setIsAddingBook(false);
    } finally {
      setIsSearching(false);
    }
  };

  const handleManualISBNSubmit = async (isbn: string) => {
    console.log('[iOS] Manual ISBN submitted:', isbn);
    
    if (!selectedChild) {
      showToast('Please select a child before adding books.', 'warning');
      return;
    }

    setIsAddingBook(true);
    setIsSearching(true);

    try {
      console.log('[iOS] Searching for book by manual ISBN...');
      const book = await searchBookByISBN(isbn);

      if (!book) {
        // Still not found - update the modal to show manual input mode with this ISBN
        console.log('[iOS] Book still not found - staying in modal');
        setNotFoundISBN(isbn);
        setIsSearching(false);
        setIsAddingBook(false);
        showToast('Book not found. You can add it as a custom book.', 'warning');
        return;
      }

      console.log('[iOS] Book found by manual ISBN:', book.title);
      // Close the modal
      setShowISBNNotFoundModal(false);
      // Add the book
      await handleSelectBook(book);
    } catch (error) {
      console.error('[iOS] Error handling manual ISBN:', error);
      showToast('An error occurred while searching for the book. Please try again.', 'error');
      setIsAddingBook(false);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddCustomBookFromModal = (isbn?: string) => {
    console.log('[iOS] Add custom book from modal, ISBN:', isbn);
    
    // Close the ISBN not found modal
    setShowISBNNotFoundModal(false);
    
    // Open the custom book bottom sheet with ISBN prefilled
    setTimeout(() => {
      addCustomBookRef.current?.present();
    }, 300);
  };

  const handleAddCustomBook = useCallback(() => {
    if (!selectedChild) {
      showToast('Please select a child before adding books.', 'warning');
      return;
    }

    if (!currentUserId) {
      showToast('Please wait while we load your profile.', 'warning');
      return;
    }

    // Close search dropdown
    setShowDropdown(false);
    Keyboard.dismiss();

    // Open custom book bottom sheet
    addCustomBookRef.current?.present();
  }, [selectedChild, currentUserId, showToast]);

  const handleBookPress = useCallback((book: SavedBook) => {
    console.log('[iOS] Book pressed:', book.book.title, 'Modal open:', isModalOpen, 'Last clicked:', lastClickedBookIdRef.current);
    
    // If modal is already open, ignore the press
    if (isModalOpen) {
      console.log('[iOS] Modal already open - ignoring press');
      return;
    }

    // If clicking the same book within 500ms, ignore (debounce)
    if (lastClickedBookIdRef.current === book.id) {
      console.log('[iOS] Same book clicked within debounce period - ignoring');
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
    console.log('[iOS] Closing book detail modal');
    setSelectedBook(null);
    setIsModalOpen(false);
    lastClickedBookIdRef.current = null;
  };

  const handleImageError = (bookId: string) => {
    console.log('[iOS] Image failed to load for book:', bookId);
    setImageErrors(prev => new Set(prev).add(bookId));
  };

  const getImageUrl = (book: SavedBook) => {
    // For custom books with private covers, use signed URL
    if (book.is_custom_for_user && book.cover_url_private) {
      const signedUrl = signedUrls.get(book.id);
      if (signedUrl) {
        return signedUrl;
      }
    }

    // For regular books, try cover_url first, then thumbnail_url as fallback
    if (book.book.cover_url && !imageErrors.has(book.book.id)) {
      return book.book.cover_url;
    }
    if (book.book.thumbnail_url && !imageErrors.has(`${book.book.id}-thumb`)) {
      return book.book.thumbnail_url;
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
            <View style={styles.headerRow}>
              <View style={styles.headerLeft}>
                <Text style={commonStyles.title}>Books</Text>
                <Text style={commonStyles.subtitle}>
                  {selectedChild ? `${selectedChild.name}'s library` : 'Select a child'}
                </Text>
              </View>
              
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {savedBooks.length} {savedBooks.length === 1 ? 'book' : 'books'}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.searchContainer}>
            <View style={styles.searchRow}>
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
                            onError={() => console.log('[iOS] Dropdown image error:', book.title)}
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
                  
                  {/* Add Custom Book Option */}
                  <TouchableOpacity
                    style={[styles.dropdownItem, styles.addCustomBookItem]}
                    onPress={handleAddCustomBook}
                  >
                    <View style={styles.addCustomBookIcon}>
                      <IconSymbol
                        ios_icon_name="plus.circle.fill"
                        android_material_icon_name="add-circle"
                        size={32}
                        color={colors.buttonBlue}
                      />
                    </View>
                    <View style={styles.bookInfo}>
                      <Text style={styles.addCustomBookText}>
                        Add custom book
                      </Text>
                      <Text style={styles.addCustomBookSubtext}>
                        {searchQuery ? `"${searchQuery}"` : 'Create your own entry'}
                      </Text>
                    </View>
                  </TouchableOpacity>
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
                const imageUrl = getImageUrl(savedBook);
                console.log('[iOS] Rendering book:', savedBook.book.title, 'Image URL:', imageUrl);
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
                        contentFit="cover"
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
                    {savedBook.is_custom_for_user && (
                      <View style={styles.customBadge}>
                        <Text style={styles.customBadgeText}>Custom</Text>
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

      <AddCustomBookBottomSheet
        ref={addCustomBookRef}
        prefillTitle={searchQuery}
        prefillISBN={notFoundISBN}
        onClose={() => {
          console.log('[iOS] Custom book bottom sheet closed');
          setNotFoundISBN('');
        }}
        onBookAdded={fetchSavedBooks}
        childId={selectedChild?.id || ''}
        userId={currentUserId || ''}
      />

      <ISBNNotFoundModal
        visible={showISBNNotFoundModal}
        scannedISBN={notFoundISBN}
        onClose={() => {
          setShowISBNNotFoundModal(false);
          setNotFoundISBN('');
        }}
        onManualISBNSubmit={handleManualISBNSubmit}
        onAddCustomBook={handleAddCustomBookFromModal}
        isSearching={isSearching}
      />

      <BarcodeScannerModal
        visible={showScanner}
        onClose={() => setShowScanner(false)}
        onBarcodeScanned={handleBarcodeScanned}
      />

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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flex: 1,
  },
  badge: {
    backgroundColor: colors.accent,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginLeft: 12,
  },
  badgeText: {
    color: colors.backgroundAlt,
    fontSize: 14,
    fontWeight: '600',
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
    width: '100%',
  },
  searchBarWrapper: {
    flex: 1,
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
  cameraButton: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.15)',
    elevation: 4,
    flexShrink: 0,
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
  addCustomBookItem: {
    backgroundColor: colors.background,
    borderBottomWidth: 0,
  },
  addCustomBookIcon: {
    marginRight: 12,
    width: 50,
    height: 75,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addCustomBookText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.buttonBlue,
    marginBottom: 4,
  },
  addCustomBookSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  bookCoverContainer: {
    marginRight: 12,
    backgroundColor: colors.background,
    borderRadius: 16,
    overflow: 'hidden',
  },
  bookCoverSmall: {
    width: 50,
    height: 75,
    borderRadius: 16,
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
    position: 'relative',
  },
  bookCoverLarge: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
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
  customBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: colors.buttonBlue,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  customBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.backgroundAlt,
  },
});
