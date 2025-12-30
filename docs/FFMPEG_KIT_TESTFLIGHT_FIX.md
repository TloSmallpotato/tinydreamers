
# FFmpeg Kit TestFlight Build Fix

## Problem

When building for TestFlight, you may encounter errors related to `ffmpeg-kit-react-native`:

### Error 1: npm/yarn/bun resolution error
```
error: No version matching "6.0.3" found for specifier "ffmpeg-kit-react-native" (but package exists)
error: ffmpeg-kit-react-native@6.0.3 failed to resolve
```

### Error 2: CocoaPods download error
```
[!] Error installing ffmpeg-kit-ios-https
[!] /usr/local/bin/curl -f -L -o /var/folders/.../file.zip 
https://github.com/arthenica/ffmpeg-kit/releases/download/v6.0/ffmpeg-kit-https-6.0-ios-xcframework.zip
curl: (56) The requested URL returned error: 404
```

## Root Cause

The `ffmpeg-kit-react-native` npm package version 6.0.2 has a podspec that references version 6.0 of the native iOS framework. However:

1. **Version 6.0.3 doesn't exist** - The latest stable version is 6.0.2
2. **Version 6.0 iOS framework doesn't exist** - The GitHub releases only have 6.0.2
3. The podspec needs to be patched to use the correct version

## Solution

This project now includes an **automatic fix** that patches the ffmpeg-kit-react-native podspec during installation.

### What's Been Fixed

1. **package.json** - Specifies version 6.0.2 with resolutions and overrides
2. **postinstall script** - Automatically patches the podspec after npm install
3. **iOS Podfile** - Forces the correct version for CocoaPods
4. **scripts/patch-ffmpeg-kit.js** - Patches all version references from 6.0 to 6.0.2

### How It Works

When you run `npm install` (or `yarn install` / `bun install`), the postinstall script automatically:

1. Locates the ffmpeg-kit-react-native podspec file
2. Replaces all references to version 6.0 with 6.0.2
3. Updates download URLs to point to the correct GitHub release

This ensures that when CocoaPods runs during the iOS build, it downloads the correct version (6.0.2) of the native framework.

## Manual Steps (If Needed)

If you're still experiencing issues, follow these steps:

### Step 1: Clean Everything

```bash
# Remove all build artifacts and dependencies
rm -rf node_modules package-lock.json yarn.lock bun.lockb
rm -rf ios/Pods ios/Podfile.lock ios/build

# Clear package manager cache
npm cache clean --force
# OR
yarn cache clean
# OR
bun pm cache rm
```

### Step 2: Reinstall Dependencies

```bash
# This will automatically run the postinstall script
npm install
# OR
yarn install
# OR
bun install
```

### Step 3: Verify the Patch

Check that the podspec was patched correctly:

```bash
grep "6.0.2" node_modules/ffmpeg-kit-react-native/ffmpeg-kit-react-native.podspec
```

You should see URLs like:
```
https://github.com/arthenica/ffmpeg-kit/releases/download/v6.0.2/ffmpeg-kit-https-6.0.2-ios-xcframework.zip
```

### Step 4: Prebuild iOS (if using expo prebuild)

```bash
npx expo prebuild -p ios --clean
```

### Step 5: Install Pods

```bash
cd ios
pod repo update
pod install
cd ..
```

### Step 6: Build for TestFlight

```bash
# Build with EAS (with cache cleared)
eas build --platform ios --profile production --clear-cache
```

## Verification Checklist

After rebuilding, verify that:

- [ ] **Dependency Installation Success:**
  ```
  ✓ Installing ffmpeg-kit-react-native@6.0.2
  ✓ Running postinstall script
  ✓ Successfully patched ffmpeg-kit-react-native.podspec
  ```

- [ ] **Pod Installation Success (iOS):**
  ```
  ✓ Installing ffmpeg-kit-ios-https (6.0.2)
  ```

- [ ] **Build Completion:**
  ```
  ✓ Build completed successfully
  ```

- [ ] **TestFlight Upload:**
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

## Technical Details

### Why Version 6.0.2?

- Version 6.0.2 is the latest stable release of `ffmpeg-kit-react-native`
- Version 6.0.3 does not exist in the npm registry
- Version 6.0 iOS framework does not exist on GitHub
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

FFmpeg Kit requires a custom development build (Expo Dev Client) and will not work with Expo Go:

```bash
# Create a development build
eas build --platform ios --profile development
```

## Troubleshooting

### Issue: Postinstall script didn't run

**Solution:**
```bash
# Manually run the patch script
node scripts/patch-ffmpeg-kit.js

# Then reinstall pods
cd ios && pod install && cd ..
```

### Issue: Still getting "6.0 not found" error

**Solution:**
1. Verify the patch was applied:
   ```bash
   cat node_modules/ffmpeg-kit-react-native/ffmpeg-kit-react-native.podspec | grep "6.0.2"
   ```
2. If not patched, run the script manually:
   ```bash
   node scripts/patch-ffmpeg-kit.js
   ```
3. Clear CocoaPods cache:
   ```bash
   cd ios
   pod cache clean --all
   pod repo update
   pod install
   cd ..
   ```

### Issue: No Lockfile Detected

If EAS Build shows "Did not detect any lock files":

**Solution:**
1. Generate a lockfile locally:
   ```bash
   npm install  # Creates package-lock.json
   ```
2. Commit the lockfile to your repository:
   ```bash
   git add package-lock.json
   git commit -m "Add package-lock.json for consistent builds"
   git push
   ```
3. Rebuild on EAS

### Issue: Pod Install Fails

**Solution:**
1. Check your Xcode version (should be 14.0 or later)
2. Update CocoaPods:
   ```bash
   sudo gem install cocoapods
   ```
3. Clear CocoaPods cache:
   ```bash
   pod cache clean --all
   ```
4. Run pod repo update:
   ```bash
   cd ios
   pod repo update
   pod install
   cd ..
   ```

### Issue: Build Succeeds but App Crashes

**Solution:**
1. Check that you're using Expo Dev Client (not Expo Go)
2. Verify that the FFmpeg commands in your code are correct
3. Check the device logs for FFmpeg-related errors
4. Ensure the video file paths are accessible

## Alternative Solutions

If the automatic patch doesn't work for your setup, consider these alternatives:

### Option A: Use expo-av for Basic Video Operations

If you only need basic video trimming without re-encoding, you can use `expo-av` with metadata-based trimming.

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

## Files Modified

This fix includes changes to the following files:

1. **package.json** - Added postinstall script and version constraints
2. **scripts/patch-ffmpeg-kit.js** - New script to patch the podspec
3. **ios/Podfile** - Force correct version in CocoaPods
4. **docs/FFMPEG_KIT_TESTFLIGHT_FIX.md** - This documentation

## References

- [FFmpeg Kit React Native GitHub](https://github.com/arthenica/ffmpeg-kit)
- [FFmpeg Kit Releases](https://github.com/arthenica/ffmpeg-kit/releases)
- [Expo Dev Client Documentation](https://docs.expo.dev/develop/development-builds/introduction/)
- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)

## Summary

The fix ensures all references to `ffmpeg-kit-react-native` point to version **6.0.2**:

✅ **npm package**: 6.0.2  
✅ **iOS native framework**: 6.0.2  
✅ **Download URLs**: v6.0.2  
✅ **Automatic patching**: Enabled via postinstall script

After running `npm install`, the postinstall script automatically patches the podspec to use the correct version. This ensures successful builds on EAS and TestFlight without manual intervention.
