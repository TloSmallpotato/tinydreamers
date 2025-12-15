
import { supabase } from '@/app/integrations/supabase/client';

/**
 * Generate a signed URL for a private video file
 * @param videoUrl - The full storage URL or path to the video
 * @param expiresIn - Expiration time in seconds (default: 1 hour)
 * @returns Signed URL or null if generation fails
 */
export async function getSignedVideoUrl(
  videoUrl: string,
  expiresIn: number = 3600
): Promise<string | null> {
  try {
    // Extract the path from the full URL if needed
    const path = extractStoragePath(videoUrl, 'video-moments');
    
    if (!path) {
      console.error('Failed to extract storage path from:', videoUrl);
      return null;
    }

    console.log('Generating signed URL for path:', path);

    const { data, error } = await supabase.storage
      .from('video-moments')
      .createSignedUrl(path, expiresIn);

    if (error) {
      console.error('Error generating signed URL:', error);
      return null;
    }

    if (!data?.signedUrl) {
      console.error('No signed URL returned');
      return null;
    }

    console.log('✓ Generated signed URL successfully');
    return data.signedUrl;
  } catch (error) {
    console.error('Exception generating signed URL:', error);
    return null;
  }
}

/**
 * Generate signed URLs for multiple videos
 * @param videoUrls - Array of video URLs
 * @param expiresIn - Expiration time in seconds (default: 1 hour)
 * @returns Array of signed URLs (null for failed generations)
 */
export async function getSignedVideoUrls(
  videoUrls: string[],
  expiresIn: number = 3600
): Promise<(string | null)[]> {
  return Promise.all(
    videoUrls.map(url => getSignedVideoUrl(url, expiresIn))
  );
}

/**
 * Generate a signed URL for a private thumbnail file
 * @param thumbnailUrl - The full storage URL or path to the thumbnail
 * @param expiresIn - Expiration time in seconds (default: 1 hour)
 * @returns Signed URL or null if generation fails
 */
export async function getSignedThumbnailUrl(
  thumbnailUrl: string,
  expiresIn: number = 3600
): Promise<string | null> {
  try {
    // Extract the path from the full URL if needed
    const path = extractStoragePath(thumbnailUrl, 'video-moments');
    
    if (!path) {
      console.error('Failed to extract storage path from:', thumbnailUrl);
      return null;
    }

    console.log('Generating signed URL for thumbnail path:', path);

    const { data, error } = await supabase.storage
      .from('video-moments')
      .createSignedUrl(path, expiresIn);

    if (error) {
      console.error('Error generating signed thumbnail URL:', error);
      return null;
    }

    if (!data?.signedUrl) {
      console.error('No signed thumbnail URL returned');
      return null;
    }

    console.log('✓ Generated signed thumbnail URL successfully');
    return data.signedUrl;
  } catch (error) {
    console.error('Exception generating signed thumbnail URL:', error);
    return null;
  }
}

/**
 * Extract the storage path from a full Supabase storage URL or return the path as-is
 * @param url - Full storage URL or path
 * @param bucketName - Name of the storage bucket
 * @returns Storage path or null if extraction fails
 */
function extractStoragePath(url: string, bucketName: string): string | null {
  try {
    // If it's already a path (doesn't start with http), return as-is
    if (!url.startsWith('http')) {
      console.log('Already a storage path:', url);
      return url;
    }

    // Parse the URL to extract the path
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;

    console.log('Extracting path from URL pathname:', pathname);

    // Pattern: /storage/v1/object/public/bucket-name/path
    // or: /storage/v1/object/sign/bucket-name/path
    const publicPattern = `/storage/v1/object/public/${bucketName}/`;
    const signPattern = `/storage/v1/object/sign/${bucketName}/`;
    
    if (pathname.includes(publicPattern)) {
      const extractedPath = pathname.split(publicPattern)[1];
      console.log('Extracted from public pattern:', extractedPath);
      return extractedPath;
    }
    
    if (pathname.includes(signPattern)) {
      const extractedPath = pathname.split(signPattern)[1];
      console.log('Extracted from sign pattern:', extractedPath);
      return extractedPath;
    }

    // Try to find bucket name in path and extract everything after it
    const bucketIndex = pathname.indexOf(`/${bucketName}/`);
    if (bucketIndex !== -1) {
      const extractedPath = pathname.substring(bucketIndex + bucketName.length + 2);
      console.log('Extracted from bucket index:', extractedPath);
      return extractedPath;
    }

    console.warn('Could not extract path from URL:', url);
    return null;
  } catch (error) {
    console.error('Error extracting storage path:', error);
    return null;
  }
}

/**
 * Process moments data to include signed URLs
 * @param moments - Array of moment objects with video_url and thumbnail_url
 * @param expiresIn - Expiration time in seconds (default: 1 hour)
 * @returns Moments with signed URLs
 */
export async function processMomentsWithSignedUrls<T extends { video_url: string; thumbnail_url?: string | null }>(
  moments: T[],
  expiresIn: number = 3600
): Promise<(T & { signedVideoUrl: string | null; signedThumbnailUrl: string | null })[]> {
  const processedMoments = await Promise.all(
    moments.map(async (moment) => {
      const signedVideoUrl = await getSignedVideoUrl(moment.video_url, expiresIn);
      const signedThumbnailUrl = moment.thumbnail_url 
        ? await getSignedThumbnailUrl(moment.thumbnail_url, expiresIn)
        : null;

      return {
        ...moment,
        signedVideoUrl,
        signedThumbnailUrl,
      };
    })
  );

  return processedMoments;
}
