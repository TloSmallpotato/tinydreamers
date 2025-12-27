
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Image, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { HapticFeedback } from '@/utils/haptics';
import { supabase } from '@/app/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Book {
  id: string;
  title: string;
  authors: string | null;
  cover_url: string | null;
  thumbnail_url: string | null;
  source: string | null;
  created_at: string;
}

const BOOKS_PER_PAGE = 40;

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

  useEffect(() => {
    checkAdminStatusAndFetchBooks();
  }, [user, currentPage]);

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
      console.log('AdminAllBooks: Fetching books, page:', currentPage);
      
      const from = (currentPage - 1) * BOOKS_PER_PAGE;
      const to = from + BOOKS_PER_PAGE - 1;

      // Get total count
      const { count } = await supabase
        .from('books_library')
        .select('*', { count: 'exact', head: true });

      setTotalBooks(count || 0);

      // Get paginated books
      const { data, error } = await supabase
        .from('books_library')
        .select('id, title, authors, cover_url, thumbnail_url, source, created_at')
        .order('created_at', { ascending: false })
        .range(from, to);

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
  }, []);

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
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.statsBar}>
          <Text style={styles.statsText}>
            Total: {totalBooks} books • Page {currentPage} of {totalPages}
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
                {books.map((book, index) => (
                  <View key={index} style={styles.bookCard}>
                    {book.thumbnail_url || book.cover_url ? (
                      <Image 
                        source={{ uri: book.thumbnail_url || book.cover_url || '' }}
                        style={styles.bookCover}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.bookPlaceholder}>
                        <IconSymbol 
                          ios_icon_name="book.fill" 
                          android_material_icon_name="menu-book" 
                          size={32} 
                          color={colors.textSecondary} 
                        />
                      </View>
                    )}
                    <View style={styles.bookInfo}>
                      <Text style={styles.bookTitle} numberOfLines={2}>
                        {book.title}
                      </Text>
                      {book.authors && (
                        <Text style={styles.bookAuthor} numberOfLines={1}>
                          {book.authors}
                        </Text>
                      )}
                      {book.source && (
                        <View style={styles.sourceTag}>
                          <Text style={styles.sourceText}>
                            {book.source === 'google_books' ? 'Google' : 
                             book.source === 'custom_global' ? 'Custom' : 
                             book.source === 'isbn_scan' ? 'ISBN' : book.source}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                ))}
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
  headerSpacer: {
    width: 40,
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
    gap: 12,
  },
  bookCard: {
    width: '48%',
    backgroundColor: colors.backgroundAlt,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
    elevation: 2,
  },
  bookCover: {
    width: '100%',
    height: 200,
    backgroundColor: colors.cardPurple,
  },
  bookPlaceholder: {
    width: '100%',
    height: 200,
    backgroundColor: colors.cardPurple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookInfo: {
    padding: 12,
  },
  bookTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 4,
  },
  bookAuthor: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  sourceTag: {
    alignSelf: 'flex-start',
    backgroundColor: colors.cardPink,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  sourceText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.primary,
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
});
