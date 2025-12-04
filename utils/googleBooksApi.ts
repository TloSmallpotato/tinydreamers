
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
 * Enhances Google Books image URL to get higher resolution
 * Google Books allows zoom parameter to increase image quality
 */
function enhanceImageUrl(url: string | undefined): string {
  if (!url) return '';
  
  // Replace http with https
  let enhancedUrl = url.replace('http://', 'https://');
  
  // Remove existing zoom parameter if present
  enhancedUrl = enhancedUrl.replace(/&zoom=\d+/, '');
  
  // Add zoom=1 for higher quality (zoom=0 is default, zoom=1 gives better quality)
  // Also increase the image size by replacing 'zoom=1' with larger dimensions
  enhancedUrl = enhancedUrl.replace('&edge=curl', '');
  
  // For thumbnail URLs, we can increase quality by adding zoom parameter
  if (enhancedUrl.includes('books.google.com')) {
    enhancedUrl += '&zoom=1';
  }
  
  return enhancedUrl;
}

/**
 * Gets the best available image URL from Google Books imageLinks
 * Prioritizes larger images for better quality
 */
function getBestImageUrl(imageLinks: GoogleBook['volumeInfo']['imageLinks']): string {
  if (!imageLinks) return '';
  
  // Priority order: extraLarge > large > medium > small > thumbnail > smallThumbnail
  const url = imageLinks.extraLarge || 
               imageLinks.large || 
               imageLinks.medium || 
               imageLinks.small || 
               imageLinks.thumbnail || 
               imageLinks.smallThumbnail || 
               '';
  
  return enhanceImageUrl(url);
}

/**
 * Gets thumbnail URL for dropdown preview
 */
function getThumbnailUrl(imageLinks: GoogleBook['volumeInfo']['imageLinks']): string {
  if (!imageLinks) return '';
  
  // For thumbnails in dropdown, use small or thumbnail
  const url = imageLinks.small || 
               imageLinks.thumbnail || 
               imageLinks.smallThumbnail || 
               '';
  
  return enhanceImageUrl(url);
}

export async function searchGoogleBooks(query: string): Promise<BookSearchResult[]> {
  if (!query || query.trim().length < 2) {
    return [];
  }

  try {
    const encodedQuery = encodeURIComponent(query.trim());
    const response = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=${encodedQuery}&maxResults=10&printType=books`
    );

    if (!response.ok) {
      console.error('Google Books API error:', response.status);
      return [];
    }

    const data = await response.json();

    if (!data.items || data.items.length === 0) {
      return [];
    }

    return data.items.map((item: GoogleBook) => ({
      googleBooksId: item.id,
      title: item.volumeInfo.title || 'Unknown Title',
      authors: item.volumeInfo.authors?.join(', ') || 'Unknown Author',
      coverUrl: getBestImageUrl(item.volumeInfo.imageLinks),
      thumbnailUrl: getThumbnailUrl(item.volumeInfo.imageLinks),
      description: item.volumeInfo.description || '',
      publishedDate: item.volumeInfo.publishedDate || '',
      pageCount: item.volumeInfo.pageCount || 0,
    }));
  } catch (error) {
    console.error('Error searching Google Books:', error);
    return [];
  }
}
