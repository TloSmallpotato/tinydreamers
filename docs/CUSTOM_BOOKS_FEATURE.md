
# Custom Books Feature

This document describes the implementation of the custom books feature, which allows users to add their own books with private cover images.

## Overview

The custom books feature enables users to:
- Add books that aren't found in Google Books
- Upload custom cover images from their camera or photo library
- Add personal descriptions and notes
- Keep cover images private (only visible to the owner)

## Architecture

### Database Schema

#### books_library Table
- Added `source` column to track book origin:
  - `google_books`: Books from Google Books API
  - `custom_global`: Custom books created by users
  - `isbn_scan`: Books added via ISBN barcode scan

#### user_books Table
New columns for custom book support:
- `is_custom_for_user` (boolean): Indicates if this is a custom book
- `user_description` (text): User's personal description/notes
- `cover_url_private` (text): Path to private cover image in storage
- `user_id` (uuid): Reference to the user who owns this book

### Storage

#### user-covers Bucket
- **Type**: Private bucket
- **Structure**: `{user_id}/{filename}.{ext}`
- **Access**: Row Level Security policies ensure users can only access their own files
- **File Types**: PNG, JPEG, JPG, WebP
- **Size Limit**: 5 MB per file

### Components

#### AddCustomBookBottomSheet
A bottom sheet modal that allows users to:
- Enter book title (required)
- Add description (optional)
- Take a photo or choose from library for cover image
- Save the custom book to their library

**Props**:
- `prefillTitle`: Pre-fill the title field (e.g., from search query)
- `onClose`: Callback when the sheet is closed
- `onBookAdded`: Callback when a book is successfully added
- `childId`: ID of the child this book belongs to
- `userId`: ID of the authenticated user

## User Flow

### Flow 1: Search and "Add Custom Book"

1. User searches for a book in the search bar
2. Search results are displayed in a dropdown
3. At the bottom of the dropdown, there's an "Add custom book" option
4. Clicking it opens the AddCustomBookBottomSheet with the search query pre-filled
5. User can:
   - Edit the title
   - Add a description
   - Upload a cover image (optional)
6. On save:
   - Cover image is uploaded to `user-covers/{user_id}/{filename}`
   - Book entry is created in `books_library` with `source='custom_global'`
   - User-book relationship is created in `user_books` with custom fields
7. Book appears in the user's library with a "Custom" badge

## Privacy & Security

### Cover Images
- Stored in a **private** bucket (`user-covers`)
- Organized by user ID: `{user_id}/{filename}`
- RLS policies ensure only the owner can access their files
- Accessed via **signed URLs** with 1-hour expiry
- Signed URLs are regenerated when fetching books

### Data Access
- Custom books are linked to specific users via `user_id`
- Cover images are never publicly accessible
- Each user can only see and manage their own custom books

## Implementation Details

### Uploading Cover Images

```typescript
const uploadCoverImage = async (imageUri: string): Promise<string | null> => {
  const fileExt = imageUri.split('.').pop() || 'jpg';
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
  const filePath = `${userId}/${fileName}`;

  const response = await fetch(imageUri);
  const blob = await response.blob();

  const { data, error } = await supabase.storage
    .from('user-covers')
    .upload(filePath, blob, {
      contentType: `image/${fileExt}`,
      upsert: false,
    });

  return data?.path || null;
};
```

### Generating Signed URLs

```typescript
const generateSignedUrl = async (path: string): Promise<string | null> => {
  const { data, error } = await supabase.storage
    .from('user-covers')
    .createSignedUrl(path, 3600); // 1 hour expiry

  return data?.signedUrl || null;
};
```

### Fetching Books with Private Covers

```typescript
// Fetch books
const { data: books } = await supabase
  .from('user_books')
  .select(`
    *,
    book:books_library (*)
  `)
  .eq('child_id', childId);

// Generate signed URLs for custom books
const urlMap = new Map();
for (const book of books) {
  if (book.is_custom_for_user && book.cover_url_private) {
    const signedUrl = await generateSignedUrl(book.cover_url_private);
    if (signedUrl) {
      urlMap.set(book.id, signedUrl);
    }
  }
}
```

## Future Enhancements

### Flow 2: ISBN Scan to Custom Book (Not Yet Implemented)
- Scan ISBN barcode
- If book not found in Google Books, offer to create custom entry
- Pre-fill with ISBN data if available
- Allow user to add cover and additional details

### Additional Features
- Edit custom book details
- Replace cover image
- Share custom books with other users
- Export/import custom book library
- Bulk upload custom books

## Testing

To test the custom books feature:

1. **Add a custom book**:
   - Search for a non-existent book
   - Click "Add custom book"
   - Fill in title and description
   - Upload a cover image
   - Save

2. **Verify privacy**:
   - Check that the cover image is in `user-covers/{your_user_id}/`
   - Try accessing the storage path directly (should fail)
   - Verify signed URL works

3. **View in library**:
   - Custom book should appear with "Custom" badge
   - Cover image should display correctly
   - Click to view details

## Troubleshooting

### Cover image not uploading
- Check camera/photo library permissions
- Verify file size is under 5 MB
- Check network connection
- Review storage bucket policies

### Cover image not displaying
- Verify signed URL is being generated
- Check that the file exists in storage
- Ensure RLS policies are correctly configured
- Check signed URL hasn't expired

### Cannot add custom book
- Verify user is authenticated
- Check that child is selected
- Review database constraints
- Check console for error messages
