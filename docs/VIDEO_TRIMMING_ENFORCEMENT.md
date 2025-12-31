
# Video Trimming Enforcement Implementation

## Overview

This document describes the implementation of strict video trimming enforcement in the app. The implementation ensures that videos always respect their `trim_start` and `trim_end` metadata during playback, preventing users from seeing the full untrimmed video.

## Problem Statement

Previously, video previews were showing the entire clip instead of respecting the trim metadata stored in the database. This was caused by missing enforcement logic in the video player components.

## Solution: Hybrid Playback Mode

We implemented a "hybrid" approach where the full video file is stored, but playback is actively policed to respect trim boundaries. This approach is used by apps like Apple Photos and Instagram.

## Three Critical Enforcement Points

### 1️⃣ Force Seek to trimStart BEFORE Play

**Location**: Before calling `playAsync()`

**Logic**:
```typescript
// Before playing, check if position is within trim range
if (position < trimStart OR position >= trimEnd) {
  await setPositionAsync(trimStart * 1000);
}
await playAsync();
```

**Why**: If you call `playAsync()` while the position is at 0, the player will play from 0. We must seek to `trimStart` every time playback starts.

### 2️⃣ Hard-Stop Playback at trimEnd

**Location**: Inside `onPlaybackStatusUpdate` callback

**Logic**:
```typescript
if (status.isPlaying === true AND position >= trimEnd) {
  await pauseAsync();
  await setPositionAsync(trimStart * 1000);
  setIsPlaying(false);
}
```

**Why**: expo-av will not stop automatically. We must pause manually when playback reaches `trimEnd`. This makes the clip behave like it ends at `trimEnd`.

**Important**: We check `>= trimEnd` (not `===`) because `onPlaybackStatusUpdate`:
- Is async
- Fires ~every 250ms
- Is not guaranteed to catch the exact frame

### 3️⃣ Prevent Background Looping Past Trim Range

**Location**: Inside `onPlaybackStatusUpdate` callback and seek handlers

**Logic**:
```typescript
// If position goes outside trim range, snap it back
if (position < trimStart) {
  await setPositionAsync(trimStart * 1000);
} else if (position > trimEnd) {
  await setPositionAsync(trimStart * 1000);
}
```

**Why**: This prevents:
- Accidental full playback
- Timeline scrubbing past bounds
- Background looping beyond trim range

## Implementation Details

### Modified Components

#### 1. `FullScreenVideoPlayer.tsx`

**Changes**:
- Added `trimStart` and `trimEnd` props (optional, in seconds)
- Implemented all three enforcement points
- Disabled `isLooping` (set to `false`)
- Disabled `shouldPlay` (set to `false`) - we control playback manually
- Added comprehensive logging for debugging

**Key Features**:
- Auto-seeks to `trimStart` when video becomes visible
- Enforces trim boundaries during playback
- Prevents seeking outside trim range
- Resets to `trimStart` when reaching `trimEnd`

#### 2. `VideoPreviewModal.tsx`

**Changes**:
- Strengthened existing trim logic with all three enforcement points
- Added detailed logging for debugging
- Ensured `isLooping={false}` and `shouldPlay={false}`

#### 3. Profile Pages (`profile.tsx` and `profile.ios.tsx`)

**Changes**:
- Changed from storing `selectedVideoUri` to `selectedMoment` (full moment object)
- Pass `trim_start` and `trim_end` metadata to `FullScreenVideoPlayer`
- Added logging to show trim metadata when moment is pressed

#### 4. All Moments Pages (`all-moments.tsx` and `all-moments.ios.tsx`)

**Changes**:
- Changed from storing `selectedVideoUri` to `selectedMoment` (full moment object)
- Pass `trim_start` and `trim_end` metadata to `FullScreenVideoPlayer`
- Added logging to show trim metadata when moment is pressed

### Database Schema

The `moments` table includes:
- `trim_start` (number, optional): Start time in seconds
- `trim_end` (number, optional): End time in seconds

These values are stored when a video is trimmed in the `VideoPreviewModal` and passed through to the player.

## Expected Behavior

### What Users See

✅ **Correct Behavior**:
- Video starts at `trimStart`
- Video stops at `trimEnd`
- Pressing play after reaching end restarts from `trimStart`
- Video never shows content before `trimStart` or after `trimEnd`

❌ **Previous Incorrect Behavior**:
- Video started at 0:00
- Video played to the end of the full file
- Users could see untrimmed content

### UX Note

The timeline scrubber (if implemented) will still represent the full file. This is normal and expected in hybrid mode. What matters is:
- What plays
- What loops
- What users perceive

This is the same approach used by Apple Photos and Instagram.

## Testing Checklist

To verify the implementation works correctly, check that:

- [ ] Video never starts at 0 (unless `trimStart` is 0)
- [ ] Play always begins at `trimStart`
- [ ] Playback never crosses `trimEnd`
- [ ] Seeking snaps back into range
- [ ] Looping is disabled
- [ ] Pressing play after reaching end restarts from `trimStart`
- [ ] Trim metadata is logged when playing videos
- [ ] Videos without trim metadata play normally (full duration)

## Debugging

All enforcement points include console logging with the prefix:
- `[FullScreenVideoPlayer]` for the full-screen player
- `VideoPreviewModal:` for the preview/trimming modal

Look for these log messages:
- `⚠️` - Warning: Position outside trim range
- `🛑` - Hard stop at trim end
- `✓` - Successful operation

## Future Enhancements

Potential improvements:
1. Add visual trim indicators on the timeline
2. Implement scrubber with trim boundaries
3. Add trim duration display during playback
4. Show trim range in video thumbnail overlays

## References

- expo-av documentation: https://docs.expo.dev/versions/latest/sdk/av/
- Video component: https://docs.expo.dev/versions/latest/sdk/video/
- AVPlaybackStatus: https://docs.expo.dev/versions/latest/sdk/av/#avplaybackstatus
