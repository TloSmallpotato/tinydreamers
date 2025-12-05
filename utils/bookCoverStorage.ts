
import { supabase } from '@/app/integrations/supabase/client';

export interface BookCover {
  id: string;
  book_id: string;
  storage_path: string;
  width: number;
  height: number;
  file_size: number;
  is_low_res: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Processes and uploads a book cover image via Edge Function
 * The Edge Function handles:
 * - Downloading the image from the URL
 * - Converting to PNG format
 * - Optimizing to be under 2MB
 * - Detecting low resolution (<800px in either dimension)
 * - Uploading to Supabase Storage
 * - Saving metadata to book_covers table
 * 
 * @param coverUrl - The URL of the cover image to download and process
 * @param bookId - The ID of the book in the books_library table
 * @returns The book cover metadata or null if failed
 */
export async function processAndUploadBookCover(
  coverUrl: string,
  bookId: string
): Promise<BookCover | null> {
  try {
    console.log('Processing book cover via Edge Function:', coverUrl);
    
    // Get the current session for authentication
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      console.error('No active session - user must be authenticated');
      return null;
    }

    // Call the Edge Function to process the cover
    const response = await fetch(
      'https://vxglluxqhceajceizbbm.supabase.co/functions/v1/process-book-cover',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          coverUrl,
          bookId,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Edge Function error:', errorData);
      return null;
    }

    const data = await response.json();

    if (!data.success) {
      console.error('Failed to process book cover:', data.error);
      return null;
    }

    console.log('Book cover processed successfully:', data.cover);
    return data.cover;
  } catch (error) {
    console.error('Error in processAndUploadBookCover:', error);
    return null;
  }
}

/**
 * Gets the book cover for a specific book
 * @param bookId - The ID of the book
 * @returns The book cover metadata or null if not found
 */
export async function getBookCover(bookId: string): Promise<BookCover | null> {
  try {
    const { data, error } = await supabase
      .from('book_covers')
      .select('*')
      .eq('book_id', bookId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No cover found
        return null;
      }
      console.error('Error fetching book cover:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in getBookCover:', error);
    return null;
  }
}

/**
 * Gets the public URL for a book cover
 * @param storagePath - The storage path of the cover image
 * @returns The public URL of the cover image
 */
export function getBookCoverUrl(storagePath: string): string {
  const { data } = supabase.storage
    .from('book-covers')
    .getPublicUrl(storagePath);

  return data.publicUrl;
}

/**
 * Deletes a book cover from storage and database
 * @param bookId - The ID of the book
 * @returns True if successful, false otherwise
 */
export async function deleteBookCover(bookId: string): Promise<boolean> {
  try {
    // Get the cover metadata first
    const cover = await getBookCover(bookId);
    
    if (!cover) {
      console.log('No cover found to delete');
      return true;
    }

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('book-covers')
      .remove([cover.storage_path]);

    if (storageError) {
      console.error('Error deleting from storage:', storageError);
      // Continue to delete from database anyway
    }

    // Delete from database
    const { error: dbError } = await supabase
      .from('book_covers')
      .delete()
      .eq('book_id', bookId);

    if (dbError) {
      console.error('Error deleting from database:', dbError);
      return false;
    }

    console.log('Book cover deleted successfully');
    return true;
  } catch (error) {
    console.error('Error in deleteBookCover:', error);
    return false;
  }
}

/**
 * Gets all low resolution book covers
 * @returns Array of book covers that are low resolution
 */
export async function getLowResolutionCovers(): Promise<BookCover[]> {
  try {
    const { data, error } = await supabase
      .from('book_covers')
      .select('*')
      .eq('is_low_res', true);

    if (error) {
      console.error('Error fetching low res covers:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getLowResolutionCovers:', error);
    return [];
  }
}
