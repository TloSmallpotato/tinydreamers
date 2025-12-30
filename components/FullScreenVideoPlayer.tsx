
import React, { useRef, useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Modal, StatusBar } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEvent } from 'expo';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { colors } from '@/styles/commonStyles';

interface FullScreenVideoPlayerProps {
  visible: boolean;
  videoUri: string;
  trimStart?: number;
  trimEnd?: number;
  onClose: () => void;
}

export default function FullScreenVideoPlayer({
  visible,
  videoUri,
  trimStart = 0,
  trimEnd,
  onClose,
}: FullScreenVideoPlayerProps) {
  const [videoDuration, setVideoDuration] = useState(0);
  const lastPositionRef = useRef<number>(0);

  // Create video player
  const player = useVideoPlayer(videoUri, (player) => {
    player.loop = false;
    player.play();
  });

  // Listen to playing state changes
  const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: player.playing });

  // Reset video position when modal opens
  useEffect(() => {
    if (visible) {
      console.log('FullScreenVideoPlayer: Modal opened, setting initial position to trim start:', trimStart);
      player.currentTime = trimStart;
      player.play();
      lastPositionRef.current = trimStart;
    }
  }, [visible, trimStart]);

  // Get video duration
  useEffect(() => {
    if (player.duration > 0 && videoDuration === 0) {
      const durationInSeconds = player.duration;
      setVideoDuration(durationInSeconds);
      console.log('FullScreenVideoPlayer: Video duration:', durationInSeconds, 'seconds');
    }
  }, [player.duration, videoDuration]);

  // Monitor playback position and enforce trim boundaries
  useEffect(() => {
    if (!visible) return;

    const interval = setInterval(() => {
      const currentPosition = player.currentTime;
      const effectiveTrimEnd = trimEnd || videoDuration;
      
      // If we have trim times, enforce strict boundaries
      if (trimStart !== undefined && effectiveTrimEnd > 0) {
        // Check if we've reached or exceeded the trim end
        // Use a small buffer (0.1s) to catch the boundary before it's too late
        if (currentPosition >= effectiveTrimEnd - 0.1) {
          console.log('FullScreenVideoPlayer: Reached trim end at', currentPosition, 's, looping to trim start', trimStart, 's');
          player.currentTime = trimStart;
          lastPositionRef.current = trimStart;
          
          // Continue playing if it was playing
          if (player.playing) {
            player.play();
          }
          return;
        }
        
        // If somehow we're before trim start (shouldn't happen, but safety check)
        if (currentPosition < trimStart && player.playing) {
          console.log('FullScreenVideoPlayer: Before trim start at', currentPosition, 's, jumping to trim start', trimStart, 's');
          player.currentTime = trimStart;
          lastPositionRef.current = trimStart;
          return;
        }
        
        // If we somehow jumped way past the trim end (e.g., user seeked), reset
        if (currentPosition > effectiveTrimEnd + 0.5) {
          console.log('FullScreenVideoPlayer: Way past trim end at', currentPosition, 's, resetting to trim start', trimStart, 's');
          player.currentTime = trimStart;
          lastPositionRef.current = trimStart;
          
          if (player.playing) {
            player.play();
          }
          return;
        }
      }
      
      lastPositionRef.current = currentPosition;
    }, 50); // Check every 50ms for precise trimming

    return () => clearInterval(interval);
  }, [visible, player, trimStart, trimEnd, videoDuration]);

  const togglePlayback = () => {
    if (isPlaying) {
      player.pause();
    } else {
      player.play();
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
          onPress={togglePlayback}
          activeOpacity={1}
        >
          <VideoView
            player={player}
            style={styles.video}
            contentFit="contain"
            nativeControls={false}
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
