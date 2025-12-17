
import React, { forwardRef, useMemo, useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Dimensions, ScrollView } from 'react-native';
import { BottomSheetBackdrop, BottomSheetScrollView, BottomSheetModal } from '@gorhom/bottom-sheet';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { supabase } from '@/app/integrations/supabase/client';
import { Image } from 'expo-image';
import { useStats } from '@/contexts/StatsContext';
import * as Haptics from 'expo-haptics';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface Book {
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

interface UserBook {
  id: string;
  book_id: string;
  rating: string | null;
  tags: string[];
  would_recommend: boolean;
  book: Book;
}

interface BookDetailBottomSheetProps {
  userBook: UserBook | null;
  onClose: () => void;
  onRefresh: () => void;
}

type RatingType = 'not_vibing' | 'like_it' | 'love_it' | null;

const BookDetailBottomSheet = forwardRef<BottomSheetModal, BookDetailBottomSheetProps>(
  ({ userBook, onClose, onRefresh }, ref) => {
    const snapPoints = useMemo(() => [screenHeight * 0.85], []);
    const { decrementBookCount } = useStats();
    const [rating, setRating] = useState<RatingType>(null);
    const [wouldRecommend, setWouldRecommend] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [imageError, setImageError] = useState(false);

    // Cache the current book data to prevent flickering
    const [cachedUserBook, setCachedUserBook] = useState<UserBook | null>(null);

    // Update cached data when userBook changes
    useEffect(() => {
      if (userBook) {
        setCachedUserBook(userBook);
        setRating((userBook.rating as RatingType) || null);
        setWouldRecommend(userBook.would_recommend || false);
        setShowMenu(false);
        setImageError(false);
      }
    }, [userBook]);

    const updateBookData = useCallback(async (field: 'rating' | 'would_recommend', value: any) => {
      if (!cachedUserBook) return;

      try {
        const { error } = await supabase
          .from('user_books')
          .update({ [field]: value, updated_at: new Date().toISOString() })
          .eq('id', cachedUserBook.id);

        if (error) {
          console.error('Error updating book:', error);
          throw error;
        }

        onRefresh();
      } catch (error) {
        console.error('Error in updateBookData:', error);
        Alert.alert('Error', 'Failed to update book');
      }
    }, [cachedUserBook, onRefresh]);

    const handleRatingPress = useCallback(async (newRating: RatingType) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const finalRating = rating === newRating ? null : newRating;
      setRating(finalRating);
      await updateBookData('rating', finalRating);
    }, [rating, updateBookData]);

    const toggleRecommend = useCallback(async () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const newValue = !wouldRecommend;
      setWouldRecommend(newValue);
      await updateBookData('would_recommend', newValue);
    }, [wouldRecommend, updateBookData]);

    const deleteBook = useCallback(async () => {
      if (!cachedUserBook) return;

      try {
        console.log('BookDetailBottomSheet: Deleting book from database...');
        const { error } = await supabase
          .from('user_books')
          .delete()
          .eq('id', cachedUserBook.id);

        if (error) {
          console.error('Error deleting book:', error);
          throw error;
        }

        console.log('BookDetailBottomSheet: Book deleted successfully, updating stats...');
        // Update stats context immediately
        decrementBookCount();

        if (ref && typeof ref !== 'function' && ref.current) {
          ref.current.dismiss();
        }

        onRefresh();
        Alert.alert('Success', 'Book removed from library');
      } catch (error) {
        console.error('Error in deleteBook:', error);
        Alert.alert('Error', 'Failed to remove book');
      }
    }, [cachedUserBook, ref, onRefresh, decrementBookCount]);

    const handleDeleteBook = useCallback(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setShowMenu(false);
      
      Alert.alert(
        'Remove Book',
        `Remove "${cachedUserBook?.book.title}" from library? This action cannot be undone.`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: async () => {
              await deleteBook();
            },
          },
        ]
      );
    }, [cachedUserBook, deleteBook]);

    const handleMenuPress = () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setShowMenu(!showMenu);
    };

    const renderBackdrop = useCallback(
      (props: any) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          opacity={0.5}
          pressBehavior="close"
        />
      ),
      []
    );

    const handleDismiss = useCallback(() => {
      setShowMenu(false);
      onClose();
    }, [onClose]);

    const handleImageError = useCallback(() => {
      console.log('Image failed to load in detail view');
      setImageError(true);
    }, []);

    const getImageUrl = useCallback(() => {
      if (!cachedUserBook) return null;
      const book = cachedUserBook.book;
      
      // Try cover_url first, then thumbnail_url as fallback
      if (book.cover_url && !imageError) {
        return book.cover_url;
      }
      if (book.thumbnail_url) {
        return book.thumbnail_url;
      }
      return null;
    }, [cachedUserBook, imageError]);

    // Don't return null - keep the component mounted with cached data
    if (!cachedUserBook) return null;

    const book = cachedUserBook.book;
    const imageUrl = getImageUrl();

    return (
      <BottomSheetModal
        ref={ref}
        index={0}
        snapPoints={snapPoints}
        enablePanDownToClose={true}
        enableDismissOnClose={true}
        enableDynamicSizing={false}
        backdropComponent={renderBackdrop}
        backgroundStyle={styles.bottomSheetBackground}
        handleIndicatorStyle={styles.handleIndicator}
        onDismiss={handleDismiss}
        animateOnMount={true}
        enableContentPanningGesture={true}
      >
        <BottomSheetScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.contentContainer}
        >
          {/* Header with Menu */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Book Details</Text>
            <TouchableOpacity
              style={styles.menuButton}
              onPress={handleMenuPress}
            >
              <IconSymbol
                ios_icon_name="ellipsis.circle"
                android_material_icon_name="more-vert"
                size={28}
                color={colors.primary}
              />
            </TouchableOpacity>
          </View>

          {/* Menu Dropdown */}
          {showMenu && (
            <View style={styles.menuDropdown}>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={handleDeleteBook}
              >
                <IconSymbol
                  ios_icon_name="trash"
                  android_material_icon_name="delete"
                  size={20}
                  color={colors.secondary}
                />
                <Text style={styles.menuItemText}>Delete Book</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Book Cover */}
          <View style={styles.coverContainer}>
            {imageUrl ? (
              <Image
                source={{ uri: imageUrl }}
                style={styles.bookCover}
                contentFit="contain"
                cachePolicy="memory-disk"
                priority="high"
                transition={200}
                onError={handleImageError}
              />
            ) : (
              <View style={[styles.bookCover, styles.placeholderCover]}>
                <IconSymbol
                  ios_icon_name="book.fill"
                  android_material_icon_name="book"
                  size={80}
                  color={colors.textSecondary}
                />
                <Text style={styles.placeholderTitle} numberOfLines={3}>
                  {book.title}
                </Text>
              </View>
            )}
          </View>

          {/* Book Info */}
          <View style={styles.bookInfo}>
            <Text style={styles.bookTitle}>{book.title}</Text>
            <Text style={styles.bookAuthor}>{book.authors}</Text>
            {book.published_date && (
              <Text style={styles.bookMeta}>Published: {book.published_date}</Text>
            )}
            {book.page_count > 0 && (
              <Text style={styles.bookMeta}>{book.page_count} pages</Text>
            )}
          </View>

          {/* Rating - Moved above description */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>How did your kids like it?</Text>
            <View style={styles.ratingContainer}>
              <TouchableOpacity
                style={[
                  styles.ratingButton,
                  rating === 'not_vibing' && styles.ratingButtonActive,
                ]}
                onPress={() => handleRatingPress('not_vibing')}
              >
                <Text style={styles.ratingEmoji}>😕</Text>
                <Text
                  style={[
                    styles.ratingText,
                    rating === 'not_vibing' && styles.ratingTextActive,
                  ]}
                >
                  Didn&apos;t vibe
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.ratingButton,
                  rating === 'like_it' && styles.ratingButtonActive,
                ]}
                onPress={() => handleRatingPress('like_it')}
              >
                <Text style={styles.ratingEmoji}>😊</Text>
                <Text
                  style={[
                    styles.ratingText,
                    rating === 'like_it' && styles.ratingTextActive,
                  ]}
                >
                  Liked it
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.ratingButton,
                  rating === 'love_it' && styles.ratingButtonActive,
                ]}
                onPress={() => handleRatingPress('love_it')}
              >
                <Text style={styles.ratingEmoji}>😍</Text>
                <Text
                  style={[
                    styles.ratingText,
                    rating === 'love_it' && styles.ratingTextActive,
                  ]}
                >
                  Loved it
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Would Recommend - Moved above description */}
          <View style={styles.section}>
            <TouchableOpacity
              style={[
                styles.recommendButton,
                wouldRecommend && styles.recommendButtonActive,
              ]}
              onPress={toggleRecommend}
            >
              <IconSymbol
                ios_icon_name={wouldRecommend ? 'heart.fill' : 'heart'}
                android_material_icon_name={wouldRecommend ? 'favorite' : 'favorite-border'}
                size={24}
                color={wouldRecommend ? colors.backgroundAlt : colors.primary}
              />
              <Text
                style={[
                  styles.recommendText,
                  wouldRecommend && styles.recommendTextActive,
                ]}
              >
                Would Recommend
              </Text>
            </TouchableOpacity>
          </View>

          {/* Description */}
          {book.description && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Description</Text>
              <Text style={styles.description}>{book.description}</Text>
            </View>
          )}
        </BottomSheetScrollView>
      </BottomSheetModal>
    );
  }
);

const styles = StyleSheet.create({
  bottomSheetBackground: {
    backgroundColor: colors.backgroundAlt,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  handleIndicator: {
    backgroundColor: colors.primary,
    width: 40,
    height: 4,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
  },
  menuButton: {
    padding: 4,
  },
  menuDropdown: {
    backgroundColor: colors.background,
    marginHorizontal: 20,
    marginBottom: 10,
    borderRadius: 12,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.secondary,
  },
  coverContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  bookCover: {
    width: screenWidth * 0.5,
    height: screenWidth * 0.7,
    borderRadius: 16,
  },
  placeholderCover: {
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  placeholderTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 12,
  },
  bookInfo: {
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  bookTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  bookAuthor: {
    fontSize: 18,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  bookMeta: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: colors.text,
    lineHeight: 24,
  },
  ratingContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  ratingButton: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  ratingButtonActive: {
    backgroundColor: colors.buttonBlue,
  },
  ratingEmoji: {
    fontSize: 32,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
    textAlign: 'center',
  },
  ratingTextActive: {
    color: colors.backgroundAlt,
  },
  recommendButton: {
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  recommendButtonActive: {
    backgroundColor: colors.secondary,
  },
  recommendText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  recommendTextActive: {
    color: colors.backgroundAlt,
  },
});

export default BookDetailBottomSheet;
