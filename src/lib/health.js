/**
 * Apple Health / HealthKit workout import (iOS via Capacitor).
 * - On iOS: request workout read permission, query workouts in date range, map to Zenith, dedupe, write.
 * - On web/Android: not supported; UI shows "Coming soon".
 *
 * Uses @capgo/capacitor-health (queryWorkouts). Install: npm i @capgo/capacitor-health && npx cap sync.
 */

import { Capacitor } from '@capacitor/core';
import { firestoreIntegrations, firestoreActivities, firestoreUser, firestoreFeed } from './firestore';
import { calculateXP } from './gamification';

const HEALTH_INTEGRATION_ID = 'health';

/** Whether the app is running on iOS with native HealthKit (Capacitor). */
export function isHealthImportAvailable() {
  return Capacitor.getPlatform() === 'ios';
}

/**
 * Map Health plugin WorkoutType to Zenith sport.
 * @see @capgo/capacitor-health WorkoutType
 */
function workoutTypeToSport(workoutType) {
  const t = (workoutType || '').toLowerCase();
  if (['running'].includes(t)) return 'run';
  if (['cycling'].includes(t)) return 'cycle';
  if (['swimming', 'waterfitness', 'waterpolo', 'watersports'].includes(t)) return 'swim';
  if (['strengthtraining', 'traditionalstrengthtraining'].includes(t)) return 'lift';
  if (['walking', 'hiking'].includes(t)) return 'run';
  if (['yoga', 'elliptical', 'rowing', 'stairclimbing', 'crosstraining'].includes(t)) return 'lift';
  return 'run';
}

/**
 * Build externalId for dedupe. Health plugin doesn't expose a stable UUID; use start+type+duration.
 */
function healthExternalId(workout) {
  const start = workout.startDate || '';
  const type = workout.workoutType || 'other';
  const dur = workout.duration ?? 0;
  return `health_${start}_${type}_${dur}`;
}

/**
 * Convert one Health workout to Zenith activity shape (no id, userId, xpEarned yet).
 */
function mapHealthWorkoutToZenith(workout) {
  const sport = workoutTypeToSport(workout.workoutType);
  const durationSec = workout.duration ?? 0;
  const durationMin = durationSec / 60;
  let distance = null;
  let pace = null;
  const distMeters = workout.totalDistance ?? 0;

  if (sport === 'run' || sport === 'cycle') {
    distance = distMeters / 1609.34;
    if (distance > 0 && durationMin > 0) pace = durationMin / distance;
  } else if (sport === 'swim') {
    distance = distMeters / 0.9144;
  }

  const dateTs = workout.startDate ? new Date(workout.startDate).getTime() : Date.now();
  const title =
    sport === 'run'
      ? 'Run'
      : sport === 'cycle'
        ? 'Ride'
        : sport === 'swim'
          ? 'Swim'
          : sport === 'lift'
            ? 'Strength'
            : 'Workout';

  return {
    sport,
    title,
    duration: Math.round(durationMin * 10) / 10,
    distance: distance != null ? Math.round(distance * 100) / 100 : null,
    pace: pace != null ? Math.round(pace * 10) / 10 : null,
    volume: null,
    exercises: null,
    poolType: null,
    laps: null,
    notes: null,
    date: dateTs,
    source: 'health',
    externalId: healthExternalId(workout),
    visibility: 'private',
  };
}

/**
 * Request HealthKit workout read permission and query workouts in [startDate, endDate].
 * Returns { workouts: [] }. On unsupported platform or error, returns { workouts: [], error }.
 */
export async function requestAndQueryWorkouts(startDate, endDate, limit = 200) {
  if (!isHealthImportAvailable()) {
    return { workouts: [], error: 'Apple Health import is only available on iOS.' };
  }
  try {
    const { Health } = await import('@capgo/capacitor-health');
    const availability = await Health.isAvailable();
    if (!availability?.available) {
      return { workouts: [], error: availability?.reason || 'Health data not available.' };
    }
    await Health.requestAuthorization({ read: ['workouts'] });
    const start = typeof startDate === 'string' ? startDate : new Date(startDate).toISOString();
    const end = typeof endDate === 'string' ? endDate : new Date(endDate).toISOString();
    const result = await Health.queryWorkouts({ startDate: start, endDate: end, limit });
    return { workouts: result?.workouts ?? [] };
  } catch (e) {
    console.warn('Health query failed:', e);
    return { workouts: [], error: e?.message || 'Could not read workouts.' };
  }
}

/**
 * Get last import time for Apple Health (stored in integrations/health).
 */
export async function getHealthLastImport(uid) {
  const data = await firestoreIntegrations.get(uid, HEALTH_INTEGRATION_ID);
  return data?.lastImportAt ?? null;
}

/**
 * Import Health workouts for user: query workouts in range, dedupe by externalId, write to Firestore,
 * add XP, optionally run onActivityAdded.
 * @param {string} uid
 * @param {{ startDate: Date | string, endDate: Date | string }} range - Default last 30 days
 * @param {(msg: string) => void} [onProgress]
 * @param {(payload: { activity }) => Promise<void>} [onActivityAdded]
 * @returns {{ imported: number, skipped: number, error?: string }}
 */
export async function importHealthWorkouts(uid, range, onProgress, onActivityAdded) {
  if (!isHealthImportAvailable()) {
    return { imported: 0, skipped: 0, error: 'Apple Health is only available on iOS.' };
  }
  const end = range?.endDate ? new Date(range.endDate) : new Date();
  const start = range?.startDate
    ? new Date(range.startDate)
    : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
  onProgress?.('Reading workouts from Apple Health…');
  const { workouts, error } = await requestAndQueryWorkouts(start, end);
  if (error) return { imported: 0, skipped: 0, error };
  if (!workouts.length) {
    await firestoreIntegrations.set(uid, HEALTH_INTEGRATION_ID, { lastImportAt: Date.now() });
    return { imported: 0, skipped: 0 };
  }
  const existingActivities = await firestoreActivities.getAll(uid);
  const existingExternalIds = new Set(
    existingActivities.map((a) => a.externalId).filter(Boolean)
  );
  let imported = 0;
  let skipped = 0;
  const newActivities = [];
  for (const w of workouts) {
    const extId = healthExternalId(w);
    if (existingExternalIds.has(extId)) {
      skipped++;
      continue;
    }
    const mapped = mapHealthWorkoutToZenith(w);
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
    onProgress?.(`Imported ${imported} workouts…`);
  }
  await firestoreIntegrations.set(uid, HEALTH_INTEGRATION_ID, {
    lastImportAt: Date.now(),
  });
  if (onActivityAdded) {
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
