
import { useEffect, useState } from 'react';
import { Redirect, useRouter, useSegments } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { colors } from '@/styles/commonStyles';

export default function Index() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    if (loading) {
      console.log('Index (iOS): Auth loading...');
      return;
    }

    const inAuthGroup = segments[0] === '(auth)';

    console.log('Index (iOS): User authenticated:', !!user);
    console.log('Index (iOS): Current segments:', segments);
    console.log('Index (iOS): In auth group:', inAuthGroup);

    // Prevent multiple navigation attempts
    if (isNavigating) {
      console.log('Index (iOS): Already navigating, skipping...');
      return;
    }

    const navigate = async () => {
      try {
        setIsNavigating(true);
        
        if (!user && !inAuthGroup) {
          // User is not signed in and not in auth group, redirect to login
          console.log('Index (iOS): Redirecting to login');
          await new Promise(resolve => setTimeout(resolve, 100));
          router.replace('/(auth)/login');
        } else if (user && inAuthGroup) {
          // User is signed in but in auth group, redirect to profile
          console.log('Index (iOS): Redirecting to profile');
          await new Promise(resolve => setTimeout(resolve, 100));
          router.replace('/(tabs)/profile');
        }
      } catch (err) {
        console.error('Index (iOS): Navigation error:', err);
      } finally {
        setIsNavigating(false);
      }
    };

    navigate();
  }, [user, loading, segments]);

  // Show loading spinner while checking auth state
  if (loading || isNavigating) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.buttonBlue} />
        <Text style={styles.loadingText}>
          {loading ? 'Loading...' : 'Redirecting...'}
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
