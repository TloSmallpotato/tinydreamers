
import { supabase } from '@/app/integrations/supabase/client';

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
    industryIdentifiers?: Array<{
      type: string;
      identifier: string;
    }>;
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
  authors?: Array<{ name: string }>;
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
  items?: Array<{
    link: string;
    image?: {
      thumbnailLink: string;
      width?: number;
      height?: number;
    };
    mime?: string;
  }>;
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
 * This function is called when:
 * - A book is not found in the database
 * - We need to fetch a high-quality cover image
 * 
 * @param query - The search query
 * @param fileType - File type filter (jpg or png)
 */
async function searchGoogleCustomSearch(
  query: string,
  fileType: 'jpg' | 'png' = 'jpg'
): Promise<{ coverUrl: string; thumbnailUrl: string } | null> {
  try {
    console.log('🔍 Calling Google Custom Search API (Cost: $0.005)');
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

    if (!response.ok) {
      console.error('Edge Function error:', response.status);
      const errorText = await response.text();
      console.error('Error details:', errorText);
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
 * 1. Try Google Custom Search API (primary method)
 *    - If successful and high-res (>=800px), use it
 *    - If low-res (<800px), continue to fallbacks
 * 2. Try OpenLibrary API (fallback #1)
 *    - If successful and high-res, use it
 * 3. Try Google Books API (fallback #2)
 *    - If successful and high-res, use it
 * 4. If all fail or return low-res, use the best available (even if low-res)
 * 
 * COST: Up to $0.040 per book (8 Google Custom Search attempts max)
 * In practice: Usually $0.005-$0.010 per book (1-2 attempts)
 */
async function getBestCoverUrl(
  isbn: string | undefined,
  title: string,
  author: string,
  volumeInfo?: GoogleBook['volumeInfo']
): Promise<{ coverUrl: string; thumbnailUrl: string; source: string }> {
  console.log('📚 Starting cover image search for:', title);
  
  let bestCoverUrl = '';
  let bestThumbnailUrl = '';
  let bestSource = 'none';
  
  // Method 1: Try Google Custom Search API (primary method)
  if (isbn && title && author) {
    const query1 = `${isbn} ${title} ${author} book cover`;
    console.log('Attempt 1: Google Custom Search with ISBN, title, and author');
    
    let result = await searchGoogleCustomSearch(query1, 'jpg');
    if (result) {
      // Check if it's high resolution
      const isHighRes = await isHighResolution(result.coverUrl);
      if (isHighRes) {
        console.log('✅ High-res cover found on Google Custom Search (first attempt)');
        return { ...result, source: 'googlecustomsearch' };
      } else {
        console.log('⚠️ Low-res cover from Google Custom Search, will try fallbacks');
        bestCoverUrl = result.coverUrl;
        bestThumbnailUrl = result.thumbnailUrl;
        bestSource = 'googlecustomsearch';
      }
    }

    // Try with PNG if JPG didn't work or was low-res
    if (!result || !bestCoverUrl) {
      result = await searchGoogleCustomSearch(query1, 'png');
      if (result) {
        const isHighRes = await isHighResolution(result.coverUrl);
        if (isHighRes) {
          console.log('✅ High-res cover found on Google Custom Search (PNG attempt)');
          return { ...result, source: 'googlecustomsearch' };
        } else if (!bestCoverUrl) {
          console.log('⚠️ Low-res PNG cover from Google Custom Search');
          bestCoverUrl = result.coverUrl;
          bestThumbnailUrl = result.thumbnailUrl;
          bestSource = 'googlecustomsearch';
        }
      }
    }
  }

  // Method 2: Try OpenLibrary API (fallback #1)
  if (isbn) {
    console.log('Attempt 2: Trying OpenLibrary API');
    const openLibraryCover = await getOpenLibraryCover(isbn);
    if (openLibraryCover) {
      const isHighRes = await isHighResolution(openLibraryCover);
      if (isHighRes) {
        console.log('✅ High-res cover found on OpenLibrary');
        return {
          coverUrl: openLibraryCover,
          thumbnailUrl: openLibraryCover,
          source: 'openlibrary',
        };
      } else if (!bestCoverUrl) {
        console.log('⚠️ Low-res cover from OpenLibrary');
        bestCoverUrl = openLibraryCover;
        bestThumbnailUrl = openLibraryCover;
        bestSource = 'openlibrary';
      }
    }
  }

  // Method 3: Try Google Books API (fallback #2)
  if (volumeInfo) {
    console.log('Attempt 3: Trying Google Books API');
    const googleBooksCover = getGoogleBooksCover(volumeInfo);
    if (googleBooksCover) {
      const isHighRes = await isHighResolution(googleBooksCover);
      if (isHighRes) {
        console.log('✅ High-res cover found on Google Books API');
        return {
          coverUrl: googleBooksCover,
          thumbnailUrl: googleBooksCover,
          source: 'google',
        };
      } else if (!bestCoverUrl) {
        console.log('⚠️ Low-res cover from Google Books API');
        bestCoverUrl = googleBooksCover;
        bestThumbnailUrl = googleBooksCover;
        bestSource = 'google';
      }
    }
  }

  // Method 4: Additional Google Custom Search fallback queries
  if (isbn) {
    const cleanISBN = isbn.replace(/[-\s]/g, '');
    const query2 = `${cleanISBN} cover jpg`;
    console.log('Attempt 4: Google Custom Search with ISBN only');
    
    let result = await searchGoogleCustomSearch(query2, 'jpg');
    if (result) {
      const isHighRes = await isHighResolution(result.coverUrl);
      if (isHighRes) {
        console.log('✅ High-res cover found on Google Custom Search (ISBN only)');
        return { ...result, source: 'googlecustomsearch' };
      } else if (!bestCoverUrl) {
        bestCoverUrl = result.coverUrl;
        bestThumbnailUrl = result.thumbnailUrl;
        bestSource = 'googlecustomsearch';
      }
    }

    // Try with PNG
    if (!result || !bestCoverUrl) {
      result = await searchGoogleCustomSearch(query2, 'png');
      if (result) {
        const isHighRes = await isHighResolution(result.coverUrl);
        if (isHighRes) {
          console.log('✅ High-res cover found on Google Custom Search (ISBN PNG)');
          return { ...result, source: 'googlecustomsearch' };
        } else if (!bestCoverUrl) {
          bestCoverUrl = result.coverUrl;
          bestThumbnailUrl = result.thumbnailUrl;
          bestSource = 'googlecustomsearch';
        }
      }
    }
  }

  // Method 5: Try title + author with high resolution query
  if (title && author) {
    const query3 = `${title} ${author} cover high resolution`;
    console.log('Attempt 5: Google Custom Search with title and author (high res)');
    
    let result = await searchGoogleCustomSearch(query3, 'jpg');
    if (result) {
      const isHighRes = await isHighResolution(result.coverUrl);
      if (isHighRes) {
        console.log('✅ High-res cover found on Google Custom Search (title+author high res)');
        return { ...result, source: 'googlecustomsearch' };
      } else if (!bestCoverUrl) {
        bestCoverUrl = result.coverUrl;
        bestThumbnailUrl = result.thumbnailUrl;
        bestSource = 'googlecustomsearch';
      }
    }

    // Try with PNG
    if (!result || !bestCoverUrl) {
      result = await searchGoogleCustomSearch(query3, 'png');
      if (result) {
        const isHighRes = await isHighResolution(result.coverUrl);
        if (isHighRes) {
          console.log('✅ High-res cover found on Google Custom Search (title+author PNG)');
          return { ...result, source: 'googlecustomsearch' };
        } else if (!bestCoverUrl) {
          bestCoverUrl = result.coverUrl;
          bestThumbnailUrl = result.thumbnailUrl;
          bestSource = 'googlecustomsearch';
        }
      }
    }
  }

  // Return the best available cover (even if low-res)
  if (bestCoverUrl) {
    console.log(`⚠️ Returning best available cover (low-res) from ${bestSource}`);
    return {
      coverUrl: bestCoverUrl,
      thumbnailUrl: bestThumbnailUrl,
      source: bestSource,
    };
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
        const { coverUrl, thumbnailUrl } = await getBestCoverUrl(isbn, title, author);
        
        // Use the work key as the ID (remove /works/ prefix)
        const bookId = doc.key.replace('/works/', '');
        
        return {
          googleBooksId: `openlibrary-${bookId}`,
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
    const { coverUrl, thumbnailUrl } = await getBestCoverUrl(cleanISBN, title, authors);

    return {
      googleBooksId: `openlibrary-${cleanISBN}`,
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
 *    - Tries Google Custom Search API ($0.005 per call)
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
        
        // This will try Google Custom Search, then OpenLibrary, then Google Books
        const { coverUrl, thumbnailUrl, source } = await getBestCoverUrl(
          isbn,
          title,
          authors,
          item.volumeInfo
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
 *    - Tries Google Custom Search API ($0.005 per call)
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
    
    console.log('Searching for ISBN:', cleanISBN);
    
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
    
    // This will try Google Custom Search, then OpenLibrary, then Google Books
    const { coverUrl, thumbnailUrl, source } = await getBestCoverUrl(
      itemISBN,
      title,
      authors,
      item.volumeInfo
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
