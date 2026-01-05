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

async function refreshAccessToken(supabase: any, userId: string, refreshToken: string): Promise<string | null> {
  console.log('Refreshing access token for user:', userId);
  
  const tokenResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: AZURE_CLIENT_ID,
      client_secret: AZURE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  const tokenData = await tokenResponse.json();

  if (!tokenResponse.ok) {
    console.error('Token refresh failed:', tokenData);
    return null;
  }

  const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

  await supabase
    .from('outlook_tokens')
    .update({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token || refreshToken,
      expires_at: expiresAt,
    })
    .eq('user_id', userId);

  return tokenData.access_token;
}

async function getValidAccessToken(supabase: any, userId: string): Promise<string | null> {
  const { data: tokens, error } = await supabase
    .from('outlook_tokens')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error || !tokens) {
    console.error('No tokens found for user:', userId);
    return null;
  }

  // Check if token is expired (with 5 minute buffer)
  const expiresAt = new Date(tokens.expires_at);
  const now = new Date();
  const bufferMs = 5 * 60 * 1000;

  if (expiresAt.getTime() - bufferMs < now.getTime()) {
    return await refreshAccessToken(supabase, userId, tokens.refresh_token);
  }

  return tokens.access_token;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get user from token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      console.error('User auth error:', userError);
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { audits } = await req.json();

    if (!audits || !Array.isArray(audits)) {
      return new Response(JSON.stringify({ error: 'Invalid audits data' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get valid access token
    const accessToken = await getValidAccessToken(supabase, user.id);
    if (!accessToken) {
      return new Response(JSON.stringify({ error: 'Not connected to Outlook', reconnectRequired: true }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Syncing', audits.length, 'audits to Outlook for user:', user.id);

    const results = [];
    const errors = [];

    for (const audit of audits) {
      try {
        // Create calendar event
        const eventData = {
          subject: `Audit: ${audit.clientName}`,
          body: {
            contentType: 'HTML',
            content: `
              <p><strong>Kunde:</strong> ${audit.clientName}</p>
              <p><strong>Typ:</strong> ${audit.type}</p>
              <p><strong>Status:</strong> ${audit.status}</p>
              ${audit.certifications ? `<p><strong>Zertifizierungen:</strong> ${audit.certifications.join(', ')}</p>` : ''}
              ${audit.notes ? `<p><strong>Notizen:</strong> ${audit.notes}</p>` : ''}
            `,
          },
          start: {
            dateTime: new Date(audit.scheduledDate).toISOString(),
            timeZone: 'Europe/Berlin',
          },
          end: {
            // Assume 2 hour duration if not specified
            dateTime: new Date(new Date(audit.scheduledDate).getTime() + 2 * 60 * 60 * 1000).toISOString(),
            timeZone: 'Europe/Berlin',
          },
          location: {
            displayName: audit.clientAddress || '',
          },
          categories: ['Audit'],
        };

        const response = await fetch('https://graph.microsoft.com/v1.0/me/events', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(eventData),
        });

        const result = await response.json();

        if (!response.ok) {
          console.error('Error creating event for audit:', audit.id, result);
          errors.push({ auditId: audit.id, error: result.error?.message || 'Unknown error' });
        } else {
          console.log('Successfully created event for audit:', audit.id);
          results.push({ auditId: audit.id, eventId: result.id });
        }
      } catch (err: unknown) {
        console.error('Exception creating event for audit:', audit.id, err);
        const errMessage = err instanceof Error ? err.message : 'Unknown error';
        errors.push({ auditId: audit.id, error: errMessage });
      }
    }

    return new Response(JSON.stringify({
      success: true, 
      synced: results.length,
      failed: errors.length,
      results,
      errors 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error in outlook-sync function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
