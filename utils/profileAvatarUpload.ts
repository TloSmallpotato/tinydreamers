
import { supabase } from '@/app/integrations/supabase/client';
import * as ImagePicker from 'expo-image-picker';

export interface UploadAvatarResult {
  success: boolean;
  url?: string;
  error?: string;
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

    // Generate unique filename with child ID prefix
    const timestamp = Date.now();
    const fileName = `${childId}-${timestamp}.${fileExt}`;
    const filePath = `avatars/${fileName}`;

    console.log('uploadProfileAvatar: Uploading to path:', filePath);

    // Fetch the image as a blob
    const response = await fetch(imageUri);
    if (!response.ok) {
      console.error('uploadProfileAvatar: Failed to fetch image:', response.status);
      return {
        success: false,
        error: 'Failed to read image file.',
      };
    }

    const blob = await response.blob();
    console.log('uploadProfileAvatar: Blob size:', blob.size, 'bytes');

    // Check file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (blob.size > maxSize) {
      console.error('uploadProfileAvatar: File too large:', blob.size);
      return {
        success: false,
        error: 'Image is too large. Please use an image smaller than 5MB.',
      };
    }

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('profile-avatars')
      .upload(filePath, blob, {
        contentType: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`,
        upsert: true,
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

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('profile-avatars')
      .getPublicUrl(filePath);

    const publicUrl = urlData.publicUrl;
    console.log('uploadProfileAvatar: Public URL:', publicUrl);

    // Verify the URL is accessible
    try {
      const verifyResponse = await fetch(publicUrl, { method: 'HEAD' });
      if (!verifyResponse.ok) {
        console.warn('uploadProfileAvatar: URL verification failed:', verifyResponse.status);
      } else {
        console.log('uploadProfileAvatar: URL verified successfully');
      }
    } catch (verifyError) {
      console.warn('uploadProfileAvatar: URL verification error:', verifyError);
    }

    return {
      success: true,
      url: publicUrl,
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

    // Extract the file path from the URL
    const urlParts = avatarUrl.split('/storage/v1/object/public/profile-avatars/');
    if (urlParts.length !== 2) {
      console.warn('deleteProfileAvatar: Invalid URL format, skipping deletion');
      return;
    }

    const filePath = urlParts[1];
    console.log('deleteProfileAvatar: File path:', filePath);

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
