
/**
 * VideoTrimmer Native Module
 * 
 * Provides native iOS video trimming functionality using AVFoundation.
 */

/**
 * Trims a video to a specified time range and exports it as a new MP4 file.
 * 
 * @param path - Local file path to the video (without file:// prefix)
 * @param startTime - Start time in seconds
 * @param endTime - End time in seconds (must be ≤ startTime + 5)
 * @returns Promise that resolves with the path to the trimmed video file
 * 
 * @throws {Error} If the video file doesn't exist
 * @throws {Error} If the time range is invalid
 * @throws {Error} If the duration exceeds 5 seconds
 * @throws {Error} If the export fails
 * 
 * @example
 * ```typescript
 * import VideoTrimmer from '@/modules/video-trimmer';
 * 
 * const videoUri = 'file:///path/to/video.mp4';
 * const cleanPath = videoUri.replace('file://', '');
 * 
 * try {
 *   const trimmedPath = await VideoTrimmer.trim(cleanPath, 0, 5);
 *   console.log('Trimmed video saved to:', trimmedPath);
 * } catch (error) {
 *   console.error('Trim failed:', error);
 * }
 * ```
 */
export function trim(
  path: string,
  startTime: number,
  endTime: number
): Promise<string>;

declare const VideoTrimmer: {
  trim: typeof trim;
};

export default VideoTrimmer;
