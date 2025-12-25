
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Set the notification handler to control how notifications are displayed
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Array of motivational messages for daily reminders
const DAILY_REMINDER_MESSAGES = [
  {
    title: "Celebrate the little moments that matter 💛",
    body: "Track today's book, word, or smile."
  },
  {
    title: "New word? New book? New moment?",
    body: "Log it now!"
  },
  {
    title: "Every word counts!",
    body: "Log a new one today and watch them grow."
  },
  {
    title: "Time to capture today's tiny win! 🐣",
    body: "Add a new word, book, or magical moment."
  },
  {
    title: "Good morning! ☀️",
    body: "What will your little one learn today?"
  },
  {
    title: "Start the day with a smile!",
    body: "Record a special moment with your child."
  }
];

/**
 * Request notification permissions from the user
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Notification permissions not granted');
      return false;
    }

    // On Android, create a notification channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('daily-reminders', {
        name: 'Daily Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        sound: 'default',
        description: 'Daily reminders to log your child\'s moments',
      });
    }

    console.log('Notification permissions granted');
    return true;
  } catch (error) {
    console.error('Error requesting notification permissions:', error);
    return false;
  }
}

/**
 * Register for push notifications and get the Expo push token
 * This requires an EAS project ID
 */
export async function registerForPushNotifications(): Promise<string | null> {
  try {
    if (!Device.isDevice) {
      console.log('Push notifications require a physical device');
      return null;
    }

    // Request permissions first
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      return null;
    }

    // Get the EAS project ID from app config
    const projectId = Constants?.expoConfig?.extra?.eas?.projectId;
    
    if (!projectId) {
      console.warn('EAS Project ID not found. Add it to app.json under expo.extra.eas.projectId');
      console.warn('You can find your project ID at: https://expo.dev/accounts/[account]/projects/[project]/settings');
      return null;
    }

    // Get the Expo push token
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    });

    console.log('Expo Push Token:', tokenData.data);
    return tokenData.data;
  } catch (error) {
    console.error('Error registering for push notifications:', error);
    return null;
  }
}

/**
 * Schedule a daily reminder notification
 * @param hour - Hour of the day (0-23)
 * @param minute - Minute of the hour (0-59)
 */
export async function scheduleDailyReminder(hour: number = 9, minute: number = 0): Promise<string | null> {
  try {
    // Cancel any existing daily reminders first
    await cancelDailyReminder();

    // Request permissions
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      console.log('Cannot schedule notification without permissions');
      return null;
    }

    // Pick a random message
    const message = DAILY_REMINDER_MESSAGES[Math.floor(Math.random() * DAILY_REMINDER_MESSAGES.length)];

    // Schedule the notification
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: message.title,
        body: message.body,
        sound: 'default',
        data: { type: 'daily-reminder' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
        repeats: true,
      },
    });

    console.log(`Daily reminder scheduled for ${hour}:${minute.toString().padStart(2, '0')}`);
    console.log('Notification identifier:', identifier);
    
    return identifier;
  } catch (error) {
    console.error('Error scheduling daily reminder:', error);
    return null;
  }
}

/**
 * Cancel the daily reminder
 */
export async function cancelDailyReminder(): Promise<void> {
  try {
    // Get all scheduled notifications
    const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
    
    // Find and cancel daily reminder notifications
    for (const notification of scheduledNotifications) {
      if (notification.content.data?.type === 'daily-reminder') {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier);
        console.log('Cancelled daily reminder:', notification.identifier);
      }
    }
  } catch (error) {
    console.error('Error cancelling daily reminder:', error);
  }
}

/**
 * Check if daily reminder is scheduled
 */
export async function isDailyReminderScheduled(): Promise<boolean> {
  try {
    const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
    return scheduledNotifications.some(
      notification => notification.content.data?.type === 'daily-reminder'
    );
  } catch (error) {
    console.error('Error checking daily reminder status:', error);
    return false;
  }
}

/**
 * Get the next scheduled notification time
 */
export async function getNextReminderTime(): Promise<Date | null> {
  try {
    const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
    const dailyReminder = scheduledNotifications.find(
      notification => notification.content.data?.type === 'daily-reminder'
    );

    if (dailyReminder && dailyReminder.trigger && 'type' in dailyReminder.trigger) {
      // Calculate next trigger time
      const trigger = dailyReminder.trigger as any;
      if (trigger.hour !== undefined && trigger.minute !== undefined) {
        const now = new Date();
        const next = new Date();
        next.setHours(trigger.hour, trigger.minute, 0, 0);
        
        // If the time has passed today, schedule for tomorrow
        if (next <= now) {
          next.setDate(next.getDate() + 1);
        }
        
        return next;
      }
    }

    return null;
  } catch (error) {
    console.error('Error getting next reminder time:', error);
    return null;
  }
}

/**
 * Test notification - sends immediately
 */
export async function sendTestNotification(): Promise<void> {
  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      console.log('Cannot send test notification without permissions');
      return;
    }

    const message = DAILY_REMINDER_MESSAGES[0];

    await Notifications.scheduleNotificationAsync({
      content: {
        title: message.title,
        body: message.body,
        sound: 'default',
        data: { type: 'test' },
      },
      trigger: null, // null means send immediately
    });

    console.log('Test notification sent');
  } catch (error) {
    console.error('Error sending test notification:', error);
  }
}
