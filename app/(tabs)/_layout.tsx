
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Stack, useRouter, usePathname } from 'expo-router';
import { View, TouchableOpacity, StyleSheet, Platform, Animated, Image, Alert, Text } from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { CameraView, useCameraPermissions, CameraType } from 'expo-camera';
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
import BarcodeScannerModal from '@/components/BarcodeScannerModal';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { supabase } from '@/app/integrations/supabase/client';
import { generateVideoThumbnail, uploadThumbnailToSupabase, uploadVideoToSupabase } from '@/utils/videoThumbnail';
import { Video, AVPlaybackStatus } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';

interface TabItem {
  name: string;
  label: string;
  route: string;
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
    route: '/(tabs)/books',
    iosIcon: 'book.fill',
    androidIcon: 'menu-book',
    materialIcon: 'menu-book',
    iconDefault: require('@/assets/images/40292f0c-5084-4da7-ab7e-20e42bbb8555.png'),
    iconSelected: require('@/assets/images/58340aa2-f3e0-47ef-8440-bd682c04475d.png'),
  },
  {
    name: 'words',
    label: 'Words',
    route: '/(tabs)/words',
    iosIcon: 'text.bubble.fill',
    androidIcon: 'chat-bubble',
    materialIcon: 'chat-bubble',
    iconDefault: require('@/assets/images/0d5c36da-89bf-42a5-b21a-859a42fe4580.png'),
    iconSelected: require('@/assets/images/b8d67420-03b7-4803-aab2-35e9d6d21f4e.png'),
  },
  {
    name: 'add',
    label: 'Add',
    route: '/(tabs)/add',
    iosIcon: 'plus',
    androidIcon: 'add',
    materialIcon: 'add',
    isAddButton: true,
  },
  {
    name: 'play',
    label: 'Play',
    route: '/(tabs)/play',
    iosIcon: 'play.circle.fill',
    androidIcon: 'sports-esports',
    materialIcon: 'sports-esports',
    iconDefault: require('@/assets/images/a52345f9-68c2-478b-9403-dc23d3ed0aee.png'),
    iconSelected: require('@/assets/images/e6ac3f52-53f8-45a0-b744-28cbf5ef758f.png'),
  },
  {
    name: 'profile',
    label: 'Profile',
    route: '/(tabs)/profile',
    iosIcon: 'face.smiling.fill',
    androidIcon: 'mood',
    materialIcon: 'mood',
    iconDefault: require('@/assets/images/14d63ac9-4651-4542-8f2a-76f9f54f4436.png'),
    iconSelected: require('@/assets/images/c3dd0532-ba2e-42fd-8611-07d1cab67f53.png'),
  },
];

function CustomTabBar() {
  const router = useRouter();
  const pathname = usePathname();
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [mediaLibraryPermission, requestMediaLibraryPermission] = ImagePicker.useMediaLibraryPermissions();
  const [showCamera, setShowCamera] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [cameraFacing, setCameraFacing] = useState<CameraType>('back');
  const cameraRef = useRef<CameraView>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [previousRoute, setPreviousRoute] = useState<string>('/(tabs)/profile');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  const scaleAnims = useRef(
    tabs.map(() => new Animated.Value(1))
  ).current;

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

  // Store video creation date for uploaded videos
  const [uploadedVideoCreationDate, setUploadedVideoCreationDate] = useState<Date | null>(null);

  useEffect(() => {
    if (!showCamera && !recordedVideoUri) {
      setPreviousRoute(pathname);
    }
  }, [pathname, showCamera, recordedVideoUri]);

  useEffect(() => {
    const initPermissions = async () => {
      if (cameraPermission && !cameraPermission.granted) {
        console.log('Pre-requesting camera permission');
        await requestCameraPermission();
      }
      if (mediaLibraryPermission && !mediaLibraryPermission.granted) {
        console.log('Pre-requesting media library permission');
        await requestMediaLibraryPermission();
      }
    };
    initPermissions();
  }, [cameraPermission, requestCameraPermission, mediaLibraryPermission, requestMediaLibraryPermission]);

  const openCamera = useCallback(async () => {
    console.log('Opening camera for video recording');
    
    if (!cameraPermission) {
      console.log('Camera permission not loaded yet');
      return;
    }

    if (!cameraPermission.granted) {
      console.log('Requesting camera permission');
      const result = await requestCameraPermission();
      if (!result.granted) {
        console.log('Camera permission denied');
        Alert.alert(
          'Camera Permission Required',
          'Please grant camera permission to record videos.',
          [{ text: 'OK' }]
        );
        return;
      }
    }

    setIsCameraReady(false);
    setShowCamera(true);
    setRecordingTime(0);
    setCameraFacing('back');
    setUploadedVideoCreationDate(null);
  }, [cameraPermission, requestCameraPermission]);

  useEffect(() => {
    if (shouldOpenCamera) {
      console.log('Camera trigger detected from WordDetailBottomSheet');
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

  const handleTabPress = async (tab: TabItem, index: number) => {
    console.log('Tab pressed:', tab.name);
    
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

    if (tab.isAddButton) {
      console.log('Add button pressed - showing options modal');
      setShowAddModal(true);
    } else {
      console.log('Navigating to:', tab.route);
      router.push(tab.route as any);
    }
  };

  const handleScanBook = () => {
    console.log('Add book selected - opening scanner directly');
    setShowAddModal(false);
    // Open the barcode scanner directly
    setTimeout(() => {
      setShowScanner(true);
    }, 300);
  };

  const handleBarcodeScanned = (isbn: string) => {
    console.log('ISBN scanned from tab bar scanner:', isbn);
    // Close the scanner
    setShowScanner(false);
    // Navigate to books page and let it handle the ISBN
    router.push({
      pathname: '/(tabs)/books',
      params: { scannedISBN: isbn },
    } as any);
  };

  const handleAddWord = () => {
    console.log('Add word selected - navigating with autoOpen param');
    setShowAddModal(false);
    // Navigate to words screen with autoOpen parameter
    router.push({
      pathname: '/(tabs)/words',
      params: { autoOpen: 'true' },
    } as any);
  };

  const handleCaptureMoment = async () => {
    console.log('Capture moment selected');
    setShowAddModal(false);
    await openCamera();
  };

  const handleCameraReady = () => {
    console.log('Camera is ready!');
    setIsCameraReady(true);
  };

  const handleUploadFromAlbum = async () => {
    console.log('Upload from album pressed');
    
    if (!mediaLibraryPermission) {
      console.log('Media library permission not loaded yet');
      return;
    }

    if (!mediaLibraryPermission.granted) {
      console.log('Requesting media library permission');
      const result = await requestMediaLibraryPermission();
      if (!result.granted) {
        console.log('Media library permission denied');
        Alert.alert(
          'Media Library Permission Required',
          'Please grant media library permission to select videos.',
          [{ text: 'OK' }]
        );
        return;
      }
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        allowsEditing: false,
        quality: 1,
      });

      console.log('Image picker result:', result);

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        console.log('Selected video asset:', asset);
        
        // Extract creation date from asset
        // On Android, we can use the asset's creation date if available
        const creationDate = new Date();
        console.log('Video creation date:', creationDate);
        setUploadedVideoCreationDate(creationDate);
        
        // Get video duration
        const duration = await getVideoDuration(asset.uri);
        console.log('Uploaded video duration:', duration);
        
        setRecordedVideo(asset.uri, duration);
        setShowCamera(false);
        setIsCameraReady(false);
      }
    } catch (error) {
      console.error('Error picking video from library:', error);
      Alert.alert('Error', 'Failed to select video from library');
    }
  };

  const handleSwitchCamera = () => {
    if (isRecording) {
      console.log('Cannot switch camera while recording');
      return;
    }
    
    console.log('Switching camera');
    setCameraFacing(current => current === 'back' ? 'front' : 'back');
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
        setUploadedVideoCreationDate(null);
        
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
    clearRecordedVideo();
    setUploadedVideoCreationDate(null);
  };

  const handleConfirmVideo = async (trimmedUri: string, startTime: number, endTime: number) => {
    console.log('Video confirmed with trim:', { startTime, endTime });
    console.log('isRecordingFromWordDetail:', isRecordingFromWordDetail);
    console.log('targetWordId:', targetWordId);
    console.log('uploadedVideoCreationDate:', uploadedVideoCreationDate);
    
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
    clearRecordedVideo();
    setUploadedVideoCreationDate(null);
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
      console.log('Video creation date:', uploadedVideoCreationDate);
      
      setToastMessage('Video saving…');
      setShowToastViewButton(false);
      setSavedWordId(null);
      setToastVisible(true);
      
      // Get word name for toast message
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

      // Add creation date if available (for uploaded videos)
      if (uploadedVideoCreationDate) {
        momentData.created_at = uploadedVideoCreationDate.toISOString();
        console.log('Using uploaded video creation date:', momentData.created_at);
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
      
      setToastVisible(false);
      
      setTimeout(() => {
        setToastMessage(`Video saved to "${wordName}"`);
        setShowToastViewButton(true);
        setSavedWordId(wordId);
        setToastVisible(true);
      }, 300);
      
      // Clear the creation date after saving
      setUploadedVideoCreationDate(null);
      
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
              zIndex: 10000,
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
              <View style={styles.cameraButtonsRow}>
                {/* Upload from Album Button - Bottom Left */}
                <TouchableOpacity 
                  style={styles.uploadButton}
                  onPress={handleUploadFromAlbum}
                  disabled={isRecording}
                >
                  <MaterialIcons 
                    name="photo-library" 
                    size={28} 
                    color={isRecording ? 'rgba(255, 255, 255, 0.3)' : colors.backgroundAlt} 
                  />
                </TouchableOpacity>

                {/* Record/Stop Button - Center */}
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

                {/* Switch Camera Button - Bottom Right */}
                <TouchableOpacity 
                  style={styles.switchCameraButton}
                  onPress={handleSwitchCamera}
                  disabled={isRecording}
                >
                  <MaterialIcons 
                    name="flip-camera-android" 
                    size={28} 
                    color={isRecording ? 'rgba(255, 255, 255, 0.3)' : colors.backgroundAlt} 
                  />
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      )}

      {!showCamera && recordedVideoUri && (
        <View 
          style={[
            StyleSheet.absoluteFill, 
            { 
              zIndex: 10000,
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
        <View style={styles.tabBar}>
          {tabs.map((tab, index) => {
            const isActive = activeTab === tab.name;
            const isAddButton = tab.isAddButton;

            if (isAddButton) {
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
                    onPress={() => handleTabPress(tab, index)}
                    activeOpacity={0.8}
                  >
                    <MaterialIcons name="add" size={28} color={colors.backgroundAlt} />
                  </TouchableOpacity>
                </Animated.View>
              );
            }

            return (
              <TouchableOpacity
                key={index}
                style={styles.tabItemContainer}
                onPress={() => handleTabPress(tab, index)}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.tabButton,
                    isActive && styles.tabButtonActive,
                  ]}
                >
                  {tab.iconDefault && tab.iconSelected ? (
                    <Image
                      source={isActive ? tab.iconSelected : tab.iconDefault}
                      style={styles.tabIcon}
                      resizeMode="contain"
                    />
                  ) : (
                    <IconSymbol
                      ios_icon_name={tab.iosIcon}
                      android_material_icon_name={tab.androidIcon}
                      size={24}
                      color={isActive ? colors.tabIconActive : colors.tabIconInactive}
                    />
                  )}
                </View>
                <Text 
                  style={[
                    styles.tabLabel,
                    isActive && styles.tabLabelActive
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
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

      <BarcodeScannerModal
        visible={showScanner}
        onClose={() => setShowScanner(false)}
        onBarcodeScanned={handleBarcodeScanned}
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
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="(home)" options={{ headerShown: false }} />
        <Stack.Screen name="books" options={{ headerShown: false }} />
        <Stack.Screen name="words" options={{ headerShown: false }} />
        <Stack.Screen name="play" options={{ headerShown: false }} />
        <Stack.Screen name="profile" options={{ headerShown: false }} />
        <Stack.Screen 
          name="settings" 
          options={{ 
            headerShown: false,
            presentation: 'card',
          }} 
        />
      </Stack>
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
    zIndex: 100,
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
  tabButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  tabButtonActive: {
    backgroundColor: colors.tabActive,
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
    zIndex: 10001,
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
    zIndex: 10001,
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
    alignItems: 'center',
    zIndex: 10000,
  },
  cameraButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 40,
  },
  uploadButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchCameraButton: {
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
});
