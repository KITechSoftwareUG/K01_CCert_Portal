import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const AZURE_CLIENT_ID = Deno.env.get('AZURE_CLIENT_ID')!;
const AZURE_CLIENT_SECRET = Deno.env.get('AZURE_CLIENT_SECRET')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    // Get the authorization header to identify the user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader && action !== 'callback') {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get user from token
    let userId: string | null = null;
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);
      if (userError || !user) {
        console.error('User auth error:', userError);
        return new Response(JSON.stringify({ error: 'Invalid token' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      userId = user.id;
    }

    if (action === 'get-auth-url') {
      // Generate OAuth URL for Microsoft - use separate callback function
      const redirectUri = `${SUPABASE_URL}/functions/v1/outlook-callback`;
      const scope = 'offline_access Calendars.ReadWrite';
      const state = userId; // Pass user ID in state for callback
      
      const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?` +
        `client_id=${encodeURIComponent(AZURE_CLIENT_ID)}` +
        `&response_type=code` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&response_mode=query` +
        `&scope=${encodeURIComponent(scope)}` +
        `&state=${encodeURIComponent(state || '')}`;

      console.log('Generated auth URL for user:', userId);
      return new Response(JSON.stringify({ authUrl }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'status') {
      // Check if user has valid tokens
      const { data: tokens, error: fetchError } = await supabase
        .from('outlook_tokens')
        .select('expires_at')
        .eq('user_id', userId)
        .single();

      if (fetchError || !tokens) {
        return new Response(JSON.stringify({ connected: false }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const isExpired = new Date(tokens.expires_at) < new Date();
      return new Response(JSON.stringify({ 
        connected: !isExpired,
        expiresAt: tokens.expires_at 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'disconnect') {
      // Remove tokens from database
      const { error: deleteError } = await supabase
        .from('outlook_tokens')
        .delete()
        .eq('user_id', userId);

      if (deleteError) {
        console.error('Error deleting tokens:', deleteError);
        return new Response(JSON.stringify({ error: 'Failed to disconnect' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log('Successfully disconnected user:', userId);
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error in outlook-auth function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
