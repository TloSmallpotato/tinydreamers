
# Push Notifications Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Step 1: Add Your EAS Project ID

1. Go to https://expo.dev and sign in
2. Create or select your project
3. Copy your Project ID
4. Update `app.json`:

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

### Step 2: Rebuild Your App

```bash
# iOS
npx expo run:ios

# Android
npx expo run:android
```

### Step 3: Test Notifications

1. Open the app
2. Go to Settings → Notifications
3. Enable notifications
4. Set a reminder time
5. Tap "Send Test Notification"

## ✅ What's Already Done

- ✅ expo-notifications installed
- ✅ expo-device installed
- ✅ Plugin configured in app.json
- ✅ NotificationContext created
- ✅ NotificationProvider added to app
- ✅ NotificationService implemented
- ✅ UI component for settings created
- ✅ Permission handling implemented
- ✅ Daily reminders configured
- ✅ Deep linking set up

## 📱 How to Use

### In Your Components

```typescript
import { useNotifications } from '@/contexts/NotificationContext';

function MyComponent() {
  const {
    hasPermission,
    isReminderScheduled,
    expoPushToken,
    requestPermissions,
    scheduleReminder,
    cancelReminder,
    sendTest,
  } = useNotifications();

  // Request permissions
  const enable = async () => {
    const granted = await requestPermissions();
    if (granted) {
      console.log('Notifications enabled!');
      console.log('Push token:', expoPushToken);
    }
  };

  // Schedule daily reminder for 9:00 AM
  const setReminder = async () => {
    await scheduleReminder(9, 0);
  };

  // Send test notification
  const test = async () => {
    await sendTest();
  };
}
```

### Access Settings UI

The NotificationSettingsBottomSheet is already created. To use it:

```typescript
import { useRef } from 'react';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import NotificationSettingsBottomSheet from '@/components/NotificationSettingsBottomSheet';

function SettingsScreen() {
  const notificationSheetRef = useRef<BottomSheetModal>(null);

  return (
    <>
      <TouchableOpacity onPress={() => notificationSheetRef.current?.present()}>
        <Text>Notification Settings</Text>
      </TouchableOpacity>

      <NotificationSettingsBottomSheet bottomSheetRef={notificationSheetRef} />
    </>
  );
}
```

## 🔔 Send Notifications from Backend

### Save Push Tokens

```typescript
// When user enables notifications
const { expoPushToken } = useNotifications();

await supabase
  .from('user_push_tokens')
  .upsert({
    user_id: userId,
    push_token: expoPushToken,
  });
```

### Send via Expo Push API

```typescript
async function sendNotification(token: string) {
  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: token,
      title: 'Hello!',
      body: 'This is a push notification',
      data: { type: 'custom' },
    }),
  });
}
```

## 🧪 Testing

### Test with Expo Tool
1. Get your push token from the app
2. Go to https://expo.dev/notifications
3. Paste your token
4. Send a test notification

### Test Daily Reminders
1. Enable notifications in app
2. Set reminder time to 1 minute from now
3. Wait for notification
4. Tap notification to test deep linking

## 📋 Checklist

- [ ] Add EAS project ID to app.json
- [ ] Rebuild app with `npx expo run:ios` or `npx expo run:android`
- [ ] Test notification permissions
- [ ] Test daily reminders
- [ ] Test push token generation
- [ ] Test notification tapping (deep linking)
- [ ] Save push tokens to your database
- [ ] Set up backend notification sending

## 🐛 Common Issues

**Notifications not appearing?**
- Check permissions are granted
- Verify app is rebuilt with plugin
- Check device notification settings

**No push token?**
- Must use physical device (not simulator)
- Verify EAS project ID is set
- Check permissions are granted

**Daily reminders not working?**
- Verify reminder is scheduled
- Check next reminder time
- Ensure permissions are granted

## 📚 More Info

See `PUSH_NOTIFICATIONS_IMPLEMENTATION.md` for detailed documentation.

## 🎉 You're Ready!

Push notifications are now fully integrated. Just add your EAS project ID and rebuild!
