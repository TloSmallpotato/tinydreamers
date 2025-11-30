
import React, { useRef, useState } from 'react';
import { Stack, useRouter, usePathname } from 'expo-router';
import { View, TouchableOpacity, StyleSheet, Platform, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Alert } from 'react-native';
import { BlurView } from 'expo-blur';

interface TabItem {
  name: string;
  route: string;
  iosIcon: string;
  androidIcon: string;
  isAddButton?: boolean;
}

const tabs: TabItem[] = [
  {
    name: 'books',
    route: '/(tabs)/books',
    iosIcon: 'book.fill',
    androidIcon: 'menu-book',
  },
  {
    name: 'words',
    route: '/(tabs)/words',
    iosIcon: 'text.bubble.fill',
    androidIcon: 'chat-bubble',
  },
  {
    name: 'add',
    route: '/(tabs)/add',
    iosIcon: 'plus',
    androidIcon: 'add',
    isAddButton: true,
  },
  {
    name: 'play',
    route: '/(tabs)/play',
    iosIcon: 'play.circle.fill',
    androidIcon: 'sports-esports',
  },
  {
    name: 'profile',
    route: '/(tabs)/profile',
    iosIcon: 'face.smiling.fill',
    androidIcon: 'mood',
  },
];

function CustomTabBar() {
  const router = useRouter();
  const pathname = usePathname();
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [showCamera, setShowCamera] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  const scaleAnims = useRef(
    tabs.map(() => new Animated.Value(1))
  ).current;

  const getActiveTab = () => {
    if (pathname.includes('/books')) return 'books';
    if (pathname.includes('/words')) return 'words';
    if (pathname.includes('/play')) return 'play';
    if (pathname.includes('/profile')) return 'profile';
    return 'profile';
  };

  const activeTab = getActiveTab();

  const handleTabPress = async (tab: TabItem, index: number) => {
    console.log('Tab pressed:', tab.name);
    
    // Animate button press
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
      console.log('Add button pressed - requesting camera permission');
      // Handle Add button - open camera for video recording
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

      console.log('Opening camera for video recording');
      setShowCamera(true);
      
      // Start recording automatically after a short delay
      setTimeout(async () => {
        if (cameraRef.current) {
          try {
            console.log('Starting video recording');
            const video = await cameraRef.current.recordAsync({
              maxDuration: 60,
            });
            console.log('Video recorded:', video);
            setShowCamera(false);
            Alert.alert('Video Recorded', 'Your video has been saved!');
          } catch (error) {
            console.error('Error recording video:', error);
            setShowCamera(false);
            Alert.alert('Error', 'Failed to record video');
          }
        }
      }, 500);
    } else {
      console.log('Navigating to:', tab.route);
      router.push(tab.route as any);
    }
  };

  const stopRecording = () => {
    if (cameraRef.current) {
      console.log('Stopping video recording');
      cameraRef.current.stopRecording();
    }
    setShowCamera(false);
  };

  if (showCamera) {
    return (
      <View style={StyleSheet.absoluteFill}>
        <CameraView 
          ref={cameraRef}
          style={StyleSheet.absoluteFill} 
          mode="video"
          facing="back"
        />
        <SafeAreaView style={styles.cameraControls} edges={['bottom']}>
          <TouchableOpacity 
            style={styles.stopButton}
            onPress={stopRecording}
          >
            <View style={styles.stopButtonInner} />
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.tabBarContainer} edges={['bottom']}>
      <BlurView intensity={80} tint="light" style={styles.blurContainer}>
        <View style={styles.tabBar}>
          {tabs.map((tab, index) => {
            const isActive = activeTab === tab.name;
            const isAddButton = tab.isAddButton;

            if (isAddButton) {
              return (
                <Animated.View 
                  key={index}
                  style={[
                    styles.addButtonContainer,
                    { transform: [{ scale: scaleAnims[index] }] }
                  ]}
                >
                  <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => handleTabPress(tab, index)}
                    activeOpacity={0.8}
                  >
                    <IconSymbol
                      ios_icon_name={tab.iosIcon}
                      android_material_icon_name={tab.androidIcon}
                      size={28}
                      color={colors.backgroundAlt}
                    />
                  </TouchableOpacity>
                </Animated.View>
              );
            }

            return (
              <Animated.View 
                key={index}
                style={{ transform: [{ scale: scaleAnims[index] }] }}
              >
                <TouchableOpacity
                  style={[
                    styles.tabButton,
                    isActive && styles.tabButtonActive,
                  ]}
                  onPress={() => handleTabPress(tab, index)}
                  activeOpacity={0.8}
                >
                  <IconSymbol
                    ios_icon_name={tab.iosIcon}
                    android_material_icon_name={tab.androidIcon}
                    size={28}
                    color={isActive ? colors.backgroundAlt : colors.textSecondary}
                  />
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </View>
      </BlurView>
    </SafeAreaView>
  );
}

export default function TabLayout() {
  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'none',
        }}
      >
        <Stack.Screen name="books" />
        <Stack.Screen name="words" />
        <Stack.Screen name="play" />
        <Stack.Screen name="profile" />
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
    zIndex: 1000,
  },
  blurContainer: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 40,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
  },
  tabBar: {
    flexDirection: 'row',
    height: 80,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  tabButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    zIndex: 10,
  },
  tabButtonActive: {
    backgroundColor: colors.tabActive,
  },
  addButtonContainer: {
    marginTop: -32,
    zIndex: 1001,
  },
  addButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.buttonBlue,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0px 6px 16px rgba(61, 63, 181, 0.4)',
    elevation: 12,
    borderWidth: 4,
    borderColor: colors.backgroundAlt,
  },
  cameraControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingBottom: 40,
    zIndex: 2000,
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
