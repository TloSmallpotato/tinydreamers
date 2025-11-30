
import React, { useRef, useState } from 'react';
import { Stack, useRouter, usePathname } from 'expo-router';
import { View, TouchableOpacity, StyleSheet, Platform, Animated, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Alert } from 'react-native';

interface TabItem {
  name: string;
  route: string;
  iosIcon: string;
  androidIcon: string;
  iconDefault?: any;
  iconSelected?: any;
  isAddButton?: boolean;
}

const tabs: TabItem[] = [
  {
    name: 'books',
    route: '/(tabs)/books',
    iosIcon: 'book.fill',
    androidIcon: 'menu-book',
    iconDefault: require('@/assets/images/435d780d-ba95-4570-81d7-010f545ce6bf.png'),
    iconSelected: require('@/assets/images/6ee16373-9a99-46cf-8c3d-30616cd588a7.png'),
  },
  {
    name: 'words',
    route: '/(tabs)/words',
    iosIcon: 'text.bubble.fill',
    androidIcon: 'chat-bubble',
    iconDefault: require('@/assets/images/db7c4d7d-2a0d-4a56-8d9f-0807d2b75247.png'),
    iconSelected: require('@/assets/images/aed760c0-46cf-4b8e-9da1-3afe736e5078.png'),
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
    iconDefault: require('@/assets/images/bc980c42-46cf-47fb-af93-2146b9173154.png'),
    iconSelected: require('@/assets/images/39f1f9da-ae85-4522-bc20-7ebf251b1462.png'),
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
      <View style={[styles.tabBar, { height: 72 }]}>
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
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </View>
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
  addButtonContainer: {
    marginTop: -24,
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
    borderColor: colors.background,
  },
  cameraControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingBottom: 40,
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
