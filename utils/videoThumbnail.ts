
import { File, Directory, Paths } from 'expo-file-system';

/**
 * Generates a thumbnail from a video file and saves it to persistent storage.
 * 
 * Note: Due to limitations with expo-video's VideoThumbnail being a native reference,
 * we're currently skipping thumbnail generation. The app will work without thumbnails,
 * or you can implement a server-side thumbnail generation solution.
 * 
 * @param videoUri - The URI of the video file
 * @returns The URI of the saved thumbnail, or null if generation failed
 */
export async function generateVideoThumbnail(videoUri: string): Promise<string | null> {
  try {
    console.log('[Thumbnail] Thumbnail generation requested for:', videoUri);
    console.log('[Thumbnail] Skipping thumbnail generation (not implemented yet)');
    
    // For now, we'll return null to indicate no thumbnail
    // The app should handle this gracefully by not showing a thumbnail
    // or by using the video URL directly (some video players can show first frame)
    
    return null;
    
  } catch (error) {
    console.error('[Thumbnail] Error in thumbnail generation:', error);
    return null;
  }
}

/**
 * Uploads a thumbnail file to Supabase Storage.
 * 
 * @param thumbnailUri - The local URI of the thumbnail file
 * @param childId - The ID of the child (for organizing files)
 * @param supabase - The Supabase client instance
 * @returns The public URL of the uploaded thumbnail, or null if upload failed
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
    
    // Create a File instance from the URI
    const thumbnailFile = new File(thumbnailUri);
    
    // Verify the file exists
    if (!thumbnailFile.exists) {
      console.error('[Upload] Thumbnail file does not exist:', thumbnailUri);
      return null;
    }
    
    console.log('[Upload] File exists, size:', thumbnailFile.size, 'bytes');
    
    // Read the file as bytes (Uint8Array)
    const fileBytes = await thumbnailFile.bytes();
    console.log('[Upload] Read', fileBytes.length, 'bytes from file');
    
    // Create a unique filename in Supabase storage
    const timestamp = Date.now();
    const supabaseFileName = `${childId}/${timestamp}_thumb.jpg`;
    
    console.log('[Upload] Uploading to Supabase as:', supabaseFileName);
    
    // Upload directly to Supabase without Base64 conversion
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('video-moments')
      .upload(supabaseFileName, fileBytes, {
        contentType: 'image/jpeg',
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('[Upload] Supabase upload error:', uploadError);
      return null;
    }

    console.log('[Upload] Upload successful:', uploadData);

    // Get the public URL
    const { data: urlData } = supabase.storage
      .from('video-moments')
      .getPublicUrl(supabaseFileName);

    console.log('[Upload] Public URL:', urlData.publicUrl);
    return urlData.publicUrl;
    
  } catch (error) {
    console.error('[Upload] Error uploading thumbnail:', error);
    return null;
  }
}

/**
 * Uploads a video file to Supabase Storage.
 * 
 * @param videoUri - The local URI of the video file
 * @param childId - The ID of the child (for organizing files)
 * @param supabase - The Supabase client instance
 * @returns The public URL of the uploaded video, or null if upload failed
 */
export async function uploadVideoToSupabase(
  videoUri: string,
  childId: string,
  supabase: any
): Promise<string | null> {
  try {
    console.log('[Video Upload] Starting video upload:', videoUri);
    
    // Create a File instance from the URI
    const videoFile = new File(videoUri);
    
    // Verify the file exists
    if (!videoFile.exists) {
      console.error('[Video Upload] Video file does not exist:', videoUri);
      return null;
    }
    
    console.log('[Video Upload] File exists, size:', videoFile.size, 'bytes');
    
    // Read the file as bytes (Uint8Array)
    const fileBytes = await videoFile.bytes();
    console.log('[Video Upload] Read', fileBytes.length, 'bytes from file');
    
    // Create a unique filename in Supabase storage
    const timestamp = Date.now();
    const supabaseFileName = `${childId}/${timestamp}.mp4`;
    
    console.log('[Video Upload] Uploading to Supabase as:', supabaseFileName);
    
    // Upload directly to Supabase without Base64 conversion
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('video-moments')
      .upload(supabaseFileName, fileBytes, {
        contentType: 'video/mp4',
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('[Video Upload] Supabase upload error:', uploadError);
      return null;
    }

    console.log('[Video Upload] Upload successful:', uploadData);

    // Get the public URL
    const { data: urlData } = supabase.storage
      .from('video-moments')
      .getPublicUrl(supabaseFileName);

    console.log('[Video Upload] Public URL:', urlData.publicUrl);
    return urlData.publicUrl;
    
  } catch (error) {
    console.error('[Video Upload] Error uploading video:', error);
    return null;
  }
}
