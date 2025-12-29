
import { supabase } from '@/app/integrations/supabase/client';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface GoogleBook {
  id: string;
  volumeInfo: {
    title: string;
    authors?: string[];
    description?: string;
    publishedDate?: string;
    pageCount?: number;
    imageLinks?: {
      thumbnail?: string;
      smallThumbnail?: string;
      small?: string;
      medium?: string;
      large?: string;
      extraLarge?: string;
    };
    industryIdentifiers?: {
      type: string;
      identifier: string;
    }[];
  };
}

export interface OpenLibraryBook {
  key: string;
  title: string;
  author_name?: string[];
  first_publish_year?: number;
  isbn?: string[];
  cover_i?: number;
  number_of_pages_median?: number;
}

export interface OpenLibraryBookDetails {
  title: string;
  authors?: { name: string }[];
  description?: string | { value: string };
  publish_date?: string;
  number_of_pages?: number;
  covers?: number[];
  isbn_13?: string[];
  isbn_10?: string[];
}

export interface DoubanBook {
  id: string;
  title: string;
  subtitle?: string;
  author?: string[];
  translator?: string[];
  publisher?: string;
  pubdate?: string;
  pages?: string;
  summary?: string;
  images?: {
    small?: string;
    medium?: string;
    large?: string;
  };
  isbn13?: string;
  isbn10?: string;
}

export interface WorldCatBook {
  title?: string;
  creator?: string;
  date?: string;
  extent?: string;
  summary?: string[];
  oclcNumber?: string;
}

export interface BookSearchResult {
  googleBooksId: string;
  title: string;
  authors: string;
  coverUrl: string;
  thumbnailUrl: string;
  description: string;
  publishedDate: string;
  pageCount: number;
  source?: 'google' | 'openlibrary' | 'googlecustomsearch' | 'douban' | 'worldcat';
}

interface GoogleCustomSearchResult {
  items?: {
    link: string;
    image?: {
      thumbnailLink: string;
      width?: number;
      height?: number;
    };
    mime?: string;
  }[];
}

// In-memory cache to prevent duplicate API calls during the same session
const coverUrlCache = new Map<string, { coverUrl: string; thumbnailUrl: string; source: string; timestamp: number }>();
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour

// Search results cache for faster dropdown performance
const searchResultsCache = new Map<string, { results: BookSearchResult[]; timestamp: number }>();
const SEARCH_CACHE_DURATION = 1000 * 60 * 5; // 5 minutes

// AsyncStorage keys
const QUOTA_EXCEEDED_KEY = '@google_custom_search_quota_exceeded';
const QUOTA_EXCEEDED_TIMESTAMP_KEY = '@google_custom_search_quota_timestamp';

// Track if Google Custom Search quota is exceeded
let isQuotaExceeded = false;
let quotaExceededTimestamp = 0;
const QUOTA_RESET_DURATION = 1000 * 60 * 60 * 24; // 24 hours

// Timeout for API calls
const API_TIMEOUT = 10000; // 10 seconds

/**
 * Creates a promise that rejects after a timeout
 */
function createTimeout(ms: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Request timeout')), ms);
  });
}

/**
 * Wraps a promise with a timeout
 */
async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([promise, createTimeout(timeoutMs)]);
}

/**
 * Loads quota exceeded state from AsyncStorage
 */
async function loadQuotaState(): Promise<void> {
  try {
    const [exceeded, timestamp] = await Promise.all([
      AsyncStorage.getItem(QUOTA_EXCEEDED_KEY),
      AsyncStorage.getItem(QUOTA_EXCEEDED_TIMESTAMP_KEY),
    ]);

    if (exceeded === 'true' && timestamp) {
      isQuotaExceeded = true;
      quotaExceededTimestamp = parseInt(timestamp, 10);
      console.log('📦 Loaded quota state from storage:', {
        exceeded: isQuotaExceeded,
        timestamp: new Date(quotaExceededTimestamp).toISOString(),
      });
    }
  } catch (error) {
    console.error('Error loading quota state:', error);
  }
}

/**
 * Saves quota exceeded state to AsyncStorage
 */
async function saveQuotaState(exceeded: boolean, timestamp: number): Promise<void> {
  try {
    await Promise.all([
      AsyncStorage.setItem(QUOTA_EXCEEDED_KEY, exceeded.toString()),
      AsyncStorage.setItem(QUOTA_EXCEEDED_TIMESTAMP_KEY, timestamp.toString()),
    ]);
    console.log('💾 Saved quota state to storage:', {
      exceeded,
      timestamp: new Date(timestamp).toISOString(),
    });
  } catch (error) {
    console.error('Error saving quota state:', error);
  }
}

/**
 * Checks if Google Custom Search quota is currently exceeded
 */
async function isGoogleCustomSearchAvailable(): Promise<boolean> {
  // Load state from storage on first check
  if (!isQuotaExceeded && quotaExceededTimestamp === 0) {
    await loadQuotaState();
  }

  if (!isQuotaExceeded) {
    return true;
  }

  // Check if 24 hours have passed since quota was exceeded
  const now = Date.now();
  if (now - quotaExceededTimestamp > QUOTA_RESET_DURATION) {
    console.log('✅ 24 hours passed since quota exceeded - resetting flag');
    isQuotaExceeded = false;
    quotaExceededTimestamp = 0;
    await saveQuotaState(false, 0);
    return true;
  }

  const hoursRemaining = Math.ceil((QUOTA_RESET_DURATION - (now - quotaExceededTimestamp)) / (1000 * 60 * 60));
  console.log(`⚠️ Google Custom Search quota still exceeded - ${hoursRemaining} hours until reset`);
  return false;
}

/**
 * Marks Google Custom Search as quota exceeded
 */
async function markQuotaExceeded(): Promise<void> {
  const now = Date.now();
  console.log('⚠️ Google Custom Search quota exceeded - will use fallback methods for 24 hours');
  isQuotaExceeded = true;
  quotaExceededTimestamp = now;
  await saveQuotaState(true, now);
}

/**
 * Checks if a book already exists in the database
 * This prevents unnecessary API calls for books we've already processed
 */
async function checkBookInDatabase(googleBooksId: string): Promise<{ coverUrl: string; thumbnailUrl: string; source: string } | null> {
  try {
    console.log('🔍 Checking database for book:', googleBooksId);
    
    const { data, error } = await withTimeout(
      supabase
        .from('books_library')
        .select('cover_url, thumbnail_url')
        .eq('google_books_id', googleBooksId)
        .single(),
      5000 // 5 second timeout for database query
    );

    if (error) {
      if (error.code === 'PGRST116') {
        // Book not found in database
        console.log('❌ Book not found in database');
        return null;
      }
      throw error;
    }

    if (data && data.cover_url) {
      console.log('✅ Book found in database with cover URL');
      return {
        coverUrl: data.cover_url,
        thumbnailUrl: data.thumbnail_url || data.cover_url,
        source: 'database',
      };
    }

    return null;
  } catch (error) {
    console.error('Error checking book in database:', error);
    return null;
  }
}

/**
 * Checks if an image URL is high resolution (>=800px in both dimensions)
 * @param imageUrl - The URL of the image to check
 * @returns Promise<boolean> - True if high resolution, false otherwise
 */
async function isHighResolution(imageUrl: string): Promise<boolean> {
  try {
    console.log('🔍 Checking image resolution for:', imageUrl);
    
    // Get the current session to include auth token
    const { data: { session } } = await supabase.auth.getSession();
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add authorization header if user is logged in
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }

    // Call the Edge Function to check image dimensions with timeout
    const response = await withTimeout(
      fetch(
        'https://vxglluxqhceajceizbbm.supabase.co/functions/v1/check-image-resolution',
        {
          method: 'POST',
          headers,
          body: JSON.stringify({ imageUrl }),
        }
      ),
      API_TIMEOUT
    );

    if (!response.ok) {
      console.error('Edge Function error:', response.status);
      return false;
    }

    const data = await response.json();
    
    if (!data.width || !data.height) {
      console.log('Could not determine image dimensions');
      return false;
    }

    const isHighRes = data.width >= 800 && data.height >= 800;
    console.log(`Image dimensions: ${data.width}x${data.height} - High res: ${isHighRes}`);
    
    return isHighRes;
  } catch (error) {
    if (error instanceof Error && error.message === 'Request timeout') {
      console.error('Image resolution check timed out');
    } else {
      console.error('Error checking image resolution:', error);
    }
    return false;
  }
}

/**
 * Gets cover URL from OpenLibrary API
 * @param isbn - The ISBN of the book
 * @returns Promise<string | null> - The cover URL or null
 */
async function getOpenLibraryCover(isbn: string): Promise<string | null> {
  try {
    const cleanISBN = isbn.replace(/[-\s]/g, '');
    console.log('📚 Trying OpenLibrary API for ISBN:', cleanISBN);
    
    // OpenLibrary provides different sizes: S (small), M (medium), L (large)
    // We'll try large first
    const coverUrl = `https://covers.openlibrary.org/b/isbn/${cleanISBN}-L.jpg`;
    
    // Check if the cover exists by making a HEAD request with timeout
    const response = await withTimeout(
      fetch(coverUrl, { method: 'HEAD' }),
      API_TIMEOUT
    );
    
    if (response.ok) {
      console.log('✅ Found cover on OpenLibrary');
      return coverUrl;
    }
    
    console.log('❌ No cover found on OpenLibrary');
    return null;
  } catch (error) {
    if (error instanceof Error && error.message === 'Request timeout') {
      console.error('OpenLibrary API timed out');
    } else {
      console.error('Error fetching OpenLibrary cover:', error);
    }
    return null;
  }
}

/**
 * Gets cover URL from Google Books API
 * @param volumeInfo - The volume info from Google Books
 * @returns string | null - The best available cover URL or null
 */
function getGoogleBooksCover(volumeInfo: GoogleBook['volumeInfo']): string | null {
  const imageLinks = volumeInfo.imageLinks;
  
  if (!imageLinks) {
    return null;
  }

  // Try to get the highest resolution image available
  // Priority: extraLarge > large > medium > small > thumbnail > smallThumbnail
  const coverUrl = 
    imageLinks.extraLarge ||
    imageLinks.large ||
    imageLinks.medium ||
    imageLinks.small ||
    imageLinks.thumbnail ||
    imageLinks.smallThumbnail ||
    null;

  if (coverUrl) {
    console.log('📚 Found cover on Google Books API');
    // Remove zoom parameter and set to highest quality
    return coverUrl.replace(/&zoom=\d+/, '').replace(/zoom=\d+/, '') + '&zoom=0';
  }

  return null;
}

/**
 * Searches Google Custom Search API for book cover images via Supabase Edge Function
 * This keeps API keys secure on the server side
 * 
 * COST: $0.005 per API call
 * 
 * This function is called ONLY ONCE when:
 * - A book is not found in the database
 * - We need to fetch a high-quality cover image
 * - Quota is not exceeded
 * 
 * @param query - The search query
 * @param fileType - File type filter (jpg or png)
 */
async function searchGoogleCustomSearch(
  query: string,
  fileType: 'jpg' | 'png' = 'jpg'
): Promise<{ coverUrl: string; thumbnailUrl: string } | null> {
  try {
    // Check if quota is exceeded
    const isAvailable = await isGoogleCustomSearchAvailable();
    if (!isAvailable) {
      console.log('⚠️ Skipping Google Custom Search - quota exceeded');
      return null;
    }

    console.log('💰 Calling Google Custom Search API (Cost: $0.005)');
    console.log('Query:', query, 'FileType:', fileType);

    // Get the current session to include auth token
    const { data: { session } } = await supabase.auth.getSession();
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add authorization header if user is logged in
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }

    // Call the Supabase Edge Function instead of making direct API calls
    // This keeps the API keys secure on the server
    const response = await withTimeout(
      fetch(
        'https://vxglluxqhceajceizbbm.supabase.co/functions/v1/search-book-cover',
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            query,
            fileType,
          }),
        }
      ),
      API_TIMEOUT
    );

    // Handle quota exceeded error
    if (response.status === 429) {
      console.error('⚠️ Google Custom Search API quota exceeded (429)');
      const errorData = await response.json();
      console.error('Error details:', errorData);
      
      // Mark quota as exceeded
      await markQuotaExceeded();
      
      return null;
    }

    if (!response.ok) {
      console.error('Edge Function error:', response.status);
      const errorText = await response.text();
      console.error('Error details:', errorText);
      
      // Try to parse error response to check for quota exceeded
      try {
        const errorData = JSON.parse(errorText);
        if (errorData.error === 'QUOTA_EXCEEDED') {
          console.error('⚠️ Quota exceeded detected in error response');
          await markQuotaExceeded();
        }
      } catch (e) {
        console.error('Could not parse error response:', e);
      }
      
      return null;
    }

    const data = await response.json();

    if (!data.coverUrl) {
      console.log('No results from Google Custom Search for query:', query);
      return null;
    }

    console.log('✅ Google Custom Search API call successful');
    console.log('Cover URL found:', data.coverUrl);

    return {
      coverUrl: data.coverUrl,
      thumbnailUrl: data.thumbnailUrl || data.coverUrl,
    };
  } catch (error) {
    if (error instanceof Error && error.message === 'Request timeout') {
      console.error('Google Custom Search API timed out');
    } else {
      console.error('Error searching Google Custom Search:', error);
    }
    return null;
  }
}

/**
 * Gets the best available cover image URL with fallback mechanism
 * 
 * This function implements a cascading fallback strategy:
 * 1. Check in-memory cache (prevents duplicate calls in same session)
 * 2. Check database (prevents API calls for existing books)
 * 3. If Douban cover is provided (for Chinese ISBNs), prioritize it
 * 4. Try Google Custom Search API ONCE (primary method) - ONLY if quota not exceeded
 *    - Only tries ONE query with the best parameters
 *    - If successful and high-res (>=800px), use it
 *    - If low-res (<800px), continue to fallbacks
 *    - If quota exceeded (429), skip and go to fallbacks
 * 5. Try OpenLibrary API (fallback #1)
 *    - If successful and high-res, use it
 * 6. Try Google Books API (fallback #2)
 *    - If successful and high-res, use it
 * 7. If all fail or return low-res, use the best available (even if low-res)
 * 
 * COST: Maximum $0.005 per book (1 Google Custom Search call)
 * In practice: Usually $0.000 per book (cached or in database)
 * When quota exceeded: $0.000 per book (uses free fallback APIs)
 */
async function getBestCoverUrl(
  isbn: string | undefined,
  title: string,
  author: string,
  volumeInfo?: GoogleBook['volumeInfo'],
  googleBooksId?: string,
  doubanCoverUrl?: string
): Promise<{ coverUrl: string; thumbnailUrl: string; source: string }> {
  console.log('📚 Starting cover image search for:', title);
  
  // Create a cache key based on the book's unique identifiers
  const cacheKey = googleBooksId || isbn || `${title}-${author}`;
  
  // Step 1: Check in-memory cache
  const cached = coverUrlCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
    console.log('✅ Using cached cover URL');
    return {
      coverUrl: cached.coverUrl,
      thumbnailUrl: cached.thumbnailUrl,
      source: cached.source,
    };
  }
  
  // Step 2: Check database first
  if (googleBooksId) {
    try {
      const dbResult = await checkBookInDatabase(googleBooksId);
      if (dbResult) {
        // Cache the result
        coverUrlCache.set(cacheKey, {
          ...dbResult,
          timestamp: Date.now(),
        });
        return dbResult;
      }
    } catch (error) {
      console.error('Error checking database:', error);
      // Continue to other methods
    }
  }
  
  let bestCoverUrl = '';
  let bestThumbnailUrl = '';
  let bestSource = 'none';
  
  // Step 3: PRIORITIZE DOUBAN COVER for Chinese ISBNs
  if (doubanCoverUrl) {
    console.log('🇨🇳 Douban cover provided, checking quality...');
    try {
      const isHighRes = await isHighResolution(doubanCoverUrl);
      if (isHighRes) {
        console.log('✅ High-res cover found on Douban API - using it!');
        const finalResult = {
          coverUrl: doubanCoverUrl,
          thumbnailUrl: doubanCoverUrl,
          source: 'douban',
        };
        // Cache the result
        coverUrlCache.set(cacheKey, {
          ...finalResult,
          timestamp: Date.now(),
        });
        return finalResult;
      } else {
        console.log('⚠️ Low-res cover from Douban, will try other sources');
        bestCoverUrl = doubanCoverUrl;
        bestThumbnailUrl = doubanCoverUrl;
        bestSource = 'douban';
      }
    } catch (error) {
      console.error('Error checking Douban cover resolution, using it anyway:', error);
      // Use the Douban cover even if resolution check fails
      bestCoverUrl = doubanCoverUrl;
      bestThumbnailUrl = doubanCoverUrl;
      bestSource = 'douban';
    }
  }
  
  // Step 4: Try Google Custom Search API ONCE (primary method) - ONLY if quota not exceeded
  // Only make ONE API call with the best query parameters
  const isAvailable = await isGoogleCustomSearchAvailable();
  if (isbn && title && author && isAvailable) {
    const query = `${isbn} ${title} ${author} book cover`;
    console.log('Attempt: Google Custom Search (SINGLE CALL)');
    
    try {
      // Try JPG first (most common format for book covers)
      const result = await searchGoogleCustomSearch(query, 'jpg');
      if (result) {
        // Check if it's high resolution (with timeout protection)
        try {
          const isHighRes = await isHighResolution(result.coverUrl);
          if (isHighRes) {
            console.log('✅ High-res cover found on Google Custom Search');
            const finalResult = { ...result, source: 'googlecustomsearch' };
            // Cache the result
            coverUrlCache.set(cacheKey, {
              ...finalResult,
              timestamp: Date.now(),
            });
            return finalResult;
          } else {
            console.log('⚠️ Low-res cover from Google Custom Search, will try fallbacks');
            if (!bestCoverUrl) {
              bestCoverUrl = result.coverUrl;
              bestThumbnailUrl = result.thumbnailUrl;
              bestSource = 'googlecustomsearch';
            }
          }
        } catch (error) {
          console.error('Error checking resolution, using result anyway:', error);
          // Use the result even if resolution check fails
          if (!bestCoverUrl) {
            bestCoverUrl = result.coverUrl;
            bestThumbnailUrl = result.thumbnailUrl;
            bestSource = 'googlecustomsearch';
          }
        }
      }
    } catch (error) {
      console.error('Error in Google Custom Search, continuing to fallbacks:', error);
    }
  } else if (!isAvailable) {
    console.log('⚠️ Skipping Google Custom Search - quota exceeded, using fallback methods');
  }

  // Step 5: Try OpenLibrary API (fallback #1)
  if (isbn) {
    console.log('Attempt: Trying OpenLibrary API');
    try {
      const openLibraryCover = await getOpenLibraryCover(isbn);
      if (openLibraryCover) {
        try {
          const isHighRes = await isHighResolution(openLibraryCover);
          if (isHighRes) {
            console.log('✅ High-res cover found on OpenLibrary');
            const finalResult = {
              coverUrl: openLibraryCover,
              thumbnailUrl: openLibraryCover,
              source: 'openlibrary',
            };
            // Cache the result
            coverUrlCache.set(cacheKey, {
              ...finalResult,
              timestamp: Date.now(),
            });
            return finalResult;
          } else if (!bestCoverUrl) {
            console.log('⚠️ Low-res cover from OpenLibrary');
            bestCoverUrl = openLibraryCover;
            bestThumbnailUrl = openLibraryCover;
            bestSource = 'openlibrary';
          }
        } catch (error) {
          console.error('Error checking resolution, using result anyway:', error);
          if (!bestCoverUrl) {
            bestCoverUrl = openLibraryCover;
            bestThumbnailUrl = openLibraryCover;
            bestSource = 'openlibrary';
          }
        }
      }
    } catch (error) {
      console.error('Error in OpenLibrary API, continuing to next fallback:', error);
    }
  }

  // Step 6: Try Google Books API (fallback #2)
  if (volumeInfo) {
    console.log('Attempt: Trying Google Books API');
    try {
      const googleBooksCover = getGoogleBooksCover(volumeInfo);
      if (googleBooksCover) {
        try {
          const isHighRes = await isHighResolution(googleBooksCover);
          if (isHighRes) {
            console.log('✅ High-res cover found on Google Books API');
            const finalResult = {
              coverUrl: googleBooksCover,
              thumbnailUrl: googleBooksCover,
              source: 'google',
            };
            // Cache the result
            coverUrlCache.set(cacheKey, {
              ...finalResult,
              timestamp: Date.now(),
            });
            return finalResult;
          } else if (!bestCoverUrl) {
            console.log('⚠️ Low-res cover from Google Books API');
            bestCoverUrl = googleBooksCover;
            bestThumbnailUrl = googleBooksCover;
            bestSource = 'google';
          }
        } catch (error) {
          console.error('Error checking resolution, using result anyway:', error);
          if (!bestCoverUrl) {
            bestCoverUrl = googleBooksCover;
            bestThumbnailUrl = googleBooksCover;
            bestSource = 'google';
          }
        }
      }
    } catch (error) {
      console.error('Error in Google Books API:', error);
    }
  }

  // Return the best available cover (even if low-res)
  if (bestCoverUrl) {
    console.log(`⚠️ Returning best available cover (low-res) from ${bestSource}`);
    const finalResult = {
      coverUrl: bestCoverUrl,
      thumbnailUrl: bestThumbnailUrl,
      source: bestSource,
    };
    // Cache the result
    coverUrlCache.set(cacheKey, {
      ...finalResult,
      timestamp: Date.now(),
    });
    return finalResult;
  }

  // No cover found
  console.log('❌ No cover image available from any source');
  return { coverUrl: '', thumbnailUrl: '', source: 'none' };
}

/**
 * Extracts ISBN from Google Books volume info
 */
function extractISBN(volumeInfo: GoogleBook['volumeInfo']): string | undefined {
  if (!volumeInfo.industryIdentifiers) return undefined;
  
  // Prefer ISBN-13, fallback to ISBN-10
  const isbn13 = volumeInfo.industryIdentifiers.find(id => id.type === 'ISBN_13');
  if (isbn13) return isbn13.identifier;
  
  const isbn10 = volumeInfo.industryIdentifiers.find(id => id.type === 'ISBN_10');
  if (isbn10) return isbn10.identifier;
  
  return undefined;
}

/**
 * Determines the ISBN prefix to route to the appropriate API
 * @param isbn - The ISBN to check
 * @returns The ISBN prefix type
 */
function getISBNPrefix(isbn: string): 'china' | 'english' | 'other' {
  const cleanISBN = isbn.replace(/[-\s]/g, '');
  
  // Check for Mainland China ISBN (978-7)
  if (cleanISBN.startsWith('9787')) {
    console.log('🇨🇳 Detected Mainland China ISBN (978-7)');
    return 'china';
  }
  
  // Check for English-language ISBN (978-0 or 978-1)
  if (cleanISBN.startsWith('9780') || cleanISBN.startsWith('9781')) {
    console.log('🇬🇧 Detected English-language ISBN (978-0/978-1)');
    return 'english';
  }
  
  console.log('🌍 Detected other ISBN prefix');
  return 'other';
}

/**
 * Searches Douban API for a book by ISBN
 * Used for Mainland China books (978-7)
 * 
 * @param isbn - The ISBN to search for
 * @returns Promise<BookSearchResult | null> - Book data or null
 */
async function searchDoubanAPI(isbn: string): Promise<BookSearchResult | null> {
  try {
    const cleanISBN = isbn.replace(/[-\s]/g, '');
    console.log('🇨🇳 Searching Douban API for ISBN:', cleanISBN);
    
    // Douban API endpoint
    const response = await withTimeout(
      fetch(`https://api.douban.com/v2/book/isbn/${cleanISBN}`),
      API_TIMEOUT
    );

    if (!response.ok) {
      console.log('❌ Douban API error:', response.status);
      return null;
    }

    const data: DoubanBook = await response.json();

    if (!data || !data.title) {
      console.log('❌ No book data from Douban API');
      return null;
    }

    console.log('✅ Found book on Douban API:', data.title);

    const title = data.title + (data.subtitle ? `: ${data.subtitle}` : '');
    const authors = data.author?.join(', ') || 'Unknown Author';
    const googleBooksId = `douban-${data.id}`;
    
    // Get the best Douban cover image (prioritize large, then medium, then small)
    const doubanCoverUrl = data.images?.large || data.images?.medium || data.images?.small || '';
    
    console.log('🇨🇳 Douban cover URL:', doubanCoverUrl);
    
    // Get cover image using our existing flow, but pass Douban cover for prioritization
    const { coverUrl, thumbnailUrl, source } = await getBestCoverUrl(
      cleanISBN,
      title,
      authors,
      undefined,
      googleBooksId,
      doubanCoverUrl // Pass Douban cover to prioritize it
    );

    return {
      googleBooksId,
      title,
      authors,
      coverUrl,
      thumbnailUrl,
      description: data.summary || '',
      publishedDate: data.pubdate || '',
      pageCount: data.pages ? parseInt(data.pages, 10) : 0,
      source: source as 'google' | 'openlibrary' | 'googlecustomsearch' | 'douban' | 'worldcat',
    };
  } catch (error) {
    if (error instanceof Error && error.message === 'Request timeout') {
      console.error('❌ Douban API timed out');
    } else {
      console.error('❌ Error searching Douban API:', error);
    }
    return null;
  }
}

/**
 * Searches WorldCat API for a book by ISBN
 * Used for English-language books (978-0/978-1)
 * 
 * Note: WorldCat API requires authentication. This is a placeholder implementation.
 * You'll need to set up WorldCat API credentials and implement proper authentication.
 * 
 * @param isbn - The ISBN to search for
 * @returns Promise<BookSearchResult | null> - Book data or null
 */
async function searchWorldCatAPI(isbn: string): Promise<BookSearchResult | null> {
  try {
    const cleanISBN = isbn.replace(/[-\s]/g, '');
    console.log('🌍 Searching WorldCat API for ISBN:', cleanISBN);
    
    // WorldCat Search API endpoint (requires API key)
    // Note: This is a simplified example. WorldCat API requires proper authentication.
    // You'll need to implement OAuth or API key authentication based on your WorldCat subscription.
    
    // For now, we'll return null and let it fall back to other APIs
    // TODO: Implement WorldCat API authentication and search
    console.log('⚠️ WorldCat API not yet implemented - falling back to other APIs');
    return null;

    /* Example implementation when WorldCat API is set up:
    
    const response = await withTimeout(
      fetch(`https://www.worldcat.org/webservices/catalog/content/isbn/${cleanISBN}?wskey=YOUR_API_KEY`, {
        headers: {
          'Accept': 'application/json',
        },
      }),
      API_TIMEOUT
    );

    if (!response.ok) {
      console.log('❌ WorldCat API error:', response.status);
      return null;
    }

    const data: WorldCatBook = await response.json();

    if (!data || !data.title) {
      console.log('❌ No book data from WorldCat API');
      return null;
    }

    console.log('✅ Found book on WorldCat API:', data.title);

    const title = data.title;
    const authors = data.creator || 'Unknown Author';
    const googleBooksId = `worldcat-${data.oclcNumber}`;
    
    // Get cover image using our existing flow (WorldCat doesn't provide good covers)
    const { coverUrl, thumbnailUrl } = await getBestCoverUrl(
      cleanISBN,
      title,
      authors,
      undefined,
      googleBooksId
    );

    return {
      googleBooksId,
      title,
      authors,
      coverUrl,
      thumbnailUrl,
      description: data.summary?.join(' ') || '',
      publishedDate: data.date || '',
      pageCount: data.extent ? parseInt(data.extent, 10) : 0,
      source: 'worldcat',
    };
    */
  } catch (error) {
    if (error instanceof Error && error.message === 'Request timeout') {
      console.error('❌ WorldCat API timed out');
    } else {
      console.error('❌ Error searching WorldCat API:', error);
    }
    return null;
  }
}

/**
 * Searches OpenLibrary API for books
 */
async function searchOpenLibrary(query: string, limit: number = 5): Promise<BookSearchResult[]> {
  try {
    const encodedQuery = encodeURIComponent(query.trim());
    const response = await withTimeout(
      fetch(`https://openlibrary.org/search.json?q=${encodedQuery}&limit=${limit}`),
      API_TIMEOUT
    );

    if (!response.ok) {
      console.error('OpenLibrary API error:', response.status);
      return [];
    }

    const data = await response.json();

    if (!data.docs || data.docs.length === 0) {
      return [];
    }

    const results = await Promise.all(
      data.docs.map(async (doc: OpenLibraryBook) => {
        const isbn = doc.isbn?.[0];
        const title = doc.title || 'Unknown Title';
        const author = doc.author_name?.join(', ') || 'Unknown Author';
        
        // Use the work key as the ID (remove /works/ prefix)
        const bookId = doc.key.replace('/works/', '');
        const googleBooksId = `openlibrary-${bookId}`;
        
        const { coverUrl, thumbnailUrl } = await getBestCoverUrl(isbn, title, author, undefined, googleBooksId);
        
        return {
          googleBooksId,
          title,
          authors: author,
          coverUrl,
          thumbnailUrl,
          description: '',
          publishedDate: doc.first_publish_year?.toString() || '',
          pageCount: doc.number_of_pages_median || 0,
          source: 'openlibrary' as const,
        };
      })
    );

    return results.filter((book: BookSearchResult) => book.title && book.authors);
  } catch (error) {
    if (error instanceof Error && error.message === 'Request timeout') {
      console.error('OpenLibrary search timed out');
    } else {
      console.error('Error searching OpenLibrary:', error);
    }
    return [];
  }
}

/**
 * Searches OpenLibrary API for a book by ISBN
 */
async function searchOpenLibraryByISBN(isbn: string): Promise<BookSearchResult | null> {
  try {
    const cleanISBN = isbn.replace(/[-\s]/g, '');
    console.log('Searching OpenLibrary for ISBN:', cleanISBN);
    
    const response = await withTimeout(
      fetch(`https://openlibrary.org/isbn/${cleanISBN}.json`),
      API_TIMEOUT
    );

    if (!response.ok) {
      console.log('OpenLibrary ISBN not found:', response.status);
      return null;
    }

    const data: OpenLibraryBookDetails = await response.json();

    // Get the work details for more information
    let description = '';
    let authors = 'Unknown Author';
    
    if (data.authors && data.authors.length > 0) {
      authors = data.authors.map(a => a.name).join(', ');
    }

    if (typeof data.description === 'string') {
      description = data.description;
    } else if (data.description && typeof data.description === 'object' && 'value' in data.description) {
      description = data.description.value;
    }

    const title = data.title || 'Unknown Title';
    const googleBooksId = `openlibrary-${cleanISBN}`;
    const { coverUrl, thumbnailUrl, source } = await getBestCoverUrl(cleanISBN, title, authors, undefined, googleBooksId);

    return {
      googleBooksId,
      title,
      authors,
      coverUrl,
      thumbnailUrl,
      description,
      publishedDate: data.publish_date || '',
      pageCount: data.number_of_pages || 0,
      source: source as 'google' | 'openlibrary' | 'googlecustomsearch',
    };
  } catch (error) {
    if (error instanceof Error && error.message === 'Request timeout') {
      console.error('OpenLibrary ISBN search timed out');
    } else {
      console.error('Error searching OpenLibrary by ISBN:', error);
    }
    return null;
  }
}

/**
 * Searches for books by text query - OPTIMIZED FOR DROPDOWN SPEED
 * Uses Google Books API first, falls back to OpenLibrary if no results
 * 
 * OPTIMIZATIONS:
 * - Caches search results for 5 minutes
 * - Limits results to 5 items by default for faster rendering
 * - Skips cover image fetching for dropdown (only fetches when book is selected)
 * 
 * FLOW:
 * 1. Check search results cache (free, instant)
 * 2. Search Google Books API for book metadata (free)
 * 3. Return results WITHOUT fetching cover images (for speed)
 * 4. Cover images are fetched only when a book is selected
 */
export async function searchGoogleBooks(query: string, limit: number = 5): Promise<BookSearchResult[]> {
  if (!query || query.trim().length < 2) {
    return [];
  }

  // Check cache first
  const cacheKey = `${query.trim().toLowerCase()}-${limit}`;
  const cached = searchResultsCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp) < SEARCH_CACHE_DURATION) {
    console.log('✅ Using cached search results');
    return cached.results;
  }

  try {
    const encodedQuery = encodeURIComponent(query.trim());
    // Request lite projection for faster response (no need for full data in dropdown)
    const response = await withTimeout(
      fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodedQuery}&maxResults=${limit}&printType=books&projection=lite`),
      API_TIMEOUT
    );

    if (!response.ok) {
      console.error('Google Books API error:', response.status);
      // Fallback to OpenLibrary
      console.log('Falling back to OpenLibrary API');
      const results = await searchOpenLibrary(query, limit);
      // Cache the results
      searchResultsCache.set(cacheKey, { results, timestamp: Date.now() });
      return results;
    }

    const data = await response.json();

    if (!data.items || data.items.length === 0) {
      console.log('No results from Google Books, trying OpenLibrary');
      // Fallback to OpenLibrary
      const results = await searchOpenLibrary(query, limit);
      // Cache the results
      searchResultsCache.set(cacheKey, { results, timestamp: Date.now() });
      return results;
    }

    // Map results WITHOUT fetching cover images (for speed)
    const googleResults = data.items.map((item: GoogleBook) => {
      const title = item.volumeInfo.title || 'Unknown Title';
      const authors = item.volumeInfo.authors?.join(', ') || 'Unknown Author';
      
      // Use basic thumbnail from Google Books API (no additional API calls)
      const imageLinks = item.volumeInfo.imageLinks;
      const basicThumbnail = imageLinks?.thumbnail || imageLinks?.smallThumbnail || '';
      
      return {
        googleBooksId: item.id,
        title,
        authors,
        coverUrl: basicThumbnail,
        thumbnailUrl: basicThumbnail,
        description: item.volumeInfo.description || '',
        publishedDate: item.volumeInfo.publishedDate || '',
        pageCount: item.volumeInfo.pageCount || 0,
        source: 'google' as const,
      };
    });

    const results = googleResults.filter((book: BookSearchResult) => book.title && book.authors);
    
    // Cache the results
    searchResultsCache.set(cacheKey, { results, timestamp: Date.now() });
    
    return results;
  } catch (error) {
    if (error instanceof Error && error.message === 'Request timeout') {
      console.error('Google Books search timed out');
    } else {
      console.error('Error searching Google Books:', error);
    }
    // Fallback to OpenLibrary
    console.log('Error occurred, falling back to OpenLibrary API');
    const results = await searchOpenLibrary(query, limit);
    // Cache the results
    searchResultsCache.set(cacheKey, { results, timestamp: Date.now() });
    return results;
  }
}

/**
 * Fetches detailed book information with high-quality cover image
 * This is called AFTER a book is selected from the dropdown
 * 
 * @param googleBooksId - The Google Books ID
 * @returns Promise<BookSearchResult | null> - Detailed book info with high-quality cover
 */
export async function getBookDetails(googleBooksId: string): Promise<BookSearchResult | null> {
  try {
    console.log('📚 Fetching detailed book info for:', googleBooksId);
    
    // Check if it's an OpenLibrary book
    if (googleBooksId.startsWith('openlibrary-')) {
      // For OpenLibrary books, we need to fetch from OpenLibrary API
      const bookId = googleBooksId.replace('openlibrary-', '');
      // This is a simplified version - you may need to implement full OpenLibrary details fetching
      return null;
    }
    
    // Fetch from Google Books API with full projection
    const response = await withTimeout(
      fetch(`https://www.googleapis.com/books/v1/volumes/${googleBooksId}?projection=full`),
      API_TIMEOUT
    );

    if (!response.ok) {
      console.error('Google Books API error:', response.status);
      return null;
    }

    const item: GoogleBook = await response.json();
    const isbn = extractISBN(item.volumeInfo);
    const title = item.volumeInfo.title || 'Unknown Title';
    const authors = item.volumeInfo.authors?.join(', ') || 'Unknown Author';
    
    console.log('Fetching high-quality cover image...');
    
    // Fetch high-quality cover image
    const { coverUrl, thumbnailUrl, source } = await getBestCoverUrl(
      isbn,
      title,
      authors,
      item.volumeInfo,
      item.id
    );

    console.log('Book details fetched:', {
      title,
      coverUrl,
      thumbnailUrl,
      source,
    });

    return {
      googleBooksId: item.id,
      title,
      authors,
      coverUrl,
      thumbnailUrl,
      description: item.volumeInfo.description || '',
      publishedDate: item.volumeInfo.publishedDate || '',
      pageCount: item.volumeInfo.pageCount || 0,
      source: source as 'google' | 'openlibrary' | 'googlecustomsearch',
    };
  } catch (error) {
    if (error instanceof Error && error.message === 'Request timeout') {
      console.error('Book details fetch timed out');
    } else {
      console.error('Error fetching book details:', error);
    }
    return null;
  }
}

/**
 * Searches for a book by ISBN with intelligent routing based on ISBN prefix
 * 
 * ROUTING LOGIC:
 * - Mainland China (978-7): Douban API (with prioritized cover) -> Google Books API -> OpenLibrary API -> Google Custom Search
 * - English (978-0/978-1): Google Books API -> WorldCat API -> OpenLibrary API -> Google Custom Search
 * - Other ISBNs: Google Books API -> OpenLibrary API -> Google Custom Search
 * 
 * COVER IMAGE FLOW (updated for Chinese ISBNs):
 * For Chinese ISBNs (978-7):
 * 1. Douban API provides book metadata AND cover image
 * 2. getBestCoverUrl() receives the Douban cover and PRIORITIZES it
 * 3. If Douban cover is high-res, use it immediately
 * 4. Otherwise, fall back to Google Custom Search, OpenLibrary, Google Books
 * 
 * For other ISBNs:
 * 1. Checks cache
 * 2. Checks database
 * 3. Tries Google Custom Search (if quota not exceeded)
 * 4. Falls back to OpenLibrary
 * 5. Falls back to Google Books
 * 
 * @param isbn - The ISBN to search for
 * @returns Promise<BookSearchResult | null> - Book data with cover URLs or null
 */
export async function searchBookByISBN(isbn: string): Promise<BookSearchResult | null> {
  if (!isbn || isbn.trim().length === 0) {
    return null;
  }

  try {
    // Clean up ISBN (remove dashes, spaces)
    const cleanISBN = isbn.replace(/[-\s]/g, '');
    
    console.log('🔍 Searching for ISBN:', cleanISBN);
    
    // Determine ISBN prefix to route to appropriate API
    const isbnPrefix = getISBNPrefix(cleanISBN);
    
    let result: BookSearchResult | null = null;
    
    // MAINLAND CHINA ISBN (978-7)
    if (isbnPrefix === 'china') {
      console.log('📚 Route: Douban (prioritized cover) -> Google Books -> OpenLibrary -> Google Custom Search');
      
      // Try Douban API first - it will provide book data AND prioritized cover
      result = await searchDoubanAPI(cleanISBN);
      if (result) {
        console.log('✅ Book found on Douban API with prioritized cover');
        return result;
      }
      console.log('⚠️ Douban API failed, trying Google Books API');
      
      // Fall back to Google Books API
      const response = await withTimeout(
        fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${cleanISBN}&projection=full`),
        API_TIMEOUT
      );

      if (response.ok) {
        const data = await response.json();
        if (data.items && data.items.length > 0) {
          const item: GoogleBook = data.items[0];
          const itemISBN = extractISBN(item.volumeInfo) || cleanISBN;
          const title = item.volumeInfo.title || 'Unknown Title';
          const authors = item.volumeInfo.authors?.join(', ') || 'Unknown Author';
          
          console.log('✅ Found book on Google Books:', title);
          
          const { coverUrl, thumbnailUrl, source } = await getBestCoverUrl(
            itemISBN,
            title,
            authors,
            item.volumeInfo,
            item.id
          );

          return {
            googleBooksId: item.id,
            title,
            authors,
            coverUrl,
            thumbnailUrl,
            description: item.volumeInfo.description || '',
            publishedDate: item.volumeInfo.publishedDate || '',
            pageCount: item.volumeInfo.pageCount || 0,
            source: source as 'google' | 'openlibrary' | 'googlecustomsearch',
          };
        }
      }
      console.log('⚠️ Google Books API failed, trying OpenLibrary API');
      
      // Fall back to OpenLibrary
      result = await searchOpenLibraryByISBN(cleanISBN);
      if (result) {
        console.log('✅ Book found on OpenLibrary');
        return result;
      }
      
      console.log('❌ No book found for Mainland China ISBN');
      return null;
    }
    
    // ENGLISH-LANGUAGE ISBN (978-0/978-1)
    if (isbnPrefix === 'english') {
      console.log('📚 Route: Google Books -> WorldCat -> OpenLibrary -> Google Custom Search');
      
      // Try Google Books API first
      const response = await withTimeout(
        fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${cleanISBN}&projection=full`),
        API_TIMEOUT
      );

      if (response.ok) {
        const data = await response.json();
        if (data.items && data.items.length > 0) {
          const item: GoogleBook = data.items[0];
          const itemISBN = extractISBN(item.volumeInfo) || cleanISBN;
          const title = item.volumeInfo.title || 'Unknown Title';
          const authors = item.volumeInfo.authors?.join(', ') || 'Unknown Author';
          
          console.log('✅ Found book on Google Books:', title);
          
          const { coverUrl, thumbnailUrl, source } = await getBestCoverUrl(
            itemISBN,
            title,
            authors,
            item.volumeInfo,
            item.id
          );

          return {
            googleBooksId: item.id,
            title,
            authors,
            coverUrl,
            thumbnailUrl,
            description: item.volumeInfo.description || '',
            publishedDate: item.volumeInfo.publishedDate || '',
            pageCount: item.volumeInfo.pageCount || 0,
            source: source as 'google' | 'openlibrary' | 'googlecustomsearch',
          };
        }
      }
      console.log('⚠️ Google Books API failed, trying WorldCat API');
      
      // Try WorldCat API
      result = await searchWorldCatAPI(cleanISBN);
      if (result) {
        console.log('✅ Book found on WorldCat API');
        return result;
      }
      console.log('⚠️ WorldCat API failed, trying OpenLibrary API');
      
      // Fall back to OpenLibrary
      result = await searchOpenLibraryByISBN(cleanISBN);
      if (result) {
        console.log('✅ Book found on OpenLibrary');
        return result;
      }
      
      console.log('❌ No book found for English-language ISBN');
      return null;
    }
    
    // OTHER ISBNs
    console.log('📚 Route: Google Books -> OpenLibrary -> Google Custom Search');
    
    // Try Google Books API first
    const response = await withTimeout(
      fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${cleanISBN}&projection=full`),
      API_TIMEOUT
    );

    if (response.ok) {
      const data = await response.json();
      if (data.items && data.items.length > 0) {
        const item: GoogleBook = data.items[0];
        const itemISBN = extractISBN(item.volumeInfo) || cleanISBN;
        const title = item.volumeInfo.title || 'Unknown Title';
        const authors = item.volumeInfo.authors?.join(', ') || 'Unknown Author';
        
        console.log('✅ Found book on Google Books:', title);
        
        const { coverUrl, thumbnailUrl, source } = await getBestCoverUrl(
          itemISBN,
          title,
          authors,
          item.volumeInfo,
          item.id
        );

        return {
          googleBooksId: item.id,
          title,
          authors,
          coverUrl,
          thumbnailUrl,
          description: item.volumeInfo.description || '',
          publishedDate: item.volumeInfo.publishedDate || '',
          pageCount: item.volumeInfo.pageCount || 0,
          source: source as 'google' | 'openlibrary' | 'googlecustomsearch',
        };
      }
    }
    console.log('⚠️ Google Books API failed, trying OpenLibrary API');
    
    // Fall back to OpenLibrary
    result = await searchOpenLibraryByISBN(cleanISBN);
    if (result) {
      console.log('✅ Book found on OpenLibrary');
      return result;
    }
    
    console.log('❌ No book found for ISBN');
    return null;
  } catch (error) {
    if (error instanceof Error && error.message === 'Request timeout') {
      console.error('ISBN search timed out');
    } else {
      console.error('Error searching book by ISBN:', error);
    }
    return null;
  }
}

/**
 * Gets the current quota status
 * @returns Promise<{ exceeded: boolean; hoursUntilReset: number }>
 */
export async function getQuotaStatus(): Promise<{ exceeded: boolean; hoursUntilReset: number }> {
  await loadQuotaState();
  
  if (!isQuotaExceeded) {
    return { exceeded: false, hoursUntilReset: 0 };
  }

  const now = Date.now();
  const timeRemaining = QUOTA_RESET_DURATION - (now - quotaExceededTimestamp);
  const hoursUntilReset = Math.ceil(timeRemaining / (1000 * 60 * 60));

  return {
    exceeded: true,
    hoursUntilReset: Math.max(0, hoursUntilReset),
  };
}
