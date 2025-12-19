
/**
 * Utility functions for validating and detecting blank/invalid images
 */

/**
 * Checks if an image URL is likely to be blank or invalid
 * This includes checking for:
 * - Known blank image patterns
 * - Very small file sizes
 * - Suspicious URL patterns
 */
export function isLikelyBlankImage(url: string | null | undefined): boolean {
  if (!url) return true;

  // Check for common blank image indicators in the URL
  const blankPatterns = [
    'blank.jpg',
    'blank.jpeg',
    'blank.png',
    'placeholder.jpg',
    'placeholder.jpeg',
    'placeholder.png',
    'no-cover',
    'nocover',
    'no_cover',
    'missing',
    '1x1',
    'spacer',
    'transparent',
  ];

  const lowerUrl = url.toLowerCase();
  
  // Check if URL contains any blank image patterns
  for (const pattern of blankPatterns) {
    if (lowerUrl.includes(pattern)) {
      console.log('🔍 Detected blank image pattern in URL:', pattern, url);
      return true;
    }
  }

  // Check for very small dimensions in URL (e.g., zoom=0, size=1)
  if (lowerUrl.includes('zoom=0') || lowerUrl.includes('size=1')) {
    console.log('🔍 Detected suspicious dimensions in URL:', url);
    return true;
  }

  return false;
}

/**
 * Validates an image by attempting to load it and checking its properties
 * Returns true if the image is valid and not blank
 */
export async function validateImageUrl(url: string): Promise<boolean> {
  try {
    // First check for obvious blank patterns
    if (isLikelyBlankImage(url)) {
      return false;
    }

    // Try to fetch the image headers to check content-length
    const response = await fetch(url, { method: 'HEAD' });
    
    if (!response.ok) {
      console.log('🔍 Image URL returned error status:', response.status, url);
      return false;
    }

    const contentLength = response.headers.get('content-length');
    const contentType = response.headers.get('content-type');

    // Check if content type is an image
    if (contentType && !contentType.startsWith('image/')) {
      console.log('🔍 URL is not an image:', contentType, url);
      return false;
    }

    // Check if file size is suspiciously small (less than 500 bytes is likely blank)
    if (contentLength) {
      const size = parseInt(contentLength, 10);
      if (size < 500) {
        console.log('🔍 Image file size too small:', size, 'bytes', url);
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('🔍 Error validating image URL:', error);
    return false;
  }
}

/**
 * Filters out blank images from a list of URLs
 * Returns the first valid URL or null if none are valid
 */
export function getFirstValidImageUrl(urls: (string | null | undefined)[]): string | null {
  for (const url of urls) {
    if (url && !isLikelyBlankImage(url)) {
      return url;
    }
  }
  return null;
}
