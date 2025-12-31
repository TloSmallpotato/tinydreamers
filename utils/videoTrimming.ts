
import VideoTrimmer from '@/modules/video-trimmer';
import { supabase } from '@/app/integrations/supabase/client';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';

/**
 * Utility functions for video trimming operations
 */

/**
 * Trim a video and upload it to Supabase storage
 * 
 * @param videoUri - URI of the video to trim
 * @param startTime - Start time in seconds
 * @param endTime - End time in seconds
 * @param bucketName - Supabase storage bucket name (default: 'video-moments')
 * @returns Object with the storage path and public URL, or null if failed
 */
export async function trimAndUploadVideo(
  videoUri: string,
  startTime: number,
  endTime: number,
  bucketName: string = 'video-moments'
): Promise<{ path: string; url: string } | null> {
  try {
    console.log('[VideoTrimming] Starting trim and upload process');
    console.log('[VideoTrimming] Video URI:', videoUri);
    console.log('[VideoTrimming] Time range:', startTime, '-', endTime);

    // Step 1: Trim the video
    console.log('[VideoTrimming] Step 1: Trimming video...');
    const trimmedPath = await VideoTrimmer.trim(videoUri, startTime, endTime);
    console.log('[VideoTrimming] ✓ Video trimmed:', trimmedPath);

    // Step 2: Read the trimmed file
    console.log('[VideoTrimming] Step 2: Reading trimmed file...');
    const fileData = await FileSystem.readAsStringAsync(trimmedPath, {
      encoding: FileSystem.EncodingType.Base64,
    });
    console.log('[VideoTrimming] ✓ File read successfully');

    // Step 3: Upload to Supabase
    console.log('[VideoTrimming] Step 3: Uploading to Supabase...');
    const fileName = `trimmed_${Date.now()}.mp4`;
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(fileName, decode(fileData), {
        contentType: 'video/mp4',
        upsert: false,
      });

    if (error) {
      console.error('[VideoTrimming] Upload error:', error);
      throw error;
    }

    console.log('[VideoTrimming] ✓ Upload successful');

    // Step 4: Get public URL
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(data.path);

    console.log('[VideoTrimming] ✓ Process complete');
    console.log('[VideoTrimming] Storage path:', data.path);
    console.log('[VideoTrimming] Public URL:', urlData.publicUrl);

    // Step 5: Clean up temporary file
    try {
      await FileSystem.deleteAsync(trimmedPath, { idempotent: true });
      console.log('[VideoTrimming] ✓ Temporary file cleaned up');
    } catch (cleanupError) {
      console.warn('[VideoTrimming] Failed to clean up temp file:', cleanupError);
    }

    return {
      path: data.path,
      url: urlData.publicUrl,
    };
  } catch (error) {
    console.error('[VideoTrimming] Process failed:', error);
    return null;
  }
}

/**
 * Trim multiple video segments and upload them
 * 
 * @param segments - Array of video segments to trim
 * @param bucketName - Supabase storage bucket name
 * @returns Array of upload results
 */
export async function trimAndUploadMultipleVideos(
  segments: Array<{
    videoUri: string;
    startTime: number;
    endTime: number;
  }>,
  bucketName: string = 'video-moments'
): Promise<Array<{ path: string; url: string } | null>> {
  console.log('[VideoTrimming] Processing', segments.length, 'video segments');

  const results = [];

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    console.log(`[VideoTrimming] Processing segment ${i + 1}/${segments.length}`);

    const result = await trimAndUploadVideo(
      segment.videoUri,
      segment.startTime,
      segment.endTime,
      bucketName
    );

    results.push(result);
  }

  console.log('[VideoTrimming] ✓ All segments processed');
  return results;
}

/**
 * Validate trim parameters
 * 
 * @param startTime - Start time in seconds
 * @param endTime - End time in seconds
 * @param maxDuration - Maximum allowed duration (default: 5 seconds)
 * @returns Validation result with error message if invalid
 */
export function validateTrimParams(
  startTime: number,
  endTime: number,
  maxDuration: number = 5
): { valid: boolean; error?: string } {
  if (startTime < 0) {
    return { valid: false, error: 'Start time must be non-negative' };
  }

  if (endTime <= startTime) {
    return { valid: false, error: 'End time must be greater than start time' };
  }

  const duration = endTime - startTime;
  if (duration > maxDuration) {
    return {
      valid: false,
      error: `Duration must be ${maxDuration} seconds or less (got ${duration.toFixed(2)}s)`,
    };
  }

  return { valid: true };
}

/**
 * Clean URI by removing file:// prefix
 * 
 * @param uri - Video URI
 * @returns Clean file path
 */
export function cleanVideoUri(uri: string): string {
  return uri.replace(/^file:\/\//, '');
}

/**
 * Format time in seconds to MM:SS format
 * 
 * @param seconds - Time in seconds
 * @returns Formatted time string
 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Calculate trim duration
 * 
 * @param startTime - Start time in seconds
 * @param endTime - End time in seconds
 * @returns Duration in seconds
 */
export function calculateDuration(startTime: number, endTime: number): number {
  return endTime - startTime;
}
