
# Video Trimmer Quick Start Guide

This guide will help you quickly integrate the VideoTrimmer native module into your app.

## Step 1: Rebuild the Native Project

After the module files have been added, rebuild the native iOS project:

```bash
npx expo prebuild --clean
npx expo run:ios
```

## Step 2: Basic Implementation

### Option A: Using the Hook (Recommended)

```typescript
import { useVideoTrimmer } from '@/hooks/useVideoTrimmer';
import { Button, ActivityIndicator, Text } from 'react-native';

function MyScreen() {
  const { status, trimmedPath, error, trimVideo } = useVideoTrimmer();

  const handleTrim = async () => {
    const result = await trimVideo(
      'file:///path/to/video.mp4',
      0,    // start at 0 seconds
      5     // end at 5 seconds
    );
    
    if (result) {
      console.log('Success! Trimmed video:', result);
      // Upload or save the trimmed video
    }
  };

  return (
    <>
      <Button title="Trim Video" onPress={handleTrim} />
      {status === 'trimming' && <ActivityIndicator />}
      {status === 'success' && <Text>Done: {trimmedPath}</Text>}
      {status === 'error' && <Text>Error: {error}</Text>}
    </>
  );
}
```

### Option B: Direct API Usage

```typescript
import VideoTrimmer from '@/modules/video-trimmer';

async function trimMyVideo() {
  try {
    const videoUri = 'file:///path/to/video.mp4';
    
    // Trim the first 5 seconds
    const trimmedPath = await VideoTrimmer.trim(videoUri, 0, 5);
    
    console.log('Trimmed video saved to:', trimmedPath);
    return trimmedPath;
  } catch (error) {
    console.error('Trim failed:', error);
    return null;
  }
}
```

## Step 3: Integration with Video Picker

```typescript
import { useVideoTrimmer } from '@/hooks/useVideoTrimmer';
import * as ImagePicker from 'expo-image-picker';

function VideoPickerScreen() {
  const { trimVideo } = useVideoTrimmer();

  const pickAndTrim = async () => {
    // Pick video
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      allowsEditing: false,
      quality: 1,
    });

    if (!result.canceled && result.assets[0]) {
      // Trim video
      const trimmedPath = await trimVideo(
        result.assets[0].uri,
        0,
        5
      );
      
      if (trimmedPath) {
        // Upload to Supabase or save locally
        await uploadVideo(trimmedPath);
      }
    }
  };

  return <Button title="Pick & Trim Video" onPress={pickAndTrim} />;
}
```

## Step 4: Upload Trimmed Video

```typescript
import { supabase } from '@/app/integrations/supabase/client';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';

async function uploadVideo(trimmedPath: string) {
  try {
    // Read file as base64
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
    
    console.log('Uploaded:', data.path);
    return data.path;
  } catch (error) {
    console.error('Upload failed:', error);
    return null;
  }
}
```

## Common Use Cases

### 1. Trim with Custom Time Range

```typescript
const { trimVideo } = useVideoTrimmer();

// Trim from 2.5s to 7.5s (5 second duration)
const result = await trimVideo(videoUri, 2.5, 7.5);
```

### 2. Trim with User-Selected Range

```typescript
function TrimUI({ videoUri }) {
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(5);
  const { trimVideo } = useVideoTrimmer();

  const handleTrim = async () => {
    const result = await trimVideo(videoUri, startTime, endTime);
    // Handle result
  };

  return (
    <View>
      <Slider value={startTime} onValueChange={setStartTime} />
      <Slider value={endTime} onValueChange={setEndTime} />
      <Button title="Trim" onPress={handleTrim} />
    </View>
  );
}
```

### 3. Trim Multiple Clips

```typescript
async function trimMultipleClips(clips) {
  const trimmedPaths = [];
  
  for (const clip of clips) {
    const result = await VideoTrimmer.trim(
      clip.uri,
      clip.start,
      clip.end
    );
    
    if (result) {
      trimmedPaths.push(result);
    }
  }
  
  return trimmedPaths;
}
```

## Important Notes

1. **File URI Format**: Always remove the `file://` prefix before passing to the trim function. The module handles this automatically, but it's good practice.

2. **Duration Limit**: The maximum trim duration is 5 seconds. This is enforced by the module.

3. **Temporary Files**: Trimmed videos are saved to the iOS temporary directory. Upload or move them to permanent storage if needed.

4. **Error Handling**: Always wrap trim operations in try-catch blocks or check the error state when using the hook.

5. **Performance**: Trimming is performed on a background thread, but larger videos may take a few seconds to process.

## Troubleshooting

### "Module not found"
Run `npx expo prebuild --clean` and rebuild the app.

### "Video file not found"
Make sure the file path is correct and the file exists.

### "Export failed"
Check console logs for detailed error messages. Common causes:
- Invalid time range
- Insufficient disk space
- Corrupted video file

## Next Steps

- Read the [full documentation](./VIDEO_TRIMMER_NATIVE_MODULE.md)
- Check out the [example component](../components/VideoTrimmerExample.tsx)
- Explore the [useVideoTrimmer hook](../hooks/useVideoTrimmer.ts)

## Support

For issues or questions, check the console logs for detailed error messages. The module logs all operations with the `[VideoTrimmer]` prefix.
