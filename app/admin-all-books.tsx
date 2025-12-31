
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { HapticFeedback } from '@/utils/haptics';
import { supabase } from '@/app/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import BookDetailBottomSheet from '@/components/BookDetailBottomSheet';
import { getFirstValidImageUrl } from '@/utils/imageValidation';
import ValidatedImage from '@/components/ValidatedImage';
import { Image } from 'expo-image';

interface Book {
  id: string;
  title: string;
  authors: string | null;
  cover_url: string | null;
  thumbnail_url: string | null;
  source: string | null;
  created_at: string;
  google_books_id: string;
  description: string;
  published_date: string;
  page_count: number;
  active_request_count?: number;
  not_vibing_count?: number;
  like_it_count?: number;
  love_it_count?: number;
  recommend_count?: number;
}

interface UserBook {
  id: string;
  book_id: string;
  rating: string | null;
  tags: string[];
  would_recommend: boolean;
  book: Book;
}

const BOOKS_PER_PAGE = 40;

type SortOption = 'recent' | 'alphabetical' | 'most_requested';

// Bookmark component with PNG image
const Bookmark = () => (
  <View style={styles.bookmark}>
    <Image
      source={require('@/assets/images/bb1d0280-280e-49da-964e-cc8dac050425.png')}
      style={styles.bookmarkImage}
      contentFit="contain"
    />
  </View>
);

export default function AdminAllBooksScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [books, setBooks] = useState<Book[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalBooks, setTotalBooks] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedBook, setSelectedBook] = useState<UserBook | null>(null);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const bookDetailRef = useRef<BottomSheetModal>(null);

  useEffect(() => {
    checkAdminStatusAndFetchBooks();
  }, [user, currentPage, sortBy]);

  const checkAdminStatusAndFetchBooks = async () => {
    if (!user) {
      console.log('AdminAllBooks: No user, redirecting...');
      router.replace('/(tabs)/profile');
      return;
    }

    try {
      console.log('AdminAllBooks: Checking admin status for user:', user.id);
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('AdminAllBooks: Error checking admin status:', error);
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      const adminStatus = data?.role === 'admin';
      console.log('AdminAllBooks: Admin status:', adminStatus);
      setIsAdmin(adminStatus);

      if (!adminStatus) {
        console.log('AdminAllBooks: User is not admin, redirecting...');
        HapticFeedback.warning();
        router.replace('/(tabs)/profile');
        return;
      }

      // Fetch books if admin
      await fetchBooks();
    } catch (err) {
      console.error('AdminAllBooks: Unexpected error:', err);
      setIsAdmin(false);
      setLoading(false);
    }
  };

  const fetchBooks = async () => {
    try {
      console.log('AdminAllBooks: Fetching books, page:', currentPage, 'sort:', sortBy);
      
      const from = (currentPage - 1) * BOOKS_PER_PAGE;
      const to = from + BOOKS_PER_PAGE - 1;

      // Get total count
      const { count } = await supabase
        .from('admin_book_stats')
        .select('*', { count: 'exact', head: true });

      setTotalBooks(count || 0);

      // Build query with sorting
      let query = supabase
        .from('admin_book_stats')
        .select('*');

      // Apply sorting
      if (sortBy === 'alphabetical') {
        query = query.order('title', { ascending: true });
      } else if (sortBy === 'most_requested') {
        query = query.order('active_request_count', { ascending: false, nullsFirst: false });
      } else {
        // Default: recent
        query = query.order('created_at', { ascending: false });
      }

      // Apply pagination
      query = query.range(from, to);

      const { data, error } = await query;

      if (error) {
        console.error('AdminAllBooks: Error fetching books:', error);
        return;
      }

      console.log('AdminAllBooks: Fetched', data?.length || 0, 'books');
      setBooks(data || []);
    } catch (err) {
      console.error('AdminAllBooks: Unexpected error fetching books:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const onRefresh = useCallback(async () => {
    HapticFeedback.light();
    setRefreshing(true);
    setCurrentPage(1);
    await fetchBooks();
    setRefreshing(false);
    HapticFeedback.success();
  }, [sortBy]);

  const handleGoBack = () => {
    HapticFeedback.medium();
    router.back();
  };

  const handleNextPage = () => {
    if (currentPage * BOOKS_PER_PAGE < totalBooks) {
      HapticFeedback.medium();
      setLoadingMore(true);
      setCurrentPage(prev => prev + 1);
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      HapticFeedback.medium();
      setLoadingMore(true);
      setCurrentPage(prev => prev - 1);
    }
  };

  const handleSortChange = (newSort: SortOption) => {
    HapticFeedback.light();
    setSortBy(newSort);
    setShowSortMenu(false);
    setCurrentPage(1);
    setLoadingMore(true);
  };

  const handleBookPress = (book: Book) => {
    console.log('AdminAllBooks: Book pressed:', book.title);
    HapticFeedback.medium();
    
    // Create a UserBook object for the bottom sheet
    // Since this is admin view, we don't have user-specific data
    const userBook: UserBook = {
      id: book.id, // Using book id as placeholder
      book_id: book.id,
      rating: null,
      tags: [],
      would_recommend: false,
      book: {
        ...book,
        // Pass the stats to the bottom sheet
        not_vibing_count: book.not_vibing_count || 0,
        like_it_count: book.like_it_count || 0,
        love_it_count: book.love_it_count || 0,
        recommend_count: book.recommend_count || 0,
        active_request_count: book.active_request_count || 0,
      },
    };
    
    setSelectedBook(userBook);
    setTimeout(() => {
      bookDetailRef.current?.present();
    }, 50);
  };

  const handleCloseBookDetail = () => {
    console.log('AdminAllBooks: Closing book detail modal');
    setSelectedBook(null);
  };

  const handleImageValidationFailed = useCallback((bookId: string) => {
    console.log('AdminAllBooks: Image validation failed for book:', bookId);
    setImageErrors(prev => new Set(prev).add(bookId));
  }, []);

  const getImageUrl = useCallback((book: Book) => {
    // Use the same logic as Books page - cover_url first, then thumbnail_url
    const validUrl = getFirstValidImageUrl([
      book.cover_url,
      book.thumbnail_url
    ]);

    // Check if the URL has already failed validation
    if (validUrl && !imageErrors.has(book.id)) {
      return validUrl;
    }

    return null;
  }, [imageErrors]);

  const getSortLabel = () => {
    switch (sortBy) {
      case 'alphabetical':
        return 'A-Z';
      case 'most_requested':
        return 'Most Requested';
      default:
        return 'Recent';
    }
  };

  const totalPages = Math.ceil(totalBooks / BOOKS_PER_PAGE);

  if (loading) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.buttonBlue} />
            <Text style={styles.loadingText}>Loading books...</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  if (isAdmin === false) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={styles.errorContainer}>
            <IconSymbol 
              ios_icon_name="exclamationmark.triangle.fill" 
              android_material_icon_name="error" 
              size={48} 
              color={colors.textSecondary} 
            />
            <Text style={styles.errorText}>Access Denied</Text>
            <Text style={styles.errorSubtext}>You do not have admin privileges</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
            <IconSymbol 
              ios_icon_name="chevron.left" 
              android_material_icon_name="arrow-back" 
              size={24} 
              color={colors.primary} 
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>All Books</Text>
          <TouchableOpacity 
            style={styles.sortButton} 
            onPress={() => {
              HapticFeedback.light();
              setShowSortMenu(!showSortMenu);
            }}
          >
            <IconSymbol 
              ios_icon_name="arrow.up.arrow.down" 
              android_material_icon_name="sort" 
              size={24} 
              color={colors.primary} 
            />
          </TouchableOpacity>
        </View>

        {/* Sort Menu */}
        {showSortMenu && (
          <View style={styles.sortMenu}>
            <TouchableOpacity
              style={[styles.sortMenuItem, sortBy === 'recent' && styles.sortMenuItemActive]}
              onPress={() => handleSortChange('recent')}
            >
              <Text style={[styles.sortMenuText, sortBy === 'recent' && styles.sortMenuTextActive]}>
                Recent
              </Text>
              {sortBy === 'recent' && (
                <IconSymbol 
                  ios_icon_name="checkmark" 
                  android_material_icon_name="check" 
                  size={20} 
                  color={colors.backgroundAlt} 
                />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sortMenuItem, sortBy === 'alphabetical' && styles.sortMenuItemActive]}
              onPress={() => handleSortChange('alphabetical')}
            >
              <Text style={[styles.sortMenuText, sortBy === 'alphabetical' && styles.sortMenuTextActive]}>
                Alphabetical (A-Z)
              </Text>
              {sortBy === 'alphabetical' && (
                <IconSymbol 
                  ios_icon_name="checkmark" 
                  android_material_icon_name="check" 
                  size={20} 
                  color={colors.backgroundAlt} 
                />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sortMenuItem, sortBy === 'most_requested' && styles.sortMenuItemActive]}
              onPress={() => handleSortChange('most_requested')}
            >
              <Text style={[styles.sortMenuText, sortBy === 'most_requested' && styles.sortMenuTextActive]}>
                Most Requested
              </Text>
              {sortBy === 'most_requested' && (
                <IconSymbol 
                  ios_icon_name="checkmark" 
                  android_material_icon_name="check" 
                  size={20} 
                  color={colors.backgroundAlt} 
                />
              )}
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.statsBar}>
          <Text style={styles.statsText}>
            Total: {totalBooks} books • Page {currentPage} of {totalPages} • Sort: {getSortLabel()}
          </Text>
        </View>

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        >
          {loadingMore ? (
            <View style={styles.loadingMoreContainer}>
              <ActivityIndicator size="large" color={colors.buttonBlue} />
              <Text style={styles.loadingText}>Loading page {currentPage}...</Text>
            </View>
          ) : (
            <>
              <View style={styles.booksGrid}>
                {books.map((book, index) => {
                  const imageUrl = getImageUrl(book);
                  const hasRequests = (book.active_request_count || 0) > 0;
                  
                  return (
                    <TouchableOpacity
                      key={index}
                      style={styles.bookCard}
                      onPress={() => handleBookPress(book)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.bookCoverContainer}>
                        {imageUrl ? (
                          <ValidatedImage
                            source={{ uri: imageUrl }}
                            style={styles.bookCover}
                            fallbackTitle={book.title}
                            minWidth={50}
                            minHeight={50}
                            contentFit="contain"
                            cachePolicy="memory-disk"
                            priority="high"
                            transition={200}
                            onValidationFailed={() => handleImageValidationFailed(book.id)}
                          />
                        ) : (
                          <View style={[styles.bookCover, styles.placeholderCover]}>
                            <Bookmark />
                            <Text style={styles.placeholderText} numberOfLines={4}>
                              {book.title}
                            </Text>
                          </View>
                        )}
                      </View>
                      
                      {/* Request Pill */}
                      {hasRequests && (
                        <View style={styles.requestPill}>
                          <IconSymbol 
                            ios_icon_name="photo" 
                            android_material_icon_name="image" 
                            size={12} 
                            color={colors.backgroundAlt} 
                          />
                          <Text style={styles.requestPillText}>
                            {book.active_request_count} {book.active_request_count === 1 ? 'request' : 'requests'}
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {books.length === 0 && (
                <View style={styles.emptyContainer}>
                  <IconSymbol 
                    ios_icon_name="book.closed" 
                    android_material_icon_name="menu-book" 
                    size={48} 
                    color={colors.textSecondary} 
                  />
                  <Text style={styles.emptyText}>No books found</Text>
                </View>
              )}
            </>
          )}
        </ScrollView>

        {totalPages > 1 && (
          <View style={styles.paginationContainer}>
            <TouchableOpacity 
              style={[styles.paginationButton, currentPage === 1 && styles.paginationButtonDisabled]}
              onPress={handlePreviousPage}
              disabled={currentPage === 1}
            >
              <IconSymbol 
                ios_icon_name="chevron.left" 
                android_material_icon_name="chevron-left" 
                size={20} 
                color={currentPage === 1 ? colors.textSecondary : colors.backgroundAlt} 
              />
              <Text style={[styles.paginationButtonText, currentPage === 1 && styles.paginationButtonTextDisabled]}>
                Previous
              </Text>
            </TouchableOpacity>

            <Text style={styles.paginationInfo}>
              {currentPage} / {totalPages}
            </Text>

            <TouchableOpacity 
              style={[styles.paginationButton, currentPage === totalPages && styles.paginationButtonDisabled]}
              onPress={handleNextPage}
              disabled={currentPage === totalPages}
            >
              <Text style={[styles.paginationButtonText, currentPage === totalPages && styles.paginationButtonTextDisabled]}>
                Next
              </Text>
              <IconSymbol 
                ios_icon_name="chevron.right" 
                android_material_icon_name="chevron-right" 
                size={20} 
                color={currentPage === totalPages ? colors.textSecondary : colors.backgroundAlt} 
              />
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>

      <BookDetailBottomSheet
        ref={bookDetailRef}
        userBook={selectedBook}
        onClose={handleCloseBookDetail}
        onRefresh={fetchBooks}
        isAdminView={true}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 16,
  },
  loadingMoreContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.primary,
    marginTop: 16,
  },
  errorSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.backgroundAlt,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.backgroundAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
  },
  sortButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.backgroundAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sortMenu: {
    backgroundColor: colors.backgroundAlt,
    marginHorizontal: 20,
    marginTop: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  sortMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.background,
  },
  sortMenuItemActive: {
    backgroundColor: colors.buttonBlue,
  },
  sortMenuText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  sortMenuTextActive: {
    color: colors.backgroundAlt,
  },
  statsBar: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: colors.backgroundAlt,
  },
  statsText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  booksGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  bookCard: {
    width: '47%',
    marginBottom: 16,
    overflow: 'visible',
    position: 'relative',
  },
  bookCoverContainer: {
    width: '100%',
    aspectRatio: 4 / 5,
  },
  bookCover: {
    width: '100%',
    height: '100%',
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
  },
  placeholderCover: {
    backgroundColor: '#FFD0A3',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    overflow: 'visible',
  },
  placeholderText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    textAlign: 'center',
  },
  requestPill: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    backgroundColor: colors.secondary,
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  requestPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.backgroundAlt,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 12,
  },
  paginationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.backgroundAlt,
    borderTopWidth: 1,
    borderTopColor: colors.background,
  },
  paginationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.buttonBlue,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 4,
  },
  paginationButtonDisabled: {
    backgroundColor: colors.backgroundAlt,
    borderWidth: 1,
    borderColor: colors.textSecondary,
  },
  paginationButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.backgroundAlt,
  },
  paginationButtonTextDisabled: {
    color: colors.textSecondary,
  },
  paginationInfo: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  bookmark: {
    position: 'absolute',
    top: 0,
    right: 16,
    width: 32,
    height: 48,
    zIndex: 10,
  },
  bookmarkImage: {
    width: '100%',
    height: '100%',
  },
});
