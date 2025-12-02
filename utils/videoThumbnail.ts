
import { createVideoPlayer } from 'expo-video';
import { File, Paths } from 'expo-file-system';

export async function generateVideoThumbnail(videoUri: string): Promise<string | null> {
  let player: any = null;
  
  try {
    console.log('Generating thumbnail for video:', videoUri);
    
    player = createVideoPlayer(videoUri);
    
    // Wait for the player to be ready
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout waiting for video to be ready'));
      }, 10000);
      
      const checkStatus = () => {
        if (player.status === 'readyToPlay') {
          clearTimeout(timeout);
          resolve();
        } else if (player.status === 'error') {
          clearTimeout(timeout);
          reject(new Error('Video player error'));
        } else {
          setTimeout(checkStatus, 100);
        }
      };
      checkStatus();
    });
    
    // Generate thumbnail at the first frame (0 seconds)
    const thumbnails = await player.generateThumbnailsAsync([0], {
      quality: 0.8,
    });
    
    if (!thumbnails || thumbnails.length === 0) {
      console.warn('No thumbnails generated');
      return null;
    }
    
    const thumbnail = thumbnails[0];
    console.log('Thumbnail generated:', thumbnail);
    
    // The thumbnail object has a uri property that points to a temporary cache location
    // We need to copy it to a persistent location
    let tempUri: string | null = null;
    
    if (typeof thumbnail === 'string') {
      tempUri = thumbnail;
    } else if (thumbnail && typeof thumbnail === 'object' && 'uri' in thumbnail) {
      tempUri = (thumbnail as any).uri;
    } else if (thumbnail && typeof thumbnail === 'object' && 'localUri' in thumbnail) {
      tempUri = (thumbnail as any).localUri;
    }
    
    if (!tempUri) {
      console.warn('Could not extract URI from thumbnail');
      return null;
    }
    
    console.log('Temporary thumbnail URI:', tempUri);
    
    // Copy the thumbnail to a persistent location in the document directory
    const thumbnailFileName = `thumb_${Date.now()}.jpg`;
    const persistentFile = new File(Paths.document, 'thumbnails', thumbnailFileName);
    
    // Create the thumbnails directory if it doesn't exist
    const thumbnailsDir = persistentFile.parentDirectory;
    if (!thumbnailsDir.exists) {
      thumbnailsDir.create({ intermediates: true });
    }
    
    // Copy the temporary thumbnail to the persistent location
    const tempFile = new File(tempUri);
    if (tempFile.exists) {
      tempFile.copy(persistentFile);
      console.log('Thumbnail copied to persistent location:', persistentFile.uri);
      return persistentFile.uri;
    } else {
      console.warn('Temporary thumbnail file does not exist:', tempUri);
      return null;
    }
    
  } catch (error) {
    console.error('Error generating thumbnail:', error);
    return null;
  } finally {
    if (player) {
      try {
        player.release();
      } catch (releaseError) {
        console.error('Error releasing player:', releaseError);
      }
    }
  }
}

export async function uploadThumbnailToSupabase(
  thumbnailUri: string,
  childId: string,
  supabase: any
): Promise<string | null> {
  try {
    console.log('Uploading thumbnail:', thumbnailUri);
    
    const thumbnailFileName = `${childId}/${Date.now()}_thumb.jpg`;
    
    // Use the new Expo 54 File API to read the file directly
    const thumbnailFile = new File(thumbnailUri);
    
    if (!thumbnailFile.exists) {
      console.error('Thumbnail file does not exist:', thumbnailUri);
      return null;
    }
    
    // Read the file as bytes (Uint8Array)
    const fileBytes = await thumbnailFile.bytes();
    
    // Upload directly to Supabase without Base64 conversion
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('video-moments')
      .upload(thumbnailFileName, fileBytes, {
        contentType: 'image/jpeg',
      });

    if (uploadError) {
      console.error('Error uploading thumbnail:', uploadError);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from('video-moments')
      .getPublicUrl(thumbnailFileName);

    console.log('Thumbnail uploaded successfully:', urlData.publicUrl);
    return urlData.publicUrl;
  } catch (error) {
    console.error('Error in uploadThumbnailToSupabase:', error);
    return null;
  }
}
