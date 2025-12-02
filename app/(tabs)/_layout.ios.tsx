
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { NativeTabs, Icon, Label } from 'expo-router/unstable-native-tabs';
import { View, TouchableOpacity, StyleSheet, Animated, Alert, Image, Text } from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { usePathname, useRouter } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useVideoRecording } from '@/contexts/VideoRecordingContext';
import { useChild } from '@/contexts/ChildContext';
import { useCameraTrigger } from '@/contexts/CameraTriggerContext';
import { useWordNavigation } from '@/contexts/WordNavigationContext';
import SelectWordBottomSheet from '@/components/SelectWordBottomSheet';
import VideoPreviewModal from '@/components/VideoPreviewModal';
import ToastNotification from '@/components/ToastNotification';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { supabase } from '@/app/integrations/supabase/client';
import * as FileSystem from 'expo-file-system/legacy';

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
    iosIcon: 'book.fill',
    androidIcon: 'menu-book',
    materialIcon: 'menu-book',
    iconDefault: require('@/assets/images/40292f0c-5084-4da7-ab7e-20e42bbb8555.png'),
    iconSelected: require('@/assets/images/58340aa2-f3e0-47ef-8440-bd682c04475d.png'),
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
  const cameraRef = useRef<CameraView>(null);
  const scaleAnims = useRef(tabs.map(() => new Animated.Value(1))).current;
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [previousRoute, setPreviousRoute] = useState<string>('/(tabs)/profile');
  
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
  const [words, setWords] = useState<any[]>([]);
  const selectWordSheetRef = useRef<BottomSheetModal>(null);

  // Toast notification state
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [showToastViewButton, setShowToastViewButton] = useState(false);
  const [savedWordId, setSavedWordId] = useState<string | null>(null);

  // Track the current route before opening camera
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
    };
    initPermissions();
  }, [cameraPermission, requestCameraPermission]);

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
  }, [cameraPermission, requestCameraPermission]);

  // Listen for camera trigger from WordDetailBottomSheet
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
        .from('words')
        .select('*')
        .eq('child_id', selectedChild.id)
        .order('word', { ascending: true });

      if (error) throw error;
      setWords(data || []);
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
    return 'profile';
  };

  const activeTab = getActiveTab();
  const shouldShowTabBar = !pathname.includes('/settings');

  const handleAddPress = async (index: number) => {
    console.log('Add button pressed - opening camera');
    
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

    await openCamera();
  };

  const handleCameraReady = () => {
    console.log('Camera is ready!');
    setIsCameraReady(true);
  };

  const startRecording = async () => {
    if (cameraRef.current && !isRecording) {
      try {
        console.log('Starting video recording');
        setIsRecording(true);
        setRecordingTime(0);
        
        recordingTimerRef.current = setInterval(() => {
          setRecordingTime((prev) => prev + 1);
        }, 1000);
        
        const video = await cameraRef.current.recordAsync({
          maxDuration: 300,
        });
        
        console.log('Video recorded:', video);
        
        if (recordingTimerRef.current) {
          clearInterval(recordingTimerRef.current);
          recordingTimerRef.current = null;
        }
        
        setIsRecording(false);
        setRecordedVideo(video.uri, recordingTime);
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
  };

  const handleConfirmVideo = async () => {
    console.log('Video confirmed');
    console.log('isRecordingFromWordDetail:', isRecordingFromWordDetail);
    console.log('targetWordId:', targetWordId);
    
    if (isRecordingFromWordDetail && targetWordId) {
      // Method 2: Exit immediately and save in background
      console.log('Method 2: Exiting preview and saving video in background');
      
      // Navigate back to previous route immediately
      if (previousRoute) {
        console.log('Returning to previous route:', previousRoute);
        router.push(previousRoute as any);
      }
      
      // Clear the video preview
      clearRecordedVideo();
      
      // Save video in background (non-blocking)
      saveVideoToWord(targetWordId, true);
    } else {
      // Method 1: Show word selection bottom sheet
      console.log('Method 1: Showing word selection bottom sheet');
      await fetchWords();
      selectWordSheetRef.current?.present();
    }
  };

  const handleCancelVideo = () => {
    console.log('Video cancelled');
    clearRecordedVideo();
  };

  const saveVideoToWord = async (wordId: string, isMethod2: boolean = false) => {
    if (!selectedChild || !recordedVideoUri) {
      Alert.alert('Error', 'Missing required data');
      return;
    }

    // Store video URI locally before clearing
    const videoUriToSave = recordedVideoUri;
    const videoDurationToSave = recordedVideoDuration || 0;

    try {
      console.log('Saving video to word:', wordId);
      
      // Show "Video saving..." toast immediately
      setToastMessage('Video saving…');
      setShowToastViewButton(false);
      setSavedWordId(null);
      setToastVisible(true);
      
      // Get word name for toast message
      const { data: wordData } = await supabase
        .from('words')
        .select('word')
        .eq('id', wordId)
        .single();
      
      const wordName = wordData?.word || 'word';
      
      const videoFileName = `${selectedChild.id}/${Date.now()}.mp4`;
      const videoFile = await FileSystem.readAsStringAsync(videoUriToSave, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      const decode = (base64: string) => {
        const binaryString = atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes;
      };
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('video-moments')
        .upload(videoFileName, decode(videoFile), {
          contentType: 'video/mp4',
        });

      if (uploadError) {
        console.error('Error uploading video:', uploadError);
        throw uploadError;
      }

      const { data: urlData } = supabase.storage
        .from('video-moments')
        .getPublicUrl(videoFileName);

      const { error: insertError } = await supabase
        .from('moments')
        .insert({
          word_id: wordId,
          child_id: selectedChild.id,
          video_url: urlData.publicUrl,
          duration: videoDurationToSave,
        });

      if (insertError) {
        console.error('Error saving moment:', insertError);
        throw insertError;
      }

      console.log('Video saved successfully');
      
      // Hide the "saving" toast first
      setToastVisible(false);
      
      // Wait a brief moment, then show the success toast
      setTimeout(() => {
        setToastMessage(`Video saved to "${wordName}"`);
        setShowToastViewButton(true);
        setSavedWordId(wordId);
        setToastVisible(true);
      }, 300);
      
    } catch (error) {
      console.error('Error in saveVideoToWord:', error);
      setToastVisible(false);
      Alert.alert('Error', 'Failed to save video');
    }
  };

  const handleSelectWord = async (wordId: string) => {
    console.log('Word selected from bottom sheet:', wordId);
    
    // Store video data before clearing
    const videoUriToSave = recordedVideoUri;
    const videoDurationToSave = recordedVideoDuration;
    
    // Close the bottom sheet immediately
    selectWordSheetRef.current?.dismiss();
    
    // Navigate back to previous route immediately
    if (previousRoute) {
      console.log('Returning to previous route:', previousRoute);
      router.push(previousRoute as any);
    }
    
    // Clear the recorded video state
    clearRecordedVideo();
    
    // Save video in background (non-blocking)
    if (videoUriToSave && selectedChild) {
      try {
        console.log('Saving video to word:', wordId);
        
        // Show "Video saving..." toast immediately
        setToastMessage('Video saving…');
        setShowToastViewButton(false);
        setSavedWordId(null);
        setToastVisible(true);
        
        // Get word name for toast message
        const { data: wordData } = await supabase
          .from('words')
          .select('word')
          .eq('id', wordId)
          .single();
        
        const wordName = wordData?.word || 'word';
        
        const videoFileName = `${selectedChild.id}/${Date.now()}.mp4`;
        const videoFile = await FileSystem.readAsStringAsync(videoUriToSave, {
          encoding: FileSystem.EncodingType.Base64,
        });
        
        const decode = (base64: string) => {
          const binaryString = atob(base64);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          return bytes;
        };
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('video-moments')
          .upload(videoFileName, decode(videoFile), {
            contentType: 'video/mp4',
          });

        if (uploadError) {
          console.error('Error uploading video:', uploadError);
          throw uploadError;
        }

        const { data: urlData } = supabase.storage
          .from('video-moments')
          .getPublicUrl(videoFileName);

        const { error: insertError } = await supabase
          .from('moments')
          .insert({
            word_id: wordId,
            child_id: selectedChild.id,
            video_url: urlData.publicUrl,
            duration: videoDurationToSave || 0,
          });

        if (insertError) {
          console.error('Error saving moment:', insertError);
          throw insertError;
        }

        console.log('Video saved successfully');
        
        // Hide the "saving" toast first
        setToastVisible(false);
        
        // Wait a brief moment, then show the success toast
        setTimeout(() => {
          setToastMessage(`Video saved to "${wordName}"`);
          setShowToastViewButton(true);
          setSavedWordId(wordId);
          setToastVisible(true);
        }, 300);
        
      } catch (error) {
        console.error('Error in handleSelectWord:', error);
        setToastVisible(false);
        Alert.alert('Error', 'Failed to save video');
      }
    }
  };

  const handleViewNow = () => {
    console.log('View now pressed for word:', savedWordId);
    
    // Set the target word to open and navigate to words page
    if (savedWordId) {
      setTargetWordIdToOpen(savedWordId);
      router.push('/(tabs)/words');
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
              <Text style={styles.recordingTime}>{formatTime(recordingTime)}</Text>
            </View>
          )}

          <CameraView 
            ref={cameraRef}
            style={StyleSheet.absoluteFill} 
            mode="video"
            facing="back"
            onCameraReady={handleCameraReady}
          />

          {isCameraReady && (
            <View style={styles.cameraControls}>
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
          <Icon drawable={require('@/assets/images/40292f0c-5084-4da7-ab7e-20e42bbb8555.png')} />
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
        <NativeTabs.Screen name="settings" options={{ href: null }} />
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
    marginTop: 0,
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
    alignItems: 'center',
    zIndex: 2000,
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
