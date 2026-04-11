import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const AZURE_CLIENT_ID = (Deno.env.get('AZURE_CLIENT_ID') ?? '').trim();
const AZURE_CLIENT_SECRET = (Deno.env.get('AZURE_CLIENT_SECRET') ?? '').trim();
const SUPABASE_URL = (Deno.env.get('SUPABASE_URL') ?? '').trim();
const SUPABASE_SERVICE_ROLE_KEY = (Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '').trim();
if (!AZURE_CLIENT_ID) throw new Error('Missing AZURE_CLIENT_ID');
if (!AZURE_CLIENT_SECRET) throw new Error('Missing AZURE_CLIENT_SECRET');
if (!SUPABASE_URL) throw new Error('Missing SUPABASE_URL');
if (!SUPABASE_SERVICE_ROLE_KEY) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');

// Optionaler Secret für sicheres postMessage.
// Wenn gesetzt: postMessage wird nur an diese Origin geschickt.
// Wenn nicht gesetzt: Fallback auf '*' (weniger sicher, aber OAuth-Popup hat begrenzten Angriffsvector).
const ALLOWED_ORIGIN = (Deno.env.get('ALLOWED_ORIGIN') ?? '').trim() || '*';

// Must match the scopes used when generating the authorize URL
const OUTLOOK_SCOPE = 'offline_access Calendars.ReadWrite';

serve(async (req) => {
  try {
    const url = new URL(req.url);
    
    // Handle OAuth callback from Microsoft
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state'); // This is the user ID
    const error = url.searchParams.get('error');

    if (error) {
      console.error('OAuth error received');
      return new Response(`
        <html>
          <body>
            <script>
              window.opener.postMessage({ type: 'outlook-auth-error', error: 'auth_failed' }, ALLOWED_ORIGIN);
              window.close();
            </script>
            <p>Fehler bei der Authentifizierung. Dieses Fenster schließt sich automatisch.</p>
          </body>
        </html>
      `, {
        headers: { 'Content-Type': 'text/html' },
      });
    }

    if (!code || !state) {
      console.error('Missing code or state in callback');
      return new Response(`
        <html>
          <body>
            <script>
              window.opener.postMessage({ type: 'outlook-auth-error', error: 'missing_params' }, ALLOWED_ORIGIN);
              window.close();
            </script>
            <p>Fehler: Fehlende Parameter. Dieses Fenster schließt sich automatisch.</p>
          </body>
        </html>
      `, {
        headers: { 'Content-Type': 'text/html' },
      });
    }

    // Exchange code for tokens
    const redirectUri = `${SUPABASE_URL}/functions/v1/outlook-callback`;
    const tokenResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: AZURE_CLIENT_ID,
        client_secret: AZURE_CLIENT_SECRET,
        code,
        redirect_uri: redirectUri,
        scope: OUTLOOK_SCOPE,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || !tokenData.access_token || typeof tokenData.expires_in !== 'number') {
      console.error('Token exchange failed or response missing required fields');
      return new Response(`
        <html>
          <body>
            <script>
              window.opener.postMessage({ type: 'outlook-auth-error', error: 'token_exchange_failed' }, ALLOWED_ORIGIN);
              window.close();
            </script>
            <p>Fehler beim Token-Austausch. Dieses Fenster schließt sich automatisch.</p>
          </body>
        </html>
      `, {
        headers: { 'Content-Type': 'text/html' },
      });
    }

    // Calculate expiration time
    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

    // Store tokens in database
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { error: upsertError } = await supabase
      .from('outlook_tokens')
      .upsert({
        user_id: state,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: expiresAt,
      }, {
        onConflict: 'user_id',
      });

    if (upsertError) {
      console.error('Error storing tokens');
      return new Response(`
        <html>
          <body>
            <script>
              window.opener.postMessage({ type: 'outlook-auth-error', error: 'storage_failed' }, ALLOWED_ORIGIN);
              window.close();
            </script>
            <p>Fehler beim Speichern. Dieses Fenster schließt sich automatisch.</p>
          </body>
        </html>
      `, {
        headers: { 'Content-Type': 'text/html' },
      });
    }

    console.log('Successfully completed OAuth flow for user');
    return new Response(`
      <html>
        <body>
          <script>
            window.opener.postMessage({ type: 'outlook-auth-success' }, ALLOWED_ORIGIN);
            window.close();
          </script>
          <p>Erfolgreich verbunden! Dieses Fenster schließt sich automatisch.</p>
        </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' },
    });

  } catch (error: unknown) {
    console.error('Error in outlook-callback function');
    return new Response(`
      <html>
        <body>
          <script>
            window.opener.postMessage({ type: 'outlook-auth-error', error: 'internal_error' }, ALLOWED_ORIGIN);
            window.close();
          </script>
          <p>Ein Fehler ist aufgetreten. Dieses Fenster schließt sich automatisch.</p>
        </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' },
    });
  }
});
