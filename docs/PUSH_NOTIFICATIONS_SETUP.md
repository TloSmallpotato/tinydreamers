
# Push Notifications Setup Guide

This guide will help you set up push notifications for your TinyDreamers app, including daily reminders.

## Overview

The app now includes:
- **Daily Reminders**: Local notifications that remind users every morning to log moments
- **Push Notification Support**: Infrastructure for remote push notifications via Expo
- **Notification Settings**: User-friendly UI to manage notification preferences

## What You Need

### 1. EAS Project ID

The EAS Project ID is required for Expo's push notification service.

**How to get it:**

1. Go to [https://expo.dev](https://expo.dev)
2. Sign in to your account
3. Navigate to your project
4. Go to Project Settings
5. Copy the Project ID

**Where to add it:**

Open `app.json` and replace `YOUR_EAS_PROJECT_ID_HERE` with your actual project ID:

```json
{
  "expo": {
    "extra": {
      "eas": {
        "projectId": "your-actual-project-id-here"
      }
    }
  }
}
```

### 2. Apple Push Notification Credentials (iOS)

For iOS push notifications, you need:
- **p8 file**: APNs authentication key
- **Key ID**: Identifier for your APNs key
- **Team ID**: Your Apple Developer Team ID

**How to get them:**

1. Go to [Apple Developer Portal](https://developer.apple.com/account)
2. Navigate to **Certificates, Identifiers & Profiles**
3. Click on **Keys** in the sidebar
4. Click the **+** button to create a new key
5. Give it a name (e.g., "TinyDreamers Push Notifications")
6. Check **Apple Push Notifications service (APNs)**
7. Click **Continue** and then **Register**
8. Download the `.p8` file (you can only download it once!)
9. Note the **Key ID** shown on the page
10. Your **Team ID** is shown in the top right of the Apple Developer portal

**How to upload to Expo:**

```bash
# Install EAS CLI if you haven't already
npm install -g eas-cli

# Login to Expo
eas login

# Upload your credentials
eas credentials

# Select your project
# Choose iOS
# Choose "Push Notifications"
# Upload your p8 file and enter Key ID and Team ID
```

### 3. Firebase Cloud Messaging (Android)

For Android push notifications, you need FCM credentials.

**How to set up:**

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project or select existing one
3. Add an Android app to your project
4. Download `google-services.json`
5. Upload to Expo using EAS CLI:

```bash
eas credentials

# Select your project
# Choose Android
# Choose "Push Notifications"
# Upload google-services.json
```

## Understanding Push Notification Tokens

### What are tokens?

Push notification tokens are unique identifiers for each device. They allow notification services to deliver messages to specific devices.

### Types of tokens:

1. **Expo Push Token**: 
   - Format: `ExponentPushToken[xxxxxxxxxxxxxx]`
   - Used with Expo's push notification service
   - Easier to use, works across platforms
   - Requires EAS Project ID

2. **Native Device Token**:
   - **iOS (APNs)**: Long hexadecimal string
   - **Android (FCM)**: Long alphanumeric string
   - Used directly with Apple/Google services
   - More complex but gives full control

### How tokens work:

1. User grants notification permissions
2. Device registers with notification service (APNs/FCM)
3. Service returns a unique token
4. Your app sends this token to your backend
5. Backend uses token to send notifications to that specific device

## Features Implemented

### 1. Daily Reminders (Local Notifications)

- Schedule notifications at a specific time each day
- Random motivational messages
- No internet required
- Works even when app is closed

**Messages included:**
- "Celebrate the little moments that matter 💛"
- "New word? New book? New moment? Log it now!"
- "Every word counts! Log a new one today and watch them grow."
- "Time to capture today's tiny win! 🐣"
- And more...

### 2. Notification Settings UI

Located in Settings → Daily Reminders:
- Enable/disable daily reminders
- Set custom reminder time
- Test notifications
- View next scheduled reminder
- Permission status indicator

### 3. Notification Context

The `NotificationContext` provides:
- `expoPushToken`: The Expo push token for this device
- `hasPermission`: Whether notifications are enabled
- `isReminderScheduled`: Whether daily reminder is active
- `nextReminderTime`: When the next reminder will fire
- `requestPermissions()`: Request notification permissions
- `scheduleReminder(hour, minute)`: Schedule daily reminder
- `cancelReminder()`: Cancel daily reminder
- `sendTest()`: Send test notification

## Testing

### Test Local Notifications

1. Open the app
2. Go to Settings → Daily Reminders
3. Enable notifications if prompted
4. Tap "Send Test Notification"
5. Check your notification tray

### Test Daily Reminders

1. Go to Settings → Daily Reminders
2. Enable the daily reminder toggle
3. Set a time (e.g., 1 minute from now)
4. Wait for the notification
5. Tap the notification to open the app

### Test on Physical Device

**Important**: Push notifications don't work on simulators/emulators. You must test on a physical device.

For iOS:
```bash
# Build a development client
eas build --profile development --platform ios

# Or run locally
npx expo run:ios
```

For Android:
```bash
# Build a development client
eas build --profile development --platform android

# Or run locally
npx expo run:android
```

## Sending Push Notifications from Backend

Once you have the Expo push token, you can send notifications from your backend:

```javascript
// Example using Expo's push notification service
const sendPushNotification = async (expoPushToken, title, body) => {
  const message = {
    to: expoPushToken,
    sound: 'default',
    title: title,
    body: body,
    data: { someData: 'goes here' },
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
};

// Usage
await sendPushNotification(
  'ExponentPushToken[xxxxxxxxxxxxxx]',
  'New milestone!',
  'Your child just learned their 50th word!'
);
```

## Storing Push Tokens

You should store push tokens in your Supabase database so you can send notifications later:

```sql
-- Add a column to your profiles table
ALTER TABLE profiles ADD COLUMN expo_push_token TEXT;

-- Update the token when user logs in
UPDATE profiles 
SET expo_push_token = 'ExponentPushToken[xxxxxxxxxxxxxx]'
WHERE user_id = 'user-uuid';
```

## Troubleshooting

### "Project ID not found" error

- Make sure you've added the EAS project ID to `app.json`
- Rebuild your app after adding the project ID

### Notifications not appearing

- Check that permissions are granted
- Verify the app is not in Do Not Disturb mode
- On Android, check notification channel settings
- Test on a physical device, not simulator

### "Must use physical device" message

- Push notifications require a physical device
- Local notifications work on simulators but may behave differently

### iOS notifications not working

- Ensure you've uploaded your p8 file and credentials to Expo
- Check that your bundle identifier matches
- Verify your Apple Developer account is in good standing

### Android notifications not working

- Ensure you've uploaded google-services.json
- Check that your package name matches
- Verify FCM is enabled in Firebase Console

## Best Practices

1. **Always request permissions gracefully**: Explain why you need notifications before requesting
2. **Respect user preferences**: Allow users to disable notifications
3. **Don't spam**: Limit notification frequency
4. **Make notifications valuable**: Only send notifications that provide value
5. **Test thoroughly**: Test on both iOS and Android physical devices
6. **Handle token updates**: Tokens can change, so update them regularly
7. **Implement retry logic**: Network requests can fail, implement retry logic

## Next Steps

1. Add your EAS Project ID to `app.json`
2. Upload your iOS credentials (p8 file, Key ID, Team ID)
3. Upload your Android credentials (google-services.json)
4. Rebuild your app
5. Test on physical devices
6. Implement backend logic to send push notifications
7. Store push tokens in your database

## Resources

- [Expo Push Notifications Guide](https://docs.expo.dev/push-notifications/overview/)
- [Expo Notifications API](https://docs.expo.dev/versions/latest/sdk/notifications/)
- [Apple Push Notifications](https://developer.apple.com/documentation/usernotifications)
- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)
- [EAS Build](https://docs.expo.dev/build/introduction/)
