
# FFmpeg Kit TestFlight Build Fix

## Problem

When building for TestFlight, you may encounter an error while installing `ffmpeg-kit-react-native`:

```
error: No version matching "6.0.3" found for specifier "ffmpeg-kit-react-native" (but package exists)
error: ffmpeg-kit-react-native@6.0.3 failed to resolve
```

## Root Cause

The `ffmpeg-kit-react-native` version 6.0.3 does not exist. The latest stable version is **6.0.2**. If your build system is trying to install 6.0.3, it's likely due to:

1. Cached references in lockfiles
2. Outdated documentation or configuration
3. Missing lockfile causing version resolution issues

## Solution

### Step 1: Verify Package Version

Ensure your `package.json` has the correct version:

```json
{
  "dependencies": {
    "ffmpeg-kit-react-native": "6.0.2"
  },
  "resolutions": {
    "ffmpeg-kit-react-native": "6.0.2"
  },
  "overrides": {
    "ffmpeg-kit-react-native": "6.0.2"
  }
}
```

### Step 2: Check Available Versions

You can verify the available versions using:

```bash
npm info ffmpeg-kit-react-native versions
```

This should show that 6.0.2 is the latest stable version.

### Step 3: Clean and Reinstall Dependencies

Run the following commands in your project directory:

```bash
# Remove node_modules and any lockfiles
rm -rf node_modules package-lock.json yarn.lock bun.lockb

# Clear package manager cache
npm cache clean --force
# OR if using yarn
yarn cache clean
# OR if using bun
bun pm cache rm

# Reinstall dependencies
npm install
# OR
yarn install
# OR
bun install
```

### Step 4: Clean iOS Build (if applicable)

If you have an `ios` folder (from `expo prebuild`), you need to clean the iOS build:

```bash
# Remove the ios folder
rm -rf ios

# Regenerate the ios folder
npx expo prebuild -p ios --clean
```

### Step 5: Update iOS Pods

After reinstalling dependencies, update the iOS Pods:

```bash
cd ios
pod repo update
pod install
cd ..
```

### Step 6: Rebuild for TestFlight

Now you can rebuild your app for TestFlight:

```bash
# Build with EAS (with cache cleared)
eas build --platform ios --profile production --clear-cache
```

## Alternative Solution: Use a Different FFmpeg Package

If the above solution doesn't work, you can consider using an alternative approach:

### Option A: Use expo-av for Basic Video Operations

If you only need basic video trimming without re-encoding, you can use `expo-av` with metadata-based trimming. This doesn't require FFmpeg.

**Pros:**
- No native dependencies
- Works with Expo Go
- Faster (no re-encoding)

**Cons:**
- Doesn't create a new trimmed file
- Full video is still uploaded

### Option B: Use a Cloud-Based Video Processing Service

Process videos on the server using Supabase Edge Functions with FFmpeg:

1. Upload the full video to Supabase Storage
2. Call an Edge Function to trim the video server-side
3. Download the trimmed video

**Pros:**
- No client-side FFmpeg dependency
- Works on all platforms
- Offloads processing from the device

**Cons:**
- Requires server-side setup
- Additional latency
- May incur processing costs

## Verification

After rebuilding, verify that the build succeeds by checking:

1. **Dependency Installation Success:**
   ```
   ✓ Installing ffmpeg-kit-react-native@6.0.2
   ```

2. **Pod Installation Success (iOS):**
   ```
   ✓ Installing ffmpeg-kit-ios-https (6.0.2)
   ```

3. **Build Completion:**
   ```
   ✓ Build completed successfully
   ```

4. **TestFlight Upload:**
   ```
   ✓ Uploaded to TestFlight
   ```

## Testing the Fix

Once the build is successful and uploaded to TestFlight:

1. Install the TestFlight build on your device
2. Record or select a video
3. Trim the video using the trim handles
4. Confirm and save the video
5. Verify that the trimmed video is uploaded and plays correctly

## Additional Notes

### Why Version 6.0.2?

- Version 6.0.2 is the latest stable release of `ffmpeg-kit-react-native`
- Version 6.0.3 does not exist in the npm registry
- It's compatible with Expo SDK 54 and React Native 0.81

### FFmpeg Kit Variants

The package uses the `https` variant which includes:
- Basic video/audio codecs (H.264, AAC, etc.)
- HTTPS protocol support
- Smaller binary size compared to the `full` variant

If you need additional codecs or features, you can switch to other variants:
- `ffmpeg-kit-react-native` (min - smallest)
- `ffmpeg-kit-react-native-https` (current - recommended)
- `ffmpeg-kit-react-native-full` (largest - all features)

### Expo Dev Client Requirement

Remember that FFmpeg Kit requires a custom development build (Expo Dev Client) and will not work with Expo Go:

```bash
# Create a development build
eas build --platform ios --profile development
```

## Troubleshooting

### Issue: Still Getting "6.0.3 not found" Error

**Solution:**
1. Make sure you've updated `package.json` to version 6.0.2
2. Delete `node_modules` and **all lockfiles** (package-lock.json, yarn.lock, bun.lockb)
3. Clear the EAS build cache: `eas build --platform ios --clear-cache`
4. Ensure `resolutions` and `overrides` fields in package.json are set to 6.0.2

### Issue: No Lockfile Detected

If EAS Build shows "Did not detect any lock files", it means:
- You don't have a lockfile committed to your repository
- The build system will use the default package manager (bun)

**Solution:**
1. Generate a lockfile locally: `npm install` (creates package-lock.json)
2. Commit the lockfile to your repository
3. Push the changes and rebuild

### Issue: Pod Install Fails

**Solution:**
1. Check your Xcode version (should be 14.0 or later)
2. Update CocoaPods: `sudo gem install cocoapods`
3. Clear CocoaPods cache: `pod cache clean --all`
4. Run `pod repo update` to update the CocoaPods repository

### Issue: Build Succeeds but App Crashes

**Solution:**
1. Check that you're using Expo Dev Client (not Expo Go)
2. Verify that the FFmpeg commands in your code are correct
3. Check the device logs for FFmpeg-related errors

## References

- [FFmpeg Kit React Native GitHub](https://github.com/arthenica/ffmpeg-kit)
- [FFmpeg Kit Releases](https://github.com/arthenica/ffmpeg-kit/releases)
- [Expo Dev Client Documentation](https://docs.expo.dev/develop/development-builds/introduction/)
- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)

## Summary

The fix is to ensure `ffmpeg-kit-react-native` is set to version **6.0.2** (not 6.0.3, which doesn't exist). 

Key steps:
1. Update `package.json` to use version 6.0.2
2. Add `resolutions` and `overrides` fields to force version 6.0.2
3. Delete all lockfiles and node_modules
4. Reinstall dependencies
5. Clear EAS build cache and rebuild

After these steps, the build should complete successfully without trying to resolve the non-existent 6.0.3 version.
