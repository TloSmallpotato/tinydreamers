
import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { Platform } from 'react-native';
import {
  requestNotificationPermissions,
  registerForPushNotifications,
  scheduleDailyReminder,
  cancelDailyReminder,
  isDailyReminderScheduled,
  getNextReminderTime,
  sendTestNotification,
} from '../utils/notificationService';

interface NotificationContextType {
  expoPushToken: string | null;
  hasPermission: boolean;
  isReminderScheduled: boolean;
  nextReminderTime: Date | null;
  requestPermissions: () => Promise<boolean>;
  scheduleReminder: (hour: number, minute: number) => Promise<boolean>;
  cancelReminder: () => Promise<void>;
  sendTest: () => Promise<void>;
  refreshReminderStatus: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [isReminderScheduled, setIsReminderScheduled] = useState(false);
  const [nextReminderTime, setNextReminderTime] = useState<Date | null>(null);
  
  const notificationListener = useRef<Notifications.EventSubscription>();
  const responseListener = useRef<Notifications.EventSubscription>();

  // Check permission status and reminder status on mount
  useEffect(() => {
    checkPermissionStatus();
    checkReminderStatus();
  }, []);

  // Set up notification listeners
  useEffect(() => {
    // Only set up notification listeners on native platforms
    if (Platform.OS === 'web') {
      console.log('Notifications are not supported on web');
      return;
    }

    // Listen for notifications received while app is in foreground
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
    });

    // Listen for user interactions with notifications
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification response:', response);
      
      // Handle navigation based on notification type
      const data = response.notification.request.content.data;
      if (data?.type === 'daily-reminder') {
        // Navigate to the add screen or home
        router.push('/(tabs)/(home)');
      }
    });

    // Check if app was opened from a notification
    // Only call this on native platforms
    if (Notifications.getLastNotificationResponseAsync) {
      Notifications.getLastNotificationResponseAsync().then(response => {
        if (response?.notification) {
          const data = response.notification.request.content.data;
          if (data?.type === 'daily-reminder') {
            router.push('/(tabs)/(home)');
          }
        }
      }).catch(error => {
        console.error('Error getting last notification response:', error);
      });
    }

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);

  const checkPermissionStatus = async () => {
    // Skip on web
    if (Platform.OS === 'web') {
      return;
    }

    try {
      const { status } = await Notifications.getPermissionsAsync();
      setHasPermission(status === 'granted');
    } catch (error) {
      console.error('Error checking permission status:', error);
    }
  };

  const checkReminderStatus = async () => {
    // Skip on web
    if (Platform.OS === 'web') {
      return;
    }

    try {
      const isScheduled = await isDailyReminderScheduled();
      setIsReminderScheduled(isScheduled);
      
      if (isScheduled) {
        const nextTime = await getNextReminderTime();
        setNextReminderTime(nextTime);
      } else {
        setNextReminderTime(null);
      }
    } catch (error) {
      console.error('Error checking reminder status:', error);
    }
  };

  const requestPermissions = async (): Promise<boolean> => {
    // Skip on web
    if (Platform.OS === 'web') {
      console.log('Notifications are not supported on web');
      return false;
    }

    const granted = await requestNotificationPermissions();
    setHasPermission(granted);
    
    if (granted) {
      // Try to get push token
      const token = await registerForPushNotifications();
      setExpoPushToken(token);
    }
    
    return granted;
  };

  const scheduleReminder = async (hour: number, minute: number): Promise<boolean> => {
    // Skip on web
    if (Platform.OS === 'web') {
      console.log('Notifications are not supported on web');
      return false;
    }

    const identifier = await scheduleDailyReminder(hour, minute);
    const success = identifier !== null;
    
    if (success) {
      await checkReminderStatus();
    }
    
    return success;
  };

  const cancelReminder = async (): Promise<void> => {
    // Skip on web
    if (Platform.OS === 'web') {
      return;
    }

    await cancelDailyReminder();
    await checkReminderStatus();
  };

  const sendTest = async (): Promise<void> => {
    // Skip on web
    if (Platform.OS === 'web') {
      console.log('Notifications are not supported on web');
      return;
    }

    await sendTestNotification();
  };

  const refreshReminderStatus = async (): Promise<void> => {
    // Skip on web
    if (Platform.OS === 'web') {
      return;
    }

    await checkReminderStatus();
  };

  return (
    <NotificationContext.Provider
      value={{
        expoPushToken,
        hasPermission,
        isReminderScheduled,
        nextReminderTime,
        requestPermissions,
        scheduleReminder,
        cancelReminder,
        sendTest,
        refreshReminderStatus,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
