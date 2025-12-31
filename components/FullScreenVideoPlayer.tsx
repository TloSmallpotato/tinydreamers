
import React, { useRef, useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Modal, StatusBar } from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { colors } from '@/styles/commonStyles';
import { Image } from 'expo-image';

interface FullScreenVideoPlayerProps {
  visible: boolean;
  videoUri: string;
  thumbnailUri?: string | null; // Optional thumbnail to display initially
  onClose: () => void;
  trimStart?: number; // Start time in seconds
  trimEnd?: number;   // End time in seconds
}

export default function FullScreenVideoPlayer({
  visible,
  videoUri,
  thumbnailUri,
  onClose,
  trimStart = 0,
  trimEnd,
}: FullScreenVideoPlayerProps) {
  const videoRef = useRef<Video>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPosition, setCurrentPosition] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [isVideoReady, setIsVideoReady] = useState(false); // Video is loaded AND seeked to trimStart
  const [showVideo, setShowVideo] = useState(false); // Controls whether to show video or thumbnail
  const isSeekingRef = useRef(false);
  const hasInitializedRef = useRef(false);

  // Calculate effective trim range
  const effectiveTrimStart = trimStart || 0;
  const effectiveTrimEnd = trimEnd || videoDuration;

  // Log trim metadata for debugging
  useEffect(() => {
    console.log('[FullScreenVideoPlayer] Trim metadata:', {
      trimStart: effectiveTrimStart,
      trimEnd: effectiveTrimEnd,
      hasTrimming: trimStart !== undefined || trimEnd !== undefined,
      thumbnailUri,
    });
  }, [effectiveTrimStart, effectiveTrimEnd, trimStart, trimEnd, thumbnailUri]);

  // Reset initialization when modal closes
  useEffect(() => {
    if (!visible) {
      hasInitializedRef.current = false;
      setIsVideoReady(false);
      setIsPlaying(false);
      setVideoDuration(0);
      setCurrentPosition(0);
      setShowVideo(false);
      console.log('[FullScreenVideoPlayer] Modal closed, reset state');
    }
  }, [visible]);

  // 1️⃣ ENFORCEMENT POINT: Handle thumbnail tap - load and play video
  const handleThumbnailTap = async () => {
    if (showVideo) return;
    
    console.log('[FullScreenVideoPlayer] Thumbnail tapped, loading video...');
    setShowVideo(true);
    
    // The video will start loading and we'll seek to trimStart in onPlaybackStatusUpdate
  };

  // 2️⃣ ENFORCEMENT POINT: Before Play - Seek to trimStart if needed
  const handlePlayPress = async () => {
    if (!videoRef.current || !isVideoReady) {
      console.log('[FullScreenVideoPlayer] Video not ready for playback');
      return;
    }

    // Prevent multiple simultaneous operations
    if (isSeekingRef.current) {
      console.log('[FullScreenVideoPlayer] Seek in progress, ignoring play press');
      return;
    }

    try {
      if (isPlaying) {
        // Pause
        console.log('[FullScreenVideoPlayer] Pausing playback');
        await videoRef.current.pauseAsync();
        setIsPlaying(false);
      } else {
        // Before playing, check if position is within trim range
        const status = await videoRef.current.getStatusAsync();
        
        if (status.isLoaded) {
          const positionSeconds = (status.positionMillis || 0) / 1000;
          
          console.log('[FullScreenVideoPlayer] Before play - Current position:', positionSeconds);
          console.log('[FullScreenVideoPlayer] Before play - Trim range:', effectiveTrimStart, '-', effectiveTrimEnd);
          
          // If position is outside trim range, seek to trim start
          if (positionSeconds < effectiveTrimStart || positionSeconds >= effectiveTrimEnd) {
            console.log('[FullScreenVideoPlayer] ⚠️ Position outside trim range, seeking to trim start');
            isSeekingRef.current = true;
            await videoRef.current.setPositionAsync(effectiveTrimStart * 1000);
            isSeekingRef.current = false;
            console.log('[FullScreenVideoPlayer] ✓ Seeked to trim start before play');
          }
        }
        
        // Play
        console.log('[FullScreenVideoPlayer] Starting playback');
        await videoRef.current.playAsync();
        setIsPlaying(true);
      }
    } catch (err) {
      console.error('[FullScreenVideoPlayer] Error toggling playback:', err);
      isSeekingRef.current = false;
    }
  };

  // 3️⃣ ENFORCEMENT POINT: On Playback Status Update - Hard stop at trimEnd
  const handlePlaybackStatusUpdate = async (status: AVPlaybackStatus) => {
    if (!status.isLoaded) {
      console.log('[FullScreenVideoPlayer] Status not loaded');
      return;
    }

    // Update duration if available
    if (status.durationMillis && videoDuration === 0) {
      const durationSeconds = status.durationMillis / 1000;
      console.log('[FullScreenVideoPlayer] Video duration:', durationSeconds, 'seconds');
      setVideoDuration(durationSeconds);
    }

    // 🔹 CRITICAL: Seek to trimStart as soon as video is loaded (only once)
    if (!hasInitializedRef.current && status.durationMillis && showVideo) {
      hasInitializedRef.current = true;
      
      console.log('[FullScreenVideoPlayer] 🎬 Video loaded, seeking to trim start...');
      
      try {
        // Pause first
        await videoRef.current?.pauseAsync();
        
        // Seek to trim start
        isSeekingRef.current = true;
        await videoRef.current?.setPositionAsync(effectiveTrimStart * 1000);
        isSeekingRef.current = false;
        
        // Mark as ready
        setIsVideoReady(true);
        setCurrentPosition(effectiveTrimStart);
        setIsPlaying(false);
        
        console.log('[FullScreenVideoPlayer] ✅ Video ready at trim start:', effectiveTrimStart, 'seconds');
      } catch (err) {
        console.error('[FullScreenVideoPlayer] ❌ Error seeking to trim start:', err);
        isSeekingRef.current = false;
        hasInitializedRef.current = false; // Allow retry
      }
    }

    // Update current position
    const positionSeconds = (status.positionMillis || 0) / 1000;
    setCurrentPosition(positionSeconds);

    // Update playing state
    setIsPlaying(status.isPlaying);

    // Skip enforcement if we're currently seeking or video not ready
    if (isSeekingRef.current || !isVideoReady) {
      return;
    }

    // CRITICAL: Hard-stop playback at trimEnd
    if (status.isPlaying && effectiveTrimEnd > 0 && positionSeconds >= effectiveTrimEnd) {
      console.log('[FullScreenVideoPlayer] 🛑 Reached trim end, stopping playback');
      console.log('[FullScreenVideoPlayer] Position:', positionSeconds, 'Trim end:', effectiveTrimEnd);
      
      try {
        isSeekingRef.current = true;
        
        // Pause playback
        await videoRef.current?.pauseAsync();
        
        // Seek back to trim start
        await videoRef.current?.setPositionAsync(effectiveTrimStart * 1000);
        
        // Update state
        setIsPlaying(false);
        setCurrentPosition(effectiveTrimStart);
        
        isSeekingRef.current = false;
        console.log('[FullScreenVideoPlayer] ✓ Stopped and reset to trim start');
      } catch (err) {
        console.error('[FullScreenVideoPlayer] Error stopping at trim end:', err);
        isSeekingRef.current = false;
      }
    }

    // 4️⃣ ENFORCEMENT POINT: Prevent background looping past trim range
    // If position goes outside trim range (e.g., from seeking), snap back
    if (!status.isPlaying && effectiveTrimEnd > 0) {
      if (positionSeconds < effectiveTrimStart - 0.1) {
        console.log('[FullScreenVideoPlayer] ⚠️ Position below trim start, snapping back');
        isSeekingRef.current = true;
        await videoRef.current?.setPositionAsync(effectiveTrimStart * 1000);
        isSeekingRef.current = false;
      } else if (positionSeconds > effectiveTrimEnd + 0.1) {
        console.log('[FullScreenVideoPlayer] ⚠️ Position above trim end, snapping back');
        isSeekingRef.current = true;
        await videoRef.current?.setPositionAsync(effectiveTrimStart * 1000);
        isSeekingRef.current = false;
      }
    }
  };

  // Handle manual seeking (if we add a scrubber in the future)
  const handleSeek = async (positionSeconds: number) => {
    if (!videoRef.current || !isVideoReady || isSeekingRef.current) return;

    try {
      isSeekingRef.current = true;
      
      // 5️⃣ ENFORCEMENT POINT: Clamp seek position within trim range
      let clampedPosition = positionSeconds;
      
      if (effectiveTrimEnd > 0) {
        if (positionSeconds < effectiveTrimStart) {
          console.log('[FullScreenVideoPlayer] Seek clamped to trim start');
          clampedPosition = effectiveTrimStart;
        } else if (positionSeconds > effectiveTrimEnd) {
          console.log('[FullScreenVideoPlayer] Seek clamped to trim end');
          clampedPosition = effectiveTrimEnd;
        }
      }
      
      console.log('[FullScreenVideoPlayer] Seeking to:', clampedPosition);
      await videoRef.current.setPositionAsync(clampedPosition * 1000);
      
      setTimeout(() => {
        isSeekingRef.current = false;
      }, 100);
    } catch (err) {
      console.error('[FullScreenVideoPlayer] Error seeking:', err);
      isSeekingRef.current = false;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isSeekingRef.current = false;
      hasInitializedRef.current = false;
    };
  }, []);

  return (
    <Modal
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <StatusBar hidden />
      <View style={styles.container}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={onClose}
          activeOpacity={0.8}
        >
          <MaterialIcons name="close" size={32} color={colors.backgroundAlt} />
        </TouchableOpacity>

        {/* Show thumbnail initially if available */}
        {!showVideo && thumbnailUri ? (
          <TouchableOpacity
            style={styles.thumbnailContainer}
            onPress={handleThumbnailTap}
            activeOpacity={0.9}
          >
            <Image
              source={{ uri: thumbnailUri }}
              style={styles.thumbnail}
              contentFit="contain"
              transition={200}
            />
            <View style={styles.playButtonOverlay}>
              <View style={styles.playButton}>
                <MaterialIcons
                  name="play-arrow"
                  size={64}
                  color={colors.backgroundAlt}
                />
              </View>
            </View>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.videoContainer}
            onPress={handlePlayPress}
            activeOpacity={1}
          >
            <Video
              ref={videoRef}
              source={{ uri: videoUri }}
              style={styles.video}
              resizeMode={ResizeMode.CONTAIN}
              isLooping={false} // IMPORTANT: Disable looping for hybrid mode
              shouldPlay={false} // IMPORTANT: Don't auto-play, we control it manually
              onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
            />

            {/* Show play button when paused and video is ready */}
            {!isPlaying && isVideoReady && (
              <View style={styles.playButtonOverlay}>
                <View style={styles.playButton}>
                  <MaterialIcons
                    name="play-arrow"
                    size={64}
                    color={colors.backgroundAlt}
                  />
                </View>
              </View>
            )}
          </TouchableOpacity>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  thumbnailContainer: {
    width: '100%',
    height: '100%',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  videoContainer: {
    width: '100%',
    height: '100%',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  playButtonOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
