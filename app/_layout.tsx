
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { AuthProvider } from '@/contexts/AuthContext';
import { ChildProvider } from '@/contexts/ChildContext';
import { CameraTriggerProvider } from '@/contexts/CameraTriggerContext';
import { VideoRecordingProvider } from '@/contexts/VideoRecordingContext';
import { BottomSheetProvider } from '@/contexts/BottomSheetContext';
import { AddNavigationProvider } from '@/contexts/AddNavigationContext';
import { WordNavigationProvider } from '@/contexts/WordNavigationContext';
import { MomentsRefreshProvider } from '@/contexts/MomentsRefreshContext';
import { StatsProvider } from '@/contexts/StatsContext';
import { useEffect } from 'react';
import * as SplashScreen from 'expo-splash-screen';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useEffect(() => {
    // Hide splash screen after a short delay
    setTimeout(() => {
      SplashScreen.hideAsync();
    }, 1000);
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <ChildProvider>
          <StatsProvider>
            <CameraTriggerProvider>
              <VideoRecordingProvider>
                <MomentsRefreshProvider>
                  <AddNavigationProvider>
                    <WordNavigationProvider>
                      <BottomSheetModalProvider>
                        <BottomSheetProvider>
                          <Stack screenOptions={{ headerShown: false }}>
                            <Stack.Screen name="index" />
                            <Stack.Screen name="(auth)" />
                            <Stack.Screen name="(tabs)" />
                            <Stack.Screen 
                              name="modal" 
                              options={{
                                presentation: 'modal',
                                animation: 'slide_from_bottom',
                              }}
                            />
                            <Stack.Screen 
                              name="transparent-modal" 
                              options={{
                                presentation: 'transparentModal',
                                animation: 'fade',
                              }}
                            />
                            <Stack.Screen 
                              name="formsheet" 
                              options={{
                                presentation: 'formSheet',
                                animation: 'slide_from_bottom',
                              }}
                            />
                            <Stack.Screen name="all-moments" />
                            <Stack.Screen name="milestones" />
                            <Stack.Screen name="search-book" />
                          </Stack>
                        </BottomSheetProvider>
                      </BottomSheetModalProvider>
                    </WordNavigationProvider>
                  </AddNavigationProvider>
                </MomentsRefreshProvider>
              </VideoRecordingProvider>
            </CameraTriggerProvider>
          </StatsProvider>
        </ChildProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
