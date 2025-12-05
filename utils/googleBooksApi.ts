
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
  source?: 'google' | 'openlibrary';
}

/**
 * Gets the highest quality image URL from Google Books imageLinks
 * Prioritizes "large" size specifically as it provides the best quality from Google Books
 */
function getHighQualityImageUrl(imageLinks: GoogleBook['volumeInfo']['imageLinks']): string {
  if (!imageLinks) return '';
  
  // Priority order: large is the sweet spot for Google Books quality
  // Note: extraLarge is often not available, and large provides excellent quality
  let url = imageLinks.large || 
            imageLinks.medium || 
            imageLinks.extraLarge || 
            imageLinks.small || 
            imageLinks.thumbnail || 
            imageLinks.smallThumbnail || 
            '';
  
  if (!url) return '';
  
  // Ensure HTTPS
  url = url.replace('http://', 'https://');
  
  // Remove any existing zoom or size parameters
  url = url.replace(/&zoom=\d+/g, '');
  url = url.replace(/\?zoom=\d+/g, '');
  url = url.replace(/&fife=.*/g, '');
  url = url.replace(/\?fife=.*/g, '');
  
  // For Google Books images, we can request higher quality
  if (url.includes('books.google.com')) {
    // Remove the edge parameter which limits size
    url = url.replace(/&edge=curl/g, '');
    url = url.replace(/\?edge=curl/g, '');
    
    // Add parameters for maximum quality
    // zoom=0 gives us the highest resolution available
    const separator = url.includes('?') ? '&' : '?';
    url = `${url}${separator}zoom=0&printsec=frontcover`;
  }
  
  // For Google User Content images (lh3.googleusercontent.com)
  if (url.includes('googleusercontent.com')) {
    // Remove size restrictions
    url = url.replace(/=s\d+/g, '');
    url = url.replace(/=w\d+/g, '');
    url = url.replace(/=h\d+/g, '');
    
    // Request high quality with no size limit
    // s0 means original size, no scaling
    if (!url.includes('=s')) {
      url = `${url}=s0`;
    }
  }
  
  console.log('Enhanced image URL (prioritizing large):', url);
  return url;
}

/**
 * Gets thumbnail URL for dropdown preview
 * Uses medium quality for faster loading in lists
 */
function getThumbnailUrl(imageLinks: GoogleBook['volumeInfo']['imageLinks']): string {
  if (!imageLinks) return '';
  
  // For thumbnails, use medium quality for faster loading
  let url = imageLinks.thumbnail || 
            imageLinks.small || 
            imageLinks.medium || 
            imageLinks.smallThumbnail || 
            '';
  
  if (!url) return '';
  
  // Ensure HTTPS
  url = url.replace('http://', 'https://');
  
  // For Google Books images, use zoom=1 for good quality thumbnails
  if (url.includes('books.google.com')) {
    url = url.replace(/&zoom=\d+/g, '');
    url = url.replace(/\?zoom=\d+/g, '');
    url = url.replace(/&edge=curl/g, '');
    url = url.replace(/\?edge=curl/g, '');
    
    const separator = url.includes('?') ? '&' : '?';
    url = `${url}${separator}zoom=1`;
  }
  
  // For Google User Content images
  if (url.includes('googleusercontent.com')) {
    url = url.replace(/=s\d+/g, '');
    url = url.replace(/=w\d+/g, '');
    url = url.replace(/=h\d+/g, '');
    
    // Request 400px width for thumbnails (good balance of quality and speed)
    url = `${url}=w400`;
  }
  
  return url;
}

/**
 * Gets OpenLibrary cover URL
 * @param coverId - The cover ID from OpenLibrary
 * @param size - Size of the cover (S, M, L)
 */
function getOpenLibraryCoverUrl(coverId: number | undefined, size: 'S' | 'M' | 'L' = 'L'): string {
  if (!coverId) return '';
  return `https://covers.openlibrary.org/b/id/${coverId}-${size}.jpg`;
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

    return data.docs
      .map((doc: OpenLibraryBook) => {
        const coverUrl = getOpenLibraryCoverUrl(doc.cover_i, 'L');
        const thumbnailUrl = getOpenLibraryCoverUrl(doc.cover_i, 'M');
        
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
      .filter((book: BookSearchResult) => book.title && book.authors);
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

    const coverId = data.covers?.[0];
    const coverUrl = getOpenLibraryCoverUrl(coverId, 'L');
    const thumbnailUrl = getOpenLibraryCoverUrl(coverId, 'M');

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

    const googleResults = data.items
      .map((item: GoogleBook) => {
        const coverUrl = getHighQualityImageUrl(item.volumeInfo.imageLinks);
        const thumbnailUrl = getThumbnailUrl(item.volumeInfo.imageLinks);
        
        // Log for debugging
        if (!coverUrl) {
          console.log('No image found for book:', item.volumeInfo.title);
        } else {
          console.log('Book image URLs:', {
            title: item.volumeInfo.title,
            coverUrl,
            thumbnailUrl,
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
          source: 'google' as const,
        };
      })
      .filter((book: BookSearchResult) => book.title && book.authors);

    return googleResults;
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
    const coverUrl = getHighQualityImageUrl(item.volumeInfo.imageLinks);
    const thumbnailUrl = getThumbnailUrl(item.volumeInfo.imageLinks);

    console.log('Found book on Google Books:', item.volumeInfo.title);
    console.log('Book image URLs:', {
      title: item.volumeInfo.title,
      coverUrl,
      thumbnailUrl,
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
      source: 'google',
    };
  } catch (error) {
    console.error('Error searching book by ISBN:', error);
    // Fallback to OpenLibrary
    console.log('Error occurred, falling back to OpenLibrary API for ISBN');
    const cleanISBN = isbn.replace(/[-\s]/g, '');
    return await searchOpenLibraryByISBN(cleanISBN);
  }
}
