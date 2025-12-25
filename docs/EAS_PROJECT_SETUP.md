
# EAS Project Setup for Push Notifications

## Why Do You Need an EAS Project ID?

The EAS (Expo Application Services) Project ID is required for:
- Generating Expo push tokens
- Sending push notifications via Expo's push service
- Managing app credentials (APNs, FCM)
- Building your app with EAS Build

## Step-by-Step Setup

### 1. Create an Expo Account

1. Go to https://expo.dev
2. Click "Sign Up" or "Log In"
3. Create an account or sign in with GitHub

### 2. Install EAS CLI (Optional but Recommended)

```bash
npm install -g eas-cli
```

### 3. Login to EAS

```bash
eas login
```

### 4. Create or Link Your Project

#### Option A: Create a New Project

```bash
# In your project directory
eas init
```

This will:
- Create a new project on Expo
- Generate a project ID
- Update your `app.json` automatically

#### Option B: Link to Existing Project

If you already have a project on Expo:

```bash
eas init --id YOUR_EXISTING_PROJECT_ID
```

#### Option C: Manual Setup

1. Go to https://expo.dev
2. Click "Create a Project"
3. Enter project name: "TinyDreamers"
4. Copy the Project ID
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

### 5. Verify Your Setup

Check that your project ID is set:

```bash
# View your app.json
cat app.json | grep projectId
```

You should see:
```json
"projectId": "abc123-def456-ghi789"
```

## Configure Push Notification Credentials

### For iOS (APNs)

You need an Apple Developer account ($99/year).

#### Option 1: Let EAS Handle It (Recommended)

```bash
eas credentials
```

Select:
- iOS
- Push Notifications
- Let EAS manage credentials

#### Option 2: Use Your Own Credentials

1. Go to https://developer.apple.com
2. Create a Push Notification Key
3. Download the .p8 file
4. Run:

```bash
eas credentials
```

5. Select "Use existing credentials"
6. Upload your .p8 file

### For Android (FCM)

EAS automatically handles FCM credentials. No additional setup needed!

## Build Your App

### Development Build

```bash
# iOS
eas build --profile development --platform ios

# Android
eas build --profile development --platform android
```

### Production Build

```bash
# iOS
eas build --profile production --platform ios

# Android
eas build --profile production --platform android
```

## Test Push Notifications

### 1. Get Your Push Token

Run your app and check the console:

```
✅ Expo Push Token obtained: ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]
```

### 2. Send a Test Notification

Go to https://expo.dev/notifications

1. Paste your push token
2. Enter a title and message
3. Click "Send a Notification"

### 3. Verify Receipt

Check your device notification tray!

## Common Issues

### "Project ID not found"

**Solution:** Make sure you've added the project ID to `app.json`:

```json
{
  "expo": {
    "extra": {
      "eas": {
        "projectId": "YOUR_PROJECT_ID"
      }
    }
  }
}
```

### "Must use physical device"

**Solution:** Push notifications don't work on simulators/emulators. Use a real device.

### "Failed to get push token"

**Solutions:**
1. Verify project ID is set
2. Check permissions are granted
3. Ensure you're on a physical device
4. Check console for specific error messages

### "Credentials not configured"

**Solution:** Run `eas credentials` to set up APNs (iOS) credentials.

## EAS Configuration File

Create `eas.json` in your project root:

```json
{
  "cli": {
    "version": ">= 5.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "simulator": false
      }
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "simulator": false
      }
    },
    "production": {
      "ios": {
        "simulator": false
      }
    }
  },
  "submit": {
    "production": {}
  }
}
```

## Useful Commands

```bash
# Check EAS CLI version
eas --version

# View project info
eas project:info

# View credentials
eas credentials

# Build for development
eas build --profile development --platform all

# Build for production
eas build --profile production --platform all

# Submit to app stores
eas submit --platform ios
eas submit --platform android
```

## Resources

- [EAS Documentation](https://docs.expo.dev/eas/)
- [Push Notifications Setup](https://docs.expo.dev/push-notifications/push-notifications-setup/)
- [EAS Build](https://docs.expo.dev/build/introduction/)
- [EAS Submit](https://docs.expo.dev/submit/introduction/)
- [Expo Push Notification Tool](https://expo.dev/notifications)

## Quick Reference

| Task | Command |
|------|---------|
| Install EAS CLI | `npm install -g eas-cli` |
| Login | `eas login` |
| Initialize project | `eas init` |
| Configure credentials | `eas credentials` |
| Build development | `eas build --profile development --platform all` |
| Build production | `eas build --profile production --platform all` |
| View project info | `eas project:info` |

## Next Steps

1. ✅ Create Expo account
2. ✅ Install EAS CLI
3. ✅ Run `eas init`
4. ✅ Copy project ID to `app.json`
5. ✅ Configure credentials (iOS only)
6. ✅ Build your app
7. ✅ Test push notifications

## Support

- Expo Discord: https://chat.expo.dev
- Expo Forums: https://forums.expo.dev
- GitHub Issues: https://github.com/expo/expo/issues

---

**Ready?** Run `eas init` to get started!
