
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { useChild } from '@/contexts/ChildContext';
import { supabase } from '@/app/integrations/supabase/client';

interface Moment {
  id: string;
  video_url: string;
  thumbnail_url: string | null;
  created_at: string;
}

export default function AllMomentsScreen() {
  const router = useRouter();
  const { selectedChild } = useChild();
  const [moments, setMoments] = useState<Moment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAllMoments = useCallback(async () => {
    if (!selectedChild) {
      console.log('AllMomentsScreen: No selected child');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      console.log('AllMomentsScreen: Fetching all moments for child:', selectedChild.id);

      const { data, error: fetchError } = await supabase
        .from('moments')
        .select('id, video_url, thumbnail_url, created_at')
        .eq('child_id', selectedChild.id)
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error('AllMomentsScreen: Error fetching moments:', fetchError);
        throw fetchError;
      }

      console.log('AllMomentsScreen: Fetched', data?.length || 0, 'moments');
      setMoments(data || []);
    } catch (err) {
      console.error('AllMomentsScreen: Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load moments');
    } finally {
      setLoading(false);
    }
  }, [selectedChild]);

  useEffect(() => {
    fetchAllMoments();
  }, [fetchAllMoments]);

  const handleBack = () => {
    console.log('AllMomentsScreen: Back button pressed');
    router.back();
  };

  const renderMomentItem = ({ item, index }: { item: Moment; index: number }) => (
    <View style={styles.momentCard}>
      {item.thumbnail_url ? (
        <Image 
          source={{ uri: item.thumbnail_url }}
          style={styles.momentImage}
        />
      ) : (
        <View style={styles.momentPlaceholder}>
          <IconSymbol 
            ios_icon_name="video.fill" 
            android_material_icon_name="videocam" 
            size={48} 
            color={colors.backgroundAlt} 
          />
        </View>
      )}
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <IconSymbol 
        ios_icon_name="video.slash" 
        android_material_icon_name="videocam-off" 
        size={64} 
        color={colors.textSecondary} 
      />
      <Text style={styles.emptyText}>No moments yet</Text>
      <Text style={styles.emptySubtext}>Start recording to capture special moments!</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
              <IconSymbol 
                ios_icon_name="chevron.left" 
                android_material_icon_name="arrow-back" 
                size={24} 
                color={colors.primary} 
              />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>All Moments</Text>
            <View style={styles.headerSpacer} />
          </View>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.buttonBlue} />
            <Text style={styles.loadingText}>Loading moments...</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
              <IconSymbol 
                ios_icon_name="chevron.left" 
                android_material_icon_name="arrow-back" 
                size={24} 
                color={colors.primary} 
              />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>All Moments</Text>
            <View style={styles.headerSpacer} />
          </View>
          <View style={styles.errorContainer}>
            <IconSymbol 
              ios_icon_name="exclamationmark.triangle.fill" 
              android_material_icon_name="error" 
              size={48} 
              color={colors.textSecondary} 
            />
            <Text style={styles.errorText}>Failed to load moments</Text>
            <Text style={styles.errorSubtext}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchAllMoments}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <IconSymbol 
              ios_icon_name="chevron.left" 
              android_material_icon_name="arrow-back" 
              size={24} 
              color={colors.primary} 
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>All Moments</Text>
          <View style={styles.headerSpacer} />
        </View>

        <FlatList
          data={moments}
          renderItem={renderMomentItem}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.gridContainer}
          columnWrapperStyle={styles.columnWrapper}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmptyState}
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 48 : 20,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.backgroundAlt,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
    elevation: 2,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
  },
  headerSpacer: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.primary,
    marginTop: 16,
  },
  errorSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: colors.buttonBlue,
    borderRadius: 24,
    paddingHorizontal: 32,
    paddingVertical: 12,
    marginTop: 24,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.backgroundAlt,
  },
  gridContainer: {
    padding: 20,
    paddingBottom: 120,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  momentCard: {
    width: '48%',
    aspectRatio: 2 / 3,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: colors.cardPurple,
  },
  momentImage: {
    width: '100%',
    height: '100%',
  },
  momentPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cardPurple,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.primary,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
});
