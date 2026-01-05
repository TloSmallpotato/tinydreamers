
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Platform, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { useAuth } from '@/contexts/AuthContext';
import { useChild } from '@/contexts/ChildContext';
import { HapticFeedback } from '@/utils/haptics';

export default function SettingsScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { selectedChild, updateChild } = useChild();

  const [childName, setChildName] = useState('');
  const [birthDate, setBirthDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [email, setEmail] = useState('');

  useEffect(() => {
    console.log('Settings screen mounted (iOS)');
    if (selectedChild) {
      setChildName(selectedChild.name);
      setBirthDate(new Date(selectedChild.birth_date));
    }
    if (user?.email) {
      setEmail(user.email);
    }
  }, [selectedChild, user]);

  const handleSave = async () => {
    if (!selectedChild) return;

    HapticFeedback.medium();
    try {
      await updateChild(selectedChild.id, {
        name: childName,
        birth_date: birthDate.toISOString().split('T')[0],
      });
      HapticFeedback.success();
      Alert.alert('Success', 'Child information updated successfully');
    } catch (error) {
      console.error('Error updating child:', error);
      HapticFeedback.error();
      Alert.alert('Error', 'Failed to update child information');
    }
  };

  const handleExportData = async () => {
    HapticFeedback.medium();
    Alert.alert(
      'Export Data',
      'This feature will export all your data including books, words, and moments. Coming soon!',
      [{ text: 'OK' }]
    );
  };

  const handlePrivacyPolicy = () => {
    HapticFeedback.medium();
    Alert.alert(
      'Privacy Policy',
      'Opening Privacy Policy...',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Open',
          onPress: () => {
            Linking.openURL('https://example.com/privacy-policy');
          },
        },
      ]
    );
  };

  const handleTermsAndConditions = () => {
    HapticFeedback.medium();
    Alert.alert(
      'Terms & Conditions',
      'Opening Terms & Conditions...',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Open',
          onPress: () => {
            Linking.openURL('https://example.com/terms-and-conditions');
          },
        },
      ]
    );
  };

  const handleSignOut = async () => {
    HapticFeedback.medium();
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            HapticFeedback.medium();
            await signOut();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => {
              HapticFeedback.light();
              router.back();
            }} 
            style={styles.backButton}
          >
            <IconSymbol
              ios_icon_name="chevron.left"
              android_material_icon_name="arrow-back"
              size={24}
              color={colors.primary}
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Settings</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {selectedChild && (
            <>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Child Information</Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Name</Text>
                  <TextInput
                    style={styles.input}
                    value={childName}
                    onChangeText={setChildName}
                    placeholder="Enter child's name"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Birth Date</Text>
                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => {
                      HapticFeedback.light();
                      setShowDatePicker(true);
                    }}
                  >
                    <Text style={styles.dateButtonText}>{formatDate(birthDate)}</Text>
                    <IconSymbol
                      ios_icon_name="calendar"
                      android_material_icon_name="calendar-today"
                      size={20}
                      color={colors.primary}
                    />
                  </TouchableOpacity>

                  {showDatePicker && (
                    <DateTimePicker
                      value={birthDate}
                      mode="date"
                      display="spinner"
                      onChange={(event, selectedDate) => {
                        setShowDatePicker(Platform.OS === 'ios');
                        if (selectedDate) {
                          HapticFeedback.selection();
                          setBirthDate(selectedDate);
                        }
                      }}
                      maximumDate={new Date()}
                    />
                  )}
                </View>

                <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account Information</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={[styles.input, styles.inputDisabled]}
                value={email}
                editable={false}
                placeholderTextColor={colors.textSecondary}
              />
              <Text style={styles.helperText}>Email cannot be changed</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Data & Privacy</Text>

            <TouchableOpacity style={styles.menuItem} onPress={handleExportData}>
              <View style={styles.menuItemLeft}>
                <IconSymbol
                  ios_icon_name="square.and.arrow.up"
                  android_material_icon_name="file-download"
                  size={20}
                  color={colors.primary}
                />
                <Text style={styles.menuItemText}>Export Data</Text>
              </View>
              <IconSymbol
                ios_icon_name="chevron.right"
                android_material_icon_name="chevron-right"
                size={20}
                color={colors.textSecondary}
              />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={handlePrivacyPolicy}>
              <View style={styles.menuItemLeft}>
                <IconSymbol
                  ios_icon_name="lock.shield"
                  android_material_icon_name="privacy-tip"
                  size={20}
                  color={colors.primary}
                />
                <Text style={styles.menuItemText}>Privacy Policy</Text>
              </View>
              <IconSymbol
                ios_icon_name="chevron.right"
                android_material_icon_name="chevron-right"
                size={20}
                color={colors.textSecondary}
              />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={handleTermsAndConditions}>
              <View style={styles.menuItemLeft}>
                <IconSymbol
                  ios_icon_name="doc.text"
                  android_material_icon_name="description"
                  size={20}
                  color={colors.primary}
                />
                <Text style={styles.menuItemText}>Terms & Conditions</Text>
              </View>
              <IconSymbol
                ios_icon_name="chevron.right"
                android_material_icon_name="chevron-right"
                size={20}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
              <IconSymbol
                ios_icon_name="arrow.right.square"
                android_material_icon_name="logout"
                size={20}
                color={colors.backgroundAlt}
              />
              <Text style={styles.signOutButtonText}>Sign Out</Text>
            </TouchableOpacity>
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
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.background,
    borderBottomWidth: 0,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: colors.primary,
    borderWidth: 1,
    borderColor: colors.background,
  },
  inputDisabled: {
    opacity: 0.6,
  },
  helperText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  dateButton: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.background,
  },
  dateButtonText: {
    fontSize: 16,
    color: colors.primary,
  },
  saveButton: {
    backgroundColor: colors.buttonBlue,
    borderRadius: 24,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.backgroundAlt,
  },
  menuItem: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  signOutButton: {
    backgroundColor: colors.secondary,
    borderRadius: 24,
    paddingVertical: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  signOutButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.backgroundAlt,
  },
});
