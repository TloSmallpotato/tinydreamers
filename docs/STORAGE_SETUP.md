
# Storage Setup Documentation

This document explains how to set up storage buckets with proper Row Level Security (RLS) policies.

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

1. Try uploading a profile avatar or custom book cover through the app
2. Verify that the file appears in the correct folder in the Storage dashboard
3. Try accessing the file (public URL for avatars, signed URL for covers)
4. Verify that you cannot access files belonging to other users

## Troubleshooting

If you encounter issues:

- **Upload fails with RLS error**: Check that the file path matches the expected format
- **Cannot view images**: Ensure the correct policies are in place
- **Permission denied**: Verify that the user is authenticated and owns the child/resource

## Security Notes

- Profile avatars are **public** for easy viewing across the app
- User covers are **private** and can only be accessed by the owner
- All buckets have a 5 MB file size limit to prevent abuse
- Only image files are allowed (PNG, JPEG, WebP)
