
import React from 'react';
import { View, Text, StyleSheet, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, commonStyles } from '@/styles/commonStyles';

export default function PlayScreen() {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.contentContainer,
          Platform.OS !== 'ios' && styles.contentContainerWithTabBar
        ]}
      >
        <View style={styles.header}>
          <Text style={commonStyles.title}>Play</Text>
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
  },
  contentContainerWithTabBar: {
    paddingBottom: 100,
  },
  header: {
    marginBottom: 20,
  },
});
