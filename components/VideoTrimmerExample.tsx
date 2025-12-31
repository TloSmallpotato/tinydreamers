
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useVideoTrimmer } from '@/hooks/useVideoTrimmer';
import * as ImagePicker from 'expo-image-picker';
import { colors } from '@/styles/commonStyles';

/**
 * Example component demonstrating how to use the VideoTrimmer module
 * 
 * This component:
 * 1. Allows user to pick a video from their library
 * 2. Trims the video to a 5-second clip (0-5 seconds)
 * 3. Displays the result path
 */
export function VideoTrimmerExample() {
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const { status, trimmedPath, error, trimVideo, reset } = useVideoTrimmer();

  const pickVideo = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        allowsEditing: false,
        quality: 1,
      });

      if (!result.canceled && result.assets[0]) {
        const uri = result.assets[0].uri;
        setVideoUri(uri);
        console.log('[Example] Selected video:', uri);
      }
    } catch (err) {
      console.error('[Example] Error picking video:', err);
      Alert.alert('Error', 'Failed to pick video');
    }
  };

  const handleTrim = async () => {
    if (!videoUri) {
      Alert.alert('Error', 'Please select a video first');
      return;
    }

    // Trim the first 5 seconds of the video
    const result = await trimVideo(videoUri, 0, 5);
    
    if (result) {
      Alert.alert(
        'Success',
        `Video trimmed successfully!\n\nSaved to: ${result}`,
        [
          {
            text: 'OK',
            onPress: () => {
              // Here you can upload the trimmed video, save it, or stitch it with other clips
              console.log('[Example] Trimmed video ready for upload:', result);
            },
          },
        ]
      );
    } else if (error) {
      Alert.alert('Error', `Trim failed: ${error}`);
    }
  };

  const handleReset = () => {
    reset();
    setVideoUri(null);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Video Trimmer Example</Text>
      
      <TouchableOpacity
        style={[styles.button, styles.primaryButton]}
        onPress={pickVideo}
        disabled={status === 'trimming'}
      >
        <Text style={styles.buttonText}>
          {videoUri ? 'Change Video' : 'Pick Video'}
        </Text>
      </TouchableOpacity>

      {videoUri && (
        <View style={styles.infoContainer}>
          <Text style={styles.infoLabel}>Selected Video:</Text>
          <Text style={styles.infoText} numberOfLines={2}>
            {videoUri}
          </Text>
        </View>
      )}

      {videoUri && status === 'idle' && (
        <TouchableOpacity
          style={[styles.button, styles.successButton]}
          onPress={handleTrim}
        >
          <Text style={styles.buttonText}>Trim First 5 Seconds</Text>
        </TouchableOpacity>
      )}

      {status === 'trimming' && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Trimming video...</Text>
        </View>
      )}

      {status === 'success' && trimmedPath && (
        <View style={styles.resultContainer}>
          <Text style={styles.successText}>✓ Trim Successful!</Text>
          <Text style={styles.infoLabel}>Trimmed Video Path:</Text>
          <Text style={styles.infoText} numberOfLines={3}>
            {trimmedPath}
          </Text>
          
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={handleReset}
          >
            <Text style={styles.buttonText}>Trim Another Video</Text>
          </TouchableOpacity>
        </View>
      )}

      {status === 'error' && error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>✗ Trim Failed</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={handleReset}
          >
            <Text style={styles.buttonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 20,
    textAlign: 'center',
  },
  button: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginVertical: 8,
  },
  primaryButton: {
    backgroundColor: colors.primary,
  },
  successButton: {
    backgroundColor: '#4CAF50',
  },
  secondaryButton: {
    backgroundColor: colors.secondary,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  infoContainer: {
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 12,
    marginVertical: 8,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.text,
  },
  resultContainer: {
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 12,
    marginVertical: 8,
  },
  successText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 12,
    textAlign: 'center',
  },
  errorContainer: {
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 12,
    marginVertical: 8,
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F44336',
    marginBottom: 12,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
    textAlign: 'center',
  },
});
