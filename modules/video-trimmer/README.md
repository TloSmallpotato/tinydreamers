
# VideoTrimmer Native Module

A native iOS module for trimming videos using AVFoundation.

## Features

- Trim videos to a specified time range (≤ 5 seconds)
- Export as high-quality MP4 files
- Preserve video and audio tracks
- Maintain video orientation
- Async/Promise-based API

## Installation

This module is automatically linked via Expo's autolinking. After adding the module, run:

```bash
npx expo prebuild --clean
```

## Usage

```typescript
import VideoTrimmer from '@/modules/video-trimmer';

const trimmedPath = await VideoTrimmer.trim(
  '/path/to/video.mp4',
  0,  // start time in seconds
  5   // end time in seconds
);

console.log('Trimmed video:', trimmedPath);
```

## API

### `trim(path: string, startTime: number, endTime: number): Promise<string>`

Trims a video and returns the path to the trimmed file.

**Parameters:**
- `path`: Local file path (without `file://` prefix)
- `startTime`: Start time in seconds
- `endTime`: End time in seconds (must be ≤ startTime + 5)

**Returns:**
- Promise that resolves with the path to the trimmed video

**Throws:**
- Error if the file doesn't exist
- Error if the time range is invalid
- Error if the export fails

## See Also

- [Full Documentation](../../docs/VIDEO_TRIMMER_NATIVE_MODULE.md)
- [useVideoTrimmer Hook](../../hooks/useVideoTrimmer.ts)
- [Example Component](../../components/VideoTrimmerExample.tsx)
