import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const AZURE_CLIENT_ID = Deno.env.get('AZURE_CLIENT_ID')!;
const AZURE_CLIENT_SECRET = Deno.env.get('AZURE_CLIENT_SECRET')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  try {
    const url = new URL(req.url);
    
    // Handle OAuth callback from Microsoft
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state'); // This is the user ID
    const error = url.searchParams.get('error');
    const errorDescription = url.searchParams.get('error_description');

    console.log('Outlook callback received, state (userId):', state);

    if (error) {
      console.error('OAuth error:', error, errorDescription);
      return new Response(`
        <html>
          <body>
            <script>
              window.opener.postMessage({ type: 'outlook-auth-error', error: '${error}' }, '*');
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
      console.error('Missing code or state');
      return new Response(`
        <html>
          <body>
            <script>
              window.opener.postMessage({ type: 'outlook-auth-error', error: 'Missing code or state' }, '*');
              window.close();
            </script>
            <p>Fehler: Fehlende Parameter. Dieses Fenster schließt sich automatisch.</p>
          </body>
        </html>
      `, {
        headers: { 'Content-Type': 'text/html' },
      });
    }

    // Exchange code for tokens - use the callback function URL as redirect URI
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
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenResponse.json();
    console.log('Token exchange response status:', tokenResponse.status);

    if (!tokenResponse.ok) {
      console.error('Token exchange failed:', tokenData);
      return new Response(`
        <html>
          <body>
            <script>
              window.opener.postMessage({ type: 'outlook-auth-error', error: 'Token exchange failed' }, '*');
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
      console.error('Error storing tokens:', upsertError);
      return new Response(`
        <html>
          <body>
            <script>
              window.opener.postMessage({ type: 'outlook-auth-error', error: 'Failed to store tokens' }, '*');
              window.close();
            </script>
            <p>Fehler beim Speichern der Tokens. Dieses Fenster schließt sich automatisch.</p>
          </body>
        </html>
      `, {
        headers: { 'Content-Type': 'text/html' },
      });
    }

    console.log('Successfully stored tokens for user:', state);
    return new Response(`
      <html>
        <body>
          <script>
            window.opener.postMessage({ type: 'outlook-auth-success' }, '*');
            window.close();
          </script>
          <p>Erfolgreich verbunden! Dieses Fenster schließt sich automatisch.</p>
        </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' },
    });

  } catch (error: unknown) {
    console.error('Error in outlook-callback function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(`
      <html>
        <body>
          <script>
            window.opener.postMessage({ type: 'outlook-auth-error', error: '${errorMessage}' }, '*');
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
