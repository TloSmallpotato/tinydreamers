
import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Alert, PanResponder } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/styles/commonStyles';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Maximum trim duration in seconds (5 seconds as per requirements)
const MAX_TRIM_DURATION = 5;

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
  const [trimEnd, setTrimEnd] = useState(Math.min(duration, MAX_TRIM_DURATION));

  // Store initial drag positions
  const dragStartRef = useRef({ trimStart: 0, trimEnd: 0 });

  // Timeline dimensions - make it prominent and easy to use
  const timelineWidth = screenWidth - 80;
  const handleSize = 40;

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
            setTrimEnd(Math.min(durationInSeconds, MAX_TRIM_DURATION));
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
        setTrimEnd(Math.min(durationInSeconds, MAX_TRIM_DURATION));
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

  const handleConfirm = () => {
    const trimmedDuration = trimEnd - trimStart;
    
    if (trimmedDuration < 0.1) {
      Alert.alert('Invalid Trim', 'Video must be at least 0.1 seconds long');
      return;
    }

    if (trimmedDuration > MAX_TRIM_DURATION) {
      Alert.alert('Trim Too Long', `Video must be ${MAX_TRIM_DURATION} seconds or less`);
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

  // Create pan responder for left handle (trim start)
  const leftHandlePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        console.log('Left handle drag started');
        dragStartRef.current.trimStart = trimStart;
      },
      onPanResponderMove: (_, gestureState) => {
        const pixelsMoved = gestureState.dx;
        const timePerPixel = actualDuration / timelineWidth;
        const timeChange = pixelsMoved * timePerPixel;
        
        const newStartTime = dragStartRef.current.trimStart + timeChange;
        
        const minStartTime = 0;
        const maxStartTime = trimEnd - 0.1;
        const maxStartForDuration = trimEnd - MAX_TRIM_DURATION;
        const effectiveMinStart = Math.max(minStartTime, maxStartForDuration);
        
        const clampedStartTime = Math.max(effectiveMinStart, Math.min(maxStartTime, newStartTime));
        
        setTrimStart(clampedStartTime);
        
        if (videoRef.current && !isPlaying) {
          videoRef.current.setPositionAsync(clampedStartTime * 1000);
        }
      },
      onPanResponderRelease: () => {
        console.log('Left handle drag ended at:', trimStart);
      },
    })
  ).current;

  // Create pan responder for right handle (trim end)
  const rightHandlePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        console.log('Right handle drag started');
        dragStartRef.current.trimEnd = trimEnd;
      },
      onPanResponderMove: (_, gestureState) => {
        const pixelsMoved = gestureState.dx;
        const timePerPixel = actualDuration / timelineWidth;
        const timeChange = pixelsMoved * timePerPixel;
        
        const newEndTime = dragStartRef.current.trimEnd + timeChange;
        
        const minEndTime = trimStart + 0.1;
        const maxEndTime = actualDuration;
        const maxEndForDuration = trimStart + MAX_TRIM_DURATION;
        const effectiveMaxEnd = Math.min(maxEndTime, maxEndForDuration);
        
        const clampedEndTime = Math.max(minEndTime, Math.min(effectiveMaxEnd, newEndTime));
        
        setTrimEnd(clampedEndTime);
      },
      onPanResponderRelease: () => {
        console.log('Right handle drag ended at:', trimEnd);
      },
    })
  ).current;

  // Calculate positions for trim handles
  const getLeftHandlePosition = () => {
    return (trimStart / actualDuration) * timelineWidth;
  };

  const getRightHandlePosition = () => {
    return (trimEnd / actualDuration) * timelineWidth;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.content}>
        {/* Video player with play button */}
        <View style={styles.videoContainer}>
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
              size={64}
              color={colors.backgroundAlt}
            />
          </TouchableOpacity>

          {/* Current time display */}
          <View style={styles.currentTimeDisplay}>
            <Text style={styles.currentTimeText}>{formatTime(currentPosition)}</Text>
          </View>
        </View>

        {/* Title and info */}
        <View style={styles.infoContainer}>
          <Text style={styles.title}>Trim Video</Text>
          <Text style={styles.subtitle}>
            {formatTime(getTrimmedDuration())} / {MAX_TRIM_DURATION}s max
          </Text>
        </View>

        {/* Simple trimming UI - just a line with two handles */}
        <View style={styles.trimContainer}>
          {/* Time labels above the line */}
          <View style={[styles.timeLabelsTop, { width: timelineWidth }]}>
            <Text style={styles.timeLabelTop}>{formatTime(trimStart)}</Text>
            <Text style={styles.timeLabelTop}>{formatTime(trimEnd)}</Text>
          </View>

          {/* The trimming line and handles */}
          <View style={styles.trimLineContainer}>
            <View style={[styles.trimLine, { width: timelineWidth }]}>
              {/* The main line */}
              <View style={styles.line} />
              
              {/* Selected region highlight */}
              <View 
                style={[
                  styles.selectedLine,
                  {
                    left: getLeftHandlePosition(),
                    width: getRightHandlePosition() - getLeftHandlePosition(),
                  }
                ]}
              />

              {/* Left handle */}
              <View
                {...leftHandlePanResponder.panHandlers}
                style={[
                  styles.handle,
                  { left: getLeftHandlePosition() - handleSize / 2 }
                ]}
              >
                <View style={styles.handleInner}>
                  <View style={styles.handleGripLine} />
                  <View style={styles.handleGripLine} />
                  <View style={styles.handleGripLine} />
                </View>
              </View>

              {/* Right handle */}
              <View
                {...rightHandlePanResponder.panHandlers}
                style={[
                  styles.handle,
                  { left: getRightHandlePosition() - handleSize / 2 }
                ]}
              >
                <View style={styles.handleInner}>
                  <View style={styles.handleGripLine} />
                  <View style={styles.handleGripLine} />
                  <View style={styles.handleGripLine} />
                </View>
              </View>
            </View>
          </View>

          <Text style={styles.hint}>Drag handles to trim • Max {MAX_TRIM_DURATION}s</Text>
        </View>

        {/* Action buttons */}
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
    width: screenWidth - 40,
    height: (screenWidth - 40) * (16 / 9),
    backgroundColor: '#000000',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 32,
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
    transform: [{ translateX: -48 }, { translateY: -48 }],
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentTimeDisplay: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  currentTimeText: {
    color: colors.backgroundAlt,
    fontSize: 14,
    fontWeight: '600',
  },
  infoContainer: {
    alignItems: 'center',
    marginBottom: 40,
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
  },
  trimContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 40,
  },
  timeLabelsTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  timeLabelTop: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '700',
  },
  trimLineContainer: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 30,
  },
  trimLine: {
    height: 8,
    position: 'relative',
  },
  line: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 8,
    backgroundColor: colors.textSecondary,
    borderRadius: 4,
  },
  selectedLine: {
    position: 'absolute',
    top: 0,
    height: 8,
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  handle: {
    position: 'absolute',
    top: -16,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  handleInner: {
    width: 40,
    height: 40,
    backgroundColor: colors.primary,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
    borderWidth: 3,
    borderColor: colors.backgroundAlt,
  },
  handleGripLine: {
    width: 16,
    height: 2,
    backgroundColor: colors.backgroundAlt,
    borderRadius: 1,
  },
  hint: {
    fontSize: 13,
    color: colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 20,
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
