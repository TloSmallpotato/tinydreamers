
import React, { useRef, useState } from 'react';
import { NativeTabs, Icon, Label } from 'expo-router/unstable-native-tabs';
import { View, TouchableOpacity, StyleSheet, Animated, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { CameraView, useCameraPermissions } from 'expo-camera';

interface TabItem {
  name: string;
  iosIcon: string;
  androidIcon: string;
  isAddButton?: boolean;
}

const tabs: TabItem[] = [
  {
    name: 'books',
    iosIcon: 'book.fill',
    androidIcon: 'menu-book',
  },
  {
    name: 'words',
    iosIcon: 'text.bubble.fill',
    androidIcon: 'chat-bubble',
  },
  {
    name: 'add',
    iosIcon: 'plus',
    androidIcon: 'add',
    isAddButton: true,
  },
  {
    name: 'play',
    iosIcon: 'play.circle.fill',
    androidIcon: 'sports-esports',
  },
  {
    name: 'profile',
    iosIcon: 'face.smiling.fill',
    androidIcon: 'mood',
  },
];

function CustomTabBar() {
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [showCamera, setShowCamera] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const scaleAnims = useRef(tabs.map(() => new Animated.Value(1))).current;

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

          return <View key={index} style={{ width: 56 }} pointerEvents="none" />;
        })}
      </View>
    </SafeAreaView>
  );
}

export default function TabLayout() {
  return (
    <>
      <NativeTabs
        backgroundColor="transparent"
        tintColor="transparent"
        iconColor="transparent"
        initialRouteName="profile"
        style={styles.nativeTabs}
      >
        <NativeTabs.Trigger name="books">
          <Icon sf="book.fill" style={styles.hiddenIcon} />
          <Label hidden />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="words">
          <Icon sf="text.bubble.fill" style={styles.hiddenIcon} />
          <Label hidden />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="play">
          <Icon sf="play.circle.fill" style={styles.hiddenIcon} />
          <Label hidden />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="profile">
          <Icon sf="face.smiling.fill" style={styles.hiddenIcon} />
          <Label hidden />
        </NativeTabs.Trigger>
      </NativeTabs>
      <CustomTabBar />
    </>
  );
}

const styles = StyleSheet.create({
  nativeTabs: {
    opacity: 0,
  },
  hiddenIcon: {
    opacity: 0,
  },
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
