/**
 * Strava OAuth and activity import.
 * - OAuth: redirect to Strava; exchange code via Cloud Function (client secret stays server-side).
 * - Import: fetch last 90 days, map to Zenith activity model, dedupe by externalId, write to Firestore.
 * Rate limit: Strava 100 requests/15 min — we throttle to ~6 requests per 15 min when paging.
 */

import { getFunctions, httpsCallable } from 'firebase/functions';
import app from './firebase';
import { firestoreIntegrations, firestoreActivities, firestoreUser, firestoreFeed } from './firestore';
import { calculateXP } from './gamification';

const STRAVA_INTEGRATION_ID = 'strava';
const STRAVA_SCOPE = 'activity:read_all';
const STRAVA_API_BASE = 'https://www.strava.com/api/v3';
const PER_PAGE = 30;
const MAX_PAGES = 4; // 4 * 30 = 120, under 100/15min if we space requests
const IMPORT_DAYS = 90;
const MS_PER_REQUEST = 10000; // ~6 requests per 15 min

function getClientId() {
  return import.meta.env.VITE_STRAVA_CLIENT_ID || '';
}

/**
 * Build Strava OAuth authorization URL. Redirect user here to start connect flow.
 * @param {string} redirectUri - Must match Strava app settings (e.g. origin + /profile or /profile?connect=strava)
 */
export function getStravaAuthUrl(redirectUri) {
  const clientId = getClientId();
  if (!clientId) throw new Error('Strava client ID not configured');
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: STRAVA_SCOPE,
    approval_prompt: 'force',
  });
  return `https://www.strava.com/oauth/authorize?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens. Calls Cloud Function (client secret not exposed).
 * @param {string} code - From Strava redirect query param
 * @returns {{ access_token, refresh_token, expires_at } | null}
 */
export async function exchangeStravaCode(code) {
  const functions = getFunctions(app);
  const exchange = httpsCallable(functions, 'exchangeStravaCode');
  const { data } = await exchange({ code });
  return data ?? null;
}

/**
 * Save Strava tokens to user's integrations subcollection (owner-only in rules).
 */
export async function saveStravaTokens(uid, { access_token, refresh_token, expires_at }) {
  await firestoreIntegrations.set(uid, STRAVA_INTEGRATION_ID, {
    accessToken: access_token,
    refreshToken: refresh_token,
    expiresAt: expires_at,
    connectedAt: Date.now(),
  });
}

/**
 * Get stored Strava integration (tokens + lastImportAt). Returns null if not connected.
 */
export async function getStravaIntegration(uid) {
  return firestoreIntegrations.get(uid, STRAVA_INTEGRATION_ID);
}

/**
 * Disconnect Strava: remove stored tokens.
 */
export async function disconnectStrava(uid) {
  await firestoreIntegrations.delete(uid, STRAVA_INTEGRATION_ID);
}

/**
 * Map Strava activity type to Zenith sport. Others map to run or skip.
 */
function stravaTypeToSport(type) {
  const t = (type || '').toLowerCase();
  if (['run', 'virtualrun', 'treadmill'].includes(t)) return 'run';
  if (['ride', 'virtualride', 'handcycle'].includes(t)) return 'cycle';
  if (['swim', 'openwaterswim'].includes(t)) return 'swim';
  if (['weighttraining', 'workout', 'crossfit', 'elliptical', 'yoga', 'pilates'].includes(t)) return 'lift';
  if (['hike', 'walk'].includes(t)) return 'run';
  return 'run';
}

/**
 * Convert Strava activity to Zenith activity shape (no id, xpEarned, userId yet).
 */
function mapStravaActivityToZenith(strava) {
  const sport = stravaTypeToSport(strava.type);
  const movingTimeSec = strava.moving_time ?? strava.elapsed_time ?? 0;
  const durationMin = movingTimeSec / 60;
  let distance = null;
  let pace = null;
  const distMeters = strava.distance ?? 0;

  if (sport === 'run' || sport === 'cycle') {
    distance = distMeters / 1609.34; // meters -> miles
    if (distance > 0 && durationMin > 0) pace = durationMin / distance;
  } else if (sport === 'swim') {
    distance = distMeters / 0.9144; // meters -> yards
  }

  const startDate = strava.start_date ?? strava.start_date_local;
  const dateTs = startDate ? new Date(startDate).getTime() : Date.now();

  return {
    sport,
    title: (strava.name || '').trim() || `${sport.charAt(0).toUpperCase() + sport.slice(1)}`,
    duration: Math.round(durationMin * 10) / 10,
    distance: distance != null ? Math.round(distance * 100) / 100 : null,
    pace: pace != null ? Math.round(pace * 10) / 10 : null,
    volume: null,
    exercises: null,
    poolType: null,
    laps: null,
    notes: null,
    date: dateTs,
    source: 'strava',
    externalId: String(strava.id),
    visibility: 'private',
  };
}

/**
 * Fetch athlete activities from Strava API (paginated). Respects rate limit with delay.
 */
async function fetchStravaActivitiesPage(accessToken, afterUnix, page = 1) {
  const url = `${STRAVA_API_BASE}/athlete/activities?after=${afterUnix}&page=${page}&per_page=${PER_PAGE}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Strava API ${res.status}: ${text || res.statusText}`);
  }
  return res.json();
}

/**
 * Fetch all activities in last IMPORT_DAYS, throttled.
 */
async function fetchAllStravaActivities(accessToken, onProgress) {
  const after = Math.floor((Date.now() - IMPORT_DAYS * 24 * 60 * 60 * 1000) / 1000);
  const all = [];
  let page = 1;
  while (page <= MAX_PAGES) {
    const batch = await fetchStravaActivitiesPage(accessToken, after, page);
    all.push(...batch);
    onProgress?.({ page, fetched: batch.length, total: all.length });
    if (batch.length < PER_PAGE) break;
    page++;
    await new Promise((r) => setTimeout(r, MS_PER_REQUEST));
  }
  return all;
}

/**
 * Import Strava activities for user: fetch from Strava, dedupe by externalId, write to Firestore,
 * add XP, fan-out feed, run achievement/quest logic via onActivityAdded.
 * @param {string} uid
 * @param {(msg: string) => void} [onProgress] - e.g. "Fetching…", "Imported 5…"
 * @param {(payload: { activity }) => Promise<void>} [onActivityAdded] - App's achievement/quest callback
 * @returns {{ imported: number, skipped: number }}
 */
export async function importStravaActivities(uid, onProgress, onActivityAdded) {
  const integration = await getStravaIntegration(uid);
  const accessToken = integration?.accessToken;
  if (!accessToken) throw new Error('Strava not connected');

  onProgress?.('Fetching activities from Strava…');
  const stravaActivities = await fetchAllStravaActivities(accessToken, (p) => {
    onProgress?.(`Fetched ${p.total} activities…`);
  });

  const existingActivities = await firestoreActivities.getAll(uid);
  const existingExternalIds = new Set(
    existingActivities.map((a) => a.externalId).filter(Boolean)
  );

  let imported = 0;
  let skipped = 0;
  const newActivities = [];

  for (const sa of stravaActivities) {
    const extId = String(sa.id);
    if (existingExternalIds.has(extId)) {
      skipped++;
      continue;
    }
    const mapped = mapStravaActivityToZenith(sa);
    const activity = {
      id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      userId: uid,
      ...mapped,
      createdAt: Date.now(),
      kudosCount: 0,
      commentCount: 0,
    };
    activity.xpEarned = calculateXP(activity);
    await firestoreActivities.add(activity);
    try {
      await firestoreFeed.fanOutActivityToFeed(activity);
    } catch (e) {
      console.warn('Feed fan-out failed:', e);
    }
    await firestoreUser.addXP(uid, activity.xpEarned);
    existingExternalIds.add(extId);
    newActivities.push(activity);
    imported++;
    onProgress?.(`Imported ${imported} activities…`);
  }

  await firestoreIntegrations.set(uid, STRAVA_INTEGRATION_ID, {
    lastImportAt: Date.now(),
  });

  if (onActivityAdded && newActivities.length) {
    for (const activity of newActivities) {
      try {
        await onActivityAdded({ activity, previousActivity: null });
      } catch (e) {
        console.warn('Achievement/quest check failed:', e);
      }
    }
  }

  return { imported, skipped };
}
