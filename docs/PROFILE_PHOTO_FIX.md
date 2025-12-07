
# Profile Photo Fix - Native Platform Support

## Problem
Profile photos were displaying correctly on web preview but showing a 400 error on Expo Go (iOS/Android). The error message was: "Download marked as failed because of invalid response status code 400".

## Root Cause
The issue was caused by differences in how web browsers and native platforms (iOS/Android) handle authentication for Supabase Storage:

- **Web browsers**: Automatically send authentication cookies/headers with image requests
- **Native platforms**: React Native's `Image` component doesn't automatically send authentication headers
- **Supabase Storage**: Even though the bucket was marked as `public: true`, native platforms were getting 400 errors when trying to load images via public URLs

## Solution
Implemented **signed URLs** for native platforms while keeping public URLs for web:

### 1. **New `getAvatarUrl()` function** (`utils/profileAvatarUpload.ts`)
```typescript
export async function getAvatarUrl(filePath: string): Promise<string> {
  // For native platforms, use signed URLs (includes authentication token in URL)
  if (Platform.OS !== 'web') {
    const { data, error } = await supabase.storage
      .from('profile-avatars')
      .createSignedUrl(filePath, 60 * 60 * 24 * 365); // 1 year expiry
    
    if (!error) {
      return data.signedUrl;
    }
  }
  
  // For web, public URLs work fine
  const { data } = supabase.storage
    .from('profile-avatars')
    .getPublicUrl(filePath);
  
  return data.publicUrl;
}
```

### 2. **Enhanced logging** throughout the upload and display process
- Added detailed console.log statements to track URI values, types, and formats
- Added platform detection logging
- Added error detail capture and display

### 3. **Improved error handling** in `ProfileAvatar` component
- Shows specific error messages when image loading fails
- Displays retry count during automatic retries
- Shows error overlay with details after max retries

### 4. **Smart cache-busting**
- For public URLs: Adds timestamp query parameter
- For signed URLs: Uses URL as-is (already has authentication parameters)

## Key Changes

### `utils/profileAvatarUpload.ts`
- Added `getAvatarUrl()` function for platform-specific URL generation
- Enhanced `uploadProfileAvatar()` with better validation and logging
- Updated `deleteProfileAvatar()` to handle both public and signed URL formats
- Added URI validation to ensure only local files are uploaded

### `components/ProfileAvatar.tsx`
- Added detailed error logging with error details display
- Improved retry logic with visual feedback
- Added error overlay showing specific error messages
- Smart cache-busting that respects signed URLs

### `app/(tabs)/profile.tsx` and `app/(tabs)/profile.ios.tsx`
- Updated to use new signed URL approach
- Enhanced logging throughout the avatar change process
- Better key management for forcing component re-renders

## Testing Checklist

- [x] Upload photo on web - should use public URL
- [x] Upload photo on iOS - should use signed URL
- [x] Upload photo on Android - should use signed URL
- [x] Photo displays correctly after upload on all platforms
- [x] Photo persists after app refresh on all platforms
- [x] Old photos are deleted when new ones are uploaded
- [x] Error messages are clear and helpful
- [x] Retry logic works correctly

## Technical Details

### Signed URLs vs Public URLs

**Public URLs:**
- Format: `https://[project].supabase.co/storage/v1/object/public/profile-avatars/avatars/[filename]`
- Work on web because browsers send authentication cookies
- Don't work on native because React Native Image doesn't send auth headers

**Signed URLs:**
- Format: `https://[project].supabase.co/storage/v1/object/sign/profile-avatars/avatars/[filename]?token=[auth-token]`
- Include authentication token directly in the URL
- Work on all platforms without requiring headers
- Have expiration time (set to 1 year in our implementation)

### Why This Works

1. **Native platforms** get signed URLs that include authentication in the URL itself
2. **Web platform** continues to use public URLs (faster, cached by CDN)
3. **Database** stores the appropriate URL type for each platform
4. **Image component** can load the image without needing to send custom headers

## Future Improvements

1. **Signed URL refresh**: Implement automatic refresh of signed URLs before they expire
2. **CDN caching**: Consider using a CDN for signed URLs to improve performance
3. **Image optimization**: Add automatic image resizing/compression before upload
4. **Progressive loading**: Show low-res placeholder while high-res image loads
