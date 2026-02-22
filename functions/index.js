/**
 * Zenith Firebase Callable Functions.
 * - exchangeStravaCode: exchange Strava OAuth code for access/refresh tokens (client_secret stays server-side).
 *
 * Configure Strava app credentials:
 *   firebase functions:config:set strava.client_id="YOUR_CLIENT_ID" strava.client_secret="YOUR_CLIENT_SECRET"
 * Or set STRAVA_CLIENT_ID and STRAVA_CLIENT_SECRET in Firebase Console (Functions config / environment).
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineString } from 'firebase-functions/params';

const stravaClientId = defineString('STRAVA_CLIENT_ID', { default: '' });
const stravaClientSecret = defineString('STRAVA_CLIENT_SECRET', { default: '' });

/**
 * Exchange Strava OAuth authorization code for access_token and refresh_token.
 * Callable from authenticated client with { code: string }.
 * Returns { access_token, refresh_token, expires_at }.
 */
export const exchangeStravaCode = onCall(
  { enforceAppCheck: false },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be logged in.');
    }
    const { code } = request.data || {};
    if (!code || typeof code !== 'string') {
      throw new HttpsError('invalid-argument', 'Missing or invalid code.');
    }
    const clientId = stravaClientId.value();
    const clientSecret = stravaClientSecret.value();
    if (!clientId || !clientSecret) {
      throw new HttpsError(
        'failed-precondition',
        'Strava credentials not configured. Set STRAVA_CLIENT_ID and STRAVA_CLIENT_SECRET for Functions.'
      );
    }
    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code: code.trim(),
      grant_type: 'authorization_code',
    });
    const res = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = data.message || data.error || res.statusText;
      throw new HttpsError('internal', `Strava token exchange failed: ${msg}`);
    }
    if (!data.access_token) {
      throw new HttpsError('internal', 'Strava did not return an access token.');
    }
    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: data.expires_at,
    };
  }
);
