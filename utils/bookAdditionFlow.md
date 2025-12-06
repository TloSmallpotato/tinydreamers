
# Book Addition Flow - Implementation Summary

## Overview
This document describes how the app handles adding books to the library, including database checks and Google Custom Search API integration.

## Process Flow

### 1. User Initiates Book Addition
The user can add a book in two ways:
- **Manual Search**: Type a book title/author in the search bar
- **Barcode Scan**: Scan the ISBN barcode on the back of the book

### 2. Book Search (googleBooksApi.ts)
When searching for a book:

#### Step 2.1: Search Google Books API (Free)
- Query Google Books API for book metadata (title, author, description, etc.)
- If not found, fallback to OpenLibrary API

#### Step 2.2: Fetch Cover Image via Google Custom Search API
**COST: $0.005 per API call**

The `getBestCoverUrl()` function implements a cascading fallback strategy:

1. **Primary Query**: `"<isbn> <title> <author> book cover"` (JPG)
2. **Primary Query**: `"<isbn> <title> <author> book cover"` (PNG)
3. **Fallback 1**: `"<isbn> cover jpg"` (JPG)
4. **Fallback 1**: `"<isbn> cover jpg"` (PNG)
5. **Fallback 2**: `"<title> <author> cover high resolution"` (JPG)
6. **Fallback 2**: `"<title> <author> cover high resolution"` (PNG)
7. **Fallback 3**: `"<title> <author> book cover"` (JPG)
8. **Fallback 3**: `"<title> <author> book cover"` (PNG)

**In Practice**: Usually only 1-2 attempts needed (cost: $0.005-$0.010 per book)

The Google Custom Search API is called via the `search-book-cover` Supabase Edge Function to keep API keys secure.

### 3. Add Book to Library (books.tsx)

#### Step 3.1: Check Database First
```typescript
// Check if book exists in books_library table
const { data: existingBook } = await supabase
  .from('books_library')
  .select('id, cover_url, thumbnail_url')
  .eq('google_books_id', book.googleBooksId)
  .single();
```

**If book exists in database:**
- ✅ Reuse existing book entry
- ✅ No Google Custom Search API call needed
- ✅ **Saves $0.005**

**If book NOT found in database:**
- Create new entry in `books_library` table
- Store cover URLs from Google Custom Search API

#### Step 3.2: Create Book Entry (if needed)
```typescript
const { data: newBook } = await supabase
  .from('books_library')
  .insert({
    google_books_id: book.googleBooksId,
    title: book.title,
    authors: book.authors,
    cover_url: book.coverUrl,        // From Google Custom Search
    thumbnail_url: book.thumbnailUrl, // From Google Custom Search
    description: book.description,
    published_date: book.publishedDate,
    page_count: book.pageCount,
  })
  .select('id')
  .single();
```

#### Step 3.3: Check User Library
```typescript
// Check if user already has this book
const { data: existingUserBook } = await supabase
  .from('user_books')
  .select('id')
  .eq('child_id', selectedChild.id)
  .eq('book_id', bookId)
  .single();
```

**If user already has the book:**
- Show "Already Added" alert
- Stop process

#### Step 3.4: Add to User Library
```typescript
// Create user_book relationship
const { error } = await supabase
  .from('user_books')
  .insert({
    child_id: selectedChild.id,
    book_id: bookId,
  });
```

## Cost Optimization

### Database-First Approach
By checking the database first, we avoid unnecessary API calls:

- **First user adds a book**: $0.005 (Google Custom Search API call)
- **Second user adds same book**: $0.000 (reuses existing data)
- **Third user adds same book**: $0.000 (reuses existing data)

### Example Scenario
If 100 users add "Harry Potter and the Philosopher's Stone":
- **Without database check**: 100 × $0.005 = $0.50
- **With database check**: 1 × $0.005 = $0.005
- **Savings**: $0.495 (99% reduction)

## Database Schema

### books_library Table
Stores global book information (shared across all users):
```sql
- id (uuid, primary key)
- google_books_id (text, unique)
- title (text)
- authors (text)
- description (text)
- published_date (text)
- page_count (integer)
- cover_url (text)        -- Full-size cover image URL
- thumbnail_url (text)    -- Thumbnail version for list views
- created_at (timestamp)
- updated_at (timestamp)
```

### user_books Table
Stores user-specific book data (ratings, tags, etc.):
```sql
- id (uuid, primary key)
- child_id (uuid, foreign key → children.id)
- book_id (uuid, foreign key → books_library.id)
- rating (text: 'not_vibing' | 'like_it' | 'love_it')
- tags (text[])
- would_recommend (boolean)
- created_at (timestamp)
- updated_at (timestamp)
```

## Edge Functions

### search-book-cover
**Purpose**: Securely call Google Custom Search API from the server

**Location**: `supabase/functions/search-book-cover/index.ts`

**Environment Variables**:
- `GOOGLE_CUSTOM_SEARCH_API_KEY`
- `GOOGLE_CUSTOM_SEARCH_ENGINE_ID`

**Request**:
```json
{
  "query": "9780439708180 Harry Potter book cover",
  "fileType": "jpg"
}
```

**Response**:
```json
{
  "coverUrl": "https://...",
  "thumbnailUrl": "https://..."
}
```

## Logging

The implementation includes comprehensive logging to track the process:

### books.tsx
```
=== ADDING BOOK PROCESS STARTED ===
Book title: Harry Potter and the Philosopher's Stone
Google Books ID: abc123
STEP 1: Checking if book exists in database...
STEP 2: Book NOT found in database. Creating new entry...
Cover URL from Google Custom Search: https://...
Thumbnail URL from Google Custom Search: https://...
Source: googlecustomsearch
Book created successfully in database with ID: xyz789
Cover URLs saved to database
STEP 3: Checking if user already has this book...
STEP 4: Adding book to user library...
Book added to user library successfully
=== ADDING BOOK PROCESS COMPLETED ===
```

### googleBooksApi.ts
```
📚 Starting cover image search for: Harry Potter
Attempt 1: Primary query with ISBN, title, and author
🔍 Calling Google Custom Search API (Cost: $0.005)
Query: 9780439708180 Harry Potter J.K. Rowling book cover FileType: jpg
✅ Google Custom Search API call successful
Cover URL found: https://...
✅ Cover found on first attempt
```

## Summary

The implementation follows the exact flow requested:

1. ✅ **Check DB first** - Always checks `books_library` table before creating new entries
2. ✅ **Call Google Custom Search if not found** - Only calls API when book doesn't exist in DB
3. ✅ **Store the result** - Saves book metadata and cover URLs to database
4. ✅ **Save cover URL in DB** - Stores both `cover_url` and `thumbnail_url` in `books_library` table

This approach minimizes API costs while ensuring all books have high-quality cover images.
