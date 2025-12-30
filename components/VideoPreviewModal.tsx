
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
  const insets = useSafeAreaInsets();

  // Calculate video container height to fit within safe area
  const topSafeArea = insets.top || 44;
  const bottomSafeArea = insets.bottom || 34;
  const controlsHeight = 280;
  const buttonsHeight = 100;
  const padding = 40;
  
  const maxVideoHeight = screenHeight - topSafeArea - controlsHeight - buttonsHeight - padding;
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
            
            // Set initial trim end to min of duration or MAX_TRIM_DURATION
            const initialTrimEnd = Math.min(durationInSeconds, MAX_TRIM_DURATION);
            setTrimEnd(initialTrimEnd);
            
            // If video is longer than MAX_TRIM_DURATION, show a warning
            if (durationInSeconds > MAX_TRIM_DURATION) {
              console.log(`VideoPreviewModal: Video is ${durationInSeconds.toFixed(1)}s, auto-trimming to ${MAX_TRIM_DURATION}s`);
            }
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
        if (currentPosition >= trimEnd || currentPosition < trimStart) {
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
        
        // Update trim end if needed
        const initialTrimEnd = Math.min(durationInSeconds, MAX_TRIM_DURATION);
        setTrimEnd(initialTrimEnd);
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
      Alert.alert(
        'Trim Too Long', 
        `Video trim cannot exceed ${MAX_TRIM_DURATION} seconds. Please adjust your selection.`
      );
      return;
    }

    console.log('Confirming video with trim:', { 
      trimStart, 
      trimEnd, 
      duration: trimmedDuration,
      maxAllowed: MAX_TRIM_DURATION 
    });
    
    // Pass the original URI and trim times to parent
    // The actual trimming will be done during upload/processing
    onConfirm(videoUri, trimStart, trimEnd);
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
          
          {actualDuration > MAX_TRIM_DURATION && (
            <Text style={styles.warningText}>
              ⚠️ Video is {formatTime(actualDuration)} long. Only the selected {MAX_TRIM_DURATION}s will be saved.
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
                // Ensure trim start doesn't exceed trim end minus 0.1s
                const newStart = Math.min(value, trimEnd - 0.1);
                
                // Ensure trim duration doesn't exceed MAX_TRIM_DURATION
                const maxAllowedStart = trimEnd - MAX_TRIM_DURATION;
                const finalStart = Math.max(0, Math.max(newStart, maxAllowedStart));
                
                setTrimStart(finalStart);
                
                // Update video position to new start
                if (videoRef.current) {
                  await videoRef.current.setPositionAsync(finalStart * 1000);
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
            Drag circles to adjust trim points. Max {MAX_TRIM_DURATION} seconds.
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
              !isValidTrim && styles.confirmButtonDisabled
            ]} 
            onPress={handleConfirm}
            disabled={!isValidTrim}
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
  const sliderWidth = screenWidth - 80; // Account for padding
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
  errorText: {
    fontSize: 12,
    color: colors.secondary,
    marginBottom: 8,
    textAlign: 'center',
  },
  warningText: {
    fontSize: 12,
    color: '#FF9800',
    marginBottom: 8,
    textAlign: 'center',
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
