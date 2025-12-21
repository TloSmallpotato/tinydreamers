
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
import { SuperwallProvider, SuperwallLoading, SuperwallLoaded } from 'expo-superwall';
import { ActivityIndicator, View } from 'react-native';
import { colors } from '@/styles/commonStyles';

// Replace with your actual Superwall API keys from the Superwall dashboard
const SUPERWALL_API_KEY_IOS = 'pk_d1efcfe344e34a8dcc4a5664a5dde7b4c4c4c4c4'; // Replace with your iOS API key
const SUPERWALL_API_KEY_ANDROID = 'pk_d1efcfe344e34a8dcc4a5664a5dde7b4c4c4c4c4'; // Replace with your Android API key

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SuperwallProvider 
          apiKeys={{ 
            ios: SUPERWALL_API_KEY_IOS,
            android: SUPERWALL_API_KEY_ANDROID,
          }}
          onConfigurationError={(error) => {
            console.error('Superwall configuration error:', error);
          }}
        >
          <SuperwallLoading>
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
              <ActivityIndicator size="large" color={colors.buttonBlue} />
            </View>
          </SuperwallLoading>
          <SuperwallLoaded>
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
          </SuperwallLoaded>
        </SuperwallProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
