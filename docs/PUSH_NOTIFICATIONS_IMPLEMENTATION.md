
# Push Notifications Implementation Guide

## Overview

This app now has full push notification support using Expo's push notification service. The implementation includes:

- **Permission Management**: Request and check notification permissions
- **Push Token Registration**: Get Expo push tokens for sending notifications
- **Daily Reminders**: Schedule recurring daily notifications
- **Notification Handling**: Listen to and respond to notifications
- **Deep Linking**: Navigate to specific screens when notifications are tapped

## Setup Complete ✅

The following has been implemented:

### 1. Dependencies Installed
- `expo-notifications` - Core notification functionality
- `expo-device` - Device detection for push notifications

### 2. Configuration Added

#### app.json
```json
{
  "expo": {
    "plugins": [
      [
        "expo-notifications",
        {
          "icon": "./assets/images/3e1ea99a-f17a-42c3-b801-1361ce0bce92.png",
          "color": "#E8B4D9",
          "defaultChannel": "default",
          "sounds": []
        }
      ]
    ],
    "android": {
      "permissions": [
        "POST_NOTIFICATIONS"
      ]
    },
    "extra": {
      "eas": {
        "projectId": "your-eas-project-id"
      }
    }
  }
}
```

### 3. Context Provider
The `NotificationProvider` has been added to the app layout and provides:
- Permission status
- Push token management
- Daily reminder scheduling
- Notification event handling

### 4. Notification Service
Located at `utils/notificationService.ts`, provides:
- `requestNotificationPermissions()` - Request permissions
- `registerForPushNotifications()` - Get Expo push token
- `scheduleDailyReminder(hour, minute)` - Schedule daily notifications
- `cancelDailyReminder()` - Cancel scheduled notifications
- `sendTestNotification()` - Send immediate test notification

### 5. UI Component
`NotificationSettingsBottomSheet` provides a user-friendly interface for:
- Enabling/disabling notifications
- Setting reminder time
- Testing notifications
- Viewing permission status

## Next Steps

### 1. Add Your EAS Project ID

To enable push notifications, you need to add your EAS project ID to `app.json`:

1. Go to https://expo.dev
2. Sign in or create an account
3. Create a new project or select your existing project
4. Copy your Project ID from the project settings
5. Update `app.json`:

```json
{
  "expo": {
    "extra": {
      "eas": {
        "projectId": "YOUR_PROJECT_ID_HERE"
      }
    }
  }
}
```

### 2. Rebuild Your App

After adding the expo-notifications plugin, you need to rebuild your app:

```bash
# For iOS
npx expo run:ios

# For Android
npx expo run:android

# Or build with EAS
eas build --platform ios
eas build --platform android
```

### 3. Test Notifications

#### Local Testing (In-App Notifications)
1. Open the app
2. Navigate to Settings
3. Tap on "Notifications"
4. Enable notifications
5. Tap "Send Test Notification"

#### Push Notification Testing
1. Get your Expo push token from the app (it will be logged to console)
2. Use the Expo Push Notification Tool: https://expo.dev/notifications
3. Enter your push token
4. Send a test notification

### 4. Integrate with Your Backend

To send push notifications from your backend:

#### Save Push Tokens
When a user enables notifications, save their Expo push token to your database:

```typescript
// In your app
const { expoPushToken } = useNotifications();

// Save to Supabase
await supabase
  .from('user_push_tokens')
  .upsert({
    user_id: userId,
    push_token: expoPushToken,
    updated_at: new Date().toISOString(),
  });
```

#### Send Notifications from Backend
Create a Supabase Edge Function or backend service:

```typescript
// Example: Send notification via Expo Push API
async function sendPushNotification(expoPushToken: string, title: string, body: string) {
  const message = {
    to: expoPushToken,
    sound: 'default',
    title: title,
    body: body,
    data: { type: 'custom' },
  };

  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Accept-encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(message),
  });
}
```

## Usage in Your App

### Request Permissions
```typescript
import { useNotifications } from '@/contexts/NotificationContext';

function MyComponent() {
  const { requestPermissions } = useNotifications();
  
  const handleEnableNotifications = async () => {
    const granted = await requestPermissions();
    if (granted) {
      console.log('Notifications enabled!');
    }
  };
}
```

### Schedule Daily Reminder
```typescript
const { scheduleReminder } = useNotifications();

// Schedule for 9:00 AM
await scheduleReminder(9, 0);
```

### Check Permission Status
```typescript
const { hasPermission, isReminderScheduled } = useNotifications();

if (hasPermission) {
  console.log('User has granted notification permissions');
}

if (isReminderScheduled) {
  console.log('Daily reminder is active');
}
```

### Get Push Token
```typescript
const { expoPushToken } = useNotifications();

// Use this token to send notifications from your backend
console.log('Push token:', expoPushToken);
```

## Notification Types

### Daily Reminders
Automatically scheduled notifications that repeat daily at a specified time. Messages include:
- "Celebrate the little moments that matter 💛"
- "New word? New book? New moment?"
- "Every word counts!"
- "Time to capture today's tiny win! 🐣"
- "Good morning! ☀️"
- "Start the day with a smile!"

### Custom Notifications
You can send custom notifications from your backend using the Expo Push API.

## Deep Linking

When a user taps on a notification, the app will:
1. Open the app (if closed)
2. Navigate to the appropriate screen based on notification data
3. Currently configured to navigate to home screen for daily reminders

To customize navigation:
```typescript
// In NotificationContext.tsx
responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
  const data = response.notification.request.content.data;
  
  if (data?.type === 'daily-reminder') {
    router.push('/(tabs)/(home)');
  } else if (data?.type === 'custom') {
    router.push('/custom-screen');
  }
});
```

## Platform Differences

### iOS
- Requires user permission before showing notifications
- Supports rich notifications with images and actions
- Notifications appear in Notification Center

### Android
- Requires POST_NOTIFICATIONS permission (Android 13+)
- Supports notification channels for categorization
- More granular control over notification behavior

### Web
- Push notifications are not supported on web
- All notification functions will gracefully skip on web platform

## Troubleshooting

### Notifications Not Appearing
1. Check permission status: `hasPermission` should be `true`
2. Verify app is built with expo-notifications plugin
3. Check device notification settings
4. For iOS: Check that app is not in Do Not Disturb mode

### Push Token Not Generated
1. Ensure you're testing on a physical device (not simulator)
2. Verify EAS project ID is set in app.json
3. Check that permissions are granted
4. Review console logs for error messages

### Daily Reminders Not Working
1. Verify reminder is scheduled: `isReminderScheduled` should be `true`
2. Check next reminder time: `nextReminderTime`
3. Ensure app has notification permissions
4. For iOS: Repeating notifications must be at least 60 seconds apart

## Best Practices

1. **Always Request Permissions Gracefully**
   - Explain why you need notifications before requesting
   - Provide value to the user (daily reminders help track growth)
   - Don't spam permission requests

2. **Handle Permission Denial**
   - Provide instructions to enable in device settings
   - Continue to offer value even without notifications

3. **Test Thoroughly**
   - Test on both iOS and Android
   - Test with app in foreground, background, and closed
   - Test notification tapping and deep linking

4. **Monitor Token Changes**
   - Push tokens can change (rare but possible)
   - Update your backend when tokens change
   - Use `addPushTokenListener` to handle token updates

5. **Respect User Preferences**
   - Allow users to disable notifications
   - Provide granular control over notification types
   - Honor quiet hours if implementing custom scheduling

## Resources

- [Expo Notifications Documentation](https://docs.expo.dev/versions/latest/sdk/notifications/)
- [Expo Push Notifications Guide](https://docs.expo.dev/push-notifications/overview/)
- [Expo Push Notification Tool](https://expo.dev/notifications)
- [Firebase Cloud Messaging (Android)](https://firebase.google.com/docs/cloud-messaging)
- [Apple Push Notification Service (iOS)](https://developer.apple.com/documentation/usernotifications)

## Support

If you encounter issues:
1. Check the console logs for error messages
2. Review the Expo documentation
3. Test with the Expo Push Notification Tool
4. Verify your EAS project configuration
5. Check device notification settings

## Summary

✅ Push notifications are now fully integrated into your app!
✅ Users can enable/disable notifications via Settings
✅ Daily reminders can be scheduled at custom times
✅ Push tokens are generated for backend integration
✅ Notification handling and deep linking are configured

Next: Add your EAS project ID and rebuild the app to start using push notifications!
