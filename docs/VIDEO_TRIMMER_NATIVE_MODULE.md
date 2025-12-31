
# Video Trimmer Native Module

## Overview

The VideoTrimmer native module provides high-performance video trimming functionality using native iOS APIs (AVFoundation). It allows you to export trimmed video segments (≤ 5 seconds) as new MP4 files, which can be used for uploading, saving, or stitching multiple clips together.

## Features

- ✅ Native iOS implementation using AVFoundation
- ✅ Exports trimmed videos as high-quality MP4 files
- ✅ Preserves video and audio tracks
- ✅ Maintains video orientation and transformations
- ✅ Async/Promise-based API
- ✅ TypeScript support
- ✅ Maximum 5-second trim duration (configurable)
- ✅ Automatic file management (temp directory)

## Architecture

### Native Layer (Swift)

**File**: `modules/video-trimmer/ios/VideoTrimmerModule.swift`

The native module uses:
- `AVAsset` to load the video
- `AVMutableComposition` to create a new composition
- `CMTimeRange` to define the trim range
- `AVAssetExportSession` to export the trimmed video

### JavaScript Layer

**Files**:
- `modules/video-trimmer/index.ts` - Main API
- `modules/video-trimmer/src/VideoTrimmerModule.ts` - Native module bridge
- `hooks/useVideoTrimmer.ts` - React hook for easy usage

## Installation

The module is automatically linked via Expo's autolinking. After adding the files, run:

```bash
npx expo prebuild --clean
```

This will generate the native iOS project with the VideoTrimmer module integrated.

## Usage

### Basic Usage

```typescript
import VideoTrimmer from '@/modules/video-trimmer';

// Trim a video
const videoUri = 'file:///path/to/video.mp4';
const trimmedPath = await VideoTrimmer.trim(videoUri, 0, 5);

console.log('Trimmed video saved to:', trimmedPath);
```

### Using the Hook

```typescript
import { useVideoTrimmer } from '@/hooks/useVideoTrimmer';

function MyComponent() {
  const { status, trimmedPath, error, trimVideo, reset } = useVideoTrimmer();

  const handleTrim = async () => {
    const result = await trimVideo('file:///path/to/video.mp4', 0, 5);
    
    if (result) {
      // Upload or save the trimmed video
      console.log('Success:', result);
    } else {
      console.error('Error:', error);
    }
  };

  return (
    <View>
      <Button title="Trim Video" onPress={handleTrim} />
      {status === 'trimming' && <ActivityIndicator />}
      {status === 'success' && <Text>Trimmed: {trimmedPath}</Text>}
      {status === 'error' && <Text>Error: {error}</Text>}
    </View>
  );
}
```

### Complete Example with Video Picker

```typescript
import { useVideoTrimmer } from '@/hooks/useVideoTrimmer';
import * as ImagePicker from 'expo-image-picker';

function VideoTrimScreen() {
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const { trimVideo } = useVideoTrimmer();

  const pickAndTrimVideo = async () => {
    // 1. Pick a video
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      allowsEditing: false,
      quality: 1,
    });

    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      
      // 2. Trim the video (first 5 seconds)
      const trimmedPath = await trimVideo(uri, 0, 5);
      
      if (trimmedPath) {
        // 3. Upload to Supabase
        await uploadToSupabase(trimmedPath);
      }
    }
  };

  return (
    <Button title="Pick & Trim Video" onPress={pickAndTrimVideo} />
  );
}
```

## API Reference

### `VideoTrimmer.trim(path, startTime, endTime)`

Trims a video to the specified time range and exports it as a new MP4 file.

**Parameters:**
- `path` (string): Local file path to the video (without `file://` prefix)
- `startTime` (number): Start time in seconds
- `endTime` (number): End time in seconds

**Returns:**
- `Promise<string>`: Path to the trimmed video file

**Throws:**
- Error if the video file doesn't exist
- Error if the time range is invalid
- Error if the duration exceeds 5 seconds
- Error if the export fails

**Example:**
```typescript
const trimmedPath = await VideoTrimmer.trim(
  '/var/mobile/Containers/Data/video.mp4',
  2.5,
  7.5
);
```

### `useVideoTrimmer()` Hook

React hook that provides state management for video trimming operations.

**Returns:**
```typescript
{
  status: 'idle' | 'trimming' | 'success' | 'error';
  trimmedPath: string | null;
  error: string | null;
  trimVideo: (videoUri: string, startTime: number, endTime: number) => Promise<string | null>;
  reset: () => void;
}
```

## Integration with Your App

### 1. Trim UI Integration

If you have a trim UI with sliders for start/end times:

```typescript
function TrimUI({ videoUri, onTrimComplete }) {
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(5);
  const { trimVideo } = useVideoTrimmer();

  const handleConfirm = async () => {
    const result = await trimVideo(videoUri, trimStart, trimEnd);
    if (result) {
      onTrimComplete(result);
    }
  };

  return (
    <View>
      <Slider value={trimStart} onValueChange={setTrimStart} />
      <Slider value={trimEnd} onValueChange={setTrimEnd} />
      <Button title="Trim" onPress={handleConfirm} />
    </View>
  );
}
```

### 2. Upload Trimmed Video

```typescript
import { supabase } from '@/app/integrations/supabase/client';
import * as FileSystem from 'expo-file-system/legacy';

async function uploadTrimmedVideo(trimmedPath: string) {
  // Read the file
  const fileData = await FileSystem.readAsStringAsync(trimmedPath, {
    encoding: FileSystem.EncodingType.Base64,
  });

  // Upload to Supabase
  const fileName = `${Date.now()}.mp4`;
  const { data, error } = await supabase.storage
    .from('video-moments')
    .upload(fileName, decode(fileData), {
      contentType: 'video/mp4',
    });

  if (error) throw error;
  return data.path;
}
```

### 3. Stitch Multiple Clips

For stitching multiple trimmed clips together, you can:

1. Trim each clip individually using the VideoTrimmer
2. Store the trimmed file paths
3. Use a video stitching library or create another native module to combine them

```typescript
const clips = [];

// Trim multiple segments
for (const segment of segments) {
  const trimmedPath = await VideoTrimmer.trim(
    segment.videoUri,
    segment.start,
    segment.end
  );
  clips.push(trimmedPath);
}

// Now stitch the clips together (requires additional implementation)
const finalVideo = await stitchClips(clips);
```

## Technical Details

### Video Processing

1. **Asset Loading**: The video is loaded using `AVAsset` from the file URL
2. **Composition Creation**: An `AVMutableComposition` is created to hold the trimmed content
3. **Track Extraction**: Video and audio tracks are extracted from the original asset
4. **Time Range Definition**: A `CMTimeRange` is created with the specified start time and duration
5. **Track Insertion**: The selected time range is inserted into the composition at time zero
6. **Export**: The composition is exported using `AVAssetExportSession` with highest quality preset

### File Management

- Trimmed videos are saved to the iOS temporary directory
- File names are generated using UUIDs to avoid conflicts
- The temporary directory is automatically cleaned by iOS when space is needed
- For permanent storage, copy the file to a persistent location or upload it

### Performance

- Trimming is performed on a background thread to avoid blocking the UI
- Export uses the highest quality preset for best output
- The module is optimized for clips ≤ 5 seconds
- Larger clips may take longer to process

## Troubleshooting

### Module Not Found

If you get "VideoTrimmer module not found":

1. Run `npx expo prebuild --clean`
2. Rebuild the iOS app
3. Make sure the module files are in the correct location

### Export Failed

If the export fails:

1. Check that the video file exists at the specified path
2. Verify the time range is valid (end > start, duration ≤ 5s)
3. Ensure there's enough disk space for the output file
4. Check the console logs for detailed error messages

### File Not Found

If you get "Video file not found":

1. Make sure to remove the `file://` prefix from the URI
2. Verify the file path is correct
3. Check file permissions

## Future Enhancements

Potential improvements for the module:

- [ ] Android implementation using MediaCodec
- [ ] Custom quality presets (low, medium, high)
- [ ] Progress callbacks during export
- [ ] Video stitching functionality
- [ ] Custom output directory
- [ ] Video metadata preservation
- [ ] Thumbnail generation
- [ ] Video compression options

## License

This module is part of the TinyDreamers app and follows the same license.
