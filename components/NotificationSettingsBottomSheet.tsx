
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Switch, Platform } from 'react-native';
import { BottomSheetModal, BottomSheetView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { colors } from '../styles/commonStyles';
import { useNotifications } from '../contexts/NotificationContext';
import { IconSymbol } from './IconSymbol';

interface NotificationSettingsBottomSheetProps {
  bottomSheetRef: React.RefObject<BottomSheetModal>;
}

export default function NotificationSettingsBottomSheet({ bottomSheetRef }: NotificationSettingsBottomSheetProps) {
  const {
    hasPermission,
    isReminderScheduled,
    nextReminderTime,
    requestPermissions,
    scheduleReminder,
    cancelReminder,
    sendTest,
    refreshReminderStatus,
  } = useNotifications();

  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [selectedHour, setSelectedHour] = useState(9);
  const [selectedMinute, setSelectedMinute] = useState(0);

  useEffect(() => {
    setReminderEnabled(isReminderScheduled);
  }, [isReminderScheduled]);

  useEffect(() => {
    refreshReminderStatus();
  }, [refreshReminderStatus]);

  const handleToggleReminder = async (value: boolean) => {
    if (value) {
      // Enable reminder
      if (!hasPermission) {
        const granted = await requestPermissions();
        if (!granted) {
          alert('Please enable notifications in your device settings to use daily reminders.');
          return;
        }
      }
      
      const success = await scheduleReminder(selectedHour, selectedMinute);
      if (success) {
        setReminderEnabled(true);
      } else {
        alert('Failed to schedule reminder. Please try again.');
      }
    } else {
      // Disable reminder
      await cancelReminder();
      setReminderEnabled(false);
    }
  };

  const handleTimeChange = async (hour: number, minute: number) => {
    setSelectedHour(hour);
    setSelectedMinute(minute);
    
    if (reminderEnabled) {
      await scheduleReminder(hour, minute);
    }
  };

  const handleTestNotification = async () => {
    if (!hasPermission) {
      const granted = await requestPermissions();
      if (!granted) {
        alert('Please enable notifications in your device settings.');
        return;
      }
    }
    
    await sendTest();
    alert('Test notification sent! Check your notification tray.');
  };

  const formatTime = (hour: number, minute: number) => {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    const displayMinute = minute.toString().padStart(2, '0');
    return `${displayHour}:${displayMinute} ${period}`;
  };

  const renderBackdrop = (props: any) => (
    <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.5} />
  );

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      snapPoints={['75%']}
      backdropComponent={renderBackdrop}
      enablePanDownToClose
      backgroundStyle={{ backgroundColor: colors.background }}
      handleIndicatorStyle={{ backgroundColor: colors.text }}
    >
      <BottomSheetView style={styles.container}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>Daily Reminders</Text>
          <Text style={styles.description}>
            Get a friendly reminder every morning to log your child&apos;s special moments.
          </Text>

          {/* Permission Status */}
          <View style={styles.section}>
            <View style={styles.statusRow}>
              <IconSymbol
                ios_icon_name={hasPermission ? 'checkmark.circle.fill' : 'xmark.circle.fill'}
                android_material_icon_name={hasPermission ? 'check_circle' : 'cancel'}
                size={24}
                color={hasPermission ? colors.primary : colors.error}
              />
              <Text style={styles.statusText}>
                {hasPermission ? 'Notifications Enabled' : 'Notifications Disabled'}
              </Text>
            </View>
            
            {!hasPermission && (
              <TouchableOpacity style={styles.button} onPress={requestPermissions}>
                <Text style={styles.buttonText}>Enable Notifications</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Daily Reminder Toggle */}
          <View style={styles.section}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Daily Reminder</Text>
                <Text style={styles.settingDescription}>
                  Receive a notification every morning
                </Text>
              </View>
              <Switch
                value={reminderEnabled}
                onValueChange={handleToggleReminder}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.background}
                disabled={!hasPermission}
              />
            </View>
          </View>

          {/* Time Picker */}
          {reminderEnabled && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Reminder Time</Text>
              <View style={styles.timePicker}>
                {/* Hour Selector */}
                <View style={styles.timeColumn}>
                  <Text style={styles.timeLabel}>Hour</Text>
                  <ScrollView style={styles.timeScroll} showsVerticalScrollIndicator={false}>
                    {Array.from({ length: 24 }, (_, i) => i).map((hour) => (
                      <TouchableOpacity
                        key={hour}
                        style={[
                          styles.timeOption,
                          selectedHour === hour && styles.timeOptionSelected,
                        ]}
                        onPress={() => handleTimeChange(hour, selectedMinute)}
                      >
                        <Text
                          style={[
                            styles.timeOptionText,
                            selectedHour === hour && styles.timeOptionTextSelected,
                          ]}
                        >
                          {hour.toString().padStart(2, '0')}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                {/* Minute Selector */}
                <View style={styles.timeColumn}>
                  <Text style={styles.timeLabel}>Minute</Text>
                  <ScrollView style={styles.timeScroll} showsVerticalScrollIndicator={false}>
                    {Array.from({ length: 12 }, (_, i) => i * 5).map((minute) => (
                      <TouchableOpacity
                        key={minute}
                        style={[
                          styles.timeOption,
                          selectedMinute === minute && styles.timeOptionSelected,
                        ]}
                        onPress={() => handleTimeChange(selectedHour, minute)}
                      >
                        <Text
                          style={[
                            styles.timeOptionText,
                            selectedMinute === minute && styles.timeOptionTextSelected,
                          ]}
                        >
                          {minute.toString().padStart(2, '0')}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>

              <Text style={styles.selectedTime}>
                Reminder set for {formatTime(selectedHour, selectedMinute)}
              </Text>

              {nextReminderTime && (
                <Text style={styles.nextReminder}>
                  Next reminder: {nextReminderTime.toLocaleDateString()} at{' '}
                  {nextReminderTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              )}
            </View>
          )}

          {/* Test Notification */}
          <View style={styles.section}>
            <TouchableOpacity
              style={[styles.button, styles.testButton]}
              onPress={handleTestNotification}
              disabled={!hasPermission}
            >
              <IconSymbol
                ios_icon_name="bell.fill"
                android_material_icon_name="notifications"
                size={20}
                color={colors.background}
              />
              <Text style={styles.buttonText}>Send Test Notification</Text>
            </TouchableOpacity>
          </View>

          {/* Info Section */}
          <View style={styles.infoSection}>
            <Text style={styles.infoTitle}>💡 About Daily Reminders</Text>
            <Text style={styles.infoText}>
              • Reminders help you build a habit of tracking your child&apos;s growth{'\n'}
              • You&apos;ll receive a friendly message each morning{'\n'}
              • Tap the notification to quickly add a new moment{'\n'}
              • You can change the time or disable reminders anytime
            </Text>
          </View>
        </ScrollView>
      </BottomSheetView>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 24,
    lineHeight: 22,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusText: {
    fontSize: 16,
    color: colors.text,
    marginLeft: 8,
    fontWeight: '500',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
  },
  settingInfo: {
    flex: 1,
    marginRight: 12,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  testButton: {
    flexDirection: 'row',
    gap: 8,
  },
  buttonText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '600',
  },
  timePicker: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  timeColumn: {
    flex: 1,
  },
  timeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  timeScroll: {
    maxHeight: 200,
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
  },
  timeOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  timeOptionSelected: {
    backgroundColor: colors.primary,
  },
  timeOptionText: {
    fontSize: 18,
    color: colors.text,
    fontWeight: '500',
  },
  timeOptionTextSelected: {
    color: colors.background,
    fontWeight: '700',
  },
  selectedTime: {
    fontSize: 16,
    color: colors.text,
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: 8,
  },
  nextReminder: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  infoSection: {
    backgroundColor: colors.cardBackground,
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});
