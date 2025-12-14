
# Video Moments Security Implementation

## Overview
This document describes the security measures implemented to protect private video moments stored in Supabase Storage. These videos contain sensitive content involving children and must only be accessible by the user who created them.

## Security Measures Implemented

### 1. Private Storage Bucket ✅
- **Bucket Name**: `video-moments`
- **Public Access**: `false` (private bucket)
- **File Size Limit**: 100 MB
- **Allowed MIME Types**: Video formats (mp4, quicktime, webm) and images (jpeg, png) for thumbnails

### 2. Row Level Security (RLS) Policies ✅

#### Database Table: `moments`
The `moments` table has RLS enabled with the following policies:

```sql
-- Users can only view moments for their own children
CREATE POLICY "Users can view moments for their children"
ON moments
FOR SELECT
TO authenticated
USING (
  child_id IN (
    SELECT id FROM children WHERE user_id = auth.uid()
  )
);

-- Users can only insert moments for their own children
CREATE POLICY "Users can insert moments for their children"
ON moments
FOR INSERT
TO authenticated
WITH CHECK (
  child_id IN (
    SELECT id FROM children WHERE user_id = auth.uid()
  )
);

-- Users can only update moments for their own children
CREATE POLICY "Users can update moments for their children"
ON moments
FOR UPDATE
TO authenticated
USING (
  child_id IN (
    SELECT id FROM children WHERE user_id = auth.uid()
  )
);

-- Users can only delete moments for their own children
CREATE POLICY "Users can delete moments for their children"
ON moments
FOR DELETE
TO authenticated
USING (
  child_id IN (
    SELECT id FROM children WHERE user_id = auth.uid()
  )
);
```

#### Storage Bucket: `storage.objects`
The storage bucket has RLS policies that restrict file access:

```sql
-- Users can only view videos for their own children
CREATE POLICY "Users can view videos for their children"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'video-moments' AND
  (storage.foldername(name))[1] IN (
    SELECT children.id::text
    FROM children
    WHERE children.user_id = auth.uid()
  )
);

-- Users can only upload videos for their own children
CREATE POLICY "Users can upload videos for their children"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'video-moments' AND
  (storage.foldername(name))[1] IN (
    SELECT children.id::text
    FROM children
    WHERE children.user_id = auth.uid()
  )
);

-- Users can only update videos for their own children
CREATE POLICY "Users can update videos for their children"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'video-moments' AND
  (storage.foldername(name))[1] IN (
    SELECT children.id::text
    FROM children
    WHERE children.user_id = auth.uid()
  )
)
WITH CHECK (
  bucket_id = 'video-moments' AND
  (storage.foldername(name))[1] IN (
    SELECT children.id::text
    FROM children
    WHERE children.user_id = auth.uid()
  )
);

-- Users can only delete videos for their own children
CREATE POLICY "Users can delete videos for their children"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'video-moments' AND
  (storage.foldername(name))[1] IN (
    SELECT children.id::text
    FROM children
    WHERE children.user_id = auth.uid()
  )
);
```

### 3. Signed URLs for Access ✅

Since the bucket is private, videos cannot be accessed via direct public URLs. Instead, the app uses **signed URLs** that:

- Are temporary (expire after 1 hour by default)
- Are authenticated (only generated for authorized users)
- Cannot be shared or reused after expiration

#### Implementation

The `utils/videoStorage.ts` utility provides functions for generating signed URLs:

```typescript
// Generate signed URL for a single video
const signedUrl = await getSignedVideoUrl(videoUrl, 3600); // Expires in 1 hour

// Generate signed URLs for multiple videos
const signedUrls = await getSignedVideoUrls(videoUrls, 3600);

// Generate signed URL for a thumbnail
const signedThumbnailUrl = await getSignedThumbnailUrl(thumbnailUrl, 3600);

// Process moments with signed URLs
const momentsWithSignedUrls = await processMomentsWithSignedUrls(moments, 3600);
```

### 4. Folder Structure

Videos are organized by child ID to enable RLS policies:

```
video-moments/
  ├── {child_id_1}/
  │   ├── video-{timestamp}.mp4
  │   └── thumbnail-{timestamp}.jpg
  ├── {child_id_2}/
  │   ├── video-{timestamp}.mp4
  │   └── thumbnail-{timestamp}.jpg
  └── ...
```

This structure allows the RLS policies to check if the authenticated user owns the child associated with the video.

## Security Benefits

### ✅ User Isolation
- Each user can only access videos for their own children
- No cross-user data leakage
- Enforced at the database and storage level

### ✅ Temporary Access
- Signed URLs expire after a set time (default: 1 hour)
- Prevents long-term URL sharing
- Requires re-authentication for continued access

### ✅ Defense in Depth
- Multiple layers of security:
  1. Authentication required (must be logged in)
  2. Database RLS (can only query own data)
  3. Storage RLS (can only access own files)
  4. Signed URLs (time-limited access tokens)

### ✅ Future-Proof for Sharing
- When implementing a sharing feature, we can:
  - Add a `shared_with` column to the `moments` table
  - Create additional RLS policies for shared access
  - Generate signed URLs for shared videos with appropriate expiration times

## Migration Applied

The security fix was applied via migration: `secure_video_moments_privacy`

This migration:
1. Removed the dangerous "Public can view videos" policy
2. Made the `video-moments` bucket private
3. Added an update policy for completeness
4. Added an index on `children.user_id` for better RLS performance

## Testing

To verify the security implementation:

### 1. Test Authenticated Access
- Log in as User A
- Record a video moment
- Verify you can view the video
- Verify the signed URL works

### 2. Test Isolation
- Log in as User B
- Attempt to access User A's video URL directly
- Should receive a 403 Forbidden error
- Should not see User A's videos in the app

### 3. Test Expiration
- Generate a signed URL with a short expiration (e.g., 60 seconds)
- Wait for the URL to expire
- Attempt to access the expired URL
- Should receive a 403 Forbidden error

### 4. Test Unauthenticated Access
- Log out
- Attempt to access any video URL
- Should receive a 401 Unauthorized error

## Performance Considerations

### Signed URL Generation
- Signed URLs are generated on-demand when fetching moments
- Each URL generation requires an API call to Supabase
- For lists of videos, URLs are generated in parallel using `Promise.all()`

### Caching Strategy
- Signed URLs are valid for 1 hour by default
- The app could implement client-side caching to reduce API calls
- Consider storing signed URLs with their expiration times in memory

### Optimization Tips
1. **Batch Generation**: Use `getSignedVideoUrls()` for multiple videos
2. **Longer Expiration**: Increase expiration time for better performance (trade-off with security)
3. **Lazy Loading**: Only generate signed URLs for visible videos
4. **Prefetching**: Generate signed URLs for upcoming videos in advance

## Future Enhancements

### 1. Sharing Feature
When implementing video sharing:

```sql
-- Add sharing table
CREATE TABLE moment_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  moment_id UUID REFERENCES moments(id) ON DELETE CASCADE,
  shared_with_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  UNIQUE(moment_id, shared_with_user_id)
);

-- Enable RLS
ALTER TABLE moment_shares ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view shares they created
CREATE POLICY "Users can view their shares"
ON moment_shares
FOR SELECT
TO authenticated
USING (
  moment_id IN (
    SELECT id FROM moments
    WHERE child_id IN (
      SELECT id FROM children WHERE user_id = auth.uid()
    )
  )
);

-- Policy: Users can view moments shared with them
CREATE POLICY "Users can view shared moments"
ON moments
FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT moment_id FROM moment_shares
    WHERE shared_with_user_id = auth.uid()
    AND (expires_at IS NULL OR expires_at > NOW())
  )
);
```

### 2. Public Feed (Optional)
If implementing a public feed feature:

```sql
-- Add public flag to moments
ALTER TABLE moments ADD COLUMN is_public BOOLEAN DEFAULT FALSE;

-- Policy: Anyone can view public moments
CREATE POLICY "Anyone can view public moments"
ON moments
FOR SELECT
TO authenticated
USING (is_public = TRUE);
```

### 3. Video Encryption
For additional security, consider:
- Encrypting videos before upload
- Decrypting on the client side
- Using Supabase Edge Functions for server-side encryption/decryption

## Compliance Notes

### COPPA (Children's Online Privacy Protection Act)
- Videos involving children require strict privacy controls
- Parental consent is required for data collection
- Data must be securely stored and not shared without consent

### GDPR (General Data Protection Regulation)
- Users have the right to access their data
- Users have the right to delete their data
- Data must be stored securely and not shared without consent

### Best Practices
- ✅ Implement strong authentication
- ✅ Use RLS for data isolation
- ✅ Use private storage buckets
- ✅ Use signed URLs for temporary access
- ✅ Log access attempts for auditing
- ✅ Implement data retention policies
- ✅ Provide user controls for data deletion

## Support

For questions or issues related to video security:
1. Check the Supabase Storage documentation
2. Review the RLS policy documentation
3. Test with the Supabase SQL editor
4. Check the browser console for errors
5. Review server logs for access attempts
