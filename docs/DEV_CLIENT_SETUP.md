
# Expo Dev Client Setup Guide

## Overview

Your app is now configured to use **Expo Dev Client**, which allows you to:
- Test native modules like `ffmpeg-kit-react-native` that don't work in Expo Go
- Create custom development builds with your own native code
- Use the same development workflow as Expo Go but without limitations

## What Changed

### 1. Installed Dependencies
- ✅ `expo-dev-client` package installed

### 2. Updated Configuration Files

#### app.json
- Added `expo-dev-client` plugin to enable dev client functionality

#### eas.json
- Added update channels for better OTA management:
  - **development**: For local dev builds
  - **staging**: For TestFlight/internal testing (preview builds)
  - **production**: For App Store/Play Store releases

## How to Use Dev Client

### Option 1: Local Development Build (Recommended for Testing)

#### For iOS:
```bash
# Build and run on iOS simulator
npx expo run:ios

# Or build for a physical device
npx expo run:ios --device
```

#### For Android:
```bash
# Build and run on Android emulator
npx expo run:android

# Or build for a physical device
npx expo run:android --device
```

**Note:** The first build will take several minutes as it compiles native code. Subsequent builds are faster.

### Option 2: Cloud Build with EAS (For Distribution)

#### Build a Development Client:
```bash
# For iOS
eas build --profile development --platform ios

# For Android
eas build --profile development --platform android

# For both platforms
eas build --profile development --platform all
```

After the build completes, you'll get a download link to install on your device.

#### Build for TestFlight (Staging):
```bash
# This uses the "preview" profile with staging channel
eas build --profile preview --platform ios
```

#### Build for Production:
```bash
# For App Store/Play Store
eas build --profile production --platform all
```

## Starting the Development Server

Once you have a dev client installed, start the dev server:

```bash
# Start with dev client mode
npx expo start --dev-client

# Or use your existing script
npm run dev
```

Then:
1. Open your dev client app on your device
2. Scan the QR code or enter the URL
3. Your app will load with all native modules working!

## Over-The-Air (OTA) Updates

### Publishing Updates to Staging (TestFlight Users)
```bash
# Publish to staging channel
eas update --channel staging --message "Your update message"
```

### Publishing Updates to Production (App Store Users)
```bash
# Publish to production channel
eas update --channel production --message "Your update message"
```

**Important:** 
- By default, all builds from now on will use the **staging** channel
- Only explicitly publish to **production** when you're ready for live users
- OTA updates only work for JavaScript/asset changes, not native code changes

## When to Rebuild vs OTA Update

### Use OTA Update (eas update) when:
- ✅ Changing JavaScript code
- ✅ Updating React components
- ✅ Modifying app logic
- ✅ Changing assets (images, fonts, etc.)

### Rebuild (eas build) when:
- 🔨 Adding/removing native modules
- 🔨 Changing app.json configuration
- 🔨 Updating native dependencies
- 🔨 Modifying iOS/Android native code
- 🔨 Changing app permissions

## Testing FFmpeg Video Trimming

Your app uses `ffmpeg-kit-react-native` for video trimming. This **requires a dev client** and will NOT work in Expo Go.

To test video trimming:
1. Build a dev client (local or EAS)
2. Install it on your device
3. Start the dev server with `npx expo start --dev-client`
4. Test the video recording and trimming features

## Troubleshooting

### "Unable to resolve module" errors
- Clear cache: `npx expo start --clear`
- Reinstall dependencies: `rm -rf node_modules && npm install`

### Native module not found
- Rebuild your dev client: `npx expo run:ios` or `npx expo run:android`
- Make sure you're not using Expo Go

### Build fails on EAS
- Check your eas.json configuration
- Verify all native dependencies are compatible
- Review build logs in the EAS dashboard

### OTA update not appearing
- Make sure the channel matches your build profile
- Check that you're not changing native code (requires rebuild)
- Verify the update was published successfully

## Development Workflow

### Daily Development:
1. Use local dev client: `npx expo run:ios` or `npx expo run:android`
2. Make changes to your code
3. Hot reload works automatically
4. No need to rebuild unless adding native modules

### Testing on TestFlight:
1. Build preview: `eas build --profile preview --platform ios`
2. Submit to TestFlight: `eas submit --platform ios`
3. Push OTA updates: `eas update --channel staging`

### Production Release:
1. Build production: `eas build --profile production --platform all`
2. Submit to stores: `eas submit --platform all`
3. Push OTA updates: `eas update --channel production`

## Key Differences from Expo Go

| Feature | Expo Go | Dev Client |
|---------|---------|------------|
| Native modules | Limited to Expo SDK | Any native module |
| Custom native code | ❌ No | ✅ Yes |
| Build time | Instant | 5-15 minutes first time |
| FFmpeg support | ❌ No | ✅ Yes |
| Distribution | Pre-installed | Build & install |

## Next Steps

1. **Build your first dev client:**
   ```bash
   npx expo run:ios
   # or
   npx expo run:android
   ```

2. **Test video trimming** to ensure FFmpeg works correctly

3. **Set up EAS Build** for cloud builds:
   ```bash
   eas build:configure
   ```

4. **Create a TestFlight build:**
   ```bash
   eas build --profile preview --platform ios
   ```

## Resources

- [Expo Dev Client Documentation](https://docs.expo.dev/develop/development-builds/introduction/)
- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [EAS Update Documentation](https://docs.expo.dev/eas-update/introduction/)
- [FFmpeg Kit React Native](https://github.com/arthenica/ffmpeg-kit)

## Support

If you encounter issues:
1. Check the [Expo Discord](https://chat.expo.dev/)
2. Review [Expo Forums](https://forums.expo.dev/)
3. Check [GitHub Issues](https://github.com/expo/expo/issues)
