
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

export interface BookSearchResult {
  googleBooksId: string;
  title: string;
  authors: string;
  coverUrl: string;
  thumbnailUrl: string;
  description: string;
  publishedDate: string;
  pageCount: number;
}

/**
 * Gets the highest quality image URL from Google Books imageLinks
 * Prioritizes larger images and enhances URLs for maximum quality
 */
function getHighQualityImageUrl(imageLinks: GoogleBook['volumeInfo']['imageLinks']): string {
  if (!imageLinks) return '';
  
  // Priority order: largest to smallest
  // Try to get the highest resolution available
  let url = imageLinks.extraLarge || 
            imageLinks.large || 
            imageLinks.medium || 
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
  
  console.log('Enhanced image URL:', url);
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
 * Searches for books by text query
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
      return [];
    }

    const data = await response.json();

    if (!data.items || data.items.length === 0) {
      return [];
    }

    return data.items
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
        };
      })
      .filter((book: BookSearchResult) => book.title && book.authors);
  } catch (error) {
    console.error('Error searching Google Books:', error);
    return [];
  }
}

/**
 * Searches for a book by ISBN
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
      return null;
    }

    const data = await response.json();

    if (!data.items || data.items.length === 0) {
      console.log('No book found for ISBN:', cleanISBN);
      return null;
    }

    // Get the first result (should be the most relevant)
    const item: GoogleBook = data.items[0];
    const coverUrl = getHighQualityImageUrl(item.volumeInfo.imageLinks);
    const thumbnailUrl = getThumbnailUrl(item.volumeInfo.imageLinks);

    console.log('Found book:', item.volumeInfo.title);
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
    };
  } catch (error) {
    console.error('Error searching book by ISBN:', error);
    return null;
  }
}
