
# Google Custom Search API Quota Handling

## Problem
The Google Custom Search API has a daily quota limit (100 queries per day for free tier). When this quota is exceeded, the API returns a 429 error, causing the book scanning feature to fail.

## Solution
We've implemented a robust error handling and fallback mechanism that:

1. **Detects quota exceeded errors** - Both HTTP 429 status codes and error messages in the response body
2. **Automatically switches to fallback methods** - Uses free APIs (OpenLibrary and Google Books) when quota is exceeded
3. **Caches the quota status** - Prevents repeated failed API calls for 24 hours
4. **Provides seamless user experience** - Users can still add books even when quota is exceeded

## How It Works

### Edge Function (`search-book-cover`)
- Detects 429 errors from Google Custom Search API
- Returns a specific error code `QUOTA_EXCEEDED` to the client
- Includes detailed error information for debugging

### Client-Side (`googleBooksApi.ts`)
- Tracks quota status in memory (`isQuotaExceeded` flag)
- When quota is exceeded:
  - Skips Google Custom Search API calls for 24 hours
  - Goes directly to fallback methods (OpenLibrary → Google Books)
  - Logs clear messages about using fallback methods
- Automatically resets after 24 hours

### Fallback Strategy
When Google Custom Search quota is exceeded, the system uses this fallback order:

1. **Check cache** (in-memory) - Free, instant
2. **Check database** - Free, prevents duplicate API calls
3. **Skip Google Custom Search** - Quota exceeded
4. **Try OpenLibrary API** - Free, no quota limits
5. **Try Google Books API** - Free, no quota limits
6. **Use best available** - Even if low-resolution

## Cost Impact
- **Normal operation**: $0.005 per new book (Google Custom Search)
- **When quota exceeded**: $0.000 per book (free fallback APIs)
- **Cached books**: $0.000 per book (no API calls)

## User Experience
- **Before quota exceeded**: High-quality cover images from Google Custom Search
- **After quota exceeded**: Cover images from OpenLibrary or Google Books (may be lower quality)
- **No errors shown to user**: The system automatically handles the fallback
- **Seamless operation**: Users can continue adding books without interruption

## Monitoring
Check the console logs for these messages:
- `⚠️ Google Custom Search quota exceeded - will use fallback methods for 24 hours`
- `⚠️ Skipping Google Custom Search - quota exceeded, using fallback methods`
- `24 hours passed since quota exceeded - resetting flag`

## Quota Reset
The quota status automatically resets after 24 hours, allowing the system to try Google Custom Search again.

## Recommendations
1. **Monitor API usage** - Check Supabase Edge Function logs regularly
2. **Consider upgrading quota** - If you need more than 100 queries per day
3. **Optimize usage** - The current implementation already minimizes API calls by:
   - Checking cache first
   - Checking database before API calls
   - Making only ONE API call per book
   - Using fallback methods when quota exceeded
