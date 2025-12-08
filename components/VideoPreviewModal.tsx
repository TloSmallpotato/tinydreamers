
import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/styles/commonStyles';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { VideoTrimmer } from 'react-native-video-trim';

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
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(Math.min(duration, MAX_TRIM_DURATION));
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    console.log('VideoPreviewModal: Video URI:', videoUri);
    console.log('VideoPreviewModal: Duration:', duration);
    setTrimEnd(Math.min(duration, MAX_TRIM_DURATION));
  }, [videoUri, duration]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 10);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms}`;
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

  const handleTrimChange = (start: number, end: number) => {
    console.log('Trim changed:', { start, end });
    
    // Ensure the trim duration doesn't exceed MAX_TRIM_DURATION
    let adjustedEnd = end;
    if (end - start > MAX_TRIM_DURATION) {
      adjustedEnd = start + MAX_TRIM_DURATION;
    }
    
    setTrimStart(start);
    setTrimEnd(adjustedEnd);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.content}>
        {/* Title and info */}
        <View style={styles.infoContainer}>
          <Text style={styles.title}>Trim Video</Text>
          <Text style={styles.subtitle}>
            {formatTime(getTrimmedDuration())} / {MAX_TRIM_DURATION}s max
          </Text>
        </View>

        {/* Video Trimmer Component */}
        <View style={styles.trimmerContainer}>
          <VideoTrimmer
            source={videoUri}
            height={screenHeight * 0.5}
            width={screenWidth - 40}
            themeColor={colors.primary}
            maxDuration={MAX_TRIM_DURATION}
            minDuration={0.1}
            onChange={handleTrimChange}
            showDuration={true}
            enableCancelButton={false}
            enableSaveButton={false}
          />
        </View>

        <View style={styles.trimInfo}>
          <View style={styles.trimInfoRow}>
            <Text style={styles.trimInfoLabel}>Start:</Text>
            <Text style={styles.trimInfoValue}>{formatTime(trimStart)}</Text>
          </View>
          <View style={styles.trimInfoRow}>
            <Text style={styles.trimInfoLabel}>End:</Text>
            <Text style={styles.trimInfoValue}>{formatTime(trimEnd)}</Text>
          </View>
          <View style={styles.trimInfoRow}>
            <Text style={styles.trimInfoLabel}>Duration:</Text>
            <Text style={styles.trimInfoValue}>{formatTime(getTrimmedDuration())}</Text>
          </View>
        </View>

        <Text style={styles.hint}>Drag handles to trim • Max {MAX_TRIM_DURATION}s</Text>

        {/* Action buttons */}
        <View style={styles.actions}>
          <TouchableOpacity 
            style={styles.cancelButton} 
            onPress={onCancel}
            disabled={isProcessing}
          >
            <MaterialIcons name="close" size={24} color={colors.backgroundAlt} />
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.confirmButton, isProcessing && styles.confirmButtonDisabled]} 
            onPress={handleConfirm}
            disabled={isProcessing}
          >
            <MaterialIcons name="check" size={24} color={colors.backgroundAlt} />
            <Text style={styles.confirmButtonText}>
              {isProcessing ? 'Processing...' : 'Confirm'}
            </Text>
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
  infoContainer: {
    alignItems: 'center',
    marginBottom: 20,
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
  trimmerContainer: {
    width: screenWidth - 40,
    height: screenHeight * 0.5,
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#000000',
  },
  trimInfo: {
    width: '100%',
    backgroundColor: colors.backgroundAlt,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    gap: 8,
  },
  trimInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  trimInfoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  trimInfoValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  hint: {
    fontSize: 13,
    color: colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 20,
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
    opacity: 0.6,
  },
  confirmButtonText: {
    color: colors.backgroundAlt,
    fontSize: 18,
    fontWeight: '600',
  },
});
