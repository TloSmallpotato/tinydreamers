
import { createVideoPlayer } from 'expo-video';
import * as FileSystem from 'expo-file-system/legacy';

export async function generateVideoThumbnail(videoUri: string): Promise<string | null> {
  let player: any = null;
  
  try {
    console.log('Generating thumbnail for video:', videoUri);
    
    player = createVideoPlayer(videoUri);
    
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
    
    const thumbnails = await player.generateThumbnailsAsync([0.5], {
      quality: 0.8,
    });
    
    if (thumbnails && thumbnails.length > 0) {
      const thumbnail = thumbnails[0];
      console.log('Thumbnail generated successfully:', thumbnail);
      
      const thumbnailFileName = `${Date.now()}_thumb.jpg`;
      const thumbnailPath = `${FileSystem.cacheDirectory}${thumbnailFileName}`;
      
      return thumbnailPath;
    }
    
    return null;
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
    const thumbnailFile = await FileSystem.readAsStringAsync(thumbnailUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    
    const decode = (base64: string) => {
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes;
    };
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('video-moments')
      .upload(thumbnailFileName, decode(thumbnailFile), {
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
