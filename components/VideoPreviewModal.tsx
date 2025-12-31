
import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Platform, Alert, PanResponder, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/styles/commonStyles';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { generateVideoThumbnail } from '@/utils/videoThumbnail';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface VideoPreviewModalProps {
  videoUri: string;
  duration: number;
  onConfirm: (trimmedUri: string, startTime: number, endTime: number, thumbnailUri: string | null) => void;
  onCancel: () => void;
}

const MAX_TRIM_DURATION = 5; // Maximum 5 seconds as per requirements

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
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [videoLoadError, setVideoLoadError] = useState(false);
  const isSeekingRef = useRef(false);
  const insets = useSafeAreaInsets();
  const loadAttemptRef = useRef(0);

  // Calculate video container height to fit within safe area
  const topSafeArea = insets.top || 44;
  const bottomSafeArea = insets.bottom || 34;
  const controlsHeight = 280;
  const buttonsHeight = 100;
  const padding = 40;
  
  const maxVideoHeight = screenHeight - topSafeArea - controlsHeight - buttonsHeight - padding;
  const videoWidth = screenWidth - 40;
  const videoHeight = Math.min(videoWidth * (16 / 9), maxVideoHeight);

  // Validate and normalize video URI
  useEffect(() => {
    console.log('[VideoPreviewModal] Video URI:', videoUri);
    console.log('[VideoPreviewModal] Platform:', Platform.OS);
    
    // Check if URI is valid
    if (!videoUri || videoUri.trim() === '') {
      console.error('[VideoPreviewModal] Invalid video URI');
      setVideoLoadError(true);
      Alert.alert('Error', 'Invalid video file. Please try recording again.');
      return;
    }

    // Log URI format for debugging
    if (Platform.OS === 'ios' && !videoUri.startsWith('file://')) {
      console.warn('[VideoPreviewModal] iOS video URI should start with file://');
    }
  }, [videoUri]);

  useEffect(() => {
    // Load the video to get actual duration
    const loadVideo = async () => {
      if (videoRef.current && !videoLoadError) {
        try {
          loadAttemptRef.current += 1;
          console.log('[VideoPreviewModal] Loading video, attempt:', loadAttemptRef.current);
          
          const status = await videoRef.current.getStatusAsync();
          if (status.isLoaded && status.durationMillis) {
            const durationInSeconds = status.durationMillis / 1000;
            console.log('[VideoPreviewModal] Actual video duration:', durationInSeconds, 'seconds');
            setActualDuration(durationInSeconds);
            
            // Set initial trim end to min of duration or MAX_TRIM_DURATION
            const initialTrimEnd = Math.min(durationInSeconds, MAX_TRIM_DURATION);
            setTrimEnd(initialTrimEnd);
            setVideoLoadError(false);
          }
        } catch (error) {
          console.error('[VideoPreviewModal] Error getting video duration:', error);
          
          // Only show error after multiple attempts
          if (loadAttemptRef.current > 2) {
            setVideoLoadError(true);
            Alert.alert(
              'Video Load Error',
              'Unable to load video preview. The video may still be processing. Please try again in a moment.',
              [
                { text: 'Cancel', onPress: onCancel, style: 'cancel' },
                { text: 'Retry', onPress: () => {
                  loadAttemptRef.current = 0;
                  setVideoLoadError(false);
                  setIsVideoLoaded(false);
                }}
              ]
            );
          }
        }
      }
    };

    // Delay initial load slightly to ensure file is ready
    const timer = setTimeout(loadVideo, 300);
    return () => clearTimeout(timer);
  }, [videoUri, videoLoadError]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 10);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms}`;
  };

  const togglePlayback = async () => {
    if (!videoRef.current || !isVideoLoaded || videoLoadError) {
      console.log('[VideoPreviewModal] Video not ready for playback');
      return;
    }

    // Prevent multiple simultaneous operations
    if (isSeekingRef.current) {
      console.log('[VideoPreviewModal] Seek in progress, ignoring play press');
      return;
    }

    try {
      if (isPlaying) {
        // Pause
        await videoRef.current.pauseAsync();
        setIsPlaying(false);
      } else {
        // Before playing, check if position is within trim range
        const status = await videoRef.current.getStatusAsync();
        
        if (status.isLoaded) {
          const positionSeconds = (status.positionMillis || 0) / 1000;
          
          console.log('[VideoPreviewModal] Before play - Current position:', positionSeconds);
          console.log('[VideoPreviewModal] Before play - Trim range:', trimStart, '-', trimEnd);
          
          // If position is outside trim range, seek to trim start
          if (positionSeconds < trimStart || positionSeconds >= trimEnd) {
            console.log('[VideoPreviewModal] ⚠️ Position outside trim range, seeking to trim start');
            isSeekingRef.current = true;
            await videoRef.current.setPositionAsync(trimStart * 1000);
            isSeekingRef.current = false;
            console.log('[VideoPreviewModal] ✓ Seeked to trim start before play');
          }
        }
        
        // Play
        await videoRef.current.playAsync();
        setIsPlaying(true);
      }
    } catch (err) {
      console.error('[VideoPreviewModal] Error toggling playback:', err);
      isSeekingRef.current = false;
      
      // Show user-friendly error
      Alert.alert(
        'Playback Error',
        'Unable to play video. Please try again or re-record.',
        [{ text: 'OK' }]
      );
    }
  };

  const handlePlaybackStatusUpdate = async (status: AVPlaybackStatus) => {
    if (!status.isLoaded) {
      if (status.error) {
        console.error('[VideoPreviewModal] Video load error:', status.error);
        setVideoLoadError(true);
      }
      setIsVideoLoaded(false);
      return;
    }

    // Mark video as loaded
    if (!isVideoLoaded) {
      setIsVideoLoaded(true);
      setVideoLoadError(false);
      console.log('[VideoPreviewModal] Video loaded and ready');
    }

    // Update playing state
    setIsPlaying(status.isPlaying);
    
    const positionSeconds = (status.positionMillis || 0) / 1000;
    setCurrentPosition(positionSeconds);
    
    // Update actual duration if we get it from playback status
    if (status.durationMillis && actualDuration === 0) {
      const durationInSeconds = status.durationMillis / 1000;
      console.log('[VideoPreviewModal] Duration from playback status:', durationInSeconds, 'seconds');
      setActualDuration(durationInSeconds);
      
      // Update trim end if needed
      const initialTrimEnd = Math.min(durationInSeconds, MAX_TRIM_DURATION);
      setTrimEnd(initialTrimEnd);
    }

    // Skip enforcement if we're currently seeking
    if (isSeekingRef.current) {
      return;
    }

    // Hard-stop playback at trimEnd
    if (status.isPlaying && positionSeconds >= trimEnd) {
      console.log('[VideoPreviewModal] 🛑 Reached trim end, stopping playback');
      
      try {
        isSeekingRef.current = true;
        
        // Pause playback
        await videoRef.current?.pauseAsync();
        
        // Seek back to trim start
        await videoRef.current?.setPositionAsync(trimStart * 1000);
        
        // Update state
        setIsPlaying(false);
        setCurrentPosition(trimStart);
        
        isSeekingRef.current = false;
        console.log('[VideoPreviewModal] ✓ Stopped and reset to trim start');
      } catch (err) {
        console.error('[VideoPreviewModal] Error stopping at trim end:', err);
        isSeekingRef.current = false;
      }
    }

    // Prevent background looping past trim range
    if (!status.isPlaying) {
      if (positionSeconds < trimStart - 0.1) {
        console.log('[VideoPreviewModal] ⚠️ Position below trim start, snapping back');
        isSeekingRef.current = true;
        await videoRef.current?.setPositionAsync(trimStart * 1000);
        isSeekingRef.current = false;
      } else if (positionSeconds > trimEnd + 0.1) {
        console.log('[VideoPreviewModal] ⚠️ Position above trim end, snapping back');
        isSeekingRef.current = true;
        await videoRef.current?.setPositionAsync(trimStart * 1000);
        isSeekingRef.current = false;
      }
    }
  };

  const handleConfirm = async () => {
    const trimmedDuration = trimEnd - trimStart;
    
    if (trimmedDuration < 0.1) {
      Alert.alert('Invalid Trim', 'Video must be at least 0.1 seconds long');
      return;
    }

    if (trimmedDuration > MAX_TRIM_DURATION) {
      Alert.alert(
        'Trim Too Long', 
        `Video trim cannot exceed ${MAX_TRIM_DURATION} seconds. Please adjust your selection.`
      );
      return;
    }

    console.log('[VideoPreviewModal] ✅ Confirm clicked - will generate thumbnail in background');
    console.log('[VideoPreviewModal] Trim range:', trimStart, '-', trimEnd);
    
    // Immediately call onConfirm to proceed with the flow
    onConfirm(videoUri, trimStart, trimEnd, null);
    
    // Generate thumbnail in background (don't await, don't block UI)
    generateVideoThumbnail(videoUri, trimStart)
      .then(thumbnailUri => {
        if (thumbnailUri) {
          console.log('[VideoPreviewModal] ✅ Thumbnail generated in background:', thumbnailUri);
        } else {
          console.warn('[VideoPreviewModal] ⚠️ Thumbnail generation returned null');
        }
      })
      .catch(error => {
        console.error('[VideoPreviewModal] ❌ Background thumbnail generation failed:', error);
      });
  };

  const getTrimmedDuration = () => {
    return trimEnd - trimStart;
  };

  const getTrimPercentage = () => {
    if (actualDuration === 0) return { start: 0, end: 100 };
    return {
      start: (trimStart / actualDuration) * 100,
      end: (trimEnd / actualDuration) * 100,
    };
  };

  const getCurrentPositionPercentage = () => {
    if (actualDuration === 0) return 0;
    return (currentPosition / actualDuration) * 100;
  };

  const trimDuration = getTrimmedDuration();
  const isValidTrim = trimDuration >= 0.1 && trimDuration <= MAX_TRIM_DURATION;
  const trimPercentage = getTrimPercentage();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.content}>
        {/* Video Player */}
        <View style={[styles.videoContainer, { width: videoWidth, height: videoHeight }]}>
          {videoLoadError ? (
            <View style={styles.errorContainer}>
              <MaterialIcons name="error-outline" size={48} color={colors.secondary} />
              <Text style={styles.errorText}>Unable to load video</Text>
              <TouchableOpacity 
                style={styles.retryButton}
                onPress={() => {
                  loadAttemptRef.current = 0;
                  setVideoLoadError(false);
                  setIsVideoLoaded(false);
                }}
              >
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Video
                ref={videoRef}
                source={{ uri: videoUri }}
                style={styles.video}
                resizeMode={ResizeMode.CONTAIN}
                isLooping={false}
                shouldPlay={false}
                onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
                onError={(error) => {
                  console.error('[VideoPreviewModal] Video component error:', error);
                  setVideoLoadError(true);
                }}
              />
              
              {!isVideoLoaded && !videoLoadError && (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text style={styles.loadingText}>Loading video...</Text>
                </View>
              )}
              
              {isVideoLoaded && (
                <TouchableOpacity style={styles.playButton} onPress={togglePlayback}>
                  <MaterialIcons
                    name={isPlaying ? 'pause' : 'play-arrow'}
                    size={48}
                    color={colors.backgroundAlt}
                  />
                </TouchableOpacity>
              )}
            </>
          )}
        </View>

        {/* Info and Controls */}
        <View style={styles.infoContainer}>
          <Text style={styles.title}>Trim Your Video</Text>
          <Text style={[
            styles.subtitle,
            !isValidTrim && styles.subtitleError
          ]}>
            Selected: {formatTime(trimDuration)} / Max: {MAX_TRIM_DURATION}s
          </Text>
          
          {!isValidTrim && (
            <Text style={styles.errorText}>
              {trimDuration > MAX_TRIM_DURATION 
                ? `Trim must be ${MAX_TRIM_DURATION} seconds or less` 
                : 'Trim must be at least 0.1 seconds'}
            </Text>
          )}
          
          {/* Dual Handle Trim Slider */}
          <View style={styles.trimSliderContainer}>
            <View style={styles.trimSliderLabels}>
              <Text style={styles.trimSliderLabel}>Start: {formatTime(trimStart)}</Text>
              <Text style={styles.trimSliderLabel}>End: {formatTime(trimEnd)}</Text>
            </View>
            
            <DualHandleSlider
              min={0}
              max={actualDuration}
              startValue={trimStart}
              endValue={trimEnd}
              onStartChange={async (value) => {
                // Prevent seeking if already in progress
                if (isSeekingRef.current) return;
                
                // Ensure trim start doesn't exceed trim end minus 0.1s
                const newStart = Math.min(value, trimEnd - 0.1);
                
                // Ensure trim duration doesn't exceed MAX_TRIM_DURATION
                const maxAllowedStart = trimEnd - MAX_TRIM_DURATION;
                const finalStart = Math.max(0, Math.max(newStart, maxAllowedStart));
                
                setTrimStart(finalStart);
                
                // Update video position to new start
                if (videoRef.current && isVideoLoaded) {
                  try {
                    isSeekingRef.current = true;
                    await videoRef.current.setPositionAsync(finalStart * 1000);
                    setTimeout(() => {
                      isSeekingRef.current = false;
                    }, 100);
                  } catch (err) {
                    console.error('[VideoPreviewModal] Error seeking on trim start change:', err);
                    isSeekingRef.current = false;
                  }
                }
              }}
              onEndChange={async (value) => {
                // Ensure trim end is at least 0.1s after trim start
                const newEnd = Math.max(value, trimStart + 0.1);
                
                // Ensure trim duration doesn't exceed MAX_TRIM_DURATION
                const maxAllowedEnd = Math.min(newEnd, trimStart + MAX_TRIM_DURATION);
                const finalEnd = Math.min(actualDuration, maxAllowedEnd);
                
                setTrimEnd(finalEnd);
              }}
            />
            
            <View style={styles.timelineLabels}>
              <Text style={styles.timelineLabel}>0:00</Text>
              <Text style={styles.timelineLabel}>{formatTime(actualDuration)}</Text>
            </View>
          </View>
          
          <Text style={styles.hint}>
            Drag circles to adjust trim points, then confirm
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
            <MaterialIcons name="close" size={24} color={colors.backgroundAlt} />
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[
              styles.confirmButton,
              (!isValidTrim || videoLoadError) && styles.confirmButtonDisabled
            ]} 
            onPress={handleConfirm}
            disabled={!isValidTrim || videoLoadError}
          >
            <MaterialIcons name="check" size={24} color={colors.backgroundAlt} />
            <Text style={styles.confirmButtonText}>Confirm</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

// Dual Handle Slider Component
interface DualHandleSliderProps {
  min: number;
  max: number;
  startValue: number;
  endValue: number;
  onStartChange: (value: number) => void;
  onEndChange: (value: number) => void;
}

function DualHandleSlider({
  min,
  max,
  startValue,
  endValue,
  onStartChange,
  onEndChange,
}: DualHandleSliderProps) {
  const sliderWidth = screenWidth - 80;
  const [activeHandle, setActiveHandle] = useState<'start' | 'end' | null>(null);

  const getPositionFromValue = (value: number) => {
    if (max === min) return 0;
    return ((value - min) / (max - min)) * sliderWidth;
  };

  const getValueFromPosition = (position: number) => {
    const clampedPosition = Math.max(0, Math.min(sliderWidth, position));
    return min + (clampedPosition / sliderWidth) * (max - min);
  };

  const startPosition = getPositionFromValue(startValue);
  const endPosition = getPositionFromValue(endValue);

  const createPanResponder = (handle: 'start' | 'end') => {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        setActiveHandle(handle);
      },
      onPanResponderMove: (_, gestureState) => {
        const currentPosition = handle === 'start' ? startPosition : endPosition;
        const newPosition = currentPosition + gestureState.dx;
        const newValue = getValueFromPosition(newPosition);
        
        if (handle === 'start') {
          onStartChange(newValue);
        } else {
          onEndChange(newValue);
        }
      },
      onPanResponderRelease: () => {
        setActiveHandle(null);
      },
    });
  };

  const startPanResponder = createPanResponder('start');
  const endPanResponder = createPanResponder('end');

  return (
    <View style={styles.dualSliderContainer}>
      {/* Track */}
      <View style={styles.sliderTrack}>
        {/* Inactive sections */}
        <View style={[styles.sliderInactive, { width: startPosition }]} />
        <View 
          style={[
            styles.sliderInactive, 
            { 
              position: 'absolute',
              left: endPosition,
              width: sliderWidth - endPosition 
            }
          ]} 
        />
        
        {/* Active section */}
        <View 
          style={[
            styles.sliderActive,
            {
              left: startPosition,
              width: endPosition - startPosition,
            }
          ]}
        />
      </View>

      {/* Start Handle */}
      <View
        {...startPanResponder.panHandlers}
        style={[
          styles.sliderHandle,
          styles.sliderHandleStart,
          {
            left: startPosition - 16,
          },
          activeHandle === 'start' && styles.sliderHandleActive,
        ]}
      >
        <View style={styles.sliderHandleInner} />
      </View>

      {/* End Handle */}
      <View
        {...endPanResponder.panHandlers}
        style={[
          styles.sliderHandle,
          styles.sliderHandleEnd,
          {
            left: endPosition - 16,
          },
          activeHandle === 'end' && styles.sliderHandleActive,
        ]}
      >
        <View style={styles.sliderHandleInner} />
      </View>
    </View>
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
    marginBottom: 20,
    position: 'relative',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.backgroundAlt,
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 14,
    color: colors.secondary,
    marginTop: 12,
    marginBottom: 16,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: colors.backgroundAlt,
    fontSize: 14,
    fontWeight: '600',
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
    marginBottom: 20,
    width: '100%',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  subtitleError: {
    color: colors.secondary,
    fontWeight: '600',
  },
  trimSliderContainer: {
    width: '100%',
    marginVertical: 24,
  },
  trimSliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  trimSliderLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  dualSliderContainer: {
    width: '100%',
    height: 60,
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 8,
  },
  sliderTrack: {
    width: '100%',
    height: 8,
    backgroundColor: 'transparent',
    borderRadius: 4,
    position: 'relative',
  },
  sliderInactive: {
    position: 'absolute',
    height: 8,
    backgroundColor: colors.textSecondary,
    opacity: 0.3,
    borderRadius: 4,
  },
  sliderActive: {
    position: 'absolute',
    height: 8,
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  sliderHandle: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.backgroundAlt,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  sliderHandleStart: {
    borderColor: colors.primary,
  },
  sliderHandleEnd: {
    borderColor: colors.secondary,
  },
  sliderHandleActive: {
    transform: [{ scale: 1.2 }],
  },
  sliderHandleInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  timelineLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginTop: 4,
  },
  timelineLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  hint: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 4,
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
  confirmButtonDisabled: {
    backgroundColor: colors.textSecondary,
    opacity: 0.5,
  },
  confirmButtonText: {
    color: colors.backgroundAlt,
    fontSize: 18,
    fontWeight: '600',
  },
});
