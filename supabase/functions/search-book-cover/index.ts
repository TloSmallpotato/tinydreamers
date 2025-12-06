
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

interface GoogleCustomSearchResult {
  items?: Array<{
    link: string;
    image?: {
      thumbnailLink: string;
    };
    mime?: string;
  }>;
  error?: {
    code: number;
    message: string;
    errors?: Array<{
      domain: string;
      reason: string;
      message: string;
    }>;
  };
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        {
          status: 405,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    // Get the API credentials from environment variables
    const apiKey = Deno.env.get('GOOGLE_CUSTOM_SEARCH_API_KEY');
    const searchEngineId = Deno.env.get('GOOGLE_CUSTOM_SEARCH_ENGINE_ID');

    if (!apiKey || !searchEngineId) {
      console.error('Missing Google Custom Search API credentials');
      console.error('API Key present:', !!apiKey);
      console.error('Search Engine ID present:', !!searchEngineId);
      return new Response(
        JSON.stringify({ error: 'API credentials not configured' }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    // Parse the request body
    const { query, fileType = 'jpg' } = await req.json();

    if (!query) {
      return new Response(
        JSON.stringify({ error: 'Query parameter is required' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    // Validate fileType
    if (fileType !== 'jpg' && fileType !== 'png') {
      return new Response(
        JSON.stringify({ error: 'Invalid fileType. Must be jpg or png' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    console.log('Searching Google Custom Search:', query, 'fileType:', fileType);

    // Build the Google Custom Search API URL
    const encodedQuery = encodeURIComponent(query);
    const searchUrl = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${searchEngineId}&q=${encodedQuery}&searchType=image&fileType=${fileType}&num=1`;

    // Make the API request
    const response = await fetch(searchUrl);

    // Handle quota exceeded error (429)
    if (response.status === 429) {
      console.error('Google Custom Search API quota exceeded');
      const errorText = await response.text();
      console.error('Error details:', errorText);
      
      return new Response(
        JSON.stringify({ 
          error: 'QUOTA_EXCEEDED',
          message: 'Google Custom Search API daily quota exceeded. Using fallback methods.',
          details: errorText 
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    if (!response.ok) {
      console.error('Google Custom Search API error:', response.status);
      const errorText = await response.text();
      console.error('Error details:', errorText);
      
      // Try to parse the error response
      let errorData: GoogleCustomSearchResult | null = null;
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        console.error('Could not parse error response:', e);
      }

      // Check if it's a quota error in the response body
      if (errorData?.error?.code === 429 || 
          errorData?.error?.errors?.some(e => e.reason === 'rateLimitExceeded' || e.reason === 'quotaExceeded')) {
        console.error('Quota exceeded detected in error response');
        return new Response(
          JSON.stringify({ 
            error: 'QUOTA_EXCEEDED',
            message: 'Google Custom Search API daily quota exceeded. Using fallback methods.',
            details: errorText 
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          }
        );
      }

      return new Response(
        JSON.stringify({ error: 'Google Custom Search API error', details: errorText }),
        {
          status: response.status,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    const data: GoogleCustomSearchResult = await response.json();

    // Check if we got results
    if (!data.items || data.items.length === 0) {
      console.log('No results found for query:', query);
      return new Response(
        JSON.stringify({ coverUrl: null, thumbnailUrl: null }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    // Extract the first result
    const firstResult = data.items[0];
    const coverUrl = firstResult.link;
    const thumbnailUrl = firstResult.image?.thumbnailLink || coverUrl;

    console.log('Found cover image:', coverUrl);

    // Return the result
    return new Response(
      JSON.stringify({
        coverUrl,
        thumbnailUrl,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error) {
    console.error('Error in search-book-cover function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', message: error.message }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
});
