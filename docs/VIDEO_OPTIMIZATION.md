
# Video Optimization Implementation

## Overview
This document describes the video recording and optimization features implemented in the app, including current capabilities and recommendations for future server-side processing.

## Current Implementation

### 1. Recording Duration Limit ✅
- **Maximum duration**: 5 seconds
- **Implementation**: Set via `MAX_RECORDING_DURATION` constant in `_layout.tsx` and `_layout.ios.tsx`
- **Auto-stop**: Recording automatically stops when reaching the 5-second limit
- **UI feedback**: Real-time countdown timer showing elapsed time and maximum duration

### 2. Video Trimming ✅
- **User interface**: Custom trim controls in `VideoPreviewModal.tsx`
- **Precision**: 0.1-second increments for fine-grained control
- **Controls**: 
  - Adjust start time: -0.5s, -0.1s, +0.1s, +0.5s buttons
  - Adjust end time: -0.5s, -0.1s, +0.1s, +0.5s buttons
- **Preview**: Video playback respects trim boundaries
- **Storage**: Trim times stored in database (`trim_start`, `trim_end` columns in `moments` table)

### 3. Database Schema
```sql
-- moments table includes:
- video_url: Full video URL in Supabase Storage
- thumbnail_url: Video thumbnail URL
- duration: Trimmed duration in seconds
- trim_start: Start time for playback (seconds)
- trim_end: End time for playback (seconds)
```

## Video Encoding Limitations

### Native Camera API Constraints
React Native's Expo Camera API uses the device's native camera implementation, which means:

- **Codec**: Automatically uses H.264 (iOS) or H.264/H.265 (Android) based on device capabilities
- **Bitrate**: Controlled by the native camera, not directly configurable
- **CRF**: Not accessible through React Native/Expo APIs
- **Audio codec**: Automatically uses AAC on both platforms

### Current Quality Settings
The app records at the device's default quality settings, which typically include:
- **iOS**: H.264 with AAC audio, adaptive bitrate based on device capabilities
- **Android**: H.264/H.265 with AAC audio, adaptive bitrate based on device capabilities

## Recommended Server-Side Processing

To achieve the requested video optimization specifications, server-side processing is required. Here's the recommended approach:

### 1. Video Processing Pipeline

Create a Supabase Edge Function or external service to:

1. **Download** the uploaded video from Supabase Storage
2. **Trim** the video based on `trim_start` and `trim_end` values
3. **Re-encode** with optimal settings:
   ```
   - Codec: H.264
   - CRF: 18-22 (balance quality/size)
   - Bitrate: 
     * High-motion: ≥5 Mbps for 1080p, ≥3 Mbps for 720p
     * Talking-head: ≥3 Mbps for 1080p, ≥2 Mbps for 720p
   - Audio: AAC 128-160 kbps
   - Resolution: Prefer 720p at higher bitrate over 1080p at low bitrate
   ```
4. **Generate HLS variants** for adaptive streaming:
   ```
   - 1080p @ 5 Mbps (high quality)
   - 720p @ 3 Mbps (medium quality)
   - 480p @ 1.5 Mbps (low quality)
   - Create m3u8 manifest file
   ```
5. **Upload** processed files back to Supabase Storage
6. **Update** database with new URLs

### 2. Implementation Options

#### Option A: Supabase Edge Function with FFmpeg
```typescript
// supabase/functions/process-video/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  const { videoUrl, trimStart, trimEnd, momentId } = await req.json()
  
  // 1. Download video
  // 2. Use FFmpeg WASM or call external service
  // 3. Trim and re-encode with optimal settings
  // 4. Generate HLS variants
  // 5. Upload processed files
  // 6. Update database
  
  return new Response(JSON.stringify({ success: true }))
})
```

#### Option B: External Processing Service
- Use services like **Mux**, **Cloudflare Stream**, or **AWS MediaConvert**
- These handle encoding, HLS generation, and CDN delivery automatically
- More expensive but less maintenance

#### Option C: Background Worker
- Set up a separate server with FFmpeg
- Use a job queue (e.g., BullMQ, Celery)
- Process videos asynchronously
- Most control but requires infrastructure management

### 3. FFmpeg Command Example

For server-side processing, use FFmpeg with these settings:

```bash
# Trim and re-encode with optimal settings
ffmpeg -i input.mp4 \
  -ss {trim_start} \
  -to {trim_end} \
  -c:v libx264 \
  -crf 20 \
  -preset medium \
  -profile:v high \
  -level 4.0 \
  -movflags +faststart \
  -c:a aac \
  -b:a 128k \
  -ar 44100 \
  output.mp4

# Generate HLS variants
ffmpeg -i output.mp4 \
  -filter_complex \
  "[0:v]split=3[v1][v2][v3]; \
   [v1]scale=w=1920:h=1080[v1out]; \
   [v2]scale=w=1280:h=720[v2out]; \
   [v3]scale=w=854:h=480[v3out]" \
  -map "[v1out]" -c:v:0 libx264 -b:v:0 5M -maxrate:v:0 5M -bufsize:v:0 10M \
  -map "[v2out]" -c:v:1 libx264 -b:v:1 3M -maxrate:v:1 3M -bufsize:v:1 6M \
  -map "[v3out]" -c:v:2 libx264 -b:v:2 1.5M -maxrate:v:2 1.5M -bufsize:v:2 3M \
  -map a:0 -c:a:0 aac -b:a:0 128k \
  -map a:0 -c:a:1 aac -b:a:1 128k \
  -map a:0 -c:a:2 aac -b:a:2 96k \
  -f hls \
  -hls_time 4 \
  -hls_playlist_type vod \
  -hls_segment_filename "segment_%v_%03d.ts" \
  -master_pl_name master.m3u8 \
  stream_%v.m3u8
```

## Video Playback

### Current Implementation
- Uses `expo-av` Video component
- Plays full video from Supabase Storage
- Respects trim boundaries via playback controls

### Future: HLS Adaptive Playback
Once server-side processing is implemented:

```typescript
// Update video player to use HLS
<Video
  source={{ uri: hlsMasterPlaylistUrl }}
  useNativeControls
  resizeMode={ResizeMode.CONTAIN}
  shouldPlay
/>
```

The native video player will automatically:
- Select appropriate quality based on bandwidth
- Switch between qualities during playback
- Provide smooth streaming experience

## Performance Considerations

### Current Approach
- ✅ Videos limited to 5 seconds (small file sizes)
- ✅ Direct upload to Supabase Storage (fast)
- ✅ Trim metadata stored (no re-encoding needed immediately)
- ⚠️ No quality optimization (uses device defaults)
- ⚠️ No adaptive streaming (single quality)

### With Server-Side Processing
- ✅ Optimal encoding settings (better quality/size ratio)
- ✅ Multiple quality variants (adaptive streaming)
- ✅ Better compression (smaller files)
- ⚠️ Processing delay (async operation)
- ⚠️ Additional storage costs (multiple variants)
- ⚠️ Processing costs (compute time)

## Cost Estimation

### Storage Costs (Supabase)
- Original video (5s @ device quality): ~2-5 MB
- With HLS variants: ~8-15 MB total
- Thumbnail: ~50-100 KB

### Processing Costs
- **Mux**: ~$0.005 per minute of video processed
- **Cloudflare Stream**: $1 per 1000 minutes stored + $1 per 1000 minutes delivered
- **AWS MediaConvert**: ~$0.015 per minute of video processed
- **Self-hosted FFmpeg**: Server costs only

## Implementation Roadmap

### Phase 1: Current (Completed) ✅
- [x] 5-second recording limit
- [x] Video trimming UI
- [x] Trim metadata storage
- [x] Basic video playback

### Phase 2: Server-Side Processing (Recommended)
- [ ] Set up video processing pipeline
- [ ] Implement FFmpeg encoding with optimal settings
- [ ] Generate HLS variants
- [ ] Update video player for HLS playback
- [ ] Add processing status indicators

### Phase 3: Advanced Features (Optional)
- [ ] Video filters and effects
- [ ] Multiple camera angles
- [ ] Picture-in-picture mode
- [ ] Offline video caching
- [ ] Video analytics (watch time, completion rate)

## Testing Recommendations

### Video Quality Testing
1. Record videos with different content types:
   - High-motion (child running, playing)
   - Low-motion (reading, talking)
   - Mixed lighting conditions

2. Compare file sizes and quality:
   - Before processing
   - After processing with different CRF values
   - Different resolution/bitrate combinations

3. Test playback on different devices:
   - Various network speeds
   - Different screen sizes
   - iOS vs Android

### Performance Testing
1. Upload speed with different file sizes
2. Processing time for different video lengths
3. Playback startup time
4. Bandwidth usage during playback

## References

- [FFmpeg H.264 Encoding Guide](https://trac.ffmpeg.org/wiki/Encode/H.264)
- [HLS Authoring Specification](https://developer.apple.com/documentation/http_live_streaming/hls_authoring_specification_for_apple_devices)
- [Expo AV Documentation](https://docs.expo.dev/versions/latest/sdk/av/)
- [Expo Camera Documentation](https://docs.expo.dev/versions/latest/sdk/camera/)
