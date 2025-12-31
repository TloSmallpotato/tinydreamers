
import { supabase } from '@/app/integrations/supabase/client';
import { generateVideoThumbnail, uploadThumbnailToSupabase } from '@/utils/videoThumbnail';
import { getSignedVideoUrl } from '@/utils/videoStorage';

/**
 * Regenerates a thumbnail for a moment based on its trimStart value
 * and updates the database with the new thumbnail URL.
 * 
 * This ensures the grid thumbnail matches the actual video start point.
 * 
 * @param momentId - The ID of the moment to regenerate thumbnail for
 * @param videoUrl - The storage path or URL of the video
 * @param trimStart - The trim start time in seconds
 * @param childId - The child ID for organizing storage
 * @returns The new thumbnail storage path, or null if regeneration failed
 */
export async function regenerateMomentThumbnail(
  momentId: string,
  videoUrl: string,
  trimStart: number,
  childId: string
): Promise<string | null> {
  try {
    console.log('[ThumbnailRegen] Starting thumbnail regeneration for moment:', momentId);
    console.log('[ThumbnailRegen] Video URL:', videoUrl);
    console.log('[ThumbnailRegen] Trim start:', trimStart, 'seconds');
    console.log('[ThumbnailRegen] Child ID:', childId);

    // Step 1: Get a signed URL for the video if it's a storage path
    let videoUri = videoUrl;
    if (!videoUrl.startsWith('http') && !videoUrl.startsWith('file://')) {
      console.log('[ThumbnailRegen] Video URL is a storage path, generating signed URL...');
      const signedUrl = await getSignedVideoUrl(videoUrl, 3600);
      if (!signedUrl) {
        console.error('[ThumbnailRegen] Failed to generate signed URL for video');
        return null;
      }
      videoUri = signedUrl;
      console.log('[ThumbnailRegen] Generated signed URL:', videoUri);
    }

    // Step 2: Generate thumbnail at trimStart
    console.log('[ThumbnailRegen] Generating thumbnail at', trimStart, 'seconds...');
    const thumbnailUri = await generateVideoThumbnail(videoUri, trimStart);
    
    if (!thumbnailUri) {
      console.error('[ThumbnailRegen] Failed to generate thumbnail');
      return null;
    }
    
    console.log('[ThumbnailRegen] ✓ Thumbnail generated:', thumbnailUri);

    // Step 3: Upload thumbnail to Supabase with unique path
    // Use momentId and trimStart in the filename to ensure uniqueness
    console.log('[ThumbnailRegen] Uploading thumbnail to Supabase...');
    const thumbnailStoragePath = await uploadThumbnailToSupabase(
      thumbnailUri,
      childId,
      supabase
    );
    
    if (!thumbnailStoragePath) {
      console.error('[ThumbnailRegen] Failed to upload thumbnail to Supabase');
      return null;
    }
    
    console.log('[ThumbnailRegen] ✓ Thumbnail uploaded to:', thumbnailStoragePath);

    // Step 4: Update the moment in the database with the new thumbnail URL
    console.log('[ThumbnailRegen] Updating moment in database...');
    const { error: updateError } = await supabase
      .from('moments')
      .update({ 
        thumbnail_url: thumbnailStoragePath,
        updated_at: new Date().toISOString()
      })
      .eq('id', momentId);

    if (updateError) {
      console.error('[ThumbnailRegen] Error updating moment in database:', updateError);
      return null;
    }

    console.log('[ThumbnailRegen] ✅ Thumbnail regeneration complete!');
    console.log('[ThumbnailRegen] New thumbnail path:', thumbnailStoragePath);
    
    return thumbnailStoragePath;
  } catch (error) {
    console.error('[ThumbnailRegen] Exception during thumbnail regeneration:', error);
    return null;
  }
}

/**
 * Regenerates thumbnails for multiple moments in batch.
 * Useful for bulk operations or migrations.
 * 
 * @param moments - Array of moment objects with id, video_url, trim_start, and child_id
 * @returns Array of results with success status and new thumbnail paths
 */
export async function regenerateMomentThumbnailsBatch(
  moments: Array<{
    id: string;
    video_url: string;
    trim_start: number;
    child_id: string;
  }>
): Promise<Array<{ momentId: string; success: boolean; thumbnailPath: string | null }>> {
  console.log('[ThumbnailRegen] Starting batch regeneration for', moments.length, 'moments');
  
  const results = await Promise.all(
    moments.map(async (moment) => {
      const thumbnailPath = await regenerateMomentThumbnail(
        moment.id,
        moment.video_url,
        moment.trim_start || 0,
        moment.child_id
      );
      
      return {
        momentId: moment.id,
        success: thumbnailPath !== null,
        thumbnailPath,
      };
    })
  );

  const successCount = results.filter(r => r.success).length;
  console.log('[ThumbnailRegen] ✓ Batch regeneration complete:', successCount, '/', moments.length, 'successful');
  
  return results;
}
