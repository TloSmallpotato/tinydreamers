
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator, Text } from 'react-native';
import { Image } from 'expo-image';
import Svg, { Defs, Mask, Path, Rect, Image as SvgImage } from 'react-native-svg';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from './IconSymbol';
import { getSignedAvatarUrl } from '@/utils/profileAvatarUpload';

interface ProfileAvatarProps {
  imageUrl?: string | null;
  size?: number;
  onPress?: () => void;
  isUploading?: boolean;
}

export default function ProfileAvatar({ 
  imageUrl, 
  size = 120, 
  onPress, 
  isUploading = false
}: ProfileAvatarProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  // Generate signed URL when imageUrl changes
  useEffect(() => {
    console.log('ProfileAvatar: Image URL changed:', imageUrl);
    setImageError(false);
    setImageLoading(false);
    setSignedUrl(null);

    if (!imageUrl) {
      console.log('ProfileAvatar: No image URL provided');
      return;
    }

    // If it's a local file URI (starts with file://), use it directly
    if (imageUrl.startsWith('file://')) {
      console.log('ProfileAvatar: Using local file URI directly');
      setSignedUrl(imageUrl);
      setImageLoading(true);
      return;
    }

    // If it's already a signed URL (contains token parameter), use it directly
    if (imageUrl.includes('token=')) {
      console.log('ProfileAvatar: Using existing signed URL');
      setSignedUrl(imageUrl);
      setImageLoading(true);
      return;
    }

    // Otherwise, generate a signed URL
    console.log('ProfileAvatar: Generating signed URL for storage path...');
    setImageLoading(true);
    
    getSignedAvatarUrl(imageUrl)
      .then((url) => {
        if (url) {
          console.log('ProfileAvatar: ✓ Signed URL generated successfully');
          setSignedUrl(url);
        } else {
          console.error('ProfileAvatar: ✗ Failed to generate signed URL');
          setImageError(true);
          setImageLoading(false);
        }
      })
      .catch((error) => {
        console.error('ProfileAvatar: Error generating signed URL:', error);
        setImageError(true);
        setImageLoading(false);
      });
  }, [imageUrl]);

  const handleImageLoad = () => {
    console.log('ProfileAvatar: Image loaded successfully');
    setImageLoading(false);
    setImageError(false);
  };

  const handleImageError = (error: any) => {
    console.error('ProfileAvatar: Image failed to load:', error);
    setImageLoading(false);
    setImageError(true);
  };

  const showImage = signedUrl && !imageError;
  const showPlaceholder = !signedUrl || imageError;

  // Original SVG viewBox is 196x194, we'll scale it to the desired size
  const originalWidth = 196;
  const originalHeight = 194;
  const scale = size / Math.max(originalWidth, originalHeight);
  const scaledWidth = originalWidth * scale;
  const scaledHeight = originalHeight * scale;

  // The custom shape path from the SVG
  const customShapePath = "M82.0878 6.82395C90.4556 -2.27436 104.813 -2.27436 113.181 6.82395C118.474 12.5787 126.513 14.9391 134.076 12.9593C146.035 9.82927 158.113 17.5917 160.234 29.7697C161.575 37.4723 167.061 43.804 174.495 46.2278C186.247 50.0598 192.212 63.1202 187.411 74.5113C184.375 81.7164 185.568 90.0091 190.511 96.0669C198.326 105.644 196.282 119.856 186.086 126.844C179.636 131.264 176.156 138.885 177.039 146.653C178.435 158.935 169.033 169.786 156.677 170.152C148.862 170.383 141.814 174.913 138.357 181.926C132.892 193.013 119.115 197.058 108.523 190.686C101.824 186.655 93.4455 186.655 86.7459 190.686C76.1538 197.058 62.3775 193.013 56.912 181.926C53.455 174.913 46.407 170.383 38.5918 170.152C26.2361 169.786 16.8337 158.935 18.23 146.653C19.1132 138.885 15.6328 131.264 9.18338 126.844C-1.01317 119.856 -3.05651 105.644 4.75834 96.0669C9.70131 90.0091 10.8936 81.7164 7.85756 74.5113C3.05754 63.1202 9.02202 50.0598 20.7742 46.2278C28.2076 43.804 33.6941 37.4723 35.0353 29.7697C37.1558 17.5917 49.2344 9.82927 61.1927 12.9593C68.7565 14.9391 76.7952 12.5787 82.0878 6.82395Z";

  const content = (
    <View style={[styles.container, { width: scaledWidth, height: scaledHeight }]}>
      {/* SVG with custom shape mask */}
      <Svg width={scaledWidth} height={scaledHeight} viewBox={`0 0 ${originalWidth} ${originalHeight}`}>
        <Defs>
          {/* Define the mask using the custom shape */}
          <Mask id="customMask">
            <Path d={customShapePath} fill="white" />
          </Mask>
        </Defs>

        {/* Background shape */}
        <Path d={customShapePath} fill={colors.cardPurple} />

        {/* Image with mask applied */}
        {showImage && (
          <SvgImage
            key={signedUrl}
            href={signedUrl}
            width={originalWidth}
            height={originalHeight}
            preserveAspectRatio="xMidYMid slice"
            mask="url(#customMask)"
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
        )}
      </Svg>

      {/* Placeholder overlay */}
      {showPlaceholder && !isUploading && (
        <View style={[styles.overlay, { width: scaledWidth, height: scaledHeight }]}>
          <View style={styles.placeholder}>
            <IconSymbol 
              ios_icon_name="camera.fill" 
              android_material_icon_name="photo-camera" 
              size={size * 0.3} 
              color="rgba(255, 255, 255, 0.7)" 
            />
            <Text style={[styles.placeholderText, { fontSize: size * 0.08 }]}>
              Tap to add photo
            </Text>
          </View>
        </View>
      )}

      {/* Loading indicator */}
      {(isUploading || (imageLoading && signedUrl)) && (
        <View style={[styles.overlay, { width: scaledWidth, height: scaledHeight }]}>
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={colors.backgroundAlt} />
            <Text style={[styles.loadingText, { fontSize: size * 0.08 }]}>
              {isUploading ? 'Uploading...' : 'Loading...'}
            </Text>
          </View>
        </View>
      )}

      {/* Error indicator */}
      {imageError && !isUploading && imageUrl && (
        <View style={[styles.overlay, { width: scaledWidth, height: scaledHeight }]}>
          <View style={styles.errorOverlay}>
            <IconSymbol 
              ios_icon_name="exclamationmark.triangle.fill" 
              android_material_icon_name="error" 
              size={size * 0.25} 
              color="rgba(255, 255, 255, 0.7)" 
            />
            <Text style={[styles.errorText, { fontSize: size * 0.07 }]}>
              Failed to load
            </Text>
          </View>
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
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  },
  placeholderText: {
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 8,
    textAlign: 'center',
  },
  loadingOverlay: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  loadingText: {
    fontWeight: '600',
    color: colors.backgroundAlt,
    marginTop: 8,
  },
  errorOverlay: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    padding: 12,
  },
  errorText: {
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 8,
    textAlign: 'center',
  },
});
