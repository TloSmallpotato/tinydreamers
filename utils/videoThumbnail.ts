
import * as VideoThumbnails from 'expo-video-thumbnails';
import { Platform } from 'react-native';

/**
 * Generates a thumbnail from a video file using expo-video-thumbnails.
 * This creates an actual image file that can be uploaded to Supabase.
 * 
 * @param videoUri - The URI of the video file
 * @returns The URI of the generated thumbnail file, or null if generation failed
 */
export async function generateVideoThumbnail(videoUri: string): Promise<string | null> {
  try {
    console.log('[Thumbnail] Starting thumbnail generation for:', videoUri);
    
    // Generate thumbnail at the first frame (time 0)
    const { uri } = await VideoThumbnails.getThumbnailAsync(
      videoUri,
      {
        time: 0, // Get thumbnail from the first frame
        quality: 0.8, // Good quality (0-1 scale)
      }
    );
    
    console.log('[Thumbnail] Thumbnail generated successfully:', uri);
    return uri;
    
  } catch (error) {
    console.error('[Thumbnail] Error generating thumbnail:', error);
    return null;
  }
}

/**
 * Uploads a thumbnail file to Supabase Storage.
 * Returns the storage path (not a public URL) since the bucket is private.
 * 
 * @param thumbnailUri - The local URI of the thumbnail file
 * @param childId - The ID of the child (for organizing files)
 * @param supabase - The Supabase client instance
 * @returns The storage path of the uploaded thumbnail, or null if upload failed
 */
export async function uploadThumbnailToSupabase(
  thumbnailUri: string,
  childId: string,
  supabase: any
): Promise<string | null> {
  try {
    console.log('[Upload] Starting thumbnail upload:', thumbnailUri);
    
    if (!thumbnailUri) {
      console.log('[Upload] No thumbnail URI provided, skipping upload');
      return null;
    }
    
    // Read the file as a blob/arraybuffer depending on platform
    let fileData: Blob | ArrayBuffer;
    
    if (Platform.OS === 'web') {
      // On web, fetch the file as a blob
      const response = await fetch(thumbnailUri);
      fileData = await response.blob();
      console.log('[Upload] Read blob from web, size:', fileData.size, 'bytes');
    } else {
      // On native, use expo-file-system to read the file
      const { File } = await import('expo-file-system');
      const thumbnailFile = new File(thumbnailUri);
      
      // Verify the file exists
      if (!thumbnailFile.exists) {
        console.error('[Upload] Thumbnail file does not exist:', thumbnailUri);
        return null;
      }
      
      console.log('[Upload] File exists, size:', thumbnailFile.size, 'bytes');
      
      // Read the file as bytes (Uint8Array)
      fileData = await thumbnailFile.bytes();
      console.log('[Upload] Read', fileData.byteLength, 'bytes from file');
    }
    
    // Create a unique filename in Supabase storage
    const timestamp = Date.now();
    const storagePath = `${childId}/${timestamp}_thumb.jpg`;
    
    console.log('[Upload] Uploading to Supabase as:', storagePath);
    
    // Upload to private bucket
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('video-moments')
      .upload(storagePath, fileData, {
        contentType: 'image/jpeg',
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('[Upload] Supabase upload error:', uploadError);
      return null;
    }

    console.log('[Upload] Upload successful:', uploadData);
    console.log('[Upload] Returning storage path (private bucket):', storagePath);

    // Return the storage path, not a public URL (bucket is private)
    return storagePath;
    
  } catch (error) {
    console.error('[Upload] Error uploading thumbnail:', error);
    return null;
  }
}

/**
 * Uploads a video file to Supabase Storage.
 * Returns the storage path (not a public URL) since the bucket is private.
 * 
 * @param videoUri - The local URI of the video file
 * @param childId - The ID of the child (for organizing files)
 * @param supabase - The Supabase client instance
 * @returns The storage path of the uploaded video, or null if upload failed
 */
export async function uploadVideoToSupabase(
  videoUri: string,
  childId: string,
  supabase: any
): Promise<string | null> {
  try {
    console.log('[Video Upload] Starting video upload:', videoUri);
    
    // Read the file as a blob/arraybuffer depending on platform
    let fileData: Blob | ArrayBuffer;
    
    if (Platform.OS === 'web') {
      // On web, fetch the file as a blob
      const response = await fetch(videoUri);
      fileData = await response.blob();
      console.log('[Video Upload] Read blob from web, size:', fileData.size, 'bytes');
    } else {
      // On native, use expo-file-system to read the file
      const { File } = await import('expo-file-system');
      const videoFile = new File(videoUri);
      
      // Verify the file exists
      if (!videoFile.exists) {
        console.error('[Video Upload] Video file does not exist:', videoUri);
        return null;
      }
      
      console.log('[Video Upload] File exists, size:', videoFile.size, 'bytes');
      
      // Read the file as bytes (Uint8Array)
      fileData = await videoFile.bytes();
      console.log('[Video Upload] Read', fileData.byteLength, 'bytes from file');
    }
    
    // Create a unique filename in Supabase storage
    const timestamp = Date.now();
    const storagePath = `${childId}/${timestamp}.mp4`;
    
    console.log('[Video Upload] Uploading to Supabase as:', storagePath);
    
    // Upload to private bucket
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('video-moments')
      .upload(storagePath, fileData, {
        contentType: 'video/mp4',
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('[Video Upload] Supabase upload error:', uploadError);
      return null;
    }

    console.log('[Video Upload] Upload successful:', uploadData);
    console.log('[Video Upload] Returning storage path (private bucket):', storagePath);

    // Return the storage path, not a public URL (bucket is private)
    return storagePath;
    
  } catch (error) {
    console.error('[Video Upload] Error uploading video:', error);
    return null;
  }
}
