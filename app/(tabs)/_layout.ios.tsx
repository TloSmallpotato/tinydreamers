
import React, { useRef, useState, useEffect } from 'react';
import { NativeTabs, Icon, Label } from 'expo-router/unstable-native-tabs';
import { View, TouchableOpacity, StyleSheet, Animated, Alert, Image } from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { usePathname } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

interface TabItem {
  name: string;
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
    iosIcon: 'book.fill',
    androidIcon: 'menu-book',
    materialIcon: 'menu-book',
    iconDefault: require('@/assets/images/40292f0c-5084-4da7-ab7e-20e42bbb8555.png'),
    iconSelected: require('@/assets/images/58340aa2-f3e0-47ef-8440-bd682c04475d.png'),
  },
  {
    name: 'words',
    iosIcon: 'text.bubble.fill',
    androidIcon: 'chat-bubble',
    materialIcon: 'chat-bubble',
    iconDefault: require('@/assets/images/0d5c36da-89bf-42a5-b21a-859a42fe4580.png'),
    iconSelected: require('@/assets/images/b8d67420-03b7-4803-aab2-35e9d6d21f4e.png'),
  },
  {
    name: 'add',
    iosIcon: 'plus',
    androidIcon: 'add',
    materialIcon: 'add',
    isAddButton: true,
  },
  {
    name: 'play',
    iosIcon: 'play.circle.fill',
    androidIcon: 'sports-esports',
    materialIcon: 'sports-esports',
    iconDefault: require('@/assets/images/a52345f9-68c2-478b-9403-dc23d3ed0aee.png'),
    iconSelected: require('@/assets/images/e6ac3f52-53f8-45a0-b744-28cbf5ef758f.png'),
  },
  {
    name: 'profile',
    iosIcon: 'face.smiling.fill',
    androidIcon: 'mood',
    materialIcon: 'mood',
    iconDefault: require('@/assets/images/14d63ac9-4651-4542-8f2a-76f9f54f4436.png'),
    iconSelected: require('@/assets/images/c3dd0532-ba2e-42fd-8611-07d1cab67f53.png'),
  },
];

function CustomTabBar() {
  const pathname = usePathname();
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [showCamera, setShowCamera] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const scaleAnims = useRef(tabs.map(() => new Animated.Value(1))).current;

  // Pre-request camera permissions on mount
  useEffect(() => {
    const requestPermissions = async () => {
      if (cameraPermission && !cameraPermission.granted) {
        console.log('Pre-requesting camera permission');
        await requestCameraPermission();
      }
    };
    requestPermissions();
  }, [cameraPermission, requestCameraPermission]);

  const getActiveTab = () => {
    if (pathname.includes('/books')) return 'books';
    if (pathname.includes('/words')) return 'words';
    if (pathname.includes('/play')) return 'play';
    if (pathname.includes('/profile')) return 'profile';
    return 'profile';
  };

  const activeTab = getActiveTab();

  const handleAddPress = async (index: number) => {
    console.log('Add button pressed - opening camera instantly');
    
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
  };

  // Start recording as soon as camera is ready and visible
  const handleCameraReady = async () => {
    console.log('Camera is ready');
    if (showCamera && !isRecording && cameraRef.current) {
      try {
        console.log('Starting video recording immediately');
        setIsRecording(true);
        const video = await cameraRef.current.recordAsync({
          maxDuration: 60,
        });
        console.log('Video recorded:', video);
        setShowCamera(false);
        setIsRecording(false);
        Alert.alert('Video Recorded', 'Your video has been saved!');
      } catch (error) {
        console.error('Error recording video:', error);
        setShowCamera(false);
        setIsRecording(false);
        Alert.alert('Error', 'Failed to record video');
      }
    }
  };

  const stopRecording = () => {
    if (cameraRef.current && isRecording) {
      console.log('Stopping video recording');
      cameraRef.current.stopRecording();
    }
    setShowCamera(false);
    setIsRecording(false);
  };

  return (
    <>
      {/* Only mount camera when showCamera is true */}
      {showCamera && cameraPermission?.granted && (
        <View style={[StyleSheet.absoluteFill, { zIndex: 2000 }]}>
          <CameraView 
            ref={cameraRef}
            style={StyleSheet.absoluteFill} 
            mode="video"
            facing="back"
            onCameraReady={handleCameraReady}
          />
          <View style={styles.cameraControls}>
            <TouchableOpacity 
              style={styles.stopButton}
              onPress={stopRecording}
            >
              <View style={styles.stopButtonInner} />
            </TouchableOpacity>
          </View>
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

            // For iOS native tabs, we show custom icons in the overlay
            // but they're just visual - the native tabs handle the actual navigation
            return (
              <View key={index} style={styles.tabIconPlaceholder} pointerEvents="none">
                {tab.iconDefault && tab.iconSelected ? (
                  <Image
                    source={isActive ? tab.iconSelected : tab.iconDefault}
                    style={styles.tabIcon}
                    resizeMode="contain"
                  />
                ) : null}
              </View>
            );
          })}
        </View>
      </View>
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
    height: 72,
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
  cameraControls: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
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
