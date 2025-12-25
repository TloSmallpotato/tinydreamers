
# Push Notifications Quick Start

## 🚀 Quick Setup (5 minutes)

### Step 1: Add Your EAS Project ID

1. Go to https://expo.dev and find your project
2. Copy the Project ID from settings
3. Open `app.json` and replace `YOUR_EAS_PROJECT_ID_HERE`:

```json
"extra": {
  "eas": {
    "projectId": "abc123-your-actual-id-here"
  }
}
```

### Step 2: Test Local Notifications (No setup needed!)

Local notifications work immediately without any credentials:

1. Run your app: `npm run ios` or `npm run android`
2. Go to **Settings** → **Daily Reminders**
3. Tap **"Send Test Notification"**
4. You should see a notification!

### Step 3: Set Up Daily Reminders

1. In Settings → Daily Reminders
2. Toggle on **"Daily Reminder"**
3. Select your preferred time
4. Done! You'll get a reminder every morning

## 📱 What Works Right Now

✅ **Local Notifications** (Daily Reminders)
- No credentials needed
- Works immediately
- Scheduled notifications
- Custom times

❌ **Remote Push Notifications** (Requires setup)
- Needs EAS Project ID
- Needs iOS credentials (p8 file)
- Needs Android credentials (FCM)

## 🔑 Understanding Your Credentials

### EAS Project ID
- **What**: Unique identifier for your Expo project
- **Where**: Expo dashboard → Project Settings
- **Used for**: Getting Expo push tokens
- **Required for**: Remote push notifications

### iOS p8 File + Key ID
- **What**: Apple Push Notification authentication
- **Where**: Apple Developer Portal → Keys
- **Used for**: Sending notifications to iOS devices
- **Note**: You can only download the p8 file once!

### Android FCM
- **What**: Firebase Cloud Messaging credentials
- **Where**: Firebase Console → Project Settings
- **Used for**: Sending notifications to Android devices

## 🎯 What Each Token Means

### Expo Push Token
```
ExponentPushToken[xxxxxxxxxxxxxx]
```
- Easy to use
- Works with Expo's service
- Cross-platform
- Requires EAS Project ID

### iOS APNs Token
```
<740f4707 bebcf74f 9b7c25d4 8e335894 5f6aa01d a5ddb387 462c7eaf 61bb78ad>
```
- Direct from Apple
- More control
- iOS only

### Android FCM Token
```
fGhJ7k8L9mN0pQ1rS2tU3vW4xY5zA6bC7dE8fG9hH0iJ1kL2mN3oP4qR5sT6uV7wX8yZ9
```
- Direct from Google
- More control
- Android only

## 🧪 Testing Checklist

- [ ] Test on physical device (not simulator)
- [ ] Request notification permissions
- [ ] Send test notification
- [ ] Schedule daily reminder
- [ ] Tap notification to open app
- [ ] Check notification appears at scheduled time
- [ ] Test on both iOS and Android

## 🐛 Common Issues

**"Project ID not found"**
→ Add EAS Project ID to app.json and rebuild

**"Must use physical device"**
→ Push notifications don't work on simulators

**Notifications not showing**
→ Check permissions in device settings

**Can't schedule exact time on Android**
→ Need SCHEDULE_EXACT_ALARM permission (already added)

## 📚 Files Created

- `utils/notificationService.ts` - Core notification logic
- `contexts/NotificationContext.tsx` - React context for notifications
- `components/NotificationSettingsBottomSheet.tsx` - Settings UI
- `docs/PUSH_NOTIFICATIONS_SETUP.md` - Detailed setup guide
- `docs/NOTIFICATION_QUICK_START.md` - This file!

## 🎨 Customization

### Change Reminder Messages

Edit `utils/notificationService.ts`:

```typescript
const DAILY_REMINDER_MESSAGES = [
  {
    title: "Your custom title",
    body: "Your custom message"
  },
  // Add more messages...
];
```

### Change Default Time

Edit `utils/notificationService.ts`:

```typescript
export async function scheduleDailyReminder(
  hour: number = 9,  // Change this
  minute: number = 0  // And this
)
```

## 🚢 Ready to Ship?

Before releasing to production:

1. ✅ Add EAS Project ID
2. ✅ Upload iOS credentials
3. ✅ Upload Android credentials
4. ✅ Test on physical devices
5. ✅ Test notification permissions flow
6. ✅ Test daily reminders
7. ✅ Build production app with `eas build`

## 💡 Pro Tips

- **Test early**: Set reminder for 1 minute from now
- **Check logs**: Use `console.log` to debug
- **Physical devices**: Always test on real devices
- **Permissions**: Request at the right time (not on app launch)
- **Value**: Make notifications valuable to users

## 🆘 Need Help?

Check the detailed guide: `docs/PUSH_NOTIFICATIONS_SETUP.md`

Or search for:
- "expo notifications not working"
- "ios push notifications setup"
- "android fcm setup"
- "eas credentials"
