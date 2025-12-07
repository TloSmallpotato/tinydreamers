
import { supabase } from '@/app/integrations/supabase/client';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { Platform } from 'react-native';

export interface UploadAvatarResult {
  success: boolean;
  url?: string;
  error?: string;
}

/**
 * Pick an image from the device's photo library
 * @returns The URI of the selected image, or null if cancelled
 */
export async function pickProfileImage(): Promise<string | null> {
  try {
    console.log('pickProfileImage: Requesting permissions');

    // Request permissions
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      console.log('pickProfileImage: Permission denied');
      return null;
    }

    console.log('pickProfileImage: Launching image picker');

    // Launch image picker
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled || !result.assets[0]) {
      console.log('pickProfileImage: User cancelled or no image selected');
      return null;
    }

    const imageUri = result.assets[0].uri;
    console.log('pickProfileImage: Image selected:', imageUri);

    return imageUri;
  } catch (error) {
    console.error('pickProfileImage: Error:', error);
    return null;
  }
}

/**
 * Upload a profile avatar to Supabase Storage
 * @param childId - The ID of the child
 * @param imageUri - The local URI of the image to upload
 * @returns UploadAvatarResult with success status and URL or error
 */
export async function uploadProfileAvatar(
  childId: string,
  imageUri: string
): Promise<UploadAvatarResult> {
  try {
    console.log('uploadProfileAvatar: Starting upload for child:', childId);
    console.log('uploadProfileAvatar: Image URI:', imageUri);
    console.log('uploadProfileAvatar: Platform:', Platform.OS);

    // Validate the URI
    if (!imageUri || typeof imageUri !== 'string') {
      console.error('uploadProfileAvatar: Invalid URI');
      return {
        success: false,
        error: 'Invalid image URI',
      };
    }

    // Extract file extension
    const fileExt = imageUri.split('.').pop()?.toLowerCase() || 'jpg';
    
    // Validate file extension
    const validExtensions = ['jpg', 'jpeg', 'png', 'webp'];
    if (!validExtensions.includes(fileExt)) {
      console.error('uploadProfileAvatar: Invalid file extension:', fileExt);
      return {
        success: false,
        error: 'Invalid file type. Please use JPG, PNG, or WebP images.',
      };
    }

    // Generate unique filename with timestamp to ensure uniqueness
    const timestamp = Date.now();
    const fileName = `${childId}-${timestamp}.${fileExt}`;
    const filePath = `avatars/${fileName}`;

    console.log('uploadProfileAvatar: Uploading to path:', filePath);

    // Read the file as base64
    console.log('uploadProfileAvatar: Reading file as base64...');
    const base64 = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    console.log('uploadProfileAvatar: File read successfully, size:', base64.length, 'characters');

    if (base64.length === 0) {
      console.error('uploadProfileAvatar: Base64 string is empty');
      return {
        success: false,
        error: 'Failed to read image file. Please try again.',
      };
    }

    // Check file size (base64 is ~33% larger than binary)
    const approximateSize = (base64.length * 3) / 4;
    const maxSize = 5 * 1024 * 1024; // 5MB
    
    if (approximateSize > maxSize) {
      console.error('uploadProfileAvatar: File too large:', approximateSize);
      return {
        success: false,
        error: 'Image is too large. Please use an image smaller than 5MB.',
      };
    }

    // Convert base64 to ArrayBuffer
    console.log('uploadProfileAvatar: Converting to ArrayBuffer...');
    const arrayBuffer = decode(base64);

    console.log('uploadProfileAvatar: ArrayBuffer created, size:', arrayBuffer.byteLength, 'bytes');

    if (arrayBuffer.byteLength === 0) {
      console.error('uploadProfileAvatar: ArrayBuffer is empty');
      return {
        success: false,
        error: 'Failed to process image. Please try again.',
      };
    }

    // Upload to Supabase Storage (NOT using upsert to create a new file each time)
    console.log('uploadProfileAvatar: Uploading to Supabase Storage...');
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('profile-avatars')
      .upload(filePath, arrayBuffer, {
        contentType: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`,
        upsert: false, // Changed to false to create new files instead of overwriting
        cacheControl: '3600',
      });

    if (uploadError) {
      console.error('uploadProfileAvatar: Upload error:', uploadError);
      return {
        success: false,
        error: uploadError.message || 'Failed to upload image.',
      };
    }

    console.log('uploadProfileAvatar: Upload successful:', uploadData);

    // Get public URL with cache-busting timestamp
    const { data: publicUrlData } = supabase.storage
      .from('profile-avatars')
      .getPublicUrl(filePath);

    // Add cache-busting query parameter to force image refresh
    const avatarUrl = `${publicUrlData.publicUrl}?t=${timestamp}`;
    console.log('uploadProfileAvatar: Public URL with cache-busting:', avatarUrl);

    return {
      success: true,
      url: avatarUrl,
    };
  } catch (error) {
    console.error('uploadProfileAvatar: Unexpected error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred.',
    };
  }
}

/**
 * Delete an old profile avatar from Supabase Storage
 * @param avatarUrl - The full URL of the avatar to delete
 */
export async function deleteProfileAvatar(avatarUrl: string): Promise<void> {
  try {
    console.log('deleteProfileAvatar: Deleting avatar:', avatarUrl);

    // Extract the file path from the URL (remove query parameters first)
    const urlWithoutQuery = avatarUrl.split('?')[0];
    const urlMatch = urlWithoutQuery.match(/\/profile-avatars\/(.+?)$/);
    
    if (!urlMatch || !urlMatch[1]) {
      console.warn('deleteProfileAvatar: Could not extract file path from URL');
      return;
    }

    const filePath = urlMatch[1];
    console.log('deleteProfileAvatar: Extracted file path:', filePath);

    // Delete from storage
    const { error } = await supabase.storage
      .from('profile-avatars')
      .remove([filePath]);

    if (error) {
      console.error('deleteProfileAvatar: Delete error:', error);
    } else {
      console.log('deleteProfileAvatar: Successfully deleted old avatar');
    }
  } catch (error) {
    console.error('deleteProfileAvatar: Unexpected error:', error);
  }
}
