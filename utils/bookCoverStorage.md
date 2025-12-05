
# Book Cover Storage System

This system handles the automatic download, optimization, and storage of book cover images in the Natively app.

## Overview

All book cover images are:
- Automatically downloaded from external sources
- Converted to PNG format
- Optimized to be under 2MB in size
- Stored in Supabase Storage (`book-covers` bucket)
- Tracked in the `book_covers` database table with metadata

## Architecture

### Database Schema

**`book_covers` table:**
- `id` (uuid): Primary key
- `book_id` (uuid): Foreign key to `books_library.id`
- `storage_path` (text): Path in Supabase Storage
- `width` (integer): Image width in pixels
- `height` (integer): Image height in pixels
- `file_size` (integer): File size in bytes
- `is_low_res` (boolean): True if width or height < 800px
- `created_at` (timestamptz): Creation timestamp
- `updated_at` (timestamptz): Last update timestamp

**`books_library` table changes:**
- Removed: `cover_url` column
- Removed: `thumbnail_url` column
- Removed: `cover_storage_path` column

### Edge Function: `process-book-cover`

Handles the server-side processing of book covers:

1. **Download**: Fetches the image from the provided URL
2. **Dimension Detection**: Determines image width and height
3. **Optimization**: Converts to PNG and reduces size if > 2MB
4. **Low-Res Detection**: Marks images < 800px in either dimension
5. **Storage**: Uploads to Supabase Storage
6. **Database**: Saves metadata to `book_covers` table

**Endpoint:** `https://vxglluxqhceajceizbbm.supabase.co/functions/v1/process-book-cover`

**Request:**
```json
{
  "coverUrl": "https://example.com/cover.jpg",
  "bookId": "uuid-of-book"
}
```

**Response:**
```json
{
  "success": true,
  "cover": {
    "id": "uuid",
    "storage_path": "covers/book-id.png",
    "public_url": "https://...",
    "width": 1200,
    "height": 1800,
    "file_size": 1500000,
    "is_low_res": false
  }
}
```

## Client-Side API

### `processAndUploadBookCover(coverUrl, bookId)`

Processes and uploads a book cover via the Edge Function.

**Parameters:**
- `coverUrl` (string): URL of the cover image to download
- `bookId` (string): ID of the book in `books_library`

**Returns:** `Promise<BookCover | null>`

**Example:**
```typescript
const cover = await processAndUploadBookCover(
  'https://example.com/cover.jpg',
  'book-uuid'
);

if (cover) {
  console.log('Cover processed:', cover);
  console.log('Is low res:', cover.is_low_res);
}
```

### `getBookCover(bookId)`

Retrieves the book cover metadata for a specific book.

**Parameters:**
- `bookId` (string): ID of the book

**Returns:** `Promise<BookCover | null>`

### `getBookCoverUrl(storagePath)`

Gets the public URL for a book cover.

**Parameters:**
- `storagePath` (string): Storage path from `book_covers.storage_path`

**Returns:** `string` (public URL)

### `deleteBookCover(bookId)`

Deletes a book cover from both storage and database.

**Parameters:**
- `bookId` (string): ID of the book

**Returns:** `Promise<boolean>`

### `getLowResolutionCovers()`

Gets all book covers marked as low resolution.

**Returns:** `Promise<BookCover[]>`

## Usage in the App

### Adding a Book

When a book is added to the library:

1. Book metadata is saved to `books_library`
2. Cover processing is triggered asynchronously
3. User sees the book immediately (with placeholder if needed)
4. Cover appears once processing completes

```typescript
// Create book
const { data: newBook } = await supabase
  .from('books_library')
  .insert({ title, authors, ... })
  .select('id')
  .single();

// Process cover asynchronously
processAndUploadBookCover(coverUrl, newBook.id)
  .then(cover => {
    if (cover) {
      console.log('Cover ready:', cover);
      refreshBooksList();
    }
  });
```

### Displaying Covers

```typescript
// Fetch books with covers
const { data } = await supabase
  .from('user_books')
  .select(`
    *,
    book:books_library (
      *,
      book_cover:book_covers (*)
    )
  `);

// Get cover URL
const coverUrl = book.book_cover 
  ? getBookCoverUrl(book.book_cover.storage_path)
  : null;

// Display with low-res indicator
{coverUrl && (
  <View>
    <Image source={{ uri: coverUrl }} />
    {book.book_cover.is_low_res && (
      <Badge>Low Res</Badge>
    )}
  </View>
)}
```

## Low Resolution Detection

Images are marked as low resolution if:
- Width < 800px OR
- Height < 800px

Low-res covers are:
- Displayed with a "Low Res" badge
- Tracked in the database for potential re-processing
- Still fully functional

## Performance Considerations

- **Async Processing**: Cover processing doesn't block book addition
- **Caching**: Images are cached by Expo Image component
- **Optimization**: All images are optimized to < 2MB
- **CDN**: Supabase Storage provides CDN delivery

## Error Handling

- If cover processing fails, the book is still added
- Users see a placeholder icon instead of the cover
- Errors are logged for debugging
- Failed covers can be re-processed later

## Storage Bucket Configuration

**Bucket:** `book-covers`

**RLS Policies:**
- Public read access (anyone can view covers)
- Authenticated write access (only logged-in users can upload)

**File Limits:**
- Max size: 5MB (before optimization)
- Allowed formats: PNG, JPEG, JPG, WebP
- Output format: PNG only

## Future Enhancements

Potential improvements:
- Batch re-processing of low-res covers
- Multiple cover sizes (thumbnail, medium, large)
- Cover quality scoring
- Automatic cover replacement from better sources
- Cover image search and selection UI
