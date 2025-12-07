
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator, Text } from 'react-native';
import { Image } from 'expo-image';
import Svg, { Path, Defs, Mask, Rect } from 'react-native-svg';
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

  // Scale the SVG path to fit the desired size
  // Original SVG viewBox is "0 0 196 194"
  const originalWidth = 196;
  const originalHeight = 194;
  const scale = size / originalWidth;
  const scaledHeight = originalHeight * scale;

  const shapePath = "M82.0878 6.82395C90.4556 -2.27436 104.813 -2.27436 113.181 6.82395C118.474 12.5787 126.513 14.9391 134.076 12.9593C146.035 9.82927 158.113 17.5917 160.234 29.7697C161.575 37.4723 167.061 43.804 174.495 46.2278C186.247 50.0598 192.212 63.1202 187.411 74.5113C184.375 81.7164 185.568 90.0091 190.511 96.0669C198.326 105.644 196.282 119.856 186.086 126.844C179.636 131.264 176.156 138.885 177.039 146.653C178.435 158.935 169.033 169.786 156.677 170.152C148.862 170.383 141.814 174.913 138.357 181.926C132.892 193.013 119.115 197.058 108.523 190.686C101.824 186.655 93.4455 186.655 86.7459 190.686C76.1538 197.058 62.3775 193.013 56.912 181.926C53.455 174.913 46.407 170.383 38.5918 170.152C26.2361 169.786 16.8337 158.935 18.23 146.653C19.1132 138.885 15.6328 131.264 9.18338 126.844C-1.01317 119.856 -3.05651 105.644 4.75834 96.0669C9.70131 90.0091 10.8936 81.7164 7.85756 74.5113C3.05754 63.1202 9.02202 50.0598 20.7742 46.2278C28.2076 43.804 33.6941 37.4723 35.0353 29.7697C37.1558 17.5917 49.2344 9.82927 61.1927 12.9593C68.7565 14.9391 76.7952 12.5787 82.0878 6.82395Z";

  useEffect(() => {
    console.log('ProfileAvatar: imageUri changed:', imageUri);
    setImageError(false);
    setImageLoaded(false);
    
    if (imageUri) {
      // Add cache-busting parameter to force reload
      const cacheBuster = `?t=${Date.now()}`;
      const uriWithCacheBuster = imageUri.includes('?') 
        ? `${imageUri}&t=${Date.now()}`
        : `${imageUri}${cacheBuster}`;
      
      console.log('ProfileAvatar: Setting display URI with cache buster:', uriWithCacheBuster);
      setDisplayUri(uriWithCacheBuster);
    } else {
      setDisplayUri(null);
    }
  }, [imageUri]);

  const handleImageLoad = () => {
    console.log('ProfileAvatar: Image loaded successfully');
    setImageLoaded(true);
    setImageError(false);
  };

  const handleImageError = (error: any) => {
    console.error('ProfileAvatar: Image failed to load', error);
    setImageLoaded(false);
    setImageError(true);
  };

  const showImage = displayUri && imageLoaded && !imageError;
  const showPlaceholder = !displayUri || imageError || !imageLoaded;

  const content = (
    <View style={[styles.container, { width: size, height: scaledHeight }]}>
      {/* Background SVG Shape */}
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

      {/* Image with custom shape clipping */}
      {displayUri && (
        <View style={[styles.imageWrapper, { width: size, height: scaledHeight }]}>
          <Image
            source={{ uri: displayUri }}
            style={[styles.profileImage, { width: size, height: scaledHeight }]}
            contentFit="cover"
            transition={200}
            onLoad={handleImageLoad}
            onError={handleImageError}
            cachePolicy="none"
            priority="high"
          />
          {/* Overlay SVG to create the shape mask effect */}
          <Svg 
            width={size} 
            height={scaledHeight} 
            viewBox={`0 0 ${originalWidth} ${originalHeight}`}
            style={styles.shapeOverlay}
            pointerEvents="none"
          >
            <Defs>
              <Mask id={`shapeMask-${size}`}>
                <Rect x="0" y="0" width={originalWidth} height={originalHeight} fill="white" />
                <Path d={shapePath} fill="black" />
              </Mask>
            </Defs>
            {/* Inverted mask to hide everything outside the shape */}
            <Rect 
              x="0" 
              y="0" 
              width={originalWidth} 
              height={originalHeight} 
              fill={colors.background}
              mask={`url(#shapeMask-${size})`}
            />
          </Svg>
        </View>
      )}

      {/* Loading indicator */}
      {isUploading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.backgroundAlt} />
          <Text style={styles.loadingText}>Uploading...</Text>
        </View>
      )}
      
      {/* Camera icon overlay for empty state */}
      {showPlaceholder && !isUploading && (
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
    overflow: 'hidden',
  },
  imageWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    overflow: 'hidden',
  },
  profileImage: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  shapeOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    zIndex: 10,
  },
  loadingText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.backgroundAlt,
    marginTop: 8,
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
