
import { supabase } from '@/app/integrations/supabase/client';

/**
 * Downloads an image from a URL and returns it as a Blob
 */
async function downloadImageAsBlob(url: string): Promise<Blob> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.statusText}`);
  }
  return await response.blob();
}

/**
 * Converts a Blob to PNG format
 */
async function convertToPNG(blob: Blob): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      
      canvas.toBlob((pngBlob) => {
        if (pngBlob) {
          resolve(pngBlob);
        } else {
          reject(new Error('Failed to convert image to PNG'));
        }
      }, 'image/png');
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    img.src = URL.createObjectURL(blob);
  });
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
    
    // Download the image
    const imageBlob = await downloadImageAsBlob(coverUrl);
    
    // Convert to PNG if not already
    let pngBlob = imageBlob;
    if (!imageBlob.type.includes('png')) {
      console.log('Converting image to PNG format');
      pngBlob = await convertToPNG(imageBlob);
    }

    // Generate a unique filename
    const filename = `${bookId}.png`;
    const storagePath = `covers/${filename}`;

    console.log('Uploading book cover to storage:', storagePath);

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('book-covers')
      .upload(storagePath, pngBlob, {
        contentType: 'image/png',
        upsert: true, // Replace if already exists
      });

    if (error) {
      console.error('Error uploading book cover:', error);
      return null;
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
