
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
    };
    mime?: string;
  }>;
}

/**
 * Searches Google Custom Search API for book cover images via Supabase Edge Function
 * This keeps API keys secure on the server side
 * @param query - The search query
 * @param fileType - File type filter (jpg or png)
 */
async function searchGoogleCustomSearch(
  query: string,
  fileType: 'jpg' | 'png' = 'jpg'
): Promise<{ coverUrl: string; thumbnailUrl: string } | null> {
  try {
    console.log('Searching Google Custom Search via Edge Function:', query);

    // Call the Supabase Edge Function instead of making direct API calls
    // This keeps the API keys secure on the server
    const response = await fetch(
      'https://vxglluxqhceajceizbbm.supabase.co/functions/v1/search-book-cover',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          fileType,
        }),
      }
    );

    if (!response.ok) {
      console.error('Edge Function error:', response.status);
      return null;
    }

    const data = await response.json();

    if (!data.coverUrl) {
      console.log('No results from Google Custom Search for query:', query);
      return null;
    }

    console.log('Found cover via Google Custom Search:', data.coverUrl);

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
 * Gets the best available cover image URL using Google Custom Search API
 * with fallback queries
 */
async function getBestCoverUrl(
  isbn: string | undefined,
  title: string,
  author: string
): Promise<{ coverUrl: string; thumbnailUrl: string; source: string }> {
  // Method 1: Try with ISBN, title, and author
  if (isbn && title && author) {
    const query1 = `${isbn} ${title} ${author} book cover`;
    console.log('Trying primary query:', query1);
    
    let result = await searchGoogleCustomSearch(query1, 'jpg');
    if (result) {
      return { ...result, source: 'googlecustomsearch' };
    }

    // Try with PNG if JPG didn't work
    result = await searchGoogleCustomSearch(query1, 'png');
    if (result) {
      return { ...result, source: 'googlecustomsearch' };
    }
  }

  // Method 2: Fallback query - "isbn cover jpg"
  if (isbn) {
    const cleanISBN = isbn.replace(/[-\s]/g, '');
    const query2 = `${cleanISBN} cover jpg`;
    console.log('Trying fallback query 1:', query2);
    
    let result = await searchGoogleCustomSearch(query2, 'jpg');
    if (result) {
      return { ...result, source: 'googlecustomsearch' };
    }

    // Try with PNG
    result = await searchGoogleCustomSearch(query2, 'png');
    if (result) {
      return { ...result, source: 'googlecustomsearch' };
    }
  }

  // Method 3: Fallback query - "<title> <author> cover high resolution"
  if (title && author) {
    const query3 = `${title} ${author} cover high resolution`;
    console.log('Trying fallback query 2:', query3);
    
    let result = await searchGoogleCustomSearch(query3, 'jpg');
    if (result) {
      return { ...result, source: 'googlecustomsearch' };
    }

    // Try with PNG
    result = await searchGoogleCustomSearch(query3, 'png');
    if (result) {
      return { ...result, source: 'googlecustomsearch' };
    }
  }

  // Method 4: Try just title and author without "high resolution"
  if (title && author) {
    const query4 = `${title} ${author} book cover`;
    console.log('Trying fallback query 3:', query4);
    
    let result = await searchGoogleCustomSearch(query4, 'jpg');
    if (result) {
      return { ...result, source: 'googlecustomsearch' };
    }

    // Try with PNG
    result = await searchGoogleCustomSearch(query4, 'png');
    if (result) {
      return { ...result, source: 'googlecustomsearch' };
    }
  }

  // No cover found
  console.log('No cover image available from Google Custom Search');
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
 * Uses Google Custom Search API for cover images with fallback queries
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
        const { coverUrl, thumbnailUrl, source } = await getBestCoverUrl(isbn, title, authors);
        
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
 * Uses Google Custom Search API for cover images with fallback queries
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
    const { coverUrl, thumbnailUrl, source } = await getBestCoverUrl(itemISBN, title, authors);

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
