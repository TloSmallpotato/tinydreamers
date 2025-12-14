
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProcessCoverRequest {
  coverUrl: string;
  bookId: string;
}

interface ImageDimensions {
  width: number;
  height: number;
}

/**
 * Downloads an image and returns it as a Uint8Array
 */
async function downloadImage(url: string): Promise<Uint8Array> {
  console.log('Downloading image from:', url);
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.statusText}`);
  }
  
  const arrayBuffer = await response.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}

/**
 * Gets image dimensions from PNG, JPEG, or WebP headers
 */
function getImageDimensions(imageData: Uint8Array): ImageDimensions {
  // Check if it's a PNG
  if (imageData[0] === 0x89 && imageData[1] === 0x50 && imageData[2] === 0x4E && imageData[3] === 0x47) {
    // PNG format - IHDR chunk starts at byte 16
    const width = (imageData[16] << 24) | (imageData[17] << 16) | (imageData[18] << 8) | imageData[19];
    const height = (imageData[20] << 24) | (imageData[21] << 16) | (imageData[22] << 8) | imageData[23];
    return { width, height };
  }
  
  // Check if it's a JPEG
  if (imageData[0] === 0xFF && imageData[1] === 0xD8) {
    let offset = 2;
    while (offset < imageData.length) {
      // Check for SOF0 or SOF2 marker (0xFFC0 or 0xFFC2)
      if (imageData[offset] === 0xFF && (imageData[offset + 1] === 0xC0 || imageData[offset + 1] === 0xC2)) {
        const height = (imageData[offset + 5] << 8) | imageData[offset + 6];
        const width = (imageData[offset + 7] << 8) | imageData[offset + 8];
        return { width, height };
      }
      // Skip to next marker
      if (imageData[offset] === 0xFF) {
        const markerLength = (imageData[offset + 2] << 8) | imageData[offset + 3];
        offset += markerLength + 2;
      } else {
        offset++;
      }
    }
  }
  
  // Check if it's a WebP
  if (imageData[0] === 0x52 && imageData[1] === 0x49 && imageData[2] === 0x46 && imageData[3] === 0x46 &&
      imageData[8] === 0x57 && imageData[9] === 0x45 && imageData[10] === 0x42 && imageData[11] === 0x50) {
    // WebP format
    // VP8 (lossy)
    if (imageData[12] === 0x56 && imageData[13] === 0x50 && imageData[14] === 0x38 && imageData[15] === 0x20) {
      const width = ((imageData[26] | (imageData[27] << 8)) & 0x3fff);
      const height = ((imageData[28] | (imageData[29] << 8)) & 0x3fff);
      return { width, height };
    }
    // VP8L (lossless)
    if (imageData[12] === 0x56 && imageData[13] === 0x50 && imageData[14] === 0x38 && imageData[15] === 0x4C) {
      const bits = imageData[21] | (imageData[22] << 8) | (imageData[23] << 16) | (imageData[24] << 24);
      const width = (bits & 0x3FFF) + 1;
      const height = ((bits >> 14) & 0x3FFF) + 1;
      return { width, height };
    }
  }
  
  // Default dimensions if we can't parse
  console.warn('Could not determine image dimensions, using defaults');
  return { width: 800, height: 1200 };
}

/**
 * Converts an image to WebP format using Canvas API
 * This is a simplified approach that works in Deno Edge Runtime
 */
async function convertToWebP(imageData: Uint8Array): Promise<{ data: Uint8Array; dimensions: ImageDimensions }> {
  try {
    console.log('Converting image to WebP format...');
    
    // Check if already WebP
    if (imageData[0] === 0x52 && imageData[1] === 0x49 && imageData[2] === 0x46 && imageData[3] === 0x46 &&
        imageData[8] === 0x57 && imageData[9] === 0x45 && imageData[10] === 0x42 && imageData[11] === 0x50) {
      console.log('Image is already in WebP format');
      const dimensions = getImageDimensions(imageData);
      return { data: imageData, dimensions };
    }

    // Get original dimensions before conversion
    const originalDimensions = getImageDimensions(imageData);
    console.log('Original dimensions:', originalDimensions);

    // Determine the source format
    let mimeType = 'image/jpeg';
    if (imageData[0] === 0x89 && imageData[1] === 0x50 && imageData[2] === 0x4E && imageData[3] === 0x47) {
      mimeType = 'image/png';
    }

    // Create a blob from the image data
    const blob = new Blob([imageData], { type: mimeType });
    
    // Use the ImageBitmap API to decode the image
    const imageBitmap = await createImageBitmap(blob);
    
    // Create an OffscreenCanvas with the image dimensions
    const canvas = new OffscreenCanvas(imageBitmap.width, imageBitmap.height);
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }
    
    // Draw the image onto the canvas
    ctx.drawImage(imageBitmap, 0, 0);
    
    // Convert to WebP with quality setting
    const webpBlob = await canvas.convertToBlob({
      type: 'image/webp',
      quality: 0.85, // 85% quality for good balance between size and quality
    });
    
    // Convert blob to Uint8Array
    const webpArrayBuffer = await webpBlob.arrayBuffer();
    const webpData = new Uint8Array(webpArrayBuffer);
    
    console.log('Successfully converted to WebP');
    console.log('Original size:', imageData.length, 'bytes');
    console.log('WebP size:', webpData.length, 'bytes');
    console.log('Size reduction:', ((1 - webpData.length / imageData.length) * 100).toFixed(2), '%');
    
    return {
      data: webpData,
      dimensions: {
        width: imageBitmap.width,
        height: imageBitmap.height,
      },
    };
  } catch (error) {
    console.error('Error converting to WebP:', error);
    console.warn('Storing original format due to conversion error');
    const dimensions = getImageDimensions(imageData);
    return { data: imageData, dimensions };
  }
}

/**
 * Optimizes image size if it exceeds the maximum allowed size
 */
async function optimizeImageSize(
  imageData: Uint8Array,
  dimensions: ImageDimensions,
  maxSize: number = 2 * 1024 * 1024 // 2MB default
): Promise<{ data: Uint8Array; dimensions: ImageDimensions }> {
  if (imageData.length <= maxSize) {
    console.log('Image size is within limits, no optimization needed');
    return { data: imageData, dimensions };
  }

  try {
    console.log(`Image size (${imageData.length} bytes) exceeds ${maxSize} bytes, optimizing...`);
    
    // Calculate scale factor to reduce file size
    // We'll reduce dimensions to approximately achieve target file size
    const scaleFactor = Math.sqrt(maxSize / imageData.length);
    const newWidth = Math.floor(dimensions.width * scaleFactor);
    const newHeight = Math.floor(dimensions.height * scaleFactor);
    
    console.log(`Resizing from ${dimensions.width}x${dimensions.height} to ${newWidth}x${newHeight}`);
    
    // Create a blob from the image data
    const blob = new Blob([imageData], { type: 'image/webp' });
    
    // Use the ImageBitmap API to decode the image
    const imageBitmap = await createImageBitmap(blob);
    
    // Create an OffscreenCanvas with the new dimensions
    const canvas = new OffscreenCanvas(newWidth, newHeight);
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }
    
    // Draw the resized image onto the canvas
    ctx.drawImage(imageBitmap, 0, 0, newWidth, newHeight);
    
    // Convert to WebP with slightly lower quality
    const optimizedBlob = await canvas.convertToBlob({
      type: 'image/webp',
      quality: 0.75, // Lower quality for size optimization
    });
    
    // Convert blob to Uint8Array
    const optimizedArrayBuffer = await optimizedBlob.arrayBuffer();
    const optimizedData = new Uint8Array(optimizedArrayBuffer);
    
    console.log('Optimized size:', optimizedData.length, 'bytes');
    console.log('Size reduction:', ((1 - optimizedData.length / imageData.length) * 100).toFixed(2), '%');
    
    return {
      data: optimizedData,
      dimensions: {
        width: newWidth,
        height: newHeight,
      },
    };
  } catch (error) {
    console.error('Error optimizing image:', error);
    console.warn('Returning original image');
    return { data: imageData, dimensions };
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing authorization header' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify the user's JWT token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Parse request body
    const { coverUrl, bookId }: ProcessCoverRequest = await req.json();

    if (!coverUrl || !bookId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields: coverUrl and bookId' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log('Processing cover for book:', bookId);

    // Download the image
    const imageData = await downloadImage(coverUrl);
    console.log('Downloaded image size:', imageData.length, 'bytes');

    // Convert to WebP format
    const { data: webpImageData, dimensions: webpDimensions } = await convertToWebP(imageData);

    // Optimize image size if needed (max 2MB)
    const maxSize = 2 * 1024 * 1024; // 2MB
    const { data: finalImageData, dimensions: finalDimensions } = await optimizeImageSize(
      webpImageData,
      webpDimensions,
      maxSize
    );

    console.log('Final image dimensions:', finalDimensions);
    console.log('Final image size:', finalImageData.length, 'bytes');

    // Check if image is low resolution
    const isLowRes = finalDimensions.width < 800 || finalDimensions.height < 800;
    console.log('Is low resolution:', isLowRes);

    // Determine file extension and content type
    let extension = 'webp';
    let contentType = 'image/webp';
    
    // Verify WebP signature
    if (!(finalImageData[0] === 0x52 && finalImageData[1] === 0x49 && finalImageData[2] === 0x46 && finalImageData[3] === 0x46 &&
          finalImageData[8] === 0x57 && finalImageData[9] === 0x45 && finalImageData[10] === 0x42 && finalImageData[11] === 0x50)) {
      // Fallback to original format if conversion failed
      if (finalImageData[0] === 0xFF && finalImageData[1] === 0xD8) {
        extension = 'jpg';
        contentType = 'image/jpeg';
      } else if (finalImageData[0] === 0x89 && finalImageData[1] === 0x50) {
        extension = 'png';
        contentType = 'image/png';
      }
    }

    // Upload to Supabase Storage
    const filename = `${bookId}.${extension}`;
    const storagePath = `covers/${filename}`;

    console.log('Uploading to storage:', storagePath);

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('book-covers')
      .upload(storagePath, finalImageData, {
        contentType,
        upsert: true,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return new Response(
        JSON.stringify({ success: false, error: `Failed to upload image: ${uploadError.message}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log('Image uploaded successfully:', uploadData.path);

    // Save metadata to book_covers table
    const { data: coverData, error: dbError } = await supabase
      .from('book_covers')
      .upsert({
        book_id: bookId,
        storage_path: uploadData.path,
        width: finalDimensions.width,
        height: finalDimensions.height,
        file_size: finalImageData.length,
        is_low_res: isLowRes,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'book_id',
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      // Try to clean up the uploaded file
      await supabase.storage.from('book-covers').remove([uploadData.path]);
      return new Response(
        JSON.stringify({ success: false, error: `Failed to save cover metadata: ${dbError.message}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log('Cover metadata saved successfully');

    // Get the public URL
    const { data: urlData } = supabase.storage
      .from('book-covers')
      .getPublicUrl(uploadData.path);

    return new Response(
      JSON.stringify({
        success: true,
        cover: {
          id: coverData.id,
          book_id: coverData.book_id,
          storage_path: coverData.storage_path,
          public_url: urlData.publicUrl,
          width: coverData.width,
          height: coverData.height,
          file_size: coverData.file_size,
          is_low_res: coverData.is_low_res,
          created_at: coverData.created_at,
          updated_at: coverData.updated_at,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error processing book cover:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
