
# Google Custom Search API Quota Handling

## Problem
The Google Custom Search API has a daily quota limit (100 queries per day for free tier). When this quota is exceeded, the API returns a 429 error, causing the book scanning feature to fail. Additionally, API calls can sometimes hang indefinitely, causing the app to appear frozen.

## Solution
We've implemented a robust error handling and fallback mechanism that:

1. **Detects quota exceeded errors** - Both HTTP 429 status codes and error messages in the response body
2. **Automatically switches to fallback methods** - Uses free APIs (OpenLibrary and Google Books) when quota is exceeded
3. **Caches the quota status** - Prevents repeated failed API calls for 24 hours
4. **Provides seamless user experience** - Users can still add books even when quota is exceeded
5. **Implements timeouts** - All API calls have a 10-second timeout to prevent infinite loading
6. **Persistent quota tracking** - Quota status is saved to AsyncStorage and persists across app restarts

## How It Works

### Timeout Protection
All API calls are wrapped with a 10-second timeout using the `withTimeout` function:
- If an API call takes longer than 10 seconds, it's automatically cancelled
- The system logs the timeout and continues to the next fallback method
- This prevents the app from hanging indefinitely

### Edge Function (`search-book-cover`)
- Detects 429 errors from Google Custom Search API
- Returns a specific error code `QUOTA_EXCEEDED` to the client
- Includes detailed error information for debugging

### Client-Side (`googleBooksApi.ts`)
- Tracks quota status in memory (`isQuotaExceeded` flag)
- Persists quota status to AsyncStorage for cross-session tracking
- When quota is exceeded:
  - Skips Google Custom Search API calls for 24 hours
  - Goes directly to fallback methods (OpenLibrary → Google Books)
  - Logs clear messages about using fallback methods
- Automatically resets after 24 hours
- All API calls have timeout protection

### Fallback Strategy
When Google Custom Search quota is exceeded, the system uses this fallback order:

1. **Check cache** (in-memory) - Free, instant
2. **Check database** - Free, prevents duplicate API calls (5s timeout)
3. **Skip Google Custom Search** - Quota exceeded
4. **Try OpenLibrary API** - Free, no quota limits (10s timeout)
5. **Try Google Books API** - Free, no quota limits (10s timeout)
6. **Use best available** - Even if low-resolution

### Error Handling
All API calls are wrapped in try-catch blocks with specific error handling:
- **Timeout errors**: Logged and gracefully handled, continues to next fallback
- **Network errors**: Logged and gracefully handled, continues to next fallback
- **Quota errors**: Detected and quota status is updated
- **Resolution check errors**: Logged but doesn't prevent using the image

## Cost Impact
- **Normal operation**: $0.005 per new book (Google Custom Search)
- **When quota exceeded**: $0.000 per book (free fallback APIs)
- **Cached books**: $0.000 per book (no API calls)

## User Experience
- **Before quota exceeded**: High-quality cover images from Google Custom Search
- **After quota exceeded**: Cover images from OpenLibrary or Google Books (may be lower quality)
- **No errors shown to user**: The system automatically handles the fallback
- **Seamless operation**: Users can continue adding books without interruption
- **No infinite loading**: All API calls timeout after 10 seconds maximum

## Monitoring
Check the console logs for these messages:
- `⚠️ Google Custom Search quota exceeded - will use fallback methods for 24 hours`
- `⚠️ Skipping Google Custom Search - quota exceeded, using fallback methods`
- `✅ 24 hours passed since quota exceeded - resetting flag`
- `Request timeout` - API call took too long and was cancelled
- `📦 Loaded quota state from storage` - Quota status loaded from AsyncStorage
- `💾 Saved quota state to storage` - Quota status saved to AsyncStorage

## Quota Reset
The quota status automatically resets after 24 hours, allowing the system to try Google Custom Search again. The quota status is persisted across app restarts using AsyncStorage.

## Recommendations
1. **Monitor API usage** - Check Supabase Edge Function logs regularly
2. **Consider upgrading quota** - If you need more than 100 queries per day
3. **Optimize usage** - The current implementation already minimizes API calls by:
   - Checking cache first
   - Checking database before API calls
   - Making only ONE API call per book
   - Using fallback methods when quota exceeded
   - Implementing timeouts to prevent hanging
   - Persisting quota status across sessions

## Troubleshooting

### Issue: ISBN scanning keeps loading forever
**Cause**: API calls are timing out or hanging
**Solution**: The timeout mechanism (10 seconds) should prevent this. If it still happens:
1. Check console logs for timeout messages
2. Verify network connectivity
3. Check if the Edge Function is responding
4. Try restarting the app

### Issue: Books are added without cover images
**Cause**: All API methods failed or timed out
**Solution**: This is expected behavior when:
1. Google Custom Search quota is exceeded
2. OpenLibrary doesn't have the cover
3. Google Books doesn't have the cover
4. Network issues prevent API calls
The book is still added successfully, just without a cover image.

### Issue: Quota status doesn't reset after 24 hours
**Cause**: AsyncStorage might not be working correctly
**Solution**: 
1. Clear app data and restart
2. Check console logs for AsyncStorage errors
3. The quota status should automatically reset after 24 hours
