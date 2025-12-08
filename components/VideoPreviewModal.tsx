
import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Platform, Alert, PanResponder, Animated, Image } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/styles/commonStyles';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import * as VideoThumbnails from 'expo-video-thumbnails';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Maximum trim duration in seconds (5 seconds as per requirements)
const MAX_TRIM_DURATION = 5;

interface VideoPreviewModalProps {
  videoUri: string;
  duration: number;
  onConfirm: (trimmedUri: string, startTime: number, endTime: number) => void;
  onCancel: () => void;
}

interface ThumbnailData {
  uri: string;
  time: number;
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
  const [thumbnails, setThumbnails] = useState<ThumbnailData[]>([]);
  const [isGeneratingThumbnails, setIsGeneratingThumbnails] = useState(true);
  const insets = useSafeAreaInsets();

  // Store initial drag positions
  const dragStartRef = useRef({ trimStart: 0, trimEnd: 0 });

  // Calculate video container height to fit within safe area
  const topSafeArea = insets.top || 44;
  const bottomSafeArea = insets.bottom || 34;
  const titleInfoHeight = 200;
  const trimControlsHeight = 280;
  const buttonsHeight = 100;
  const padding = 40;
  
  const maxVideoHeight = screenHeight - topSafeArea - titleInfoHeight - trimControlsHeight - buttonsHeight - padding;
  const videoWidth = screenWidth - 40;
  const videoHeight = Math.min(videoWidth * (16 / 9), maxVideoHeight);

  // Timeline dimensions - make it wider and more visible
  const timelineWidth = screenWidth - 60;
  const thumbnailWidth = 70;
  const thumbnailHeight = 100;

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
            
            // Generate thumbnails
            generateThumbnails(durationInSeconds);
          }
        } catch (error) {
          console.error('VideoPreviewModal: Error getting video duration:', error);
          setIsGeneratingThumbnails(false);
        }
      }
    };

    loadVideo();
  }, [videoUri]);

  const generateThumbnails = async (videoDuration: number) => {
    try {
      console.log('Generating thumbnails for video...');
      const thumbnailCount = Math.min(Math.ceil(videoDuration), 20); // Max 20 thumbnails
      const interval = videoDuration / thumbnailCount;
      const generatedThumbnails: ThumbnailData[] = [];

      for (let i = 0; i < thumbnailCount; i++) {
        const time = i * interval * 1000; // Convert to milliseconds
        try {
          const { uri } = await VideoThumbnails.getThumbnailAsync(videoUri, {
            time,
            quality: 0.5,
          });
          generatedThumbnails.push({ uri, time: i * interval });
        } catch (error) {
          console.warn(`Failed to generate thumbnail at ${time}ms:`, error);
        }
      }

      console.log(`Generated ${generatedThumbnails.length} thumbnails`);
      setThumbnails(generatedThumbnails);
      setIsGeneratingThumbnails(false);
    } catch (error) {
      console.error('Error generating thumbnails:', error);
      setIsGeneratingThumbnails(false);
    }
  };

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
        // Store the initial trim start position when drag begins
        dragStartRef.current.trimStart = trimStart;
      },
      onPanResponderMove: (_, gestureState) => {
        // Calculate the time change based on drag distance
        const pixelsMoved = gestureState.dx;
        const timePerPixel = actualDuration / timelineWidth;
        const timeChange = pixelsMoved * timePerPixel;
        
        // Calculate new start time from the initial position
        const newStartTime = dragStartRef.current.trimStart + timeChange;
        
        // Ensure we don't exceed boundaries
        const minStartTime = 0;
        const maxStartTime = trimEnd - 0.1; // Minimum 0.1s duration
        
        // Also ensure we don't exceed max trim duration
        const maxStartForDuration = trimEnd - MAX_TRIM_DURATION;
        const effectiveMinStart = Math.max(minStartTime, maxStartForDuration);
        
        const clampedStartTime = Math.max(effectiveMinStart, Math.min(maxStartTime, newStartTime));
        
        setTrimStart(clampedStartTime);
        
        // Update video position to show the new start frame
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
        // Store the initial trim end position when drag begins
        dragStartRef.current.trimEnd = trimEnd;
      },
      onPanResponderMove: (_, gestureState) => {
        // Calculate the time change based on drag distance
        const pixelsMoved = gestureState.dx;
        const timePerPixel = actualDuration / timelineWidth;
        const timeChange = pixelsMoved * timePerPixel;
        
        // Calculate new end time from the initial position
        const newEndTime = dragStartRef.current.trimEnd + timeChange;
        
        // Ensure we don't exceed boundaries
        const minEndTime = trimStart + 0.1; // Minimum 0.1s duration
        const maxEndTime = actualDuration;
        
        // Also ensure we don't exceed max trim duration
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

  const getCurrentPositionIndicator = () => {
    return (currentPosition / actualDuration) * timelineWidth;
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

          {/* Current time display */}
          <View style={styles.currentTimeDisplay}>
            <Text style={styles.currentTimeText}>{formatTime(currentPosition)}</Text>
          </View>
        </View>

        <View style={styles.infoContainer}>
          <Text style={styles.title}>Trim Video</Text>
          <Text style={styles.subtitle}>
            {formatTime(getTrimmedDuration())} / {MAX_TRIM_DURATION}s max
          </Text>
          
          {/* Timeline with thumbnails */}
          <View style={styles.timelineContainer}>
            {isGeneratingThumbnails ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Generating preview...</Text>
              </View>
            ) : (
              <View style={styles.timelineWrapper}>
                <View style={[styles.timeline, { width: timelineWidth }]}>
                  {/* Thumbnail strip */}
                  <View style={styles.thumbnailStrip}>
                    {thumbnails.map((thumbnail, index) => (
                      <View key={index} style={[styles.thumbnailWrapper, { width: thumbnailWidth, height: thumbnailHeight }]}>
                        <Image
                          source={{ uri: thumbnail.uri }}
                          style={styles.thumbnail}
                          resizeMode="cover"
                        />
                      </View>
                    ))}
                  </View>

                  {/* Overlay for non-selected regions */}
                  <View style={styles.overlayContainer}>
                    {/* Left overlay */}
                    <View 
                      style={[
                        styles.overlay, 
                        { 
                          left: 0, 
                          width: getLeftHandlePosition() 
                        }
                      ]} 
                    />
                    
                    {/* Right overlay */}
                    <View 
                      style={[
                        styles.overlay, 
                        { 
                          left: getRightHandlePosition(), 
                          width: timelineWidth - getRightHandlePosition() 
                        }
                      ]} 
                    />
                  </View>

                  {/* Selected region border */}
                  <View 
                    style={[
                      styles.selectedRegion,
                      {
                        left: getLeftHandlePosition(),
                        width: getRightHandlePosition() - getLeftHandlePosition(),
                      }
                    ]}
                  />

                  {/* Current position indicator */}
                  {currentPosition >= trimStart && currentPosition <= trimEnd && (
                    <View 
                      style={[
                        styles.currentPositionIndicator,
                        { left: getCurrentPositionIndicator() }
                      ]}
                    />
                  )}

                  {/* Left handle (trim start) */}
                  <View
                    {...leftHandlePanResponder.panHandlers}
                    style={[
                      styles.handle,
                      styles.leftHandle,
                      { left: getLeftHandlePosition() - 20 }
                    ]}
                  >
                    <View style={styles.handleBar} />
                    <View style={styles.handleGrip}>
                      <View style={styles.handleGripLine} />
                      <View style={styles.handleGripLine} />
                      <View style={styles.handleGripLine} />
                    </View>
                  </View>

                  {/* Right handle (trim end) */}
                  <View
                    {...rightHandlePanResponder.panHandlers}
                    style={[
                      styles.handle,
                      styles.rightHandle,
                      { left: getRightHandlePosition() - 20 }
                    ]}
                  >
                    <View style={styles.handleGrip}>
                      <View style={styles.handleGripLine} />
                      <View style={styles.handleGripLine} />
                      <View style={styles.handleGripLine} />
                    </View>
                    <View style={styles.handleBar} />
                  </View>
                </View>
              </View>
            )}
          </View>

          {/* Time labels */}
          <View style={[styles.timeLabels, { width: timelineWidth }]}>
            <Text style={styles.timeLabel}>{formatTime(trimStart)}</Text>
            <Text style={styles.timeLabel}>{formatTime(trimEnd)}</Text>
          </View>
          
          <Text style={styles.hint}>Drag handles to trim • Max {MAX_TRIM_DURATION}s</Text>
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
    marginBottom: 20,
  },
  timelineContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 10,
  },
  loadingContainer: {
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  timelineWrapper: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 20,
  },
  timeline: {
    height: 100,
    position: 'relative',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    overflow: 'visible',
  },
  thumbnailStrip: {
    flexDirection: 'row',
    height: 100,
    borderRadius: 12,
    overflow: 'hidden',
  },
  thumbnailWrapper: {
    overflow: 'hidden',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  selectedRegion: {
    position: 'absolute',
    top: -2,
    bottom: -2,
    borderWidth: 4,
    borderColor: colors.primary,
    borderRadius: 8,
    pointerEvents: 'none',
  },
  currentPositionIndicator: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: colors.backgroundAlt,
    zIndex: 5,
    pointerEvents: 'none',
  },
  handle: {
    position: 'absolute',
    top: -15,
    bottom: -15,
    width: 40,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 10,
  },
  leftHandle: {
    justifyContent: 'flex-start',
  },
  rightHandle: {
    justifyContent: 'flex-end',
  },
  handleBar: {
    width: 5,
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  handleGrip: {
    width: 35,
    height: 60,
    backgroundColor: colors.primary,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
    elevation: 8,
  },
  handleGripLine: {
    width: 18,
    height: 3,
    backgroundColor: colors.backgroundAlt,
    borderRadius: 2,
  },
  timeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 10,
  },
  timeLabel: {
    fontSize: 15,
    color: colors.primary,
    fontWeight: '700',
  },
  hint: {
    fontSize: 13,
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
