
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
    console.log('pickProfileImage: URI type:', typeof imageUri);
    console.log('pickProfileImage: URI starts with:', imageUri.substring(0, 50));

    return imageUri;
  } catch (error) {
    console.error('pickProfileImage: Error:', error);
    return null;
  }
}

/**
 * Get a signed URL for an avatar that works on all platforms
 * @param filePath - The storage path of the file
 * @returns The signed URL or public URL depending on platform
 */
export async function getAvatarUrl(filePath: string): Promise<string> {
  try {
    console.log('getAvatarUrl: Getting URL for path:', filePath);
    console.log('getAvatarUrl: Platform:', Platform.OS);

    // For native platforms, use signed URLs to ensure authentication works
    if (Platform.OS !== 'web') {
      const { data, error } = await supabase.storage
        .from('profile-avatars')
        .createSignedUrl(filePath, 60 * 60 * 24 * 365); // 1 year expiry

      if (error) {
        console.error('getAvatarUrl: Error creating signed URL:', error);
        // Fallback to public URL
        const { data: publicData } = supabase.storage
          .from('profile-avatars')
          .getPublicUrl(filePath);
        
        console.log('getAvatarUrl: Falling back to public URL:', publicData.publicUrl);
        return publicData.publicUrl;
      }

      console.log('getAvatarUrl: Created signed URL:', data.signedUrl);
      return data.signedUrl;
    }

    // For web, public URLs work fine
    const { data: publicData } = supabase.storage
      .from('profile-avatars')
      .getPublicUrl(filePath);

    console.log('getAvatarUrl: Using public URL for web:', publicData.publicUrl);
    return publicData.publicUrl;
  } catch (error) {
    console.error('getAvatarUrl: Unexpected error:', error);
    
    // Final fallback to public URL
    const { data: publicData } = supabase.storage
      .from('profile-avatars')
      .getPublicUrl(filePath);
    
    return publicData.publicUrl;
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

    // Validate the URI format
    if (!imageUri || typeof imageUri !== 'string') {
      console.error('uploadProfileAvatar: Invalid URI type:', typeof imageUri);
      return {
        success: false,
        error: 'Invalid image URI',
      };
    }

    // Check if it's a local file URI
    const isLocalFile = imageUri.startsWith('file://') || 
                        imageUri.startsWith('content://') || 
                        imageUri.startsWith('ph://') ||
                        imageUri.startsWith('/');
    
    console.log('uploadProfileAvatar: Is local file:', isLocalFile);

    if (!isLocalFile) {
      console.error('uploadProfileAvatar: URI is not a local file:', imageUri);
      return {
        success: false,
        error: 'Selected image is not a local file. Please try again.',
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

    // Generate unique filename with child ID prefix
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

    // Check approximate file size (base64 is ~33% larger than binary)
    const approximateSize = (base64.length * 3) / 4;
    const maxSize = 5 * 1024 * 1024; // 5MB
    
    if (approximateSize > maxSize) {
      console.error('uploadProfileAvatar: File too large:', approximateSize);
      return {
        success: false,
        error: 'Image is too large. Please use an image smaller than 5MB.',
      };
    }

    if (base64.length === 0) {
      console.error('uploadProfileAvatar: Base64 string is empty');
      return {
        success: false,
        error: 'Failed to read image file. Please try again.',
      };
    }

    // Convert base64 to ArrayBuffer using base64-arraybuffer
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

    // Upload to Supabase Storage using ArrayBuffer
    console.log('uploadProfileAvatar: Uploading to Supabase Storage...');
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('profile-avatars')
      .upload(filePath, arrayBuffer, {
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

    // Wait a bit to ensure the file is fully available in storage
    console.log('uploadProfileAvatar: Waiting for storage to sync...');
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Get the appropriate URL for the platform
    const avatarUrl = await getAvatarUrl(filePath);
    console.log('uploadProfileAvatar: Final avatar URL:', avatarUrl);

    // Verify the image is accessible
    try {
      console.log('uploadProfileAvatar: Verifying image accessibility...');
      const response = await fetch(avatarUrl, { method: 'HEAD' });
      console.log('uploadProfileAvatar: Image accessibility check status:', response.status);
      
      if (!response.ok) {
        console.warn('uploadProfileAvatar: Image not immediately accessible (status:', response.status, '), but continuing...');
      } else {
        console.log('uploadProfileAvatar: Image is accessible!');
      }
    } catch (fetchError) {
      console.warn('uploadProfileAvatar: Could not verify image accessibility:', fetchError);
    }

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

    // Extract the file path from the URL
    // Handle both public URLs and signed URLs
    let filePath: string | null = null;

    // Try to extract from public URL format
    const publicUrlMatch = avatarUrl.match(/\/storage\/v1\/object\/public\/profile-avatars\/(.+?)(\?|$)/);
    if (publicUrlMatch) {
      filePath = publicUrlMatch[1];
    }

    // Try to extract from signed URL format
    if (!filePath) {
      const signedUrlMatch = avatarUrl.match(/\/storage\/v1\/object\/sign\/profile-avatars\/(.+?)\?/);
      if (signedUrlMatch) {
        filePath = signedUrlMatch[1];
      }
    }

    if (!filePath) {
      console.warn('deleteProfileAvatar: Could not extract file path from URL, skipping deletion');
      return;
    }

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
