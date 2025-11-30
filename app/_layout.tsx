
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider } from '@/contexts/AuthContext';
import { ChildProvider } from '@/contexts/ChildContext';
import { BottomSheetProvider } from '@/contexts/BottomSheetContext';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <ChildProvider>
          <BottomSheetProvider>
            <Stack
              screenOptions={{
                headerShown: false,
                animation: 'none',
              }}
            >
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(tabs)" />
            </Stack>
          </BottomSheetProvider>
        </ChildProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
