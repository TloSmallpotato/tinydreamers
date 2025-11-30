
import React, { useRef, useState } from 'react';
import { Stack, useRouter, usePathname } from 'expo-router';
import { View, TouchableOpacity, StyleSheet, Platform, Animated, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Alert } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

interface TabItem {
  name: string;
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
    route: '/(tabs)/books',
    iosIcon: 'book.fill',
    androidIcon: 'menu-book',
    materialIcon: 'menu-book',
    iconDefault: require('@/assets/images/40292f0c-5084-4da7-ab7e-20e42bbb8555.png'),
    iconSelected: require('@/assets/images/58340aa2-f3e0-47ef-8440-bd682c04475d.png'),
  },
  {
    name: 'words',
    route: '/(tabs)/words',
    iosIcon: 'text.bubble.fill',
    androidIcon: 'chat-bubble',
    materialIcon: 'chat-bubble',
    iconDefault: require('@/assets/images/0d5c36da-89bf-42a5-b21a-859a42fe4580.png'),
    iconSelected: require('@/assets/images/e6ac3f52-53f8-45a0-b744-28cbf5ef758f.png'),
  },
  {
    name: 'add',
    route: '/(tabs)/add',
    iosIcon: 'plus',
    androidIcon: 'add',
    materialIcon: 'add',
    isAddButton: true,
  },
  {
    name: 'play',
    route: '/(tabs)/play',
    iosIcon: 'play.circle.fill',
    androidIcon: 'sports-esports',
    materialIcon: 'sports-esports',
    iconDefault: require('@/assets/images/a52345f9-68c2-478b-9403-dc23d3ed0aee.png'),
    iconSelected: require('@/assets/images/b8d67420-03b7-4803-aab2-35e9d6d21f4e.png'),
  },
  {
    name: 'profile',
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
                  <MaterialIcons name="add" size={28} color={colors.backgroundAlt} />
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
