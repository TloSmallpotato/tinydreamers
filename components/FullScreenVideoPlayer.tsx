
import React, { useRef, useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Modal, StatusBar } from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { colors } from '@/styles/commonStyles';

interface FullScreenVideoPlayerProps {
  visible: boolean;
  videoUri: string;
  onClose: () => void;
  trimStart?: number; // Start time in seconds
  trimEnd?: number;   // End time in seconds
}

export default function FullScreenVideoPlayer({
  visible,
  videoUri,
  onClose,
  trimStart = 0,
  trimEnd,
}: FullScreenVideoPlayerProps) {
  const videoRef = useRef<Video>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPosition, setCurrentPosition] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const isSeekingRef = useRef(false);

  // Calculate effective trim range
  const effectiveTrimStart = trimStart || 0;
  const effectiveTrimEnd = trimEnd || videoDuration;

  // Log trim metadata for debugging
  useEffect(() => {
    console.log('[FullScreenVideoPlayer] Trim metadata:', {
      trimStart: effectiveTrimStart,
      trimEnd: effectiveTrimEnd,
      hasTrimming: trimStart !== undefined || trimEnd !== undefined,
    });
  }, [effectiveTrimStart, effectiveTrimEnd, trimStart, trimEnd]);

  // Reset and seek to trim start when video becomes visible
  useEffect(() => {
    if (visible && videoRef.current) {
      console.log('[FullScreenVideoPlayer] Video became visible, seeking to trim start:', effectiveTrimStart);
      
      // Reset state
      setIsPlaying(false);
      setCurrentPosition(effectiveTrimStart);
      
      // Seek to trim start
      videoRef.current.setPositionAsync(effectiveTrimStart * 1000).then(() => {
        console.log('[FullScreenVideoPlayer] ✓ Seeked to trim start');
        // Auto-play after seeking
        videoRef.current?.playAsync().then(() => {
          console.log('[FullScreenVideoPlayer] ✓ Started playback');
          setIsPlaying(true);
        });
      }).catch(err => {
        console.error('[FullScreenVideoPlayer] Error seeking to trim start:', err);
      });
    }
  }, [visible, effectiveTrimStart]);

  // 1️⃣ ENFORCEMENT POINT: Before Play - Seek to trimStart if needed
  const handlePlayPress = async () => {
    if (!videoRef.current) return;

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
            await videoRef.current.setPositionAsync(effectiveTrimStart * 1000);
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
    }
  };

  // 2️⃣ ENFORCEMENT POINT: On Playback Status Update - Hard stop at trimEnd
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

    // Update current position
    const positionSeconds = (status.positionMillis || 0) / 1000;
    setCurrentPosition(positionSeconds);

    // Update playing state
    setIsPlaying(status.isPlaying);

    // CRITICAL: Hard-stop playback at trimEnd
    if (status.isPlaying && effectiveTrimEnd > 0 && positionSeconds >= effectiveTrimEnd) {
      console.log('[FullScreenVideoPlayer] 🛑 Reached trim end, stopping playback');
      console.log('[FullScreenVideoPlayer] Position:', positionSeconds, 'Trim end:', effectiveTrimEnd);
      
      try {
        // Pause playback
        await videoRef.current?.pauseAsync();
        
        // Seek back to trim start
        await videoRef.current?.setPositionAsync(effectiveTrimStart * 1000);
        
        // Update state
        setIsPlaying(false);
        setCurrentPosition(effectiveTrimStart);
        
        console.log('[FullScreenVideoPlayer] ✓ Stopped and reset to trim start');
      } catch (err) {
        console.error('[FullScreenVideoPlayer] Error stopping at trim end:', err);
      }
    }

    // 3️⃣ ENFORCEMENT POINT: Prevent background looping past trim range
    // If position goes outside trim range (e.g., from seeking), snap back
    if (!isSeekingRef.current && effectiveTrimEnd > 0) {
      if (positionSeconds < effectiveTrimStart) {
        console.log('[FullScreenVideoPlayer] ⚠️ Position below trim start, snapping back');
        await videoRef.current?.setPositionAsync(effectiveTrimStart * 1000);
      } else if (positionSeconds > effectiveTrimEnd) {
        console.log('[FullScreenVideoPlayer] ⚠️ Position above trim end, snapping back');
        await videoRef.current?.setPositionAsync(effectiveTrimStart * 1000);
      }
    }
  };

  // Handle manual seeking (if we add a scrubber in the future)
  const handleSeek = async (positionSeconds: number) => {
    if (!videoRef.current) return;

    try {
      isSeekingRef.current = true;
      
      // 3️⃣ ENFORCEMENT POINT: Clamp seek position within trim range
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

          {!isPlaying && (
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
