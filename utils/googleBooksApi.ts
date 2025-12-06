
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

export interface BookSearchResult {
  googleBooksId: string;
  title: string;
  authors: string;
  coverUrl: string;
  thumbnailUrl: string;
  description: string;
  publishedDate: string;
  pageCount: number;
  source?: 'google' | 'openlibrary' | 'googlecustomsearch';
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

// AsyncStorage keys
const QUOTA_EXCEEDED_KEY = '@google_custom_search_quota_exceeded';
const QUOTA_EXCEEDED_TIMESTAMP_KEY = '@google_custom_search_quota_timestamp';

// Track if Google Custom Search quota is exceeded
let isQuotaExceeded = false;
let quotaExceededTimestamp = 0;
const QUOTA_RESET_DURATION = 1000 * 60 * 60 * 24; // 24 hours

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
    
    const { data, error } = await supabase
      .from('books_library')
      .select('cover_url, thumbnail_url')
      .eq('google_books_id', googleBooksId)
      .single();

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

    // Call the Edge Function to check image dimensions
    const response = await fetch(
      'https://vxglluxqhceajceizbbm.supabase.co/functions/v1/check-image-resolution',
      {
        method: 'POST',
        headers,
        body: JSON.stringify({ imageUrl }),
      }
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
    console.error('Error checking image resolution:', error);
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
    
    // Check if the cover exists by making a HEAD request
    const response = await fetch(coverUrl, { method: 'HEAD' });
    
    if (response.ok) {
      console.log('✅ Found cover on OpenLibrary');
      return coverUrl;
    }
    
    console.log('❌ No cover found on OpenLibrary');
    return null;
  } catch (error) {
    console.error('Error fetching OpenLibrary cover:', error);
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
    const response = await fetch(
      'https://vxglluxqhceajceizbbm.supabase.co/functions/v1/search-book-cover',
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          query,
          fileType,
        }),
      }
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
    console.error('Error searching Google Custom Search:', error);
    return null;
  }
}

/**
 * Gets the best available cover image URL with fallback mechanism
 * 
 * This function implements a cascading fallback strategy:
 * 1. Check in-memory cache (prevents duplicate calls in same session)
 * 2. Check database (prevents API calls for existing books)
 * 3. Try Google Custom Search API ONCE (primary method) - ONLY if quota not exceeded
 *    - Only tries ONE query with the best parameters
 *    - If successful and high-res (>=800px), use it
 *    - If low-res (<800px), continue to fallbacks
 *    - If quota exceeded (429), skip and go to fallbacks
 * 4. Try OpenLibrary API (fallback #1)
 *    - If successful and high-res, use it
 * 5. Try Google Books API (fallback #2)
 *    - If successful and high-res, use it
 * 6. If all fail or return low-res, use the best available (even if low-res)
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
  googleBooksId?: string
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
    const dbResult = await checkBookInDatabase(googleBooksId);
    if (dbResult) {
      // Cache the result
      coverUrlCache.set(cacheKey, {
        ...dbResult,
        timestamp: Date.now(),
      });
      return dbResult;
    }
  }
  
  let bestCoverUrl = '';
  let bestThumbnailUrl = '';
  let bestSource = 'none';
  
  // Step 3: Try Google Custom Search API ONCE (primary method) - ONLY if quota not exceeded
  // Only make ONE API call with the best query parameters
  const isAvailable = await isGoogleCustomSearchAvailable();
  if (isbn && title && author && isAvailable) {
    const query = `${isbn} ${title} ${author} book cover`;
    console.log('Attempt 1: Google Custom Search (SINGLE CALL)');
    
    // Try JPG first (most common format for book covers)
    const result = await searchGoogleCustomSearch(query, 'jpg');
    if (result) {
      // Check if it's high resolution
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
        bestCoverUrl = result.coverUrl;
        bestThumbnailUrl = result.thumbnailUrl;
        bestSource = 'googlecustomsearch';
      }
    }
  } else if (!isAvailable) {
    console.log('⚠️ Skipping Google Custom Search - quota exceeded, using fallback methods');
  }

  // Step 4: Try OpenLibrary API (fallback #1)
  if (isbn) {
    console.log('Attempt 2: Trying OpenLibrary API');
    const openLibraryCover = await getOpenLibraryCover(isbn);
    if (openLibraryCover) {
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
    }
  }

  // Step 5: Try Google Books API (fallback #2)
  if (volumeInfo) {
    console.log('Attempt 3: Trying Google Books API');
    const googleBooksCover = getGoogleBooksCover(volumeInfo);
    if (googleBooksCover) {
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
 * Searches OpenLibrary API for books
 */
async function searchOpenLibrary(query: string): Promise<BookSearchResult[]> {
  try {
    const encodedQuery = encodeURIComponent(query.trim());
    const response = await fetch(
      `https://openlibrary.org/search.json?q=${encodedQuery}&limit=10`
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
    console.error('Error searching OpenLibrary:', error);
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
    
    const response = await fetch(
      `https://openlibrary.org/isbn/${cleanISBN}.json`
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
    const { coverUrl, thumbnailUrl } = await getBestCoverUrl(cleanISBN, title, authors, undefined, googleBooksId);

    return {
      googleBooksId,
      title,
      authors,
      coverUrl,
      thumbnailUrl,
      description,
      publishedDate: data.publish_date || '',
      pageCount: data.number_of_pages || 0,
      source: 'openlibrary',
    };
  } catch (error) {
    console.error('Error searching OpenLibrary by ISBN:', error);
    return null;
  }
}

/**
 * Searches for books by text query
 * Uses Google Books API first, falls back to OpenLibrary if no results
 * Uses Google Custom Search API for cover images with fallback to OpenLibrary and Google Books
 * 
 * FLOW:
 * 1. Search Google Books API for book metadata (free)
 * 2. For each book, call getBestCoverUrl() which:
 *    - Checks cache first (free)
 *    - Checks database (free)
 *    - Tries Google Custom Search API ONCE ($0.005 per call) - ONLY if quota not exceeded
 *    - Falls back to OpenLibrary API (free)
 *    - Falls back to Google Books API (free)
 * 3. Return results with cover URLs
 */
export async function searchGoogleBooks(query: string): Promise<BookSearchResult[]> {
  if (!query || query.trim().length < 2) {
    return [];
  }

  try {
    const encodedQuery = encodeURIComponent(query.trim());
    // Request full projection to get all available image sizes
    const response = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=${encodedQuery}&maxResults=10&printType=books&projection=full`
    );

    if (!response.ok) {
      console.error('Google Books API error:', response.status);
      // Fallback to OpenLibrary
      console.log('Falling back to OpenLibrary API');
      return await searchOpenLibrary(query);
    }

    const data = await response.json();

    if (!data.items || data.items.length === 0) {
      console.log('No results from Google Books, trying OpenLibrary');
      // Fallback to OpenLibrary
      return await searchOpenLibrary(query);
    }

    const googleResults = await Promise.all(
      data.items.map(async (item: GoogleBook) => {
        const isbn = extractISBN(item.volumeInfo);
        const title = item.volumeInfo.title || 'Unknown Title';
        const authors = item.volumeInfo.authors?.join(', ') || 'Unknown Author';
        
        // This will check cache, database, then try Google Custom Search ONCE (if quota not exceeded), then OpenLibrary, then Google Books
        const { coverUrl, thumbnailUrl, source } = await getBestCoverUrl(
          isbn,
          title,
          authors,
          item.volumeInfo,
          item.id
        );
        
        // Log for debugging
        if (!coverUrl) {
          console.log('No image found for book:', title);
        } else {
          console.log('Book image URLs:', {
            title,
            coverUrl,
            thumbnailUrl,
            source,
          });
        }
        
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
      })
    );

    return googleResults.filter((book: BookSearchResult) => book.title && book.authors);
  } catch (error) {
    console.error('Error searching Google Books:', error);
    // Fallback to OpenLibrary
    console.log('Error occurred, falling back to OpenLibrary API');
    return await searchOpenLibrary(query);
  }
}

/**
 * Searches for a book by ISBN
 * Uses Google Books API first, falls back to OpenLibrary if not found
 * Uses Google Custom Search API for cover images with fallback to OpenLibrary and Google Books
 * 
 * FLOW:
 * 1. Search Google Books API for book metadata by ISBN (free)
 * 2. Call getBestCoverUrl() which:
 *    - Checks cache first (free)
 *    - Checks database (free)
 *    - Tries Google Custom Search API ONCE ($0.005 per call) - ONLY if quota not exceeded
 *    - Falls back to OpenLibrary API (free)
 *    - Falls back to Google Books API (free)
 * 3. Return result with cover URLs
 */
export async function searchBookByISBN(isbn: string): Promise<BookSearchResult | null> {
  if (!isbn || isbn.trim().length === 0) {
    return null;
  }

  try {
    // Clean up ISBN (remove dashes, spaces)
    const cleanISBN = isbn.replace(/[-\s]/g, '');
    
    console.log('🔍 Searching for ISBN:', cleanISBN);
    
    // Search by ISBN using the isbn: prefix with full projection
    const response = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=isbn:${cleanISBN}&projection=full`
    );

    if (!response.ok) {
      console.error('Google Books API error:', response.status);
      // Fallback to OpenLibrary
      console.log('Falling back to OpenLibrary API for ISBN');
      return await searchOpenLibraryByISBN(cleanISBN);
    }

    const data = await response.json();

    if (!data.items || data.items.length === 0) {
      console.log('No book found for ISBN on Google Books, trying OpenLibrary');
      // Fallback to OpenLibrary
      return await searchOpenLibraryByISBN(cleanISBN);
    }

    // Get the first result (should be the most relevant)
    const item: GoogleBook = data.items[0];
    const itemISBN = extractISBN(item.volumeInfo) || cleanISBN;
    const title = item.volumeInfo.title || 'Unknown Title';
    const authors = item.volumeInfo.authors?.join(', ') || 'Unknown Author';
    
    // This will check cache, database, then try Google Custom Search ONCE (if quota not exceeded), then OpenLibrary, then Google Books
    const { coverUrl, thumbnailUrl, source } = await getBestCoverUrl(
      itemISBN,
      title,
      authors,
      item.volumeInfo,
      item.id
    );

    console.log('Found book on Google Books:', title);
    console.log('Book image URLs:', {
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
    console.error('Error searching book by ISBN:', error);
    // Fallback to OpenLibrary
    console.log('Error occurred, falling back to OpenLibrary API for ISBN');
    const cleanISBN = isbn.replace(/[-\s]/g, '');
    return await searchOpenLibraryByISBN(cleanISBN);
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
