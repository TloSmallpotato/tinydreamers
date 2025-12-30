
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { HapticFeedback } from '@/utils/haptics';
import { supabase } from '@/app/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export default function AdminPanelScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = React.useState<boolean | null>(null);
  const [loading, setLoading] = React.useState(true);

  const checkAdminStatus = React.useCallback(async () => {
    if (!user) {
      console.log('AdminPanel: No user, redirecting...');
      router.replace('/(tabs)/profile');
      return;
    }

    try {
      console.log('AdminPanel: Checking admin status for user:', user.id);
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('AdminPanel: Error checking admin status:', error);
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      const adminStatus = data?.role === 'admin';
      console.log('AdminPanel: Admin status:', adminStatus);
      setIsAdmin(adminStatus);

      if (!adminStatus) {
        console.log('AdminPanel: User is not admin, redirecting...');
        HapticFeedback.warning();
        router.replace('/(tabs)/profile');
      }
    } catch (err) {
      console.error('AdminPanel: Unexpected error:', err);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  }, [user, router]);

  React.useEffect(() => {
    checkAdminStatus();
  }, [checkAdminStatus]);

  const handleGoBack = () => {
    HapticFeedback.medium();
    router.back();
  };

  const handleAllBooks = () => {
    HapticFeedback.medium();
    router.push('/admin-all-books');
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.buttonBlue} />
            <Text style={styles.loadingText}>Verifying admin access...</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  if (isAdmin === false) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={styles.errorContainer}>
            <IconSymbol 
              ios_icon_name="exclamationmark.triangle.fill" 
              android_material_icon_name="error" 
              size={48} 
              color={colors.textSecondary} 
            />
            <Text style={styles.errorText}>Access Denied</Text>
            <Text style={styles.errorSubtext}>You do not have admin privileges</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
            <IconSymbol 
              ios_icon_name="chevron.left" 
              android_material_icon_name="arrow-back" 
              size={24} 
              color={colors.primary} 
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Admin Panel</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Content Management</Text>
            
            <TouchableOpacity 
              style={styles.menuCard}
              onPress={handleAllBooks}
              activeOpacity={0.7}
            >
              <View style={styles.menuIconContainer}>
                <IconSymbol 
                  ios_icon_name="book.fill" 
                  android_material_icon_name="menu-book" 
                  size={28} 
                  color={colors.buttonBlue} 
                />
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuTitle}>All Books</Text>
                <Text style={styles.menuSubtitle}>View and manage all books in the library</Text>
              </View>
              <IconSymbol 
                ios_icon_name="chevron.right" 
                android_material_icon_name="chevron-right" 
                size={24} 
                color={colors.textSecondary} 
              />
            </TouchableOpacity>
          </View>

          <View style={styles.infoCard}>
            <IconSymbol 
              ios_icon_name="info.circle.fill" 
              android_material_icon_name="info" 
              size={24} 
              color={colors.buttonBlue} 
            />
            <Text style={styles.infoText}>
              As an admin, you have access to view and manage all books in the library. 
              Regular users can only see their own content.
            </Text>
          </View>
        </ScrollView>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.backgroundAlt,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.backgroundAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 12,
  },
  menuCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundAlt,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
    elevation: 2,
  },
  menuIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.cardPink,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 4,
  },
  menuSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: colors.cardPurple,
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: colors.primary,
    lineHeight: 20,
  },
});
