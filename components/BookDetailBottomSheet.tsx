
import React, { forwardRef, useMemo, useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Dimensions, ScrollView, Platform, TouchableWithoutFeedback } from 'react-native';
import { BottomSheetBackdrop, BottomSheetScrollView, BottomSheetModal } from '@gorhom/bottom-sheet';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { supabase } from '@/app/integrations/supabase/client';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { isLikelyBlankImage, getFirstValidImageUrl } from '@/utils/imageValidation';
import ValidatedImage from '@/components/ValidatedImage';

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
  requested: number;
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
    const [rating, setRating] = useState<RatingType>(null);
    const [wouldRecommend, setWouldRecommend] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [imageError, setImageError] = useState(false);
    const [isLowRes, setIsLowRes] = useState(false);
    const [hasNoCover, setHasNoCover] = useState(false);
    const [isRequesting, setIsRequesting] = useState(false);
    const [hasUserRequestedCover, setHasUserRequestedCover] = useState(false);
    const [hasUserRequestedBetterImage, setHasUserRequestedBetterImage] = useState(false);
    const [isCheckingRequest, setIsCheckingRequest] = useState(false);

    // Cache the current book data to prevent flickering
    const [cachedUserBook, setCachedUserBook] = useState<UserBook | null>(null);

    // Check if user has already requested this book
    const checkUserRequest = useCallback(async (bookId: string, requestType: 'cover' | 'better_image') => {
      try {
        console.log('🔍 Checking if user has requested:', bookId, requestType);
        
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          console.log('❌ No user found');
          return false;
        }

        const { data, error } = await supabase
          .from('book_requests')
          .select('id')
          .eq('user_id', user.id)
          .eq('book_id', bookId)
          .eq('request_type', requestType)
          .maybeSingle();

        if (error) {
          console.error('❌ Error checking user request:', error);
          return false;
        }

        const hasRequested = !!data;
        console.log(`✅ User has requested ${requestType}:`, hasRequested);
        return hasRequested;
      } catch (error) {
        console.error('❌ Error in checkUserRequest:', error);
        return false;
      }
    }, []);

    // Update cached data when userBook changes
    useEffect(() => {
      if (userBook) {
        console.log('📖 New book opened:', userBook.book.title);
        setCachedUserBook(userBook);
        setRating((userBook.rating as RatingType) || null);
        setWouldRecommend(userBook.would_recommend || false);
        setShowMenu(false);
        setImageError(false);
        setIsLowRes(false);
        setHasNoCover(false);
        // Reset request state when new book is opened
        setHasUserRequestedCover(false);
        setHasUserRequestedBetterImage(false);
        setIsCheckingRequest(false);
      }
    }, [userBook]);

    // Check if we have a valid cover URL and update hasNoCover state
    useEffect(() => {
      if (!cachedUserBook) return;
      
      const book = cachedUserBook.book;
      const validUrl = getFirstValidImageUrl([
        book.cover_url,
        book.thumbnail_url
      ]);

      // Update hasNoCover state based on whether we have a valid URL
      if (!validUrl || imageError) {
        console.log('📷 No valid cover found');
        setHasNoCover(true);
      } else {
        console.log('📷 Valid cover found:', validUrl);
        setHasNoCover(false);
      }
    }, [cachedUserBook, imageError]);

    // Check if user has already requested when book changes or image state changes
    useEffect(() => {
      if (!cachedUserBook) return;

      const checkRequests = async () => {
        setIsCheckingRequest(true);
        
        // Check both request types
        const [hasCoverRequest, hasBetterImageRequest] = await Promise.all([
          checkUserRequest(cachedUserBook.book.id, 'cover'),
          checkUserRequest(cachedUserBook.book.id, 'better_image')
        ]);
        
        console.log('🔄 Request status - Cover:', hasCoverRequest, 'Better Image:', hasBetterImageRequest);
        
        setHasUserRequestedCover(hasCoverRequest);
        setHasUserRequestedBetterImage(hasBetterImageRequest);
        setIsCheckingRequest(false);
      };

      checkRequests();
    }, [cachedUserBook, checkUserRequest]);

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
        const { error } = await supabase
          .from('user_books')
          .delete()
          .eq('id', cachedUserBook.id);

        if (error) {
          console.error('Error deleting book:', error);
          throw error;
        }

        if (ref && typeof ref !== 'function' && ref.current) {
          ref.current.dismiss();
        }

        onRefresh();
        Alert.alert('Success', 'Book removed from library');
      } catch (error) {
        console.error('Error in deleteBook:', error);
        Alert.alert('Error', 'Failed to remove book');
      }
    }, [cachedUserBook, ref, onRefresh]);

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

    const handleCloseMenu = () => {
      if (showMenu) {
        setShowMenu(false);
      }
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

    const handleImageValidationFailed = useCallback(() => {
      console.log('❌ Image validation failed in detail view');
      setImageError(true);
    }, []);

    const handleImageLoad = useCallback((event: any) => {
      // Check if image dimensions are low resolution
      if (event?.source) {
        const { width, height } = event.source;
        if (width && height && (width <= 50 || height <= 50)) {
          console.log('🔍 Low resolution image detected:', width, 'x', height);
          setIsLowRes(true);
        }
      }
    }, []);

    const getImageUrl = useCallback(() => {
      if (!cachedUserBook) return null;
      const book = cachedUserBook.book;
      
      // Get the first valid image URL (not blank and not errored)
      const validUrl = getFirstValidImageUrl([
        book.cover_url,
        book.thumbnail_url
      ]);

      // If we have a valid URL and it hasn't errored, use it
      if (validUrl && !imageError) {
        return validUrl;
      }

      // No valid cover found - don't set state here, it's handled in useEffect
      return null;
    }, [cachedUserBook, imageError]);

    const handleRequestCover = useCallback(async () => {
      if (!cachedUserBook || isRequesting) {
        console.log('⚠️ Cannot request:', { 
          hasBook: !!cachedUserBook, 
          isRequesting
        });
        return;
      }

      // Determine request type based on current state
      const requestType = hasNoCover ? 'cover' : 'better_image';
      const hasAlreadyRequested = requestType === 'cover' ? hasUserRequestedCover : hasUserRequestedBetterImage;

      if (hasAlreadyRequested) {
        console.log('⚠️ User has already requested:', requestType);
        return;
      }

      try {
        setIsRequesting(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        console.log('📤 Requesting', requestType, 'for book:', cachedUserBook.book.id);

        // Call the RPC function which will check if user has already requested
        const { error } = await supabase.rpc('increment_book_request', {
          book_id: cachedUserBook.book.id,
          request_type: requestType
        });

        if (error) {
          console.error('❌ Error requesting cover:', error);
          Alert.alert('Error', 'Failed to submit request. Please try again.');
          return;
        }

        console.log('✅ Successfully submitted request');

        // Mark as requested locally immediately
        if (requestType === 'cover') {
          setHasUserRequestedCover(true);
        } else {
          setHasUserRequestedBetterImage(true);
        }

        Alert.alert(
          'Request Submitted',
          'Your request has been submitted. We\'ll update the book cover as soon as possible.',
          [{ text: 'OK', onPress: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success) }]
        );

        onRefresh();
      } catch (error) {
        console.error('❌ Error in handleRequestCover:', error);
        Alert.alert('Error', 'An unexpected error occurred. Please try again.');
      } finally {
        setIsRequesting(false);
      }
    }, [cachedUserBook, isRequesting, hasUserRequestedCover, hasUserRequestedBetterImage, hasNoCover, onRefresh]);

    // Don't return null - keep the component mounted with cached data
    if (!cachedUserBook) return null;

    const book = cachedUserBook.book;
    const imageUrl = getImageUrl();
    const showRequestButton = hasNoCover || isLowRes;
    
    // Determine which request state to check based on current button type
    const requestType = hasNoCover ? 'cover' : 'better_image';
    const hasUserRequested = requestType === 'cover' ? hasUserRequestedCover : hasUserRequestedBetterImage;

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
        <TouchableWithoutFeedback onPress={handleCloseMenu}>
          <View style={styles.touchableContainer}>
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

              {/* Menu Dropdown - Positioned absolutely above content */}
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
                <View style={styles.coverWrapper}>
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
                      onValidationFailed={handleImageValidationFailed}
                      onLoad={handleImageLoad}
                    />
                  ) : (
                    <View style={[styles.bookCover, styles.placeholderCover]}>
                      <Text style={styles.placeholderTitle} numberOfLines={4}>
                        {book.title}
                      </Text>
                    </View>
                  )}
                </View>
                
                {/* Request Button - Always show, grey out if already requested */}
                {showRequestButton && (
                  <TouchableOpacity
                    style={[
                      styles.requestButton,
                      (hasUserRequested || isCheckingRequest) && styles.requestButtonDisabled
                    ]}
                    onPress={handleRequestCover}
                    disabled={isRequesting || hasUserRequested || isCheckingRequest}
                    activeOpacity={hasUserRequested ? 1 : 0.7}
                  >
                    <Text style={[
                      styles.requestButtonText,
                      (hasUserRequested || isCheckingRequest) && styles.requestButtonTextDisabled
                    ]}>
                      {isCheckingRequest 
                        ? 'Checking...'
                        : hasUserRequested 
                          ? (hasNoCover ? 'Book cover requested' : 'Better image requested')
                          : (hasNoCover ? 'Request book cover' : 'Request better image')
                      }
                    </Text>
                  </TouchableOpacity>
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
          </View>
        </TouchableWithoutFeedback>
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
  touchableContainer: {
    flex: 1,
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
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: colors.backgroundAlt,
    borderRadius: 12,
    minWidth: 180,
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
    zIndex: 1000,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
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
  coverWrapper: {
    width: screenWidth * 0.5,
    aspectRatio: 4 / 5, // 5:4 portrait ratio
    marginBottom: 12, // Add margin between cover and button
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
    padding: 20,
  },
  placeholderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
    textAlign: 'center',
  },
  requestButton: {
    backgroundColor: colors.buttonBlue,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    width: screenWidth * 0.5, // Match the cover width
  },
  requestButtonDisabled: {
    backgroundColor: colors.textSecondary,
    opacity: 0.6,
  },
  requestButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.backgroundAlt,
    textAlign: 'center',
  },
  requestButtonTextDisabled: {
    color: '#FFFFFF',
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
