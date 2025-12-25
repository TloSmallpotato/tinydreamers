
# 🔔 Push Notifications - Quick Start

## ✅ What's Been Done

Push notifications are now **fully integrated** into your Tiny Dreamers app! Here's what's ready:

### Installed Packages
- ✅ `expo-notifications` - Core notification functionality
- ✅ `expo-device` - Device detection for push tokens

### Configuration
- ✅ Plugin added to `app.json`
- ✅ Android permissions configured
- ✅ Notification channels set up
- ✅ EAS project ID placeholder added

### Code Implementation
- ✅ `NotificationContext` - Manages notification state
- ✅ `NotificationProvider` - Added to app layout
- ✅ `notificationService.ts` - Core notification functions
- ✅ `NotificationSettingsBottomSheet` - User-friendly UI
- ✅ Settings screen updated with notification option

### Features Ready
- ✅ Permission management
- ✅ Daily reminder scheduling
- ✅ Push token generation
- ✅ Test notifications
- ✅ Deep linking on notification tap
- ✅ Platform-specific handling (iOS/Android/Web)

## 🚀 Next Steps (Required)

### 1. Add Your EAS Project ID

**This is the only required step to enable push notifications!**

1. Go to https://expo.dev
2. Sign in or create an account
3. Create a new project or select existing
4. Copy your Project ID from settings
5. Update `app.json`:

```json
{
  "expo": {
    "extra": {
      "eas": {
        "projectId": "YOUR_ACTUAL_PROJECT_ID_HERE"
      }
    }
  }
}
```

### 2. Rebuild Your App

After adding the project ID, rebuild:

```bash
# iOS
npx expo run:ios

# Android  
npx expo run:android

# Or use EAS Build
eas build --platform ios
eas build --platform android
```

## 📱 How to Use

### For Users

1. Open the app
2. Go to **Profile** → **Settings** (gear icon)
3. Tap **Notifications**
4. Enable notifications
5. Set your preferred reminder time
6. Tap "Send Test Notification" to verify

### For Developers

```typescript
import { useNotifications } from '@/contexts/NotificationContext';

function MyComponent() {
  const {
    hasPermission,
    isReminderScheduled,
    expoPushToken,
    requestPermissions,
    scheduleReminder,
    sendTest,
  } = useNotifications();

  // Request permissions
  const enable = async () => {
    const granted = await requestPermissions();
    if (granted) {
      console.log('Push token:', expoPushToken);
    }
  };

  // Schedule daily reminder for 9:00 AM
  const setReminder = async () => {
    await scheduleReminder(9, 0);
  };
}
```

## 🧪 Testing

### Test Local Notifications
1. Open app → Settings → Notifications
2. Enable notifications
3. Tap "Send Test Notification"
4. Check your notification tray

### Test Push Notifications
1. Get your push token (logged to console)
2. Go to https://expo.dev/notifications
3. Paste your token
4. Send a test notification

### Test Daily Reminders
1. Set reminder time to 1-2 minutes from now
2. Wait for notification
3. Tap notification to test deep linking

## 📋 Features

### Daily Reminders
- Schedule recurring notifications
- Choose custom time (hour and minute)
- Random motivational messages
- Automatic rescheduling

### Push Notifications
- Get Expo push tokens
- Send from backend via Expo Push API
- Custom notification data
- Deep linking support

### Permission Management
- Request permissions gracefully
- Check permission status
- Handle permission denial
- Platform-specific handling

### User Interface
- Beautiful bottom sheet UI
- Time picker for reminders
- Test notification button
- Permission status indicator
- Next reminder time display

## 🔧 Backend Integration

### Save Push Tokens

```typescript
// When user enables notifications
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

### Send Notifications

```typescript
// From your backend or Edge Function
async function sendPushNotification(token: string, title: string, body: string) {
  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: token,
      sound: 'default',
      title: title,
      body: body,
      data: { type: 'custom', url: '/some-screen' },
    }),
  });
}
```

## 🐛 Troubleshooting

### Notifications Not Appearing
- ✅ Check permissions are granted
- ✅ Verify app is rebuilt with plugin
- ✅ Check device notification settings
- ✅ For iOS: Disable Do Not Disturb

### No Push Token
- ✅ Must use physical device (not simulator)
- ✅ Verify EAS project ID is set
- ✅ Check permissions are granted
- ✅ Review console for errors

### Daily Reminders Not Working
- ✅ Verify reminder is scheduled
- ✅ Check next reminder time
- ✅ Ensure permissions granted
- ✅ For iOS: Repeating notifications need 60s+ interval

## 📚 Documentation

- `PUSH_NOTIFICATIONS_IMPLEMENTATION.md` - Detailed implementation guide
- `NOTIFICATIONS_QUICK_START.md` - This file
- Expo Docs: https://docs.expo.dev/push-notifications/overview/

## 🎉 Summary

**You're 95% done!** Just add your EAS project ID and rebuild the app.

### What Works Now
- ✅ Local notifications (in-app)
- ✅ Daily reminders
- ✅ Permission management
- ✅ UI for settings
- ✅ Test notifications

### What Needs EAS Project ID
- ⏳ Push token generation
- ⏳ Remote push notifications
- ⏳ Backend notification sending

### Files Modified
- `app.json` - Added plugin and permissions
- `app/_layout.tsx` - Added NotificationProvider
- `app/(tabs)/settings.tsx` - Added notification menu item
- `app/(tabs)/settings.ios.tsx` - Added notification menu item
- `utils/notificationService.ts` - Enhanced with better logging
- `contexts/NotificationContext.tsx` - Already existed, no changes needed
- `components/NotificationSettingsBottomSheet.tsx` - Already existed, no changes needed

## 🚀 Ready to Go!

1. Add EAS project ID to `app.json`
2. Rebuild with `npx expo run:ios` or `npx expo run:android`
3. Test notifications in Settings
4. Start sending push notifications!

Need help? Check the detailed docs or the Expo documentation.
