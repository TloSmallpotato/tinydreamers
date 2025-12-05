
import { supabase } from '@/app/integrations/supabase/client';
import * as FileSystem from 'expo-file-system/legacy';

/**
 * Downloads an image from a URL and saves it temporarily
 * @param url - The URL of the image to download
 * @returns The local file URI
 */
async function downloadImage(url: string): Promise<string> {
  const filename = `temp_cover_${Date.now()}.png`;
  const fileUri = `${FileSystem.cacheDirectory}${filename}`;

  console.log('Downloading image to:', fileUri);

  const downloadResult = await FileSystem.downloadAsync(url, fileUri);
  
  if (downloadResult.status !== 200) {
    throw new Error(`Failed to download image: ${downloadResult.status}`);
  }

  return downloadResult.uri;
}

/**
 * Uploads a book cover image to Supabase Storage
 * @param coverUrl - The URL of the cover image to download and upload
 * @param bookId - The ID of the book (used for the filename)
 * @returns The storage path of the uploaded image
 */
export async function uploadBookCover(
  coverUrl: string,
  bookId: string
): Promise<string | null> {
  try {
    console.log('Downloading book cover from:', coverUrl);
    
    // Download the image to a temporary location
    const localUri = await downloadImage(coverUrl);

    // Read the file as base64
    const base64 = await FileSystem.readAsStringAsync(localUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Convert base64 to blob
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'image/png' });

    // Generate a unique filename
    const filename = `${bookId}.png`;
    const storagePath = `covers/${filename}`;

    console.log('Uploading book cover to storage:', storagePath);

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('book-covers')
      .upload(storagePath, blob, {
        contentType: 'image/png',
        upsert: true, // Replace if already exists
      });

    if (error) {
      console.error('Error uploading book cover:', error);
      return null;
    }

    // Clean up temporary file
    try {
      await FileSystem.deleteAsync(localUri, { idempotent: true });
    } catch (cleanupError) {
      console.warn('Failed to clean up temporary file:', cleanupError);
    }

    console.log('Book cover uploaded successfully:', data.path);
    return data.path;
  } catch (error) {
    console.error('Error in uploadBookCover:', error);
    return null;
  }
}

/**
 * Gets the public URL for a book cover from Supabase Storage
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
 * Deletes a book cover from Supabase Storage
 * @param storagePath - The storage path of the cover image to delete
 * @returns True if successful, false otherwise
 */
export async function deleteBookCover(storagePath: string): Promise<boolean> {
  try {
    const { error } = await supabase.storage
      .from('book-covers')
      .remove([storagePath]);

    if (error) {
      console.error('Error deleting book cover:', error);
      return false;
    }

    console.log('Book cover deleted successfully:', storagePath);
    return true;
  } catch (error) {
    console.error('Error in deleteBookCover:', error);
    return false;
  }
}

/**
 * Uploads a book cover and updates the books_library table
 * @param coverUrl - The URL of the cover image to download and upload
 * @param bookId - The ID of the book in the books_library table
 * @returns True if successful, false otherwise
 */
export async function uploadAndSaveBookCover(
  coverUrl: string,
  bookId: string
): Promise<boolean> {
  try {
    // Upload the cover image
    const storagePath = await uploadBookCover(coverUrl, bookId);
    
    if (!storagePath) {
      console.error('Failed to upload book cover');
      return false;
    }

    // Update the books_library table with the storage path
    const { error } = await supabase
      .from('books_library')
      .update({ cover_storage_path: storagePath })
      .eq('id', bookId);

    if (error) {
      console.error('Error updating books_library:', error);
      // Try to clean up the uploaded file
      await deleteBookCover(storagePath);
      return false;
    }

    console.log('Book cover saved successfully for book:', bookId);
    return true;
  } catch (error) {
    console.error('Error in uploadAndSaveBookCover:', error);
    return false;
  }
}
