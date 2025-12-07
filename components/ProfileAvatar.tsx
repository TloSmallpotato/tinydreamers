
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator, Text } from 'react-native';
import { Image } from 'expo-image';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from './IconSymbol';

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

  // Reset error state when imageUrl changes
  useEffect(() => {
    console.log('ProfileAvatar: Image URL changed:', imageUrl);
    setImageError(false);
    setImageLoading(!!imageUrl);
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

  const showImage = imageUrl && !imageError;
  const showPlaceholder = !imageUrl || imageError;

  const content = (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* Circular background */}
      <View style={[styles.circle, { width: size, height: size, borderRadius: size / 2 }]}>
        {/* Image */}
        {showImage && (
          <Image
            key={imageUrl}
            source={{ uri: imageUrl }}
            style={[styles.image, { borderRadius: size / 2 }]}
            contentFit="cover"
            onLoad={handleImageLoad}
            onError={handleImageError}
            transition={200}
            cachePolicy="none"
            priority="high"
          />
        )}

        {/* Placeholder */}
        {showPlaceholder && !isUploading && (
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
        )}

        {/* Loading indicator */}
        {isUploading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={colors.backgroundAlt} />
            <Text style={[styles.loadingText, { fontSize: size * 0.08 }]}>
              Uploading...
            </Text>
          </View>
        )}

        {/* Error indicator */}
        {imageError && !isUploading && imageUrl && (
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
        )}
      </View>
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
  circle: {
    backgroundColor: colors.cardPurple,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
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
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  loadingText: {
    fontWeight: '600',
    color: colors.backgroundAlt,
    marginTop: 8,
  },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
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
