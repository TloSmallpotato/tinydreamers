
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
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
 * A wrapper around expo-image that validates image dimensions
 * and shows a placeholder if the image is blank or too small
 */
export default function ValidatedImage({
  source,
  fallbackTitle,
  minWidth = 50,
  minHeight = 50,
  onValidationFailed,
  placeholderStyle,
  style,
  ...imageProps
}: ValidatedImageProps) {
  const [showPlaceholder, setShowPlaceholder] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Extract URI from source
  const getUri = useCallback(() => {
    if (typeof source === 'object' && 'uri' in source) {
      return source.uri;
    }
    if (typeof source === 'string') {
      return source;
    }
    return null;
  }, [source]);

  const uri = getUri();

  // Check URL patterns first
  const hasBlankPattern = uri ? isLikelyBlankImage(uri) : true;

  const handleLoad = useCallback((event: any) => {
    setImageLoaded(true);
    
    // Check dimensions if available
    if (event?.source) {
      const { width, height } = event.source;
      
      if (width && height) {
        console.log('🔍 Image loaded with dimensions:', width, 'x', height, uri);
        
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
    if (imageProps.onLoad) {
      imageProps.onLoad(event);
    }
  }, [minWidth, minHeight, uri, onValidationFailed, imageProps]);

  const handleError = useCallback((error: any) => {
    console.log('🔍 Image failed to load, showing placeholder:', uri);
    setShowPlaceholder(true);
    onValidationFailed?.();
    
    // Call original onError if provided
    if (imageProps.onError) {
      imageProps.onError(error);
    }
  }, [uri, onValidationFailed, imageProps]);

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
    />
  );
}

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: '#FFD0A3',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
    // Use width and height from parent container
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
