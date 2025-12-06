
# Book Cover Fallback Mechanism

## Overview
This document describes the fallback mechanism for fetching book cover images when the primary method (Google Custom Search API) fails or returns low-resolution images (<800px in either dimension).

## Fallback Strategy

The system implements a cascading fallback strategy with resolution checking:

### 1. **Primary Method: Google Custom Search API**
   - **Cost**: $0.005 per API call
   - **Process**:
     - Searches for book cover images using ISBN, title, and author
     - Checks if the returned image is high-resolution (>=800px in both dimensions)
     - If high-res, uses it immediately
     - If low-res or fails, continues to fallbacks

### 2. **Fallback #1: OpenLibrary API**
   - **Cost**: Free
   - **Process**:
     - Fetches cover from OpenLibrary using ISBN
     - URL format: `https://covers.openlibrary.org/b/isbn/{ISBN}-L.jpg`
     - Checks if the image is high-resolution
     - If high-res, uses it
     - If low-res or fails, continues to next fallback

### 3. **Fallback #2: Google Books API**
   - **Cost**: Free
   - **Process**:
     - Uses the image links from Google Books API response
     - Priority: extraLarge > large > medium > small > thumbnail
     - Checks if the image is high-resolution
     - If high-res, uses it
     - If low-res or fails, continues to additional attempts

### 4. **Additional Attempts**
   - If all primary methods fail or return low-res images:
     - Tries additional Google Custom Search queries with different combinations
     - Tries both JPG and PNG file types
     - Returns the best available image (even if low-res) if found

## Resolution Checking

The system uses a dedicated Edge Function (`check-image-resolution`) to verify image dimensions:

- **Endpoint**: `https://vxglluxqhceajceizbbm.supabase.co/functions/v1/check-image-resolution`
- **Method**: POST
- **Input**: `{ imageUrl: string }`
- **Output**: `{ width: number, height: number, isHighRes: boolean }`
- **High-res threshold**: 800px x 800px

The Edge Function:
1. Downloads the image
2. Parses the image header to extract dimensions
3. Supports JPEG, PNG, GIF, and WebP formats
4. Returns dimensions and high-res status

## Implementation Details

### Key Functions

#### `getBestCoverUrl(isbn, title, author, volumeInfo)`
Main orchestration function that implements the fallback strategy:
1. Tries Google Custom Search with ISBN + title + author
2. Checks resolution, falls back if low-res
3. Tries OpenLibrary API
4. Tries Google Books API
5. Tries additional Google Custom Search queries
6. Returns best available cover (even if low-res)

#### `isHighResolution(imageUrl)`
Checks if an image meets the high-resolution threshold:
- Calls the `check-image-resolution` Edge Function
- Returns `true` if width >= 800px AND height >= 800px
- Returns `false` otherwise

#### `getOpenLibraryCover(isbn)`
Fetches cover from OpenLibrary:
- Uses the large size variant (-L.jpg)
- Makes a HEAD request to verify existence
- Returns URL if found, null otherwise

#### `getGoogleBooksCover(volumeInfo)`
Extracts the best available cover from Google Books API response:
- Prioritizes higher resolution variants
- Removes zoom parameters for best quality
- Returns URL if found, null otherwise

## Cost Analysis

### Typical Scenario (High-res found on first attempt)
- **Cost**: $0.005 per book
- **Attempts**: 1 Google Custom Search call + 1 resolution check

### Worst Case Scenario (All attempts exhausted)
- **Cost**: Up to $0.040 per book
- **Attempts**: 8 Google Custom Search calls + multiple resolution checks

### Average Scenario
- **Cost**: $0.005-$0.010 per book
- **Attempts**: 1-2 Google Custom Search calls + fallbacks to free APIs

## Benefits

1. **Cost Optimization**: Only uses paid API when necessary
2. **Quality Assurance**: Ensures high-resolution images when available
3. **Reliability**: Multiple fallback options prevent missing covers
4. **Transparency**: Detailed logging for debugging and monitoring
5. **Flexibility**: Can easily add more fallback sources

## Logging

The system provides comprehensive logging:
- Each attempt is logged with method and query
- Resolution checks are logged with dimensions
- Success/failure of each method is logged
- Final source of cover image is tracked

Example log output:
```
📚 Starting cover image search for: Harry Potter
Attempt 1: Google Custom Search with ISBN, title, and author
🔍 Calling Google Custom Search API (Cost: $0.005)
✅ Google Custom Search API call successful
🔍 Checking image resolution for: https://...
Image dimensions: 1200x1800 - High res: true
✅ High-res cover found on Google Custom Search (first attempt)
```

## Future Enhancements

Potential improvements:
1. Cache resolution checks to avoid redundant API calls
2. Add more fallback sources (Amazon, Goodreads, etc.)
3. Implement image quality scoring beyond just resolution
4. Add retry logic with exponential backoff
5. Store resolution metadata in database for analytics
