
# Application Optimization Guide

This document outlines the optimizations implemented to improve the performance and efficiency of the Natively app.

## Database Optimizations

### 1. Removed `word_library` Table
**Problem:** The `word_library` table was creating unnecessary complexity and requiring joins for every word query.

**Solution:** 
- Migrated all word data to be stored directly in `user_words` table
- Made `custom_word` and `custom_emoji` NOT NULL columns
- Each user now has complete control over their words without shared dependencies
- Removed foreign key constraint to `word_library`

**Benefits:**
- Faster queries (no joins required)
- Simpler data model
- Better data privacy (no shared word data)
- Reduced database complexity

### 2. Added Performance Indexes
**New Indexes:**
```sql
-- User words optimizations
CREATE INDEX idx_user_words_child_created ON user_words (child_id, created_at DESC);
CREATE INDEX idx_user_words_child_status ON user_words (child_id, is_spoken, is_recognised, is_recorded);
CREATE UNIQUE INDEX idx_user_words_child_word_unique ON user_words (child_id, LOWER(custom_word));

-- Moments optimizations
CREATE INDEX idx_moments_child_created ON moments (child_id, created_at DESC);
CREATE INDEX idx_moments_word_created ON moments (word_id, created_at DESC);

-- Books optimizations
CREATE INDEX idx_user_books_child_created ON user_books (child_id, created_at DESC);
CREATE INDEX idx_user_books_child_custom ON user_books (child_id, is_custom_for_user) WHERE is_custom_for_user = true;
CREATE INDEX idx_books_library_cover ON books_library (id) INCLUDE (title, authors, cover_url, thumbnail_url, source);
```

**Benefits:**
- Faster sorting and filtering
- Optimized queries for common access patterns
- Covering indexes reduce table lookups
- Partial indexes for custom books reduce index size

## React Component Optimizations

### 1. Memoization
**Implementation:**
- Used `React.memo` for `BookCard` component to prevent unnecessary re-renders
- Used `useMemo` for expensive computations (URI extraction, blank pattern checking)
- Used `useCallback` for event handlers to maintain referential equality

**Benefits:**
- Reduced re-renders
- Better performance when scrolling through lists
- Lower memory usage

### 2. Image Loading Optimizations
**Improvements:**
- Added validation cache to avoid redundant URL checks
- Implemented proper `expo-image` caching strategies (`memory-disk`)
- Added image dimension validation
- Optimized placeholder rendering

**Benefits:**
- Faster image loading
- Reduced network requests
- Better perceived performance
- Lower memory usage

### 3. Query Optimizations
**Changes:**
- Removed unnecessary joins in word queries
- Optimized book queries to use indexes
- Batch signed URL generation for custom book covers
- Used `Promise.all` for parallel async operations

**Benefits:**
- Faster data fetching
- Reduced database load
- Better user experience

## Code Quality Improvements

### 1. Simplified Data Flow
- Removed complex word_library lookup logic
- Direct access to user-specific word data
- Cleaner component code

### 2. Better Error Handling
- Added proper error logging
- Graceful fallbacks for failed operations
- User-friendly error messages

### 3. Performance Monitoring
- Added console logs for debugging
- Cache statistics available for monitoring
- Performance metrics for image validation

## Migration Guide

### For Existing Data
The migration automatically:
1. Copies word data from `word_library` to `user_words.custom_word` and `custom_emoji`
2. Removes the foreign key constraint
3. Drops the `word_library` table
4. Adds new indexes for better performance

### For New Installations
- No `word_library` table is created
- Words are stored directly in `user_words`
- All indexes are created automatically

## Best Practices

### When Adding Words
```typescript
// Old way (with word_library)
// 1. Check if word exists in word_library
// 2. Create word in word_library if not exists
// 3. Create user_words entry with word_id

// New way (optimized)
// 1. Check if user already has the word (case-insensitive)
// 2. Create user_words entry directly with custom_word and custom_emoji
```

### When Querying Words
```typescript
// Old way
const { data } = await supabase
  .from('user_words')
  .select(`
    *,
    word_library (word, emoji)
  `)
  .eq('child_id', childId);

// New way (optimized)
const { data } = await supabase
  .from('user_words')
  .select('id, child_id, custom_word, custom_emoji, color, is_spoken, is_recognised, is_recorded, created_at, updated_at')
  .eq('child_id', childId);
```

### Image Validation
```typescript
// Use the optimized ValidatedImage component
<ValidatedImage
  source={{ uri: imageUrl }}
  fallbackTitle={book.title}
  minWidth={50}
  minHeight={50}
  cachePolicy="memory-disk"
  priority="high"
  transition={200}
  onValidationFailed={() => handleError()}
/>
```

## Performance Metrics

### Expected Improvements
- **Word queries:** 40-60% faster (no joins)
- **Image loading:** 30-50% faster (caching + validation)
- **List rendering:** 20-30% faster (memoization)
- **Database size:** 10-15% smaller (removed word_library)

### Monitoring
- Check cache statistics: `getCacheStats()`
- Monitor query performance in Supabase dashboard
- Use React DevTools Profiler for component performance

## Future Optimizations

### Potential Improvements
1. Implement virtual scrolling for large lists
2. Add progressive image loading with blurhash
3. Implement offline-first data sync
4. Add request deduplication for API calls
5. Optimize video thumbnail generation

### Database
1. Add materialized views for complex queries
2. Implement database-level caching
3. Add full-text search indexes
4. Optimize RLS policies

## Troubleshooting

### If queries are slow
1. Check if indexes are being used: `EXPLAIN ANALYZE <query>`
2. Verify RLS policies are not causing performance issues
3. Check for missing indexes on foreign keys

### If images are not loading
1. Clear validation cache: `clearValidationCache()`
2. Check network connectivity
3. Verify image URLs are valid
4. Check Supabase storage permissions

### If app is using too much memory
1. Reduce image cache size in expo-image config
2. Clear validation cache periodically
3. Implement pagination for large lists
4. Use FlatList instead of ScrollView for long lists

## Conclusion

These optimizations significantly improve the app's performance, reduce complexity, and provide a better user experience. The removal of the `word_library` table simplifies the data model while maintaining all functionality and improving privacy.
