
import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image, ImageProps } from 'expo-image';
import { colors } from '@/styles/commonStyles';
import { isLikelyBlankImage } from '@/utils/imageValidation';

interface ValidatedImageProps extends Omit<ImageProps, 'source'> {
  source: { uri: string } | string | number;
  fallbackTitle?: string;
  minWidth?: number;
  minHeight?: number;
  onValidationFailed?: () => void;
  placeholderStyle?: any;
}

/**
 * Optimized image component with validation and caching
 * Uses expo-image's built-in caching and validation
 */
const ValidatedImage = React.memo<ValidatedImageProps>(({
  source,
  fallbackTitle,
  minWidth = 50,
  minHeight = 50,
  onValidationFailed,
  placeholderStyle,
  style,
  ...imageProps
}: ValidatedImageProps) => {
  const [showPlaceholder, setShowPlaceholder] = useState(false);

  // Extract URI from source - memoized to prevent recalculation
  const uri = useMemo(() => {
    if (typeof source === 'object' && 'uri' in source) {
      return source.uri;
    }
    if (typeof source === 'string') {
      return source;
    }
    return null;
  }, [source]);

  // Check URL patterns first - memoized
  const hasBlankPattern = useMemo(() => {
    return uri ? isLikelyBlankImage(uri) : true;
  }, [uri]);

  const handleLoad = useCallback((event: any) => {
    // Check dimensions if available
    if (event?.source) {
      const { width, height } = event.source;
      
      if (width && height) {
        // Check if dimensions are too small
        if (width <= minWidth || height <= minHeight) {
          console.log('🔍 Image dimensions too small, showing placeholder');
          setShowPlaceholder(true);
          onValidationFailed?.();
          return;
        }
      }
    }
    
    // Call original onLoad if provided
    imageProps.onLoad?.(event);
  }, [minWidth, minHeight, onValidationFailed, imageProps]);

  const handleError = useCallback((error: any) => {
    console.log('🔍 Image failed to load, showing placeholder');
    setShowPlaceholder(true);
    onValidationFailed?.();
    
    // Call original onError if provided
    imageProps.onError?.(error);
  }, [onValidationFailed, imageProps]);

  // Show placeholder if URL has blank pattern or validation failed
  if (hasBlankPattern || showPlaceholder) {
    return (
      <View style={[styles.placeholder, placeholderStyle, style]}>
        {fallbackTitle && (
          <Text style={styles.placeholderText} numberOfLines={4}>
            {fallbackTitle}
          </Text>
        )}
      </View>
    );
  }

  return (
    <Image
      {...imageProps}
      source={source}
      style={style}
      onLoad={handleLoad}
      onError={handleError}
      // Optimize caching strategy
      cachePolicy={imageProps.cachePolicy || 'memory-disk'}
      // Add placeholder for better perceived performance
      placeholder={imageProps.placeholder}
      placeholderContentFit={imageProps.placeholderContentFit || 'cover'}
      transition={imageProps.transition !== undefined ? imageProps.transition : 200}
    />
  );
});

ValidatedImage.displayName = 'ValidatedImage';

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: '#FFD0A3',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
    width: '100%',
    height: '100%',
  },
  placeholderText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    textAlign: 'center',
  },
});

export default ValidatedImage;
