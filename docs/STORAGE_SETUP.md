
# Storage Setup Documentation

This document explains how to set up storage buckets with proper Row Level Security (RLS) policies.

## Video Moments Bucket (PRIVATE)

### Overview

The `video-moments` bucket is used to store **private video moments** of children. This bucket is **PRIVATE** and requires authentication and authorization to access. Videos can only be accessed by the user who created them.

### Bucket Configuration

- **Name**: `video-moments`
- **Public**: `false` (PRIVATE bucket - critical for child safety)
- **File Size Limit**: 100 MB
- **Allowed MIME Types**: `video/mp4`, `video/quicktime`, `video/webm`, `image/jpeg`, `image/png` (for thumbnails)

### Folder Structure

Files are stored in the format: `{child_id}/{filename}.{ext}`

Example: `123e4567-e89b-12d3-a456-426614174000/video-1234567890.mp4`

### RLS Policies

The following RLS policies are configured on the `storage.objects` table:

#### Policy 1: Users can view videos for their children
```sql
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
```

#### Policy 2: Users can upload videos for their children
```sql
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
```

#### Policy 3: Users can update videos for their children
```sql
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
```

#### Policy 4: Users can delete videos for their children
```sql
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

### How It Works

1. **Folder Structure**: Files must be stored in folders named after the child's ID
2. **Access Control**: The policies extract the child ID from the folder path and verify that the authenticated user owns that child
3. **Signed URLs**: Since the bucket is private, files are accessed using **signed URLs** generated with `supabase.storage.from('video-moments').createSignedUrl(path, expiryTime)`

### Accessing Videos

Videos in this bucket **cannot** be accessed via public URLs. Instead, use the `videoStorage.ts` utility:

```typescript
import { getSignedVideoUrl, processMomentsWithSignedUrls } from '@/utils/videoStorage';

// Generate signed URL for a single video (expires in 1 hour)
const signedUrl = await getSignedVideoUrl(videoUrl, 3600);

// Process moments with signed URLs
const momentsWithSignedUrls = await processMomentsWithSignedUrls(moments);
```

---

## Profile Avatars Bucket

### Overview

The `profile-avatars` bucket is used to store profile pictures for children. The bucket is public for viewing, but only authenticated users can upload, update, or delete avatars for their own children.

### Bucket Configuration

- **Name**: `profile-avatars`
- **Public**: `true` (public bucket for easy viewing)
- **File Size Limit**: 5 MB
- **Allowed MIME Types**: `image/png`, `image/jpeg`, `image/jpg`, `image/webp`

### Folder Structure

Files are stored in the format: `avatars/{child_id}-{timestamp}.{ext}`

Example: `avatars/123e4567-e89b-12d3-a456-426614174000-1234567890.jpg`

### RLS Policies

The following RLS policies are configured on the `storage.objects` table:

#### Policy 1: Public can view all avatars
```sql
CREATE POLICY "Public can view all avatars"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'profile-avatars');
```

#### Policy 2: Users can upload avatars for their children
```sql
CREATE POLICY "Users can upload avatars for their children"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profile-avatars' AND
  (storage.foldername(storage.objects.name))[1] = 'avatars' AND
  EXISTS (
    SELECT 1
    FROM children
    WHERE children.user_id = auth.uid()
    AND children.id::text = split_part(storage.filename(storage.objects.name), '-', 1)
  )
);
```

#### Policy 3: Users can update avatars for their children
```sql
CREATE POLICY "Users can update avatars for their children"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'profile-avatars' AND
  (storage.foldername(storage.objects.name))[1] = 'avatars' AND
  EXISTS (
    SELECT 1
    FROM children
    WHERE children.user_id = auth.uid()
    AND children.id::text = split_part(storage.filename(storage.objects.name), '-', 1)
  )
)
WITH CHECK (
  bucket_id = 'profile-avatars' AND
  (storage.foldername(storage.objects.name))[1] = 'avatars' AND
  EXISTS (
    SELECT 1
    FROM children
    WHERE children.user_id = auth.uid()
    AND children.id::text = split_part(storage.filename(storage.objects.name), '-', 1)
  )
);
```

#### Policy 4: Users can delete avatars for their children
```sql
CREATE POLICY "Users can delete avatars for their children"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'profile-avatars' AND
  (storage.foldername(storage.objects.name))[1] = 'avatars' AND
  EXISTS (
    SELECT 1
    FROM children
    WHERE children.user_id = auth.uid()
    AND children.id::text = split_part(storage.filename(storage.objects.name), '-', 1)
  )
);
```

### How It Works

1. **Folder Structure**: Files must be stored in the `avatars/` folder with the filename starting with the child's ID
2. **Access Control**: The policies extract the child ID from the filename and verify that the authenticated user owns that child
3. **Public URLs**: Since the bucket is public, files can be accessed directly using public URLs

---

## User Covers Bucket

### Overview

The `user-covers` bucket is used to store private book cover images uploaded by users for their custom books. Each user has their own folder within the bucket, and RLS policies ensure that users can only access their own files.

### Bucket Configuration

- **Name**: `user-covers`
- **Public**: `false` (private bucket)
- **File Size Limit**: 5 MB
- **Allowed MIME Types**: `image/png`, `image/jpeg`, `image/jpg`, `image/webp`

### Folder Structure

Files are stored in the format: `{user_id}/{filename}.{ext}`

### RLS Policies

#### Policy 1: Allow users to upload to their own folder
```sql
CREATE POLICY "Users can upload to their own folder in user-covers"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'user-covers' AND
  (storage.foldername(name))[1] = (SELECT auth.uid()::text)
);
```

#### Policy 2: Allow users to read their own files
```sql
CREATE POLICY "Users can read their own files in user-covers"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'user-covers' AND
  (storage.foldername(name))[1] = (SELECT auth.uid()::text)
);
```

#### Policy 3: Allow users to update their own files
```sql
CREATE POLICY "Users can update their own files in user-covers"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'user-covers' AND
  (storage.foldername(name))[1] = (SELECT auth.uid()::text)
)
WITH CHECK (
  bucket_id = 'user-covers' AND
  (storage.foldername(name))[1] = (SELECT auth.uid()::text)
);
```

#### Policy 4: Allow users to delete their own files
```sql
CREATE POLICY "Users can delete their own files in user-covers"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'user-covers' AND
  (storage.foldername(name))[1] = (SELECT auth.uid()::text)
);
```

### How It Works

1. **Folder Structure**: Files are stored in the format `{user_id}/{filename}.{ext}`
2. **Access Control**: The `storage.foldername()` helper function extracts the folder path from the file name, and the policies check if the first folder matches the authenticated user's ID
3. **Signed URLs**: Since the bucket is private, files are accessed using signed URLs generated with `supabase.storage.from('user-covers').createSignedUrl(path, expiryTime)`

---

## Testing

To test that the policies are working correctly:

1. Try uploading a profile avatar, video moment, or custom book cover through the app
2. Verify that the file appears in the correct folder in the Storage dashboard
3. Try accessing the file (public URL for avatars, signed URL for videos and covers)
4. Verify that you cannot access files belonging to other users

## Troubleshooting

If you encounter issues:

- **Upload fails with RLS error**: Check that the file path matches the expected format
- **Cannot view images/videos**: Ensure the correct policies are in place
- **Permission denied**: Verify that the user is authenticated and owns the child/resource
- **Signed URL expired**: Generate a new signed URL (they expire after 1 hour by default)

## Security Notes

- **Video moments** are **PRIVATE** and can only be accessed by the owner using signed URLs
- **Profile avatars** are **public** for easy viewing across the app
- **User covers** are **private** and can only be accessed by the owner
- All buckets have file size limits to prevent abuse
- Only specific file types are allowed (images and videos)
- Signed URLs expire after a set time (default: 1 hour) for additional security

## Critical Security Fix Applied

**Date**: December 2024

**Issue**: Video moments were stored in a public bucket, allowing anyone with the URL to access private videos of children.

**Fix Applied**:
1. Made the `video-moments` bucket private
2. Removed the "Public can view videos" policy
3. Implemented signed URL generation for video access
4. Updated all components to use signed URLs
5. Added comprehensive security documentation

**Migration**: `secure_video_moments_privacy`

This fix ensures that video moments are only accessible by the authenticated user who created them, protecting the privacy and safety of children.
