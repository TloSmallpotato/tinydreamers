
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { NativeTabs, Icon, Label } from 'expo-router/unstable-native-tabs';
import { View, TouchableOpacity, StyleSheet, Animated, Alert, Image, Text } from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { CameraView, useCameraPermissions, CameraType } from 'expo-camera';
import { usePathname, useRouter, Stack } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useVideoRecording } from '@/contexts/VideoRecordingContext';
import { useChild } from '@/contexts/ChildContext';
import { useCameraTrigger } from '@/contexts/CameraTriggerContext';
import { useWordNavigation } from '@/contexts/WordNavigationContext';
import { useAddNavigation } from '@/contexts/AddNavigationContext';
import SelectWordBottomSheet from '@/components/SelectWordBottomSheet';
import VideoPreviewModal from '@/components/VideoPreviewModal';
import ToastNotification from '@/components/ToastNotification';
import AddOptionsModal from '@/components/AddOptionsModal';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { supabase } from '@/app/integrations/supabase/client';
import { File } from 'expo-file-system';
import { generateVideoThumbnail, uploadThumbnailToSupabase, uploadVideoToSupabase } from '@/utils/videoThumbnail';
import { Video, AVPlaybackStatus } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';

interface TabItem {
  name: string;
  label: string;
  iosIcon: string;
  androidIcon: string;
  materialIcon?: keyof typeof MaterialIcons.glyphMap;
  iconDefault?: any;
  iconSelected?: any;
  isAddButton?: boolean;
}

const tabs: TabItem[] = [
  {
    name: 'books',
    label: 'Books',
    iosIcon: 'bookmark.fill',
    androidIcon: 'bookmark',
    materialIcon: 'bookmark',
    iconDefault: require('@/assets/images/9a501b37-3b8d-4309-b89f-a0f0a8a510bb.png'),
    iconSelected: require('@/assets/images/9a501b37-3b8d-4309-b89f-a0f0a8a510bb.png'),
  },
  {
    name: 'words',
    label: 'Words',
    iosIcon: 'text.bubble.fill',
    androidIcon: 'chat-bubble',
    materialIcon: 'chat-bubble',
    iconDefault: require('@/assets/images/0d5c36da-89bf-42a5-b21a-859a42fe4580.png'),
    iconSelected: require('@/assets/images/b8d67420-03b7-4803-aab2-35e9d6d21f4e.png'),
  },
  {
    name: 'add',
    label: 'Add',
    iosIcon: 'plus',
    androidIcon: 'add',
    materialIcon: 'add',
    isAddButton: true,
  },
  {
    name: 'play',
    label: 'Play',
    iosIcon: 'play.circle.fill',
    androidIcon: 'sports-esports',
    materialIcon: 'sports-esports',
    iconDefault: require('@/assets/images/a52345f9-68c2-478b-9403-dc23d3ed0aee.png'),
    iconSelected: require('@/assets/images/e6ac3f52-53f8-45a0-b744-28cbf5ef758f.png'),
  },
  {
    name: 'profile',
    label: 'Profile',
    iosIcon: 'face.smiling.fill',
    androidIcon: 'mood',
    materialIcon: 'mood',
    iconDefault: require('@/assets/images/14d63ac9-4651-4542-8f2a-76f9f54f4436.png'),
    iconSelected: require('@/assets/images/c3dd0532-ba2e-42fd-8611-07d1cab67f53.png'),
  },
];

function CustomTabBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [showCamera, setShowCamera] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [cameraFacing, setCameraFacing] = useState<CameraType>('back');
  const cameraRef = useRef<CameraView>(null);
  const scaleAnims = useRef(tabs.map(() => new Animated.Value(1))).current;
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [previousRoute, setPreviousRoute] = useState<string>('/(tabs)/profile');
  const [showAddModal, setShowAddModal] = useState(false);
  
  const { 
    recordedVideoUri, 
    recordedVideoDuration,
    setRecordedVideo, 
    isRecordingFromWordDetail, 
    targetWordId, 
    clearRecordedVideo 
  } = useVideoRecording();
  const { selectedChild } = useChild();
  const { shouldOpenCamera, resetCameraTrigger } = useCameraTrigger();
  const { setTargetWordIdToOpen } = useWordNavigation();
  const { triggerBookSearch } = useAddNavigation();
  const [words, setWords] = useState<any[]>([]);
  const selectWordSheetRef = useRef<BottomSheetModal>(null);

  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [showToastViewButton, setShowToastViewButton] = useState(false);
  const [savedWordId, setSavedWordId] = useState<string | null>(null);

  // Store trim information
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);

  // Store original creation date for uploaded videos
  const [videoCreationDate, setVideoCreationDate] = useState<Date | null>(null);

  useEffect(() => {
    if (!showCamera && !recordedVideoUri) {
      setPreviousRoute(pathname);
    }
  }, [pathname, showCamera, recordedVideoUri]);

  useEffect(() => {
    const initPermissions = async () => {
      console.log('[iOS TabLayout] Initializing camera permissions...');
      if (cameraPermission) {
        console.log('[iOS TabLayout] Camera permission status:', cameraPermission.granted ? 'granted' : 'not granted');
        if (!cameraPermission.granted) {
          console.log('[iOS TabLayout] Pre-requesting camera permission');
          const result = await requestCameraPermission();
          console.log('[iOS TabLayout] Pre-request result:', result.granted ? 'granted' : 'denied');
        }
      } else {
        console.log('[iOS TabLayout] Camera permission object not loaded yet');
      }
    };
    initPermissions();
  }, [cameraPermission, requestCameraPermission]);

  const openCamera = useCallback(async () => {
    console.log('[iOS TabLayout] ===== OPENING CAMERA =====');
    console.log('[iOS TabLayout] Camera permission object:', cameraPermission);
    
    if (!cameraPermission) {
      console.error('[iOS TabLayout] Camera permission not loaded yet');
      Alert.alert('Error', 'Camera is not ready. Please try again.');
      return;
    }

    console.log('[iOS TabLayout] Current permission status:', cameraPermission.granted ? 'GRANTED' : 'NOT GRANTED');
    console.log('[iOS TabLayout] Can ask again:', cameraPermission.canAskAgain);

    if (!cameraPermission.granted) {
      console.log('[iOS TabLayout] Requesting camera permission...');
      
      try {
        const result = await requestCameraPermission();
        console.log('[iOS TabLayout] Permission request result:', result);
        console.log('[iOS TabLayout] Permission granted:', result.granted);
        
        if (!result.granted) {
          console.error('[iOS TabLayout] Camera permission DENIED by user');
          Alert.alert(
            'Camera Permission Required',
            'Please grant camera permission in your device settings to record videos.',
            [{ text: 'OK' }]
          );
          return;
        }
        
        console.log('[iOS TabLayout] Camera permission GRANTED');
      } catch (error) {
        console.error('[iOS TabLayout] Error requesting camera permission:', error);
        Alert.alert('Error', 'Failed to request camera permission. Please try again.');
        return;
      }
    }

    console.log('[iOS TabLayout] Setting up camera view...');
    setIsCameraReady(false);
    setShowCamera(true);
    setRecordingTime(0);
    setCameraFacing('back');
    setVideoCreationDate(null);
    console.log('[iOS TabLayout] Camera view should now be visible');
    console.log('[iOS TabLayout] ===== CAMERA OPENING COMPLETE =====');
  }, [cameraPermission, requestCameraPermission]);

  useEffect(() => {
    if (shouldOpenCamera) {
      console.log('[iOS TabLayout] Camera trigger detected from WordDetailBottomSheet');
      openCamera();
      resetCameraTrigger();
    }
  }, [shouldOpenCamera, resetCameraTrigger, openCamera]);

  const fetchWords = async () => {
    if (!selectedChild) return;
    
    try {
      const { data, error } = await supabase
        .from('user_words')
        .select(`
          id,
          word_id,
          color,
          word_library (
            word,
            emoji
          )
        `)
        .eq('child_id', selectedChild.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Transform data to match expected format
      const transformedWords = (data || []).map((uw: any) => ({
        id: uw.id,
        word: uw.word_library.word,
        emoji: uw.word_library.emoji || '⭐',
        color: uw.color,
      }));
      
      setWords(transformedWords);
    } catch (error) {
      console.error('Error fetching words:', error);
    }
  };

  const getActiveTab = () => {
    if (pathname.includes('/books')) return 'books';
    if (pathname.includes('/words')) return 'words';
    if (pathname.includes('/play')) return 'play';
    if (pathname.includes('/profile')) return 'profile';
    if (pathname.includes('/settings')) return 'profile';
    if (pathname.includes('/search-book')) return 'books';
    return 'profile';
  };

  const activeTab = getActiveTab();
  const shouldShowTabBar = !pathname.includes('/settings') && !pathname.includes('/search-book');

  const handleAddPress = async (index: number) => {
    console.log('[iOS] Add button pressed - showing options modal');
    
    Animated.sequence([
      Animated.timing(scaleAnims[index], {
        toValue: 0.85,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnims[index], {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    setShowAddModal(true);
  };

  const handleScanBook = () => {
    console.log('[iOS] Add book selected - opening scanner');
    setShowAddModal(false);
    // Open the barcode scanner
    setTimeout(() => {
      router.push('/(tabs)/books');
      setTimeout(() => {
        // Trigger scanner opening via a state or navigation param
        router.push({
          pathname: '/(tabs)/books',
          params: { autoScan: 'true' },
        } as any);
      }, 100);
    }, 300);
  };

  const handleAddWord = () => {
    console.log('[iOS] Add word selected - navigating with autoOpen param');
    setShowAddModal(false);
    // Navigate to words screen with autoOpen parameter
    router.push({
      pathname: '/(tabs)/words',
      params: { autoOpen: 'true' },
    } as any);
  };

  const handleCaptureMoment = async () => {
    console.log('[iOS TabLayout] ===== CAPTURE MOMENT HANDLER =====');
    console.log('[iOS TabLayout] Capture moment selected from modal');
    
    try {
      await openCamera();
      console.log('[iOS TabLayout] Camera opened successfully, closing modal');
      // Close modal after camera opens successfully
      setShowAddModal(false);
    } catch (error) {
      console.error('[iOS TabLayout] Error opening camera:', error);
      Alert.alert('Error', 'Failed to open camera. Please try again.');
    }
  };

  const handleCameraReady = () => {
    console.log('[iOS TabLayout] Camera is ready!');
    setIsCameraReady(true);
  };

  const getVideoDuration = async (videoUri: string): Promise<number> => {
    try {
      console.log('Getting actual video duration from file...');
      const { sound } = await Video.createAsync(
        { uri: videoUri },
        { shouldPlay: false }
      );
      
      const status = await sound.getStatusAsync();
      if (status.isLoaded && status.durationMillis) {
        const durationInSeconds = Math.round(status.durationMillis / 1000);
        console.log('Actual video duration:', durationInSeconds, 'seconds');
        await sound.unloadAsync();
        return durationInSeconds;
      }
      
      await sound.unloadAsync();
      return 0;
    } catch (error) {
      console.error('Error getting video duration:', error);
      return 0;
    }
  };

  const startRecording = async () => {
    if (cameraRef.current && !isRecording) {
      try {
        console.log('Starting video recording');
        setIsRecording(true);
        setRecordingTime(0);
        
        // Update timer every 100ms for smoother display
        recordingTimerRef.current = setInterval(() => {
          setRecordingTime((prev) => prev + 0.1);
        }, 100);
        
        const video = await cameraRef.current.recordAsync();
        
        console.log('Video recorded:', video);
        
        if (recordingTimerRef.current) {
          clearInterval(recordingTimerRef.current);
          recordingTimerRef.current = null;
        }
        
        setIsRecording(false);
        
        // Get actual video duration from the file
        const actualDuration = await getVideoDuration(video.uri);
        console.log('Setting video with actual duration:', actualDuration);
        
        // Set creation date to now for recorded videos
        setVideoCreationDate(new Date());
        
        setRecordedVideo(video.uri, actualDuration);
        setShowCamera(false);
        setIsCameraReady(false);
        
      } catch (error) {
        console.error('Error recording video:', error);
        setIsRecording(false);
        if (recordingTimerRef.current) {
          clearInterval(recordingTimerRef.current);
          recordingTimerRef.current = null;
        }
        Alert.alert('Error', 'Failed to record video');
      }
    }
  };

  const stopRecording = () => {
    if (cameraRef.current && isRecording) {
      console.log('Stopping video recording');
      cameraRef.current.stopRecording();
    }
  };

  const toggleCameraFacing = () => {
    console.log('Toggling camera facing');
    setCameraFacing((current) => (current === 'back' ? 'front' : 'back'));
  };

  const pickVideoFromLibrary = async () => {
    try {
      console.log('Opening video picker from library');
      
      // Request media library permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please grant media library permission to upload videos.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Launch image library with video-only filter
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'], // Only allow videos
        allowsEditing: false,
        quality: 1,
        videoMaxDuration: 300, // 5 minutes max
      });

      console.log('Video picker result:', result);

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        console.log('Selected video asset:', asset);
        
        // Get video duration
        const duration = asset.duration ? Math.round(asset.duration / 1000) : 0;
        console.log('Video duration from picker:', duration);
        
        // Try to get creation date from asset
        // Note: ImagePicker doesn't directly provide creation date, but we can use the assetId
        // to fetch more info from MediaLibrary if needed
        let creationDate: Date | null = null;
        
        if (asset.assetId) {
          try {
            // Import MediaLibrary to get asset info
            const MediaLibrary = await import('expo-media-library');
            const assetInfo = await MediaLibrary.getAssetInfoAsync(asset.assetId);
            console.log('Asset info:', assetInfo);
            
            if (assetInfo.creationTime) {
              creationDate = new Date(assetInfo.creationTime);
              console.log('Original video creation date:', creationDate);
            }
          } catch (error) {
            console.warn('Could not fetch asset creation date:', error);
          }
        }
        
        // If we couldn't get creation date, use current date
        if (!creationDate) {
          creationDate = new Date();
          console.log('Using current date as fallback');
        }
        
        setVideoCreationDate(creationDate);
        setRecordedVideo(asset.uri, duration);
        setShowCamera(false);
        setIsCameraReady(false);
      }
    } catch (error) {
      console.error('Error picking video from library:', error);
      Alert.alert('Error', 'Failed to pick video from library');
    }
  };

  const closeCamera = () => {
    console.log('Closing camera - cancelling recording');
    if (isRecording) {
      stopRecording();
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    setShowCamera(false);
    setIsCameraReady(false);
    setIsRecording(false);
    setRecordingTime(0);
    setVideoCreationDate(null);
    clearRecordedVideo();
  };

  const handleConfirmVideo = async (trimmedUri: string, startTime: number, endTime: number) => {
    console.log('Video confirmed with trim:', { startTime, endTime });
    console.log('isRecordingFromWordDetail:', isRecordingFromWordDetail);
    console.log('targetWordId:', targetWordId);
    console.log('videoCreationDate:', videoCreationDate);
    
    // Store trim information
    setTrimStart(startTime);
    setTrimEnd(endTime);
    
    if (isRecordingFromWordDetail && targetWordId) {
      console.log('Method 2: Exiting preview and saving video in background');
      
      if (previousRoute) {
        console.log('Returning to previous route:', previousRoute);
        router.push(previousRoute as any);
      }
      
      clearRecordedVideo();
      
      saveVideoToWord(targetWordId, trimmedUri, startTime, endTime, true);
    } else {
      console.log('Method 1: Showing word selection bottom sheet');
      await fetchWords();
      selectWordSheetRef.current?.present();
    }
  };

  const handleCancelVideo = () => {
    console.log('Video cancelled');
    setVideoCreationDate(null);
    clearRecordedVideo();
  };

  const saveVideoToWord = async (
    wordId: string, 
    videoUri: string, 
    startTime: number, 
    endTime: number,
    isMethod2: boolean = false
  ) => {
    if (!selectedChild) {
      Alert.alert('Error', 'Missing required data');
      return;
    }

    try {
      console.log('=== Starting video save process ===');
      console.log('Video URI:', videoUri);
      console.log('Trim range:', startTime, '-', endTime);
      console.log('User Word ID:', wordId);
      console.log('Child ID:', selectedChild.id);
      console.log('Video creation date:', videoCreationDate);
      
      setToastMessage('Video saving…');
      setShowToastViewButton(false);
      setSavedWordId(null);
      setToastVisible(true);
      
      const { data: userWordData } = await supabase
        .from('user_words')
        .select(`
          word_library (
            word
          )
        `)
        .eq('id', wordId)
        .single();
      
      const wordName = userWordData?.word_library?.word || 'word';
      
      // Step 1: Try to generate thumbnail
      console.log('Step 1: Attempting thumbnail generation...');
      const thumbnailUri = await generateVideoThumbnail(videoUri);
      
      let uploadedThumbnailUrl: string | null = null;
      
      if (thumbnailUri) {
        console.log('Step 2: Uploading thumbnail to Supabase...');
        uploadedThumbnailUrl = await uploadThumbnailToSupabase(thumbnailUri, selectedChild.id, supabase);
        
        if (uploadedThumbnailUrl) {
          console.log('✓ Thumbnail uploaded successfully:', uploadedThumbnailUrl);
        } else {
          console.warn('✗ Failed to upload thumbnail');
        }
      } else {
        console.log('ℹ No thumbnail generated (feature not implemented yet)');
      }
      
      // Step 2: Upload video
      console.log('Step 2: Uploading video to Supabase...');
      const uploadedVideoUrl = await uploadVideoToSupabase(videoUri, selectedChild.id, supabase);
      
      if (!uploadedVideoUrl) {
        throw new Error('Failed to upload video');
      }
      
      console.log('✓ Video uploaded successfully:', uploadedVideoUrl);
      
      // Step 3: Save to database with trim information and creation date
      console.log('Step 3: Saving to database with trim info and creation date...');
      const trimmedDuration = endTime - startTime;
      
      const momentData: any = {
        word_id: wordId,
        child_id: selectedChild.id,
        video_url: uploadedVideoUrl,
        thumbnail_url: uploadedThumbnailUrl,
        duration: trimmedDuration,
        trim_start: startTime,
        trim_end: endTime,
      };
      
      // Add original creation date if available
      if (videoCreationDate) {
        momentData.original_created_at = videoCreationDate.toISOString();
        console.log('Including original creation date:', momentData.original_created_at);
      }
      
      const { error: insertError } = await supabase
        .from('moments')
        .insert(momentData);

      if (insertError) {
        console.error('✗ Database insert error:', insertError);
        throw insertError;
      }

      console.log('✓ Saved to database successfully');
      console.log('=== Video save process complete ===');
      
      // Clear the creation date after saving
      setVideoCreationDate(null);
      
      setToastVisible(false);
      
      setTimeout(() => {
        setToastMessage(`Video saved to "${wordName}"`);
        setShowToastViewButton(true);
        setSavedWordId(wordId);
        setToastVisible(true);
      }, 300);
      
    } catch (error) {
      console.error('✗ Error in saveVideoToWord:', error);
      setToastVisible(false);
      Alert.alert('Error', 'Failed to save video. Please try again.');
    }
  };

  const handleSelectWord = async (wordId: string) => {
    console.log('Word selected from bottom sheet:', wordId);
    
    const videoUriToSave = recordedVideoUri;
    const startTime = trimStart;
    const endTime = trimEnd;
    
    selectWordSheetRef.current?.dismiss();
    
    if (previousRoute) {
      console.log('Returning to previous route:', previousRoute);
      router.push(previousRoute as any);
    }
    
    clearRecordedVideo();
    
    if (videoUriToSave && selectedChild) {
      await saveVideoToWord(wordId, videoUriToSave, startTime, endTime, false);
    }
  };

  const handleViewNow = () => {
    console.log('View now pressed for word:', savedWordId);
    
    if (savedWordId) {
      setTargetWordIdToOpen(savedWordId);
      router.push('/(tabs)/words');
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 10);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms}`;
  };

  if (!shouldShowTabBar) {
    return null;
  }

  return (
    <>
      {showCamera && cameraPermission?.granted && (
        <View 
          style={[
            StyleSheet.absoluteFill, 
            { 
              zIndex: 2000,
              backgroundColor: '#000000',
            }
          ]}
          pointerEvents="auto"
        >
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={closeCamera}
          >
            <MaterialIcons name="close" size={32} color={colors.backgroundAlt} />
          </TouchableOpacity>

          {isRecording && (
            <View style={styles.recordingIndicator}>
              <View style={styles.recordingDot} />
              <Text style={styles.recordingTime}>
                {formatTime(recordingTime)}
              </Text>
            </View>
          )}

          <CameraView 
            ref={cameraRef}
            style={StyleSheet.absoluteFill} 
            mode="video"
            facing={cameraFacing}
            onCameraReady={handleCameraReady}
          />

          {isCameraReady && (
            <View style={styles.cameraControls}>
              {/* Upload from album button - bottom left */}
              <TouchableOpacity 
                style={styles.uploadButton}
                onPress={pickVideoFromLibrary}
                disabled={isRecording}
              >
                <MaterialIcons 
                  name="photo-library" 
                  size={28} 
                  color={isRecording ? 'rgba(255, 255, 255, 0.3)' : colors.backgroundAlt} 
                />
              </TouchableOpacity>

              {/* Record/Stop button - center */}
              {!isRecording ? (
                <TouchableOpacity 
                  style={styles.recordButton}
                  onPress={startRecording}
                >
                  <View style={styles.recordButtonInner} />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity 
                  style={styles.stopButton}
                  onPress={stopRecording}
                >
                  <View style={styles.stopButtonInner} />
                </TouchableOpacity>
              )}

              {/* Switch camera button - bottom right */}
              <TouchableOpacity 
                style={styles.switchCameraButton}
                onPress={toggleCameraFacing}
                disabled={isRecording}
              >
                <MaterialIcons 
                  name="flip-camera-ios" 
                  size={28} 
                  color={isRecording ? 'rgba(255, 255, 255, 0.3)' : colors.backgroundAlt} 
                />
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {!showCamera && recordedVideoUri && (
        <View 
          style={[
            StyleSheet.absoluteFill, 
            { 
              zIndex: 2000,
            }
          ]}
          pointerEvents="auto"
        >
          <VideoPreviewModal
            videoUri={recordedVideoUri}
            duration={recordedVideoDuration || 0}
            onConfirm={handleConfirmVideo}
            onCancel={handleCancelVideo}
          />
        </View>
      )}

      <View style={styles.tabBarContainer} pointerEvents="box-none">
        <View style={styles.tabBar} pointerEvents="box-none">
          {tabs.map((tab, index) => {
            const isActive = activeTab === tab.name;

            if (tab.isAddButton) {
              return (
                <Animated.View 
                  key={index}
                  style={[
                    styles.addButtonWrapper,
                    { transform: [{ scale: scaleAnims[index] }] }
                  ]}
                >
                  <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => handleAddPress(index)}
                    activeOpacity={0.8}
                  >
                    <MaterialIcons name="add" size={28} color={colors.backgroundAlt} />
                  </TouchableOpacity>
                </Animated.View>
              );
            }

            return (
              <View key={index} style={styles.tabItemContainer} pointerEvents="none">
                <View style={styles.tabIconPlaceholder} pointerEvents="none">
                  {tab.iconDefault && tab.iconSelected ? (
                    <Image
                      source={isActive ? tab.iconSelected : tab.iconDefault}
                      style={styles.tabIcon}
                      resizeMode="contain"
                    />
                  ) : null}
                </View>
                <Text 
                  style={[
                    styles.tabLabel,
                    isActive && styles.tabLabelActive
                  ]}
                >
                  {tab.label}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      <AddOptionsModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onScanBook={handleScanBook}
        onAddWord={handleAddWord}
        onCaptureMoment={handleCaptureMoment}
      />

      <SelectWordBottomSheet
        ref={selectWordSheetRef}
        words={words}
        onSelectWord={handleSelectWord}
        onClose={() => selectWordSheetRef.current?.dismiss()}
      />

      <ToastNotification
        visible={toastVisible}
        message={toastMessage}
        showViewButton={showToastViewButton}
        onViewPress={handleViewNow}
        onHide={() => setToastVisible(false)}
      />
    </>
  );
}

export default function TabLayout() {
  return (
    <>
      <NativeTabs
        backgroundColor={colors.tabInactive}
        tintColor={colors.tabIconActive}
        iconColor={colors.tabIconInactive}
        initialRouteName="profile"
        screenOptions={{
          tabBarActiveBackgroundColor: '#FF7A00',
          tabBarInactiveBackgroundColor: 'transparent',
          tabBarItemStyle: { borderRadius: 16, margin: 6 },
          tabBarStyle: { height: 64, paddingBottom: 8, paddingTop: 8 },
        }}
      >
        <NativeTabs.Trigger name="books">
          <Icon drawable={require('@/assets/images/9a501b37-3b8d-4309-b89f-a0f0a8a510bb.png')} />
          <Label hidden />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="words">
          <Icon drawable={require('@/assets/images/0d5c36da-89bf-42a5-b21a-859a42fe4580.png')} />
          <Label hidden />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="play">
          <Icon drawable={require('@/assets/images/a52345f9-68c2-478b-9403-dc23d3ed0aee.png')} />
          <Label hidden />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="profile">
          <Icon drawable={require('@/assets/images/14d63ac9-4651-4542-8f2a-76f9f54f4436.png')} />
          <Label hidden />
        </NativeTabs.Trigger>
        <NativeTabs.Screen name="(home)" options={{ href: null }} />
        <NativeTabs.Screen 
          name="settings" 
          options={{ 
            href: null,
            presentation: 'modal'
          }} 
        />
      </NativeTabs>
      <CustomTabBar />
    </>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
    zIndex: 1000,
    paddingBottom: 0,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.tabInactive,
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 32,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'space-around',
    boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.15)',
    elevation: 8,
    height: 80,
  },
  tabItemContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 0,
    marginTop: -12,
  },
  tabIconPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  tabIcon: {
    width: 24,
    height: 24,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: colors.tabIconInactive,
    marginTop: -10,
  },
  tabLabelActive: {
    color: '#000000',
    fontWeight: '600',
  },
  addButtonWrapper: {
    marginTop: -24,
    width: 64,
    height: 64,
  },
  addButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0px 6px 16px rgba(255, 87, 34, 0.4)',
    elevation: 12,
    borderWidth: 4,
    borderColor: colors.background,
  },
  closeButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2001,
  },
  recordingIndicator: {
    position: 'absolute',
    top: 60,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    zIndex: 2001,
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.secondary,
    marginRight: 8,
  },
  recordingTime: {
    color: colors.backgroundAlt,
    fontSize: 16,
    fontWeight: '600',
  },
  cameraControls: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 40,
    zIndex: 2000,
  },
  uploadButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.backgroundAlt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: colors.secondary,
  },
  recordButtonInner: {
    width: 56,
    height: 56,
    backgroundColor: colors.secondary,
    borderRadius: 28,
  },
  stopButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.backgroundAlt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: colors.secondary,
  },
  stopButtonInner: {
    width: 32,
    height: 32,
    backgroundColor: colors.secondary,
    borderRadius: 4,
  },
  switchCameraButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
