
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator, Text, Platform } from 'react-native';
import { Image } from 'expo-image';
import Svg, { Path, Defs, ClipPath, G, Image as SvgImage } from 'react-native-svg';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from './IconSymbol';

interface ProfileAvatarProps {
  imageUri?: string | null;
  size?: number;
  onPress?: () => void;
  isUploading?: boolean;
}

export default function ProfileAvatar({ 
  imageUri, 
  size = 120, 
  onPress, 
  isUploading = false 
}: ProfileAvatarProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [displayUri, setDisplayUri] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [errorDetails, setErrorDetails] = useState<string>('');

  // Scale the SVG path to fit the desired size
  // Original SVG viewBox is "0 0 196 194"
  const originalWidth = 196;
  const originalHeight = 194;
  const scale = size / originalWidth;
  const scaledHeight = originalHeight * scale;

  const shapePath = "M82.0878 6.82395C90.4556 -2.27436 104.813 -2.27436 113.181 6.82395C118.474 12.5787 126.513 14.9391 134.076 12.9593C146.035 9.82927 158.113 17.5917 160.234 29.7697C161.575 37.4723 167.061 43.804 174.495 46.2278C186.247 50.0598 192.212 63.1202 187.411 74.5113C184.375 81.7164 185.568 90.0091 190.511 96.0669C198.326 105.644 196.282 119.856 186.086 126.844C179.636 131.264 176.156 138.885 177.039 146.653C178.435 158.935 169.033 169.786 156.677 170.152C148.862 170.383 141.814 174.913 138.357 181.926C132.892 193.013 119.115 197.058 108.523 190.686C101.824 186.655 93.4455 186.655 86.7459 190.686C76.1538 197.058 62.3775 193.013 56.912 181.926C53.455 174.913 46.407 170.383 38.5918 170.152C26.2361 169.786 16.8337 158.935 18.23 146.653C19.1132 138.885 15.6328 131.264 9.18338 126.844C-1.01317 119.856 -3.05651 105.644 4.75834 96.0669C9.70131 90.0091 10.8936 81.7164 7.85756 74.5113C3.05754 63.1202 9.02202 50.0598 20.7742 46.2278C28.2076 43.804 33.6941 37.4723 35.0353 29.7697C37.1558 17.5917 49.2344 9.82927 61.1927 12.9593C68.7565 14.9391 76.7952 12.5787 82.0878 6.82395Z";

  useEffect(() => {
    console.log('ProfileAvatar: imageUri changed:', imageUri);
    console.log('ProfileAvatar: imageUri type:', typeof imageUri);
    console.log('ProfileAvatar: Platform:', Platform.OS);
    
    setImageError(false);
    setImageLoaded(false);
    setRetryCount(0);
    setErrorDetails('');
    
    if (imageUri) {
      // Check if it's a valid URL
      const isValidUrl = imageUri.startsWith('http://') || imageUri.startsWith('https://');
      console.log('ProfileAvatar: Is valid URL:', isValidUrl);
      
      if (!isValidUrl) {
        console.error('ProfileAvatar: Invalid URL format:', imageUri);
        setImageError(true);
        setErrorDetails('Invalid URL format');
        return;
      }

      // For native platforms, don't add cache busting to signed URLs
      // Signed URLs already have query parameters that include authentication
      if (Platform.OS !== 'web' && imageUri.includes('/sign/')) {
        console.log('ProfileAvatar: Using signed URL as-is (no cache busting)');
        setDisplayUri(imageUri);
      } else {
        // Add cache-busting parameter to force reload for public URLs
        const cacheBuster = `${imageUri.includes('?') ? '&' : '?'}t=${Date.now()}`;
        const uriWithCacheBuster = `${imageUri}${cacheBuster}`;
        
        console.log('ProfileAvatar: Setting display URI with cache buster:', uriWithCacheBuster);
        setDisplayUri(uriWithCacheBuster);
      }
    } else {
      console.log('ProfileAvatar: No imageUri provided');
      setDisplayUri(null);
    }
  }, [imageUri]);

  const handleImageLoad = () => {
    console.log('ProfileAvatar: Image loaded successfully');
    setImageLoaded(true);
    setImageError(false);
    setErrorDetails('');
  };

  const handleImageError = (error: any) => {
    console.error('ProfileAvatar: Image failed to load');
    console.error('ProfileAvatar: Error details:', JSON.stringify(error, null, 2));
    
    const errorMessage = error?.nativeEvent?.error || error?.error || 'Unknown error';
    console.error('ProfileAvatar: Error message:', errorMessage);
    
    setImageLoaded(false);
    setImageError(true);
    setErrorDetails(errorMessage);

    // Retry loading the image up to 3 times with exponential backoff
    if (retryCount < 3 && imageUri) {
      const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
      console.log(`ProfileAvatar: Retrying in ${delay}ms (attempt ${retryCount + 1}/3)`);
      
      setTimeout(() => {
        setRetryCount(prev => prev + 1);
        setImageError(false);
        
        // For signed URLs, don't modify them on retry
        if (Platform.OS !== 'web' && imageUri.includes('/sign/')) {
          console.log('ProfileAvatar: Retry with signed URL (no modification)');
          setDisplayUri(imageUri);
        } else {
          const cacheBuster = `${imageUri.includes('?') ? '&' : '?'}t=${Date.now()}&retry=${retryCount + 1}`;
          const uriWithCacheBuster = `${imageUri}${cacheBuster}`;
          
          console.log('ProfileAvatar: Retry attempt with URI:', uriWithCacheBuster);
          setDisplayUri(uriWithCacheBuster);
        }
      }, delay);
    } else if (retryCount >= 3) {
      console.error('ProfileAvatar: Max retries reached, giving up');
    }
  };

  const showImage = displayUri && imageLoaded && !imageError;
  const showPlaceholder = !displayUri || (imageError && retryCount >= 3) || (!imageLoaded && !imageError);

  const content = (
    <View style={[styles.container, { width: size, height: scaledHeight }]}>
      {/* Native approach: Use expo-image directly with proper masking */}
      {Platform.OS !== 'web' ? (
        <>
          {/* Background shape */}
          <Svg 
            width={size} 
            height={scaledHeight} 
            viewBox={`0 0 ${originalWidth} ${originalHeight}`}
            style={StyleSheet.absoluteFill}
          >
            <Path 
              d={shapePath}
              fill={colors.cardPurple}
            />
          </Svg>

          {/* Image with expo-image */}
          {displayUri && (
            <View style={StyleSheet.absoluteFill}>
              <Image
                source={{ uri: displayUri }}
                style={[
                  StyleSheet.absoluteFill,
                  { 
                    opacity: showImage ? 1 : 0,
                  }
                ]}
                contentFit="cover"
                onLoad={handleImageLoad}
                onError={handleImageError}
                cachePolicy="none"
                priority="high"
              />
              {/* Mask overlay to create the shape */}
              <Svg 
                width={size} 
                height={scaledHeight} 
                viewBox={`0 0 ${originalWidth} ${originalHeight}`}
                style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}
              >
                <Defs>
                  <ClipPath id={`shapeMask-${size}`}>
                    <Path d={shapePath} />
                  </ClipPath>
                </Defs>
                {/* This creates a mask effect by covering everything outside the shape */}
                <G>
                  <Path 
                    d={`M0,0 L${originalWidth},0 L${originalWidth},${originalHeight} L0,${originalHeight} Z ${shapePath}`}
                    fill={colors.background}
                    fillRule="evenodd"
                  />
                </G>
              </Svg>
            </View>
          )}
        </>
      ) : (
        /* Web approach: Use SVG with embedded image */
        <>
          <Svg 
            width={size} 
            height={scaledHeight} 
            viewBox={`0 0 ${originalWidth} ${originalHeight}`}
          >
            <Defs>
              <ClipPath id={`shapeClip-${size}-${Date.now()}`}>
                <Path d={shapePath} />
              </ClipPath>
            </Defs>
            
            {/* Background shape */}
            <Path 
              d={shapePath}
              fill={colors.cardPurple}
            />
            
            {/* Clipped image */}
            {displayUri && showImage && (
              <G clipPath={`url(#shapeClip-${size}-${Date.now()})`}>
                <SvgImage
                  href={displayUri}
                  x="0"
                  y="0"
                  width={originalWidth}
                  height={originalHeight}
                  preserveAspectRatio="xMidYMid slice"
                />
              </G>
            )}
          </Svg>

          {/* Hidden Image component for loading control */}
          {displayUri && (
            <Image
              source={{ uri: displayUri }}
              style={styles.hiddenImage}
              onLoad={handleImageLoad}
              onError={handleImageError}
              cachePolicy="memory-disk"
              priority="high"
              recyclingKey={displayUri}
            />
          )}
        </>
      )}

      {/* Loading indicator */}
      {isUploading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.backgroundAlt} />
          <Text style={styles.loadingText}>Uploading...</Text>
        </View>
      )}

      {/* Retry indicator */}
      {imageError && retryCount < 3 && !isUploading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.backgroundAlt} />
          <Text style={styles.loadingText}>Loading image...</Text>
          {retryCount > 0 && (
            <Text style={styles.retryText}>Retry {retryCount}/3</Text>
          )}
        </View>
      )}

      {/* Error indicator */}
      {imageError && retryCount >= 3 && !isUploading && (
        <View style={styles.errorOverlay}>
          <IconSymbol 
            ios_icon_name="exclamationmark.triangle.fill" 
            android_material_icon_name="error" 
            size={32} 
            color="rgba(255, 255, 255, 0.7)" 
          />
          <Text style={styles.errorText}>Failed to load</Text>
          {errorDetails && (
            <Text style={styles.errorDetailsText}>{errorDetails}</Text>
          )}
        </View>
      )}
      
      {/* Camera icon overlay for empty state */}
      {showPlaceholder && !isUploading && !(imageError && retryCount < 3) && !(imageError && retryCount >= 3) && (
        <View style={styles.emptyStateIcon}>
          <IconSymbol 
            ios_icon_name="camera.fill" 
            android_material_icon_name="photo-camera" 
            size={40} 
            color="rgba(255, 255, 255, 0.7)" 
          />
          <Text style={styles.tapToAddText}>Tap to add photo</Text>
        </View>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.8} disabled={isUploading}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  hiddenImage: {
    width: 0,
    height: 0,
    opacity: 0,
    position: 'absolute',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    zIndex: 10,
    borderRadius: 16,
  },
  loadingText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.backgroundAlt,
    marginTop: 8,
  },
  retryText: {
    fontSize: 10,
    fontWeight: '500',
    color: colors.backgroundAlt,
    marginTop: 4,
  },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    zIndex: 10,
    borderRadius: 16,
    padding: 12,
  },
  errorText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 8,
    textAlign: 'center',
  },
  errorDetailsText: {
    fontSize: 9,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 4,
    textAlign: 'center',
  },
  emptyStateIcon: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  tapToAddText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 8,
    textAlign: 'center',
  },
});
