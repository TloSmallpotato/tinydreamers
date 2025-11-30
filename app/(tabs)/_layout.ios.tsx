
import React, { useRef, useState } from 'react';
import { NativeTabs, Icon, Label } from 'expo-router/unstable-native-tabs';
import { View, TouchableOpacity, StyleSheet, Animated, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
    iconDefault: require('@/assets/images/5394d9a9-b46e-435c-8381-1e06e62059f8.png'),
    iconSelected: require('@/assets/images/640e4c19-40a7-4c3c-bd67-4c40276bd1e2.png'),
  },
  {
    name: 'words',
    iosIcon: 'text.bubble.fill',
    androidIcon: 'chat-bubble',
    materialIcon: 'chat-bubble',
    iconDefault: require('@/assets/images/38e2e7c2-3dad-400a-bf6b-6598901f393c.png'),
    iconSelected: require('@/assets/images/c0b915af-27e6-4c4a-9151-cfbf0ad2e156.png'),
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
    iconDefault: require('@/assets/images/60572750-7134-4e21-a14b-3a56eb724db4.png'),
    iconSelected: require('@/assets/images/414ac7fe-96c8-41af-9465-80b1a460ad3e.png'),
  },
  {
    name: 'profile',
    iosIcon: 'face.smiling.fill',
    androidIcon: 'mood',
    materialIcon: 'mood',
    iconDefault: require('@/assets/images/2db3fc89-f490-4700-9943-eebd88408478.png'),
    iconSelected: require('@/assets/images/508559d4-267e-4940-bad5-54ef683fdc4d.png'),
  },
];

function CustomTabBar() {
  const pathname = usePathname();
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [showCamera, setShowCamera] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const scaleAnims = useRef(tabs.map(() => new Animated.Value(1))).current;

  const getActiveTab = () => {
    if (pathname.includes('/books')) return 'books';
    if (pathname.includes('/words')) return 'words';
    if (pathname.includes('/play')) return 'play';
    if (pathname.includes('/profile')) return 'profile';
    return 'profile';
  };

  const activeTab = getActiveTab();

  const handleAddPress = async (index: number) => {
    console.log('Add button pressed - requesting camera permission');
    
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
    <SafeAreaView style={styles.tabBarContainer} edges={['bottom']} pointerEvents="box-none">
      <View style={styles.tabBar} pointerEvents="box-none">
        {tabs.map((tab, index) => {
          const isActive = activeTab === tab.name;

          if (tab.isAddButton) {
            return (
              <Animated.View 
                key={index}
                style={[
                  styles.addButtonContainer,
                  { transform: [{ scale: scaleAnims[index] }] }
                ]}
                pointerEvents="box-none"
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
            <View key={index} style={styles.tabButtonPlaceholder} pointerEvents="none">
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
    </SafeAreaView>
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
      >
        <NativeTabs.Trigger name="books">
          <Icon drawable={require('@/assets/images/5394d9a9-b46e-435c-8381-1e06e62059f8.png')} />
          <Label hidden />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="words">
          <Icon drawable={require('@/assets/images/38e2e7c2-3dad-400a-bf6b-6598901f393c.png')} />
          <Label hidden />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="play">
          <Icon drawable={require('@/assets/images/60572750-7134-4e21-a14b-3a56eb724db4.png')} />
          <Label hidden />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="profile">
          <Icon drawable={require('@/assets/images/2db3fc89-f490-4700-9943-eebd88408478.png')} />
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
  tabButtonPlaceholder: {
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
  addButtonContainer: {
    marginTop: -24,
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
    borderColor: colors.background,
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
