
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
  const [isInitialized, setIsInitialized] = useState(false);

  // Create video player
  const player = useVideoPlayer(videoUri, (player) => {
    player.loop = false;
  });

  // Listen to playing state changes
  const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: player.playing });

  // Get video duration and initialize
  useEffect(() => {
    if (!visible) {
      setIsInitialized(false);
      return;
    }

    const checkDuration = () => {
      if (player.duration > 0 && videoDuration === 0) {
        const durationInSeconds = player.duration;
        setVideoDuration(durationInSeconds);
        console.log('FullScreenVideoPlayer: Video duration:', durationInSeconds, 'seconds');
        console.log('FullScreenVideoPlayer: Trim range:', trimStart, '-', trimEnd || durationInSeconds);
      }
    };

    checkDuration();
    const interval = setInterval(checkDuration, 100);

    return () => clearInterval(interval);
  }, [visible, player.duration, videoDuration, trimStart, trimEnd]);

  // Initialize playback when modal opens
  useEffect(() => {
    if (visible && videoDuration > 0 && !isInitialized) {
      console.log('FullScreenVideoPlayer: Initializing playback at trim start:', trimStart);
      player.currentTime = trimStart;
      player.play();
      setIsInitialized(true);
    }
  }, [visible, videoDuration, trimStart, isInitialized]);

  // Monitor playback position and enforce trim boundaries
  useEffect(() => {
    if (!visible || !isInitialized) return;

    const interval = setInterval(() => {
      const currentPosition = player.currentTime;
      const effectiveTrimEnd = trimEnd || videoDuration;
      
      // Only enforce boundaries if we have valid trim times
      if (effectiveTrimEnd > 0) {
        // Check if we've reached or exceeded the trim end
        if (currentPosition >= effectiveTrimEnd - 0.05) {
          console.log('FullScreenVideoPlayer: Reached trim end at', currentPosition.toFixed(2), 's, looping to', trimStart, 's');
          player.pause();
          player.currentTime = trimStart;
          
          // Auto-play again to create seamless loop
          setTimeout(() => {
            player.play();
          }, 50);
          return;
        }
        
        // If somehow we're before trim start (shouldn't happen, but safety check)
        if (currentPosition < trimStart - 0.05) {
          console.log('FullScreenVideoPlayer: Before trim start at', currentPosition.toFixed(2), 's, jumping to', trimStart, 's');
          player.currentTime = trimStart;
          return;
        }
        
        // If we somehow jumped way past the trim end (e.g., user seeked), reset
        if (currentPosition > effectiveTrimEnd + 0.5) {
          console.log('FullScreenVideoPlayer: Way past trim end at', currentPosition.toFixed(2), 's, resetting to', trimStart, 's');
          player.pause();
          player.currentTime = trimStart;
          
          setTimeout(() => {
            player.play();
          }, 50);
          return;
        }
      }
    }, 50); // Check every 50ms for precise trimming

    return () => clearInterval(interval);
  }, [visible, isInitialized, player, trimStart, trimEnd, videoDuration]);

  // Clean up when modal closes
  useEffect(() => {
    if (!visible) {
      player.pause();
      player.currentTime = 0;
    }
  }, [visible]);

  const togglePlayback = () => {
    if (isPlaying) {
      player.pause();
    } else {
      // If at the end of trim range, restart from trim start
      const effectiveTrimEnd = trimEnd || videoDuration;
      if (player.currentTime >= effectiveTrimEnd - 0.1 || player.currentTime < trimStart) {
        player.currentTime = trimStart;
      }
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
