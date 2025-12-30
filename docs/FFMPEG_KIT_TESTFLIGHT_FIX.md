
# FFmpeg Kit TestFlight Build Fix

## Problem

When building for TestFlight, you encountered a 404 error while installing `ffmpeg-kit-ios-https` v6.0:

```
[!] Error installing ffmpeg-kit-ios-https
curl: (56) The requested URL returned error: 404
https://github.com/arthenica/ffmpeg-kit/releases/download/v6.0/ffmpeg-kit-https-6.0-ios-xcframework.zip
```

## Root Cause

The `ffmpeg-kit-react-native` version 6.0.2 references iOS framework URLs that no longer exist on GitHub. The FFmpeg Kit project has updated their release structure, and version 6.0.3 contains the correct URLs.

## Solution

### Step 1: Update the Package Version

The `package.json` has been updated to use `ffmpeg-kit-react-native` version **6.0.3** instead of 6.0.2.

**Changed line:**
```json
"ffmpeg-kit-react-native": "6.0.3"
```

### Step 2: Clean and Reinstall Dependencies

Run the following commands in your project directory:

```bash
# Remove node_modules and package-lock.json
rm -rf node_modules package-lock.json

# Clear npm cache (optional but recommended)
npm cache clean --force

# Reinstall dependencies
npm install
```

### Step 3: Clean iOS Build

If you have an `ios` folder (from `expo prebuild`), you need to clean the iOS build:

```bash
# Remove the ios folder
rm -rf ios

# Remove Pods
cd ios 2>/dev/null && pod deintegrate && cd .. || true

# Regenerate the ios folder
npx expo prebuild -p ios --clean
```

### Step 4: Rebuild for TestFlight

Now you can rebuild your app for TestFlight:

```bash
# Build with EAS
eas build --platform ios --profile production
```

## Alternative Solution: Use a Different FFmpeg Package

If the above solution doesn't work, you can consider using an alternative approach:

### Option A: Use expo-av for Basic Video Operations

If you only need basic video trimming without re-encoding, you can use `expo-av` with metadata-based trimming (your original approach). This doesn't require FFmpeg.

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

1. **Pod Installation Success:**
   ```
   ✓ Installing ffmpeg-kit-ios-https (6.0.3)
   ```

2. **Build Completion:**
   ```
   ✓ Build completed successfully
   ```

3. **TestFlight Upload:**
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

### Why Version 6.0.3?

- Version 6.0.3 is the latest stable release of `ffmpeg-kit-react-native`
- It contains updated iOS framework URLs that work with the current GitHub release structure
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

### Issue: Still Getting 404 Error

**Solution:**
1. Make sure you've updated `package.json` to version 6.0.3
2. Delete `node_modules` and reinstall
3. Clear the EAS build cache: `eas build --platform ios --clear-cache`

### Issue: Pod Install Fails with Different Error

**Solution:**
1. Check your Xcode version (should be 14.0 or later)
2. Update CocoaPods: `sudo gem install cocoapods`
3. Clear CocoaPods cache: `pod cache clean --all`

### Issue: Build Succeeds but App Crashes

**Solution:**
1. Check that you're using Expo Dev Client (not Expo Go)
2. Verify that the FFmpeg commands in `utils/videoStorage.ts` are correct
3. Check the device logs for FFmpeg-related errors

## References

- [FFmpeg Kit React Native GitHub](https://github.com/arthenica/ffmpeg-kit)
- [FFmpeg Kit Releases](https://github.com/arthenica/ffmpeg-kit/releases)
- [Expo Dev Client Documentation](https://docs.expo.dev/develop/development-builds/introduction/)
- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)

## Summary

The fix is simple: update `ffmpeg-kit-react-native` from version 6.0.2 to 6.0.3. This version contains the correct iOS framework URLs and should resolve the 404 error during TestFlight builds.

After updating, clean your dependencies and rebuild for TestFlight. The build should complete successfully.
