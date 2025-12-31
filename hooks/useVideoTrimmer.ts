
import { useState, useCallback } from 'react';
import VideoTrimmer from '@/modules/video-trimmer';

export type TrimStatus = 'idle' | 'trimming' | 'success' | 'error';

export interface UseVideoTrimmerResult {
  /**
   * Current status of the trim operation
   */
  status: TrimStatus;
  
  /**
   * Path to the trimmed video (available after successful trim)
   */
  trimmedPath: string | null;
  
  /**
   * Error message if trim failed
   */
  error: string | null;
  
  /**
   * Trim a video to the specified time range
   */
  trimVideo: (videoUri: string, startTime: number, endTime: number) => Promise<string | null>;
  
  /**
   * Reset the trimmer state
   */
  reset: () => void;
}

/**
 * Hook to trim videos using the native VideoTrimmer module
 * 
 * @example
 * ```typescript
 * const { status, trimmedPath, error, trimVideo, reset } = useVideoTrimmer();
 * 
 * const handleTrim = async () => {
 *   const result = await trimVideo('file:///path/to/video.mp4', 0, 5);
 *   if (result) {
 *     console.log('Trimmed video:', result);
 *   }
 * };
 * ```
 */
export function useVideoTrimmer(): UseVideoTrimmerResult {
  const [status, setStatus] = useState<TrimStatus>('idle');
  const [trimmedPath, setTrimmedPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const trimVideo = useCallback(async (
    videoUri: string,
    startTime: number,
    endTime: number
  ): Promise<string | null> => {
    try {
      console.log('[VideoTrimmer] Starting trim operation');
      console.log('[VideoTrimmer] Video URI:', videoUri);
      console.log('[VideoTrimmer] Time range:', startTime, '-', endTime);
      
      setStatus('trimming');
      setError(null);
      setTrimmedPath(null);

      // Validate duration
      const duration = endTime - startTime;
      if (duration > 5) {
        throw new Error('Trim duration must be 5 seconds or less');
      }

      if (duration <= 0) {
        throw new Error('End time must be greater than start time');
      }

      // Call the native module
      const result = await VideoTrimmer.trim(videoUri, startTime, endTime);
      
      console.log('[VideoTrimmer] ✓ Trim successful');
      console.log('[VideoTrimmer] Trimmed video path:', result);
      
      setTrimmedPath(result);
      setStatus('success');
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('[VideoTrimmer] ✗ Trim failed:', errorMessage);
      
      setError(errorMessage);
      setStatus('error');
      
      return null;
    }
  }, []);

  const reset = useCallback(() => {
    setStatus('idle');
    setTrimmedPath(null);
    setError(null);
  }, []);

  return {
    status,
    trimmedPath,
    error,
    trimVideo,
    reset,
  };
}
