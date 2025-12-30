
import React, { useRef, useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Modal, StatusBar } from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
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
  const videoRef = useRef<Video>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [videoDuration, setVideoDuration] = useState(0);

  // Reset video position when modal opens
  useEffect(() => {
    if (visible && videoRef.current) {
      console.log('FullScreenVideoPlayer: Setting initial position to trim start:', trimStart);
      videoRef.current.setPositionAsync(trimStart * 1000);
      videoRef.current.playAsync();
    }
  }, [visible, trimStart]);

  const togglePlayback = async () => {
    if (videoRef.current) {
      if (isPlaying) {
        await videoRef.current.pauseAsync();
      } else {
        await videoRef.current.playAsync();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handlePlaybackStatusUpdate = async (status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      setIsPlaying(status.isPlaying);
      
      // Store video duration
      if (status.durationMillis && videoDuration === 0) {
        setVideoDuration(status.durationMillis / 1000);
      }
      
      const currentPosition = (status.positionMillis || 0) / 1000;
      const effectiveTrimEnd = trimEnd || videoDuration;
      
      // If we have trim times, loop within the trimmed section
      if (trimStart !== undefined && effectiveTrimEnd > 0) {
        // When we reach the trim end, loop back to trim start
        if (currentPosition >= effectiveTrimEnd) {
          console.log('FullScreenVideoPlayer: Reached trim end, looping to trim start');
          await videoRef.current?.setPositionAsync(trimStart * 1000);
          if (status.isPlaying) {
            await videoRef.current?.playAsync();
          }
        }
        
        // If somehow we're before trim start, jump to trim start
        if (currentPosition < trimStart && status.isPlaying) {
          console.log('FullScreenVideoPlayer: Before trim start, jumping to trim start');
          await videoRef.current?.setPositionAsync(trimStart * 1000);
        }
      }
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
          <Video
            ref={videoRef}
            source={{ uri: videoUri }}
            style={styles.video}
            resizeMode={ResizeMode.CONTAIN}
            isLooping={false}
            shouldPlay={true}
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
