
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
  
  // Remove existing parameters that might limit quality
  enhancedUrl = enhancedUrl.replace(/&zoom=\d+/, '');
  enhancedUrl = enhancedUrl.replace(/&edge=curl/, '');
  enhancedUrl = enhancedUrl.replace(/&fife=.*$/, '');
  
  // For high-res images (main display), request maximum quality
  if (isHighRes) {
    // If it's a Google Books image, we can manipulate the URL for better quality
    if (enhancedUrl.includes('books.google.com')) {
      // Add zoom parameter for higher quality (zoom=1 gives better quality than default)
      enhancedUrl += '&zoom=3';
      
      // Add printsec parameter to get better quality
      if (!enhancedUrl.includes('printsec=')) {
        enhancedUrl += '&printsec=frontcover';
      }
      
      // Request larger image size
      enhancedUrl = enhancedUrl.replace(/&img=\d+/, '&img=1');
      enhancedUrl = enhancedUrl.replace(/&w=\d+/, '&w=800');
      enhancedUrl = enhancedUrl.replace(/&h=\d+/, '&h=1200');
    }
    
    // For Google's image serving infrastructure (if using fife)
    if (enhancedUrl.includes('googleusercontent.com')) {
      // Use fife parameters for maximum quality
      // w800-h1200 requests an image up to 800px wide and 1200px tall
      enhancedUrl += '=w800-h1200-n';
    }
  } else {
    // For thumbnails, use moderate quality
    if (enhancedUrl.includes('books.google.com')) {
      enhancedUrl += '&zoom=1';
    }
    
    if (enhancedUrl.includes('googleusercontent.com')) {
      enhancedUrl += '=w200-h300-n';
    }
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
  
  return enhanceImageUrl(url, true);
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
  
  return enhanceImageUrl(url, false);
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
