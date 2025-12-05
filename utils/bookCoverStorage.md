
# Book Cover Storage Guide

This guide explains how to use the book cover storage system with Supabase.

## Overview

The book cover storage system allows you to:
- Store book cover images as PNG files in Supabase Storage
- Link cover images to books in the `books_library` table
- Retrieve public URLs for cover images
- Delete cover images when no longer needed

## Database Structure

### books_library Table

The `books_library` table has been updated with a new column:

- `cover_storage_path` (text, nullable): Stores the path to the cover image in Supabase Storage

Example row:
```json
{
  "id": "abc123",
  "title": "The Great Gatsby",
  "authors": "F. Scott Fitzgerald",
  "cover_url": "https://example.com/cover.jpg",
  "cover_storage_path": "covers/abc123.png"
}
```

### Storage Bucket

A new storage bucket called `book-covers` has been created with:
- Public access for viewing
- 5MB file size limit
- Allowed file types: PNG, JPEG, JPG, WebP
- Authenticated users can upload, update, and delete

## Usage

### Import the utility functions

```typescript
import {
  uploadBookCover,
  getBookCoverUrl,
  deleteBookCover,
  uploadAndSaveBookCover
} from '@/utils/bookCoverStorage';
```

### Upload a book cover

```typescript
// Download from URL and upload to storage
const storagePath = await uploadBookCover(
  'https://example.com/book-cover.jpg',
  'book-id-123'
);

if (storagePath) {
  console.log('Cover uploaded to:', storagePath);
  // storagePath will be something like: "covers/book-id-123.png"
}
```

### Upload and save to database

```typescript
// This function uploads the cover AND updates the books_library table
const success = await uploadAndSaveBookCover(
  'https://example.com/book-cover.jpg',
  'book-id-123'
);

if (success) {
  console.log('Cover uploaded and saved to database');
}
```

### Get public URL for a cover

```typescript
const publicUrl = getBookCoverUrl('covers/book-id-123.png');
console.log('Public URL:', publicUrl);
// Use this URL in your <Image> components
```

### Delete a cover

```typescript
const deleted = await deleteBookCover('covers/book-id-123.png');
if (deleted) {
  console.log('Cover deleted successfully');
}
```

## Example: Adding a book with cover

```typescript
import { supabase } from '@/app/integrations/supabase/client';
import { uploadAndSaveBookCover } from '@/utils/bookCoverStorage';

async function addBookWithCover(bookData: {
  title: string;
  authors: string;
  coverUrl: string;
  // ... other fields
}) {
  // 1. Insert the book into the database
  const { data: book, error } = await supabase
    .from('books_library')
    .insert({
      google_books_id: 'unique-id',
      title: bookData.title,
      authors: bookData.authors,
      cover_url: bookData.coverUrl,
      // ... other fields
    })
    .select()
    .single();

  if (error || !book) {
    console.error('Error inserting book:', error);
    return null;
  }

  // 2. Upload the cover image and update the database
  const success = await uploadAndSaveBookCover(bookData.coverUrl, book.id);

  if (!success) {
    console.warn('Failed to upload cover image');
  }

  return book;
}
```

## Example: Displaying a book cover

```typescript
import { Image } from 'expo-image';
import { getBookCoverUrl } from '@/utils/bookCoverStorage';

function BookCover({ book }: { book: any }) {
  // Prefer storage path over external URL
  const coverUrl = book.cover_storage_path
    ? getBookCoverUrl(book.cover_storage_path)
    : book.cover_url;

  return (
    <Image
      source={{ uri: coverUrl }}
      style={{ width: 200, height: 300 }}
      contentFit="cover"
    />
  );
}
```

## Platform Differences

The utility functions have platform-specific implementations:

- **Web** (`bookCoverStorage.ts`): Uses Canvas API to convert images to PNG
- **Native** (`bookCoverStorage.native.ts`): Uses expo-file-system to download and upload images

Both implementations provide the same API, so you can use them interchangeably.

## RLS Policies

The following Row Level Security policies are in place:

1. **Anyone can view book covers** (SELECT)
   - Both authenticated and anonymous users can view covers
   
2. **Authenticated users can upload book covers** (INSERT)
   - Only logged-in users can upload new covers
   
3. **Authenticated users can update book covers** (UPDATE)
   - Only logged-in users can update existing covers
   
4. **Authenticated users can delete book covers** (DELETE)
   - Only logged-in users can delete covers

## Best Practices

1. **Always use storage path when available**: Prefer `cover_storage_path` over `cover_url` for better performance and reliability

2. **Clean up old covers**: When updating a book's cover, delete the old one first:
   ```typescript
   if (book.cover_storage_path) {
     await deleteBookCover(book.cover_storage_path);
   }
   await uploadAndSaveBookCover(newCoverUrl, book.id);
   ```

3. **Handle errors gracefully**: Always check return values and handle failures:
   ```typescript
   const success = await uploadAndSaveBookCover(coverUrl, bookId);
   if (!success) {
     // Show error message to user
     // Fall back to using cover_url
   }
   ```

4. **Use PNG format**: All covers are automatically converted to PNG for consistency

5. **Optimize images**: Consider resizing large images before upload to save storage space

## Troubleshooting

### Upload fails with "Failed to download image"
- Check that the cover URL is accessible
- Verify the URL returns an image (not HTML or error page)
- Check network connectivity

### Upload fails with "Error uploading book cover"
- Verify the user is authenticated
- Check that the file size is under 5MB
- Ensure the file type is supported (PNG, JPEG, JPG, WebP)

### Public URL doesn't work
- Verify the storage path is correct
- Check that the bucket is public
- Ensure the file was uploaded successfully

### RLS policy errors
- Make sure the user is authenticated for upload/update/delete operations
- Check that the bucket_id matches 'book-covers'
