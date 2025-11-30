
import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments, usePathname } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';

SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const segments = useSegments();
  const pathname = usePathname();
  const { session, loading } = useAuth();

  const [fontsLoaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  useEffect(() => {
    if (!fontsLoaded || loading) {
      return;
    }

    console.log('Auth routing - Session:', session?.user?.id || 'none');
    console.log('Auth routing - Current pathname:', pathname);
    console.log('Auth routing - Current segments:', segments);

    const inAuthGroup = segments[0] === '(auth)';
    const inTabsGroup = segments[0] === '(tabs)';

    if (!session && !inAuthGroup) {
      // User is not signed in and not in auth screens, redirect to login
      console.log('Redirecting to login - no session');
      router.replace('/(auth)/login');
    } else if (session && inAuthGroup) {
      // User is signed in but in auth screens, redirect to profile
      console.log('Redirecting to profile - has session');
      router.replace('/(tabs)/profile');
    } else if (session && !inTabsGroup && segments.length === 0) {
      // User is signed in and at root, redirect to profile
      console.log('Redirecting to profile - at root with session');
      router.replace('/(tabs)/profile');
    }
  }, [session, loading, fontsLoaded, pathname, segments, router]);

  if (!fontsLoaded || loading) {
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
        <Stack.Screen name="formsheet" options={{ presentation: 'formSheet' }} />
        <Stack.Screen name="transparent-modal" options={{ presentation: 'transparentModal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}
