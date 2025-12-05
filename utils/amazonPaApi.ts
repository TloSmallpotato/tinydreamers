
export interface AmazonBookResult {
  isbn: string;
  title: string;
  authors: string;
  coverUrl: string;
  thumbnailUrl: string;
  description: string;
  publishedDate: string;
  pageCount: number;
}

/**
 * Fetches book cover images from Amazon PA API via Supabase Edge Function
 * @param isbn - The ISBN to search for
 * @returns Book cover URLs or null if not found
 */
export async function getAmazonBookCover(isbn: string): Promise<{ coverUrl: string; thumbnailUrl: string } | null> {
  try {
    const cleanISBN = isbn.replace(/[-\s]/g, '');
    console.log('Fetching Amazon cover for ISBN:', cleanISBN);
    
    // Call Supabase Edge Function
    const response = await fetch(
      `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/amazon-book-cover`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ isbn: cleanISBN }),
      }
    );

    if (!response.ok) {
      console.log('Amazon PA API request failed:', response.status);
      return null;
    }

    const data = await response.json();
    
    if (data.coverUrl) {
      console.log('Found Amazon cover:', data.coverUrl);
      return {
        coverUrl: data.coverUrl,
        thumbnailUrl: data.thumbnailUrl || data.coverUrl,
      };
    }

    return null;
  } catch (error) {
    console.error('Error fetching Amazon book cover:', error);
    return null;
  }
}

/**
 * Searches for book details using Amazon PA API via Supabase Edge Function
 * @param isbn - The ISBN to search for
 * @returns Book details or null if not found
 */
export async function searchAmazonBook(isbn: string): Promise<AmazonBookResult | null> {
  try {
    const cleanISBN = isbn.replace(/[-\s]/g, '');
    console.log('Searching Amazon for ISBN:', cleanISBN);
    
    // Call Supabase Edge Function
    const response = await fetch(
      `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/amazon-book-search`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ isbn: cleanISBN }),
      }
    );

    if (!response.ok) {
      console.log('Amazon book search failed:', response.status);
      return null;
    }

    const data = await response.json();
    
    if (data.book) {
      console.log('Found Amazon book:', data.book.title);
      return data.book;
    }

    return null;
  } catch (error) {
    console.error('Error searching Amazon book:', error);
    return null;
  }
}
