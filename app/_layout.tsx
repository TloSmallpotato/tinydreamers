
import { Stack } from 'expo-router';
import { AuthProvider } from '@/contexts/AuthContext';
import { ChildProvider } from '@/contexts/ChildContext';
import { VideoRecordingProvider } from '@/contexts/VideoRecordingContext';
import { CameraTriggerProvider } from '@/contexts/CameraTriggerContext';
import { WordNavigationProvider } from '@/contexts/WordNavigationContext';
import { AddNavigationProvider } from '@/contexts/AddNavigationContext';
import { SubscriptionProvider } from '@/contexts/SubscriptionContext';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <AuthProvider>
          <SubscriptionProvider>
            <ChildProvider>
              <VideoRecordingProvider>
                <CameraTriggerProvider>
                  <WordNavigationProvider>
                    <AddNavigationProvider>
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
                    </AddNavigationProvider>
                  </WordNavigationProvider>
                </CameraTriggerProvider>
              </VideoRecordingProvider>
            </ChildProvider>
          </SubscriptionProvider>
        </AuthProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
