
# Video Preview Troubleshooting Guide

## Common Issues and Solutions

### 1. ERR_NGROK_3004 - Ngrok Gateway Error

**Symptoms:**
- Video preview not loading
- Ngrok gateway error in console
- "Server returned an invalid or incomplete HTTP response"

**Root Causes:**
- Ngrok tunnel timeout when serving large video files
- Local file URIs not properly accessible through ngrok
- Network connectivity issues
- Expo dev server not responding

**Solutions:**

#### Solution 1: Restart Development Server
```bash
# Stop the current server (Ctrl+C)
# Clear cache and restart with tunnel
npm run dev
```

#### Solution 2: Check Video File URI
- Ensure video URI is a valid local file path
- On iOS: Should start with `file://`
- On Android: Should be a valid content URI or file path
- Check console logs for the actual URI being used

#### Solution 3: Network Issues
- Check your internet connection
- Verify ngrok service is running: https://status.ngrok.com
- Try switching networks (WiFi to mobile data or vice versa)
- Restart your router if on WiFi

#### Solution 4: Use Local Network Instead of Tunnel
If ngrok continues to have issues, you can use local network mode:
```bash
# In package.json, change the dev script to:
"dev": "EXPO_NO_TELEMETRY=1 expo start --clear"
# This uses LAN instead of tunnel
```

### 2. Video Preview Not Loading

**Symptoms:**
- Black screen in video preview
- Loading indicator stuck
- "Unable to load video" error

**Solutions:**

#### Check Video File
- Verify the video file exists at the specified URI
- Check file permissions
- Ensure video format is supported (MP4 recommended)
- Check video file size (very large files may timeout)

#### Platform-Specific Issues

**iOS:**
- Ensure camera permissions are granted
- Check Info.plist has camera/microphone usage descriptions
- Verify video URI starts with `file://`

**Android:**
- Check storage permissions
- Verify video URI format is correct
- Clear app cache and restart

### 3. Video Playback Issues

**Symptoms:**
- Video loads but won't play
- Playback stutters or freezes
- Audio/video out of sync

**Solutions:**

#### Check Video Encoding
- Use H.264 codec for maximum compatibility
- Keep bitrate reasonable (< 10 Mbps)
- Use AAC audio codec
- Resolution should be 1080p or lower

#### Memory Issues
- Close other apps to free memory
- Restart the app
- Clear app cache

### 4. Thumbnail Generation Fails

**Symptoms:**
- No thumbnail shown in grid
- "Thumbnail generation failed" in console
- Thumbnails show frame 0 instead of trimStart

**Solutions:**

#### Verify Video File
- Ensure video file is accessible
- Check video duration is valid
- Verify trimStart time is within video duration

#### Check Logs
Look for these log messages:
```
[Thumbnail] Starting thumbnail generation
[Thumbnail] Extracting frame at: X seconds
[Thumbnail] Thumbnail generated successfully
```

If you see errors, check:
- Video file format
- File permissions
- Available storage space

### 5. Toast Notification Crashes

**Symptoms:**
- App crashes when touching toast
- Toast doesn't dismiss on swipe
- Success toast not showing

**Solutions:**

#### Check Reanimated Setup
Ensure react-native-reanimated is properly configured:
- Check babel.config.js includes reanimated plugin
- Restart Metro bundler after config changes
- Clear cache: `expo start --clear`

#### Gesture Handler Issues
- Ensure react-native-gesture-handler is installed
- Check it's imported at the top of your entry file
- Verify gesture handler is wrapped around app root

## Debugging Tips

### Enable Verbose Logging
Add these console logs to track video loading:

```typescript
// In VideoPreviewModal.tsx
console.log('[VideoPreviewModal] Video URI:', videoUri);
console.log('[VideoPreviewModal] Platform:', Platform.OS);
console.log('[VideoPreviewModal] Video loaded:', isVideoLoaded);
console.log('[VideoPreviewModal] Video error:', videoLoadError);
```

### Check Network Requests
- Open Chrome DevTools (for web)
- Check Network tab for failed requests
- Look for 502/504 gateway errors
- Check request timing (timeouts)

### Test on Different Devices
- Try on physical device vs simulator
- Test on different iOS/Android versions
- Compare WiFi vs mobile data

### Check Expo Version
Ensure you're using compatible versions:
```json
{
  "expo": "~54.0.1",
  "expo-av": "^16.0.7",
  "expo-video-thumbnails": "^10.0.7"
}
```

## Prevention

### Best Practices

1. **Always validate video URIs before use**
2. **Add retry logic for thumbnail generation**
3. **Show loading states to users**
4. **Provide clear error messages**
5. **Test on multiple devices/platforms**
6. **Keep video files under 100MB**
7. **Use proper video encoding (H.264/AAC)**

### Error Handling Pattern

```typescript
try {
  // Video operation
  const result = await someVideoOperation();
  
  if (!result) {
    // Show user-friendly error
    Alert.alert('Error', 'Operation failed. Please try again.');
    return;
  }
  
  // Success
  console.log('Success:', result);
  
} catch (error) {
  console.error('Error:', error);
  
  // Show retry option
  Alert.alert(
    'Error',
    'Something went wrong. Would you like to retry?',
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Retry', onPress: () => retryOperation() }
    ]
  );
}
```

## Getting Help

If issues persist:

1. Check console logs for detailed error messages
2. Test with a simple, small video file
3. Try on a different device
4. Check Expo forums for similar issues
5. Verify all dependencies are up to date

## Related Documentation

- [Video Optimization Guide](./VIDEO_OPTIMIZATION.md)
- [Video Trimmer Implementation](./VIDEO_TRIMMER_IMPLEMENTATION_SUMMARY.md)
- [Thumbnail Generation Fix](./VIDEO_THUMBNAIL_FIX.md)
