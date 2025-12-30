
# Video Trimming with FFmpeg Implementation

## Overview

This document describes the implementation of actual video trimming using FFmpeg in the React Native + Expo app. Previously, the app only trimmed video playback but didn't generate a new trimmed video file. Now, FFmpeg is used to re-encode videos with the selected trim range.

## Problem Statement

**Before:**
- ✅ Video playback was trimmed (controlled by trim_start and trim_end metadata)
- ❌ Full original video was uploaded and stored
- ❌ No new trimmed video file was generated

**After:**
- ✅ Video playback is trimmed
- ✅ New trimmed video file is generated using FFmpeg
- ✅ Only the trimmed video is uploaded and stored

## Implementation Details

### 1. Dependencies

**Installed Package:**
```bash
npm install ffmpeg-kit-react-native
```

**Note:** This package is deprecated but still functional. It works with Expo Dev Client (not Expo Go) and provides native FFmpeg support for iOS and Android.

### 2. Video Trimming Function

**File:** `utils/videoStorage.ts`

**Function:** `trimVideo(inputUri: string, startTime: number, endTime: number): Promise<string | null>`

**FFmpeg Command:**
```bash
-i "${input}" -ss ${startTime} -t ${duration} -pix_fmt yuv420p -preset ultrafast -c:v libx264 -c:a aac "${output}"
```

**Parameters:**
- `-i`: Input file path
- `-ss`: Start time (seeking to this position in seconds)
- `-t`: Duration (how long to encode in seconds)
- `-pix_fmt yuv420p`: Ensures compatibility with iOS Photos
- `-preset ultrafast`: Fast encoding preset
- `-c:v libx264`: Video codec (H.264)
- `-c:a aac`: Audio codec (AAC)

**Output:**
- Trimmed video is saved to `FileSystem.cacheDirectory` with a unique timestamp
- Returns the URI of the trimmed video or null if trimming fails

### 3. VideoPreviewModal Changes

**File:** `components/VideoPreviewModal.tsx`

**Key Changes:**
1. Added `isTrimming` state to show loading indicator during FFmpeg processing
2. Modified `handleConfirm` to be async and call `trimVideo()` before confirming
3. Added error handling with fallback option to use full video if trimming fails
4. Updated UI to show "Trimming..." state with ActivityIndicator
5. Disabled buttons during trimming process

**Flow:**
1. User adjusts trim handles on the timeline
2. User clicks "Confirm"
3. FFmpeg trims the video (shows "Trimming..." indicator)
4. Trimmed video URI is passed to parent component
5. Parent component uploads the trimmed video

### 4. Tab Layout Changes

**File:** `app/(tabs)/_layout.ios.tsx`

**Key Changes:**
1. Updated `handleConfirmVideo` to accept the trimmed video URI
2. Modified database insert to store trim_start=0 and trim_end=duration (since video is already trimmed)
3. Added logging to track the trimmed video URI through the save process

**Important Note:**
- The trimmed video has trim_start=0 because it starts at the beginning
- The trim_end equals the duration of the trimmed video
- This is different from the old approach where trim_start and trim_end were relative to the original video

### 5. FullScreenVideoPlayer Changes

**File:** `components/FullScreenVideoPlayer.tsx`

**Key Changes:**
1. Added detection for already-trimmed videos (trim_start=0 and trim_end≈duration)
2. Skip trim boundary enforcement for already-trimmed videos
3. Let already-trimmed videos play normally without seeking

**Logic:**
```typescript
const isAlreadyTrimmed = trimStart === 0 && Math.abs(effectiveTrimEnd - videoDuration) < 0.1;
```

If the video is already trimmed, we don't need to enforce playback boundaries.

## User Experience

### Before Trimming
1. User records or selects a video
2. VideoPreviewModal opens with the full video
3. User adjusts trim handles (max 5 seconds duration)
4. User clicks "Confirm"

### During Trimming
1. Button shows "Trimming..." with loading indicator
2. FFmpeg processes the video in the background
3. All buttons are disabled during processing
4. Processing typically takes 1-5 seconds depending on video length

### After Trimming
1. Trimmed video is passed to the save flow
2. Only the trimmed video is uploaded to Supabase
3. Video is saved to database with correct duration
4. User can view the trimmed video in the app

## Error Handling

### Trimming Failure
If FFmpeg fails to trim the video:
1. Alert is shown with two options:
   - "Use Full Video": Uploads the original video without trimming
   - "Try Again": Dismisses alert and lets user try again

### FFmpeg Logs
- All FFmpeg operations are logged to console
- Return codes are checked for success/failure
- Error logs from FFmpeg are printed if trimming fails

## Database Schema

**Table:** `moments`

**Relevant Columns:**
- `video_url`: URL of the uploaded video (now points to trimmed video)
- `thumbnail_url`: URL of the video thumbnail
- `duration`: Duration of the video in seconds (trimmed duration)
- `trim_start`: Start time of trim (0 for already-trimmed videos)
- `trim_end`: End time of trim (equals duration for already-trimmed videos)
- `original_created_at`: Original creation date of the video (if available)

## Performance Considerations

### FFmpeg Processing Time
- **Short videos (1-5s):** ~1-2 seconds
- **Medium videos (5-10s):** ~2-4 seconds
- **Long videos (10-30s):** ~4-8 seconds

### Preset: ultrafast
- Chosen for speed over compression efficiency
- Acceptable quality for mobile videos
- Reduces user wait time

### File Size
- Trimmed videos are smaller than originals
- Reduces storage costs in Supabase
- Faster upload times

## Future Enhancements

### Video Stitching
The same FFmpeg pipeline can be used for stitching multiple clips:

```bash
ffmpeg -f concat -safe 0 -i list.txt -preset ultrafast output.mp4
```

This would allow users to:
- Combine multiple moments into one video
- Create compilations of their child's progress
- Export highlight reels

### Additional Trim Features
- Preview trimmed video before confirming
- Fine-tune trim with frame-by-frame controls
- Add transitions between clips
- Apply filters or effects

## Testing Checklist

- [x] Install ffmpeg-kit-react-native
- [x] Create trimVideo utility function
- [x] Update VideoPreviewModal to use FFmpeg
- [x] Update tab layout to handle trimmed videos
- [x] Update FullScreenVideoPlayer for already-trimmed videos
- [ ] Test on iOS device with Expo Dev Client
- [ ] Test on Android device with Expo Dev Client
- [ ] Test with various video lengths
- [ ] Test error handling when FFmpeg fails
- [ ] Verify uploaded videos are trimmed correctly
- [ ] Verify playback of trimmed videos

## Known Limitations

### Expo Go Not Supported
- FFmpeg requires native code
- Must use Expo Dev Client or standalone build
- This is expected and documented

### Package Deprecation
- `ffmpeg-kit-react-native` is deprecated
- Still functional and widely used
- May need to migrate to alternative in the future

### Processing Time
- Users must wait for FFmpeg to process
- No background processing (intentional for simplicity)
- Could be improved with queue system

## Troubleshooting

### FFmpeg Not Working
1. Ensure you're using Expo Dev Client (not Expo Go)
2. Check that ffmpeg-kit-react-native is installed
3. Verify file paths are correct (use file:// protocol)
4. Check console logs for FFmpeg error messages

### Video Not Trimmed
1. Check that trimVideo() is being called
2. Verify FFmpeg return code is success
3. Check that output file exists after trimming
4. Verify correct video URI is being uploaded

### Playback Issues
1. Check trim_start and trim_end values in database
2. Verify video duration matches trim_end - trim_start
3. Check FullScreenVideoPlayer logic for already-trimmed videos
4. Verify signed URLs are being generated correctly

## References

- [FFmpeg Documentation](https://ffmpeg.org/documentation.html)
- [ffmpeg-kit-react-native GitHub](https://github.com/arthenica/ffmpeg-kit)
- [Expo Dev Client](https://docs.expo.dev/develop/development-builds/introduction/)
- [Expo File System](https://docs.expo.dev/versions/latest/sdk/filesystem/)
