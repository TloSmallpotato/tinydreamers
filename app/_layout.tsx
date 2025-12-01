
import { Stack } from 'expo-router';
import { AuthProvider } from '@/contexts/AuthContext';
import { ChildProvider } from '@/contexts/ChildContext';
import { VideoRecordingProvider } from '@/contexts/VideoRecordingContext';
import { CameraTriggerProvider } from '@/contexts/CameraTriggerContext';
import { WordNavigationProvider } from '@/contexts/WordNavigationContext';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <ChildProvider>
          <VideoRecordingProvider>
            <CameraTriggerProvider>
              <WordNavigationProvider>
                <BottomSheetModalProvider>
                  <Stack screenOptions={{ headerShown: false }}>
                    <Stack.Screen name="index" options={{ headerShown: false }} />
                    <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                    <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                    <Stack.Screen
                      name="modal"
                      options={{
                        presentation: 'modal',
                        headerShown: false,
                      }}
                    />
                    <Stack.Screen
                      name="formsheet"
                      options={{
                        presentation: 'formSheet',
                        headerShown: false,
                      }}
                    />
                    <Stack.Screen
                      name="transparent-modal"
                      options={{
                        presentation: 'transparentModal',
                        headerShown: false,
                        animation: 'fade',
                      }}
                    />
                  </Stack>
                </BottomSheetModalProvider>
              </WordNavigationProvider>
            </CameraTriggerProvider>
          </VideoRecordingProvider>
        </ChildProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
