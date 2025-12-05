
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
 * Enhances Google Books image URL to get maximum resolution
 * Google Books allows various parameters to increase image quality
 */
function enhanceImageUrl(url: string | undefined, isHighRes: boolean = false): string {
  if (!url) return '';
  
  // Replace http with https for security
  let enhancedUrl = url.replace('http://', 'https://');
  
  // Remove existing zoom parameter to replace it
  enhancedUrl = enhancedUrl.replace(/&zoom=\d+/, '');
  enhancedUrl = enhancedUrl.replace(/\?zoom=\d+/, '');
  
  // For high-res images (main display), request maximum quality
  if (isHighRes) {
    // If it's a Google Books image, we can manipulate the URL for better quality
    if (enhancedUrl.includes('books.google.com')) {
      // Add zoom parameter for higher quality
      // zoom=1 is standard, zoom=3 is higher quality
      if (enhancedUrl.includes('?')) {
        enhancedUrl += '&zoom=1';
      } else {
        enhancedUrl += '?zoom=1';
      }
    }
  } else {
    // For thumbnails, use zoom=1 for good quality
    if (enhancedUrl.includes('books.google.com')) {
      if (enhancedUrl.includes('?')) {
        enhancedUrl += '&zoom=1';
      } else {
        enhancedUrl += '?zoom=1';
      }
    }
  }
  
  return enhancedUrl;
}

/**
 * Gets the best available image URL from Google Books imageLinks
 * Prioritizes larger images for better quality
 * Returns the raw URL without enhancement for better compatibility
 */
function getBestImageUrl(imageLinks: GoogleBook['volumeInfo']['imageLinks']): string {
  if (!imageLinks) return '';
  
  // Priority order: try all available sizes
  // Use the raw URLs from Google Books API as they work best
  const url = imageLinks.thumbnail || 
               imageLinks.smallThumbnail || 
               imageLinks.small || 
               imageLinks.medium || 
               imageLinks.large || 
               imageLinks.extraLarge || 
               '';
  
  // Just ensure HTTPS, don't modify the URL further
  return url ? url.replace('http://', 'https://') : '';
}

/**
 * Gets thumbnail URL for dropdown preview
 * Uses the same logic as getBestImageUrl for consistency
 */
function getThumbnailUrl(imageLinks: GoogleBook['volumeInfo']['imageLinks']): string {
  if (!imageLinks) return '';
  
  // Use the same URL as cover for consistency
  // The Image component will handle sizing
  const url = imageLinks.thumbnail || 
               imageLinks.smallThumbnail || 
               imageLinks.small || 
               imageLinks.medium || 
               imageLinks.large || 
               imageLinks.extraLarge || 
               '';
  
  return url ? url.replace('http://', 'https://') : '';
}

export async function searchGoogleBooks(query: string): Promise<BookSearchResult[]> {
  if (!query || query.trim().length < 2) {
    return [];
  }

  try {
    const encodedQuery = encodeURIComponent(query.trim());
    // Request books with images and specify we want high-quality results
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
        const coverUrl = getBestImageUrl(item.volumeInfo.imageLinks);
        const thumbnailUrl = getThumbnailUrl(item.volumeInfo.imageLinks);
        
        // Log for debugging
        if (!coverUrl) {
          console.log('No image found for book:', item.volumeInfo.title);
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
      // Filter out books without images if needed, or keep them all
      // For now, keep all books even without images
      .filter((book: BookSearchResult) => book.title && book.authors);
  } catch (error) {
    console.error('Error searching Google Books:', error);
    return [];
  }
}
