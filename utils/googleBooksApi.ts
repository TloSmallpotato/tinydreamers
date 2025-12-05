
import { getAmazonBookCover } from './amazonPaApi';

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
  source?: 'google' | 'openlibrary' | 'amazon';
}

/**
 * Gets the best available cover image URL using Amazon PA API
 * @param isbn - The ISBN to search for
 */
async function getBestCoverUrl(
  isbn: string | undefined
): Promise<{ coverUrl: string; thumbnailUrl: string; source: string }> {
  // Only try Amazon PA API if we have an ISBN
  if (isbn) {
    const cleanISBN = isbn.replace(/[-\s]/g, '');
    console.log('Checking Amazon PA API for ISBN:', cleanISBN);
    
    const amazonResult = await getAmazonBookCover(cleanISBN);
    
    if (amazonResult && amazonResult.coverUrl) {
      console.log('Found cover on Amazon PA API');
      return { 
        coverUrl: amazonResult.coverUrl, 
        thumbnailUrl: amazonResult.thumbnailUrl,
        source: 'amazon' 
      };
    }
  }
  
  // No cover found
  console.log('No cover image available - Amazon PA API did not have an image');
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
        const { coverUrl, thumbnailUrl } = await getBestCoverUrl(isbn);
        
        // Use the work key as the ID (remove /works/ prefix)
        const bookId = doc.key.replace('/works/', '');
        
        return {
          googleBooksId: `openlibrary-${bookId}`,
          title: doc.title || 'Unknown Title',
          authors: doc.author_name?.join(', ') || 'Unknown Author',
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

    const { coverUrl, thumbnailUrl } = await getBestCoverUrl(cleanISBN);

    return {
      googleBooksId: `openlibrary-${cleanISBN}`,
      title: data.title || 'Unknown Title',
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
 * Uses Amazon PA API for cover images
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
        const { coverUrl, thumbnailUrl, source } = await getBestCoverUrl(isbn);
        
        // Log for debugging
        if (!coverUrl) {
          console.log('No image found for book:', item.volumeInfo.title, '- Amazon PA API does not have an image');
        } else {
          console.log('Book image URLs:', {
            title: item.volumeInfo.title,
            coverUrl,
            thumbnailUrl,
            source,
          });
        }
        
        return {
          googleBooksId: item.id,
          title: item.volumeInfo.title || 'Unknown Title',
          authors: item.volumeInfo.authors?.join(', ') || 'Unknown Author',
          coverUrl,
          thumbnailUrl,
          description: item.volumeInfo.description || '',
          publishedDate: item.volumeInfo.publishedDate || '',
          pageCount: item.volumeInfo.pageCount || 0,
          source: source as 'google' | 'openlibrary' | 'amazon',
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
 * Uses Amazon PA API for cover images
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
    const { coverUrl, thumbnailUrl, source } = await getBestCoverUrl(itemISBN);

    console.log('Found book on Google Books:', item.volumeInfo.title);
    console.log('Book image URLs:', {
      title: item.volumeInfo.title,
      coverUrl,
      thumbnailUrl,
      source,
    });

    return {
      googleBooksId: item.id,
      title: item.volumeInfo.title || 'Unknown Title',
      authors: item.volumeInfo.authors?.join(', ') || 'Unknown Author',
      coverUrl,
      thumbnailUrl,
      description: item.volumeInfo.description || '',
      publishedDate: item.volumeInfo.publishedDate || '',
      pageCount: item.volumeInfo.pageCount || 0,
      source: source as 'google' | 'openlibrary' | 'amazon',
    };
  } catch (error) {
    console.error('Error searching book by ISBN:', error);
    // Fallback to OpenLibrary
    console.log('Error occurred, falling back to OpenLibrary API for ISBN');
    const cleanISBN = isbn.replace(/[-\s]/g, '');
    return await searchOpenLibraryByISBN(cleanISBN);
  }
}
