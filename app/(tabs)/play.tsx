
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, commonStyles } from '@/styles/commonStyles';
import { HapticFeedback } from '@/utils/haptics';

export default function PlayScreen() {
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    HapticFeedback.light();
    setRefreshing(true);
    // Simulate a refresh delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
    HapticFeedback.success();
  }, []);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        <View style={styles.header}>
          <Text style={commonStyles.title}>Play</Text>
          <Text style={commonStyles.subtitle}>Fun learning games</Text>
        </View>

        <View style={styles.comingSoon}>
          <Text style={styles.comingSoonText}>🎮</Text>
          <Text style={styles.comingSoonTitle}>Coming Soon!</Text>
          <Text style={styles.comingSoonSubtitle}>
            Exciting games and activities for learning
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingTop: Platform.OS === 'android' ? 48 : 20,
    paddingBottom: 120,
  },
  header: {
    marginBottom: 40,
  },
  comingSoon: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  comingSoonText: {
    fontSize: 80,
    marginBottom: 20,
  },
  comingSoonTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.primary,
    marginBottom: 12,
  },
  comingSoonSubtitle: {
    fontSize: 16,
    fontWeight: '400',
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});
