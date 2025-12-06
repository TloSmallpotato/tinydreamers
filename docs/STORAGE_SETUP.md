
# Storage Setup for User-Covers Bucket

This document explains how to set up the `user-covers` storage bucket with proper Row Level Security (RLS) policies.

## Overview

The `user-covers` bucket is used to store private book cover images uploaded by users for their custom books. Each user has their own folder within the bucket, and RLS policies ensure that users can only access their own files.

## Bucket Configuration

The bucket has been created with the following settings:
- **Name**: `user-covers`
- **Public**: `false` (private bucket)
- **File Size Limit**: 5 MB
- **Allowed MIME Types**: `image/png`, `image/jpeg`, `image/jpg`, `image/webp`

## Required RLS Policies

You need to create the following RLS policies on the `storage.objects` table. These policies can be created through the Supabase Dashboard:

1. Go to **Storage** > **Policies** in your Supabase Dashboard
2. Click on **New Policy** for the `user-covers` bucket
3. Create the following policies:

### Policy 1: Allow users to upload to their own folder

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

### Policy 2: Allow users to read their own files

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

### Policy 3: Allow users to update their own files

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

### Policy 4: Allow users to delete their own files

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

## How It Works

1. **Folder Structure**: Files are stored in the format `{user_id}/{filename}.{ext}`
2. **Access Control**: The `storage.foldername()` helper function extracts the folder path from the file name, and the policies check if the first folder matches the authenticated user's ID
3. **Signed URLs**: Since the bucket is private, files are accessed using signed URLs generated with `supabase.storage.from('user-covers').createSignedUrl(path, expiryTime)`

## Testing

To test that the policies are working correctly:

1. Try uploading a custom book cover through the app
2. Verify that the file appears in your user folder in the Storage dashboard
3. Try accessing the file using a signed URL
4. Verify that you cannot access files in other users' folders

## Troubleshooting

If you encounter issues:

- **Upload fails**: Check that the RLS INSERT policy is created correctly
- **Cannot view images**: Ensure the SELECT policy is in place and signed URLs are being generated
- **Permission denied**: Verify that the user is authenticated and the folder structure matches `{user_id}/{filename}`

## Security Notes

- Files in this bucket are **private** and can only be accessed by the owner
- Signed URLs expire after the specified time (default: 1 hour)
- The bucket has a 5 MB file size limit to prevent abuse
- Only image files are allowed (PNG, JPEG, WebP)
