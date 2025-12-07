
import { useEffect, useState } from 'react';
import { Redirect, useRouter, useSegments } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { colors } from '@/styles/commonStyles';

export default function Index() {
  const { user, loading, isInitialized } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    // Don't do anything until auth is initialized
    if (!isInitialized || loading) {
      console.log('Index: Waiting for auth initialization...');
      return;
    }

    const inAuthGroup = segments[0] === '(auth)';

    console.log('Index: User authenticated:', !!user);
    console.log('Index: Current segments:', segments);
    console.log('Index: In auth group:', inAuthGroup);

    // Prevent navigation if already navigating
    if (isNavigating) {
      console.log('Index: Already navigating, skipping');
      return;
    }

    const handleNavigation = async () => {
      try {
        setIsNavigating(true);

        if (!user && !inAuthGroup) {
          // User is not signed in and not in auth group, redirect to login
          console.log('Index: Redirecting to login');
          
          // Add delay to prevent TurboModule crashes during navigation
          await new Promise(resolve => setTimeout(resolve, 300));
          
          router.replace('/(auth)/login');
        } else if (user && inAuthGroup) {
          // User is signed in but in auth group, redirect to profile
          console.log('Index: Redirecting to profile after sign-in');
          
          // Extended delay after sign-in to prevent TurboModule crashes
          // This ensures all native modules are ready before navigation
          await new Promise(resolve => setTimeout(resolve, 800));
          
          router.replace('/(tabs)/profile');
        }
      } catch (err) {
        console.error('Index: Navigation error:', err);
      } finally {
        setIsNavigating(false);
      }
    };

    handleNavigation();
  }, [user, loading, isInitialized, segments, router, isNavigating]);

  // Show loading spinner while checking auth state or navigating
  if (!isInitialized || loading || isNavigating) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.buttonBlue} />
        <Text style={styles.loadingText}>
          {!isInitialized ? 'Initializing...' : isNavigating ? 'Loading...' : 'Checking authentication...'}
        </Text>
      </View>
    );
  }

  // Redirect based on auth state
  if (user) {
    return <Redirect href="/(tabs)/profile" />;
  }

  return <Redirect href="/(auth)/login" />;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 16,
  },
});
