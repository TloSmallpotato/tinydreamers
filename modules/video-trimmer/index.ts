
import { NativeModulesProxy, EventEmitter, Subscription } from 'expo-modules-core';

// Import the native module. On web, it will be resolved to VideoTrimmer.web.ts
// and on native platforms to VideoTrimmerModule.swift
import VideoTrimmerModule from './src/VideoTrimmerModule';

/**
 * Trims a video to a specified time range and exports it as a new MP4 file.
 * 
 * @param path - Local file path to the video (without file:// prefix)
 * @param startTime - Start time in seconds
 * @param endTime - End time in seconds
 * @returns Promise that resolves with the path to the trimmed video file
 * 
 * @example
 * ```typescript
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
export async function trim(
  path: string,
  startTime: number,
  endTime: number
): Promise<string> {
  // Validate inputs
  if (!path) {
    throw new Error('Video path is required');
  }
  
  if (startTime < 0) {
    throw new Error('Start time must be non-negative');
  }
  
  if (endTime <= startTime) {
    throw new Error('End time must be greater than start time');
  }
  
  if (endTime - startTime > 5) {
    throw new Error('Trim duration must be 5 seconds or less');
  }
  
  // Remove file:// prefix if present
  const cleanPath = path.replace(/^file:\/\//, '');
  
  return await VideoTrimmerModule.trim(cleanPath, startTime, endTime);
}

export default {
  trim,
};
