
import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments, usePathname } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { AuthProvider } from '@/contexts/AuthContext';
import { ChildProvider } from '@/contexts/ChildContext';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const segments = useSegments();
  const pathname = usePathname();

  const [fontsLoaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  useEffect(() => {
    // Redirect to profile on app start
    if (fontsLoaded) {
      console.log('Current pathname:', pathname);
      console.log('Current segments:', segments);
      
      // If we're at the root, tabs root, or home, redirect to profile
      if (
        segments.length === 0 || 
        pathname === '/' || 
        pathname === '/(tabs)' ||
        pathname === '/(tabs)/(home)' ||
        pathname.includes('/(home)')
      ) {
        console.log('Redirecting to profile on app start');
        // Use replace to avoid adding to navigation history
        setTimeout(() => {
          router.replace('/(tabs)/profile');
        }, 0);
      }
    }
  }, [fontsLoaded, pathname, segments, router]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <AuthProvider>
          <ChildProvider>
            <BottomSheetModalProvider>
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
                <Stack.Screen name="formsheet" options={{ presentation: 'formSheet' }} />
                <Stack.Screen name="transparent-modal" options={{ presentation: 'transparentModal' }} />
              </Stack>
              <StatusBar style="auto" />
            </BottomSheetModalProvider>
          </ChildProvider>
        </AuthProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
