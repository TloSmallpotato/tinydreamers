
import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Platform, Alert, PanResponder } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/styles/commonStyles';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface VideoPreviewModalProps {
  videoUri: string;
  duration: number;
  onConfirm: (trimmedUri: string, startTime: number, endTime: number) => void;
  onCancel: () => void;
}

export default function VideoPreviewModal({
  videoUri,
  duration,
  onConfirm,
  onCancel,
}: VideoPreviewModalProps) {
  const videoRef = useRef<Video>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [actualDuration, setActualDuration] = useState(duration);
  const [currentPosition, setCurrentPosition] = useState(0);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(duration);
  const insets = useSafeAreaInsets();

  // Calculate video container height to fit within safe area
  const topSafeArea = insets.top || 44;
  const bottomSafeArea = insets.bottom || 34;
  const titleInfoHeight = 240; // Increased for trim controls
  const buttonsHeight = 100;
  const padding = 40;
  
  const maxVideoHeight = screenHeight - topSafeArea - titleInfoHeight - buttonsHeight - padding;
  const videoWidth = screenWidth - 40;
  const videoHeight = Math.min(videoWidth * (16 / 9), maxVideoHeight);

  useEffect(() => {
    // Load the video to get actual duration
    const loadVideo = async () => {
      if (videoRef.current) {
        try {
          const status = await videoRef.current.getStatusAsync();
          if (status.isLoaded && status.durationMillis) {
            const durationInSeconds = status.durationMillis / 1000;
            console.log('VideoPreviewModal: Actual video duration:', durationInSeconds, 'seconds');
            setActualDuration(durationInSeconds);
            setTrimEnd(durationInSeconds);
          }
        } catch (error) {
          console.error('VideoPreviewModal: Error getting video duration:', error);
        }
      }
    };

    loadVideo();
  }, [videoUri]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 10);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms}`;
  };

  const togglePlayback = async () => {
    if (videoRef.current) {
      if (isPlaying) {
        await videoRef.current.pauseAsync();
      } else {
        // If at the end of trim range, restart from trim start
        if (currentPosition >= trimEnd) {
          await videoRef.current.setPositionAsync(trimStart * 1000);
        }
        await videoRef.current.playAsync();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handlePlaybackStatusUpdate = async (status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      setIsPlaying(status.isPlaying);
      
      const positionSeconds = (status.positionMillis || 0) / 1000;
      setCurrentPosition(positionSeconds);
      
      // Update actual duration if we get it from playback status
      if (status.durationMillis && actualDuration === 0) {
        const durationInSeconds = status.durationMillis / 1000;
        console.log('VideoPreviewModal: Duration from playback status:', durationInSeconds, 'seconds');
        setActualDuration(durationInSeconds);
        setTrimEnd(durationInSeconds);
      }

      // Stop playback when reaching trim end
      if (status.isPlaying && positionSeconds >= trimEnd) {
        await videoRef.current?.pauseAsync();
        await videoRef.current?.setPositionAsync(trimStart * 1000);
        setIsPlaying(false);
      }

      // Keep playback within trim range
      if (positionSeconds < trimStart || positionSeconds > trimEnd) {
        if (status.isPlaying) {
          await videoRef.current?.setPositionAsync(trimStart * 1000);
        }
      }
    }
  };

  const handleTrimStartChange = async (value: number) => {
    const newStart = Math.min(value, trimEnd - 0.1); // Ensure at least 0.1s video
    setTrimStart(newStart);
    if (videoRef.current) {
      await videoRef.current.setPositionAsync(newStart * 1000);
    }
  };

  const handleTrimEndChange = (value: number) => {
    const newEnd = Math.max(value, trimStart + 0.1); // Ensure at least 0.1s video
    setTrimEnd(newEnd);
  };

  const handleConfirm = () => {
    const trimmedDuration = trimEnd - trimStart;
    
    if (trimmedDuration < 0.1) {
      Alert.alert('Invalid Trim', 'Video must be at least 0.1 seconds long');
      return;
    }

    console.log('Confirming video with trim:', { trimStart, trimEnd, duration: trimmedDuration });
    
    // Pass the original URI and trim times to parent
    // The actual trimming will be done during upload/processing
    onConfirm(videoUri, trimStart, trimEnd);
  };

  const getTrimmedDuration = () => {
    return trimEnd - trimStart;
  };

  // Simple trim adjustment buttons
  const adjustTrimStart = (delta: number) => {
    const newStart = Math.max(0, Math.min(trimStart + delta, trimEnd - 0.1));
    handleTrimStartChange(newStart);
  };

  const adjustTrimEnd = (delta: number) => {
    const newEnd = Math.max(trimStart + 0.1, Math.min(trimEnd + delta, actualDuration));
    handleTrimEndChange(newEnd);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <View style={[styles.videoContainer, { width: videoWidth, height: videoHeight }]}>
          <Video
            ref={videoRef}
            source={{ uri: videoUri }}
            style={styles.video}
            resizeMode={ResizeMode.CONTAIN}
            isLooping={false}
            shouldPlay={false}
            onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
          />
          
          <TouchableOpacity style={styles.playButton} onPress={togglePlayback}>
            <MaterialIcons
              name={isPlaying ? 'pause' : 'play-arrow'}
              size={48}
              color={colors.backgroundAlt}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.infoContainer}>
          <Text style={styles.title}>Video Recorded!</Text>
          <Text style={styles.subtitle}>
            Duration: {formatTime(getTrimmedDuration())} / {formatTime(actualDuration)}
          </Text>
          
          {/* Trim Controls */}
          <View style={styles.trimContainer}>
            <Text style={styles.trimLabel}>Trim Video</Text>
            
            <View style={styles.trimRow}>
              <Text style={styles.trimTime}>Start: {formatTime(trimStart)}</Text>
              <View style={styles.trimButtons}>
                <TouchableOpacity 
                  style={styles.trimButton} 
                  onPress={() => adjustTrimStart(-0.5)}
                >
                  <MaterialIcons name="remove" size={20} color={colors.backgroundAlt} />
                  <Text style={styles.trimButtonText}>0.5s</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.trimButton} 
                  onPress={() => adjustTrimStart(-0.1)}
                >
                  <MaterialIcons name="remove" size={16} color={colors.backgroundAlt} />
                  <Text style={styles.trimButtonText}>0.1s</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.trimButton} 
                  onPress={() => adjustTrimStart(0.1)}
                >
                  <MaterialIcons name="add" size={16} color={colors.backgroundAlt} />
                  <Text style={styles.trimButtonText}>0.1s</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.trimButton} 
                  onPress={() => adjustTrimStart(0.5)}
                >
                  <MaterialIcons name="add" size={20} color={colors.backgroundAlt} />
                  <Text style={styles.trimButtonText}>0.5s</Text>
                </TouchableOpacity>
              </View>
            </View>
            
            <View style={styles.trimRow}>
              <Text style={styles.trimTime}>End: {formatTime(trimEnd)}</Text>
              <View style={styles.trimButtons}>
                <TouchableOpacity 
                  style={styles.trimButton} 
                  onPress={() => adjustTrimEnd(-0.5)}
                >
                  <MaterialIcons name="remove" size={20} color={colors.backgroundAlt} />
                  <Text style={styles.trimButtonText}>0.5s</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.trimButton} 
                  onPress={() => adjustTrimEnd(-0.1)}
                >
                  <MaterialIcons name="remove" size={16} color={colors.backgroundAlt} />
                  <Text style={styles.trimButtonText}>0.1s</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.trimButton} 
                  onPress={() => adjustTrimEnd(0.1)}
                >
                  <MaterialIcons name="add" size={16} color={colors.backgroundAlt} />
                  <Text style={styles.trimButtonText}>0.1s</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.trimButton} 
                  onPress={() => adjustTrimEnd(0.5)}
                >
                  <MaterialIcons name="add" size={20} color={colors.backgroundAlt} />
                  <Text style={styles.trimButtonText}>0.5s</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
          
          <Text style={styles.hint}>Use buttons to trim, tap video to play/pause</Text>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
            <MaterialIcons name="close" size={24} color={colors.backgroundAlt} />
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
            <MaterialIcons name="check" size={24} color={colors.backgroundAlt} />
            <Text style={styles.confirmButtonText}>Confirm</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  videoContainer: {
    backgroundColor: '#000000',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
    position: 'relative',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  playButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -32 }, { translateY: -32 }],
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContainer: {
    alignItems: 'center',
    marginBottom: 24,
    width: '100%',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  trimContainer: {
    width: '100%',
    backgroundColor: colors.backgroundAlt,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  trimLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  trimRow: {
    marginBottom: 12,
  },
  trimTime: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 8,
    fontWeight: '500',
  },
  trimButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 4,
  },
  trimButton: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trimButtonText: {
    color: colors.backgroundAlt,
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  hint: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: 20,
  },
  cancelButton: {
    backgroundColor: colors.textSecondary,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cancelButtonText: {
    color: colors.backgroundAlt,
    fontSize: 18,
    fontWeight: '600',
  },
  confirmButton: {
    backgroundColor: colors.buttonBlue,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  confirmButtonText: {
    color: colors.backgroundAlt,
    fontSize: 18,
    fontWeight: '600',
  },
});
