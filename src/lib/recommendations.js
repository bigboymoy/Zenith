/**
 * Heuristic workout recommendations (Liftoff-style, rule-based).
 * Uses: last workout focus, profile primarySport, exercise library muscle groups.
 * No ML.
 */

import { EXERCISE_CATALOG, getExercisesByMuscleGroup } from './exerciseLibrary';

const UPPER_GROUPS = ['chest', 'back', 'shoulders', 'arms'];
const LOWER_GROUPS = ['legs'];
const CORE_GROUPS = ['core'];

/** Normalize exercise name for matching (lowercase, trim). */
function normalizeName(name) {
  return (name || '').trim().toLowerCase();
}

/**
 * Resolve activity exercise name to catalog muscle group.
 * @param {string} name - Exercise name from activity
 * @returns {string|null} - muscleGroup or null
 */
export function getMuscleGroupForExerciseName(name) {
  const n = normalizeName(name);
  if (!n) return null;
  const found = EXERCISE_CATALOG.find(
    (e) => normalizeName(e.name) === n || e.name.toLowerCase().includes(n) || n.includes(e.name.toLowerCase())
  );
  return found ? found.muscleGroup : null;
}

/**
 * Infer focus of a single activity: 'upper' | 'lower' | 'core' | 'cardio'.
 * For lift: aggregate exercise muscle groups. For run/cycle/swim: 'cardio'.
 */
export function getActivityFocus(activity) {
  if (!activity) return null;
  if (activity.sport === 'run' || activity.sport === 'cycle' || activity.sport === 'swim') {
    return 'cardio';
  }
  if (activity.sport !== 'lift' || !activity.exercises?.length) {
    return null;
  }
  const groups = new Set();
  for (const ex of activity.exercises) {
    const mg = getMuscleGroupForExerciseName(ex.name);
    if (mg) groups.add(mg);
  }
  if (groups.size === 0) return null;
  if (groups.has('legs') && !UPPER_GROUPS.some((g) => groups.has(g))) return 'lower';
  if (UPPER_GROUPS.some((g) => groups.has(g)) && !groups.has('legs')) return 'upper';
  if (groups.has('core') && groups.size <= 2) return 'core';
  if (groups.has('legs')) return 'lower';
  return 'upper';
}

/**
 * Get the focus of the most recent workout (by date).
 * @param {Array} activities - User activities (newest first or by date desc)
 * @returns {string|null} - 'upper' | 'lower' | 'core' | 'cardio' | null
 */
export function getLastWorkoutFocus(activities) {
  const sorted = [...(activities || [])].sort((a, b) => (b.date || 0) - (a.date || 0));
  for (const a of sorted) {
    const focus = getActivityFocus(a);
    if (focus) return focus;
  }
  return null;
}

/**
 * Pick 3–5 exercises from one or two muscle groups (for variety).
 * @param {string[]} muscleGroups - e.g. ['chest', 'arms']
 * @param {number} count - target count (default 4)
 * @returns {Array<{ name: string, setsCount: number }>}
 */
function pickExercisesForGroups(muscleGroups, count = 4) {
  const out = [];
  const used = new Set();
  for (const mg of muscleGroups) {
    const list = getExercisesByMuscleGroup(mg);
    const shuffled = [...list].sort(() => Math.random() - 0.5);
    for (const e of shuffled) {
      if (out.length >= count) break;
      if (used.has(e.name)) continue;
      used.add(e.name);
      out.push({ name: e.name, setsCount: 3 });
    }
  }
  return out.slice(0, count);
}

/**
 * Get a suggested workout for today (rule-based).
 * @param {Array} activities - User activities (any order; sorted internally)
 * @param {object} user - User doc { primarySport }
 * @returns {{ sport: string, title: string, reason: string, exercises?: Array<{ name: string, setsCount: number }> } | null}
 */
export function getSuggestedWorkout(activities, user) {
  const lastFocus = getLastWorkoutFocus(activities);
  const primarySport = user?.primarySport || 'run';

  // (1) Last was upper → suggest lower or cardio
  if (lastFocus === 'upper') {
    const goCardio = primarySport !== 'lift';
    if (goCardio) {
      const sport = primarySport === 'run' ? 'run' : primarySport === 'cycle' ? 'cycle' : 'run';
      return {
        sport,
        title: sport === 'run' ? 'Recovery Run' : 'Easy Ride',
        reason: 'You did upper body last — mix in some cardio today.',
      };
    }
    const exercises = pickExercisesForGroups(['legs'], 4);
    return {
      sport: 'lift',
      title: 'Leg Day',
      reason: 'You hit upper body last — balance with legs today.',
      exercises,
    };
  }

  // (2) Last was lower → suggest upper or cardio
  if (lastFocus === 'lower') {
    const exercises = pickExercisesForGroups(['chest', 'arms'], 4);
    return {
      sport: 'lift',
      title: 'Chest & Triceps',
      reason: 'Leg day is behind you — work chest and triceps today.',
      exercises,
    };
  }

  // (3) Last was core → suggest upper or cardio
  if (lastFocus === 'core') {
    const exercises = pickExercisesForGroups(['back', 'shoulders'], 4);
    return {
      sport: 'lift',
      title: 'Back & Shoulders',
      reason: 'Core is done — hit back and shoulders today.',
      exercises,
    };
  }

  // (4) Last was cardio or no recent lift → suggest lift (goal: build muscle / stay active)
  if (lastFocus === 'cardio' || lastFocus === null) {
    if (primarySport === 'lift') {
      const exercises = pickExercisesForGroups(['chest', 'arms'], 4);
      return {
        sport: 'lift',
        title: 'Chest & Triceps',
        reason: 'Great day for a strength session — chest and triceps.',
        exercises,
      };
    }
    // Stay active: suggest a quick lift
    const exercises = pickExercisesForGroups(['chest', 'back'], 4);
    return {
      sport: 'lift',
      title: 'Quick Strength',
      reason: 'Add a short strength session — build muscle and stay active.',
      exercises,
    };
  }

  // Fallback: suggest based on primary sport
  if (primarySport === 'lift') {
    const exercises = pickExercisesForGroups(['legs'], 4);
    return {
      sport: 'lift',
      title: 'Leg Day',
      reason: 'Suggested for today: leg day.',
      exercises,
    };
  }
  return {
    sport: primarySport === 'cycle' ? 'cycle' : 'run',
    title: primarySport === 'cycle' ? 'Easy Ride' : 'Quick Run',
    reason: 'Get moving with a short session today.',
  };
}

const DISMISS_KEY = 'zenith_recommendation_dismissed';

/**
 * Check if the user dismissed the recommendation for today (localStorage).
 * @param {string} todayKey - YYYY-MM-DD
 */
export function isRecommendationDismissedToday(todayKey) {
  try {
    return localStorage.getItem(DISMISS_KEY) === todayKey;
  } catch {
    return false;
  }
}

/**
 * Mark recommendation as dismissed for today.
 * @param {string} todayKey - YYYY-MM-DD
 */
export function dismissRecommendationForToday(todayKey) {
  try {
    localStorage.setItem(DISMISS_KEY, todayKey);
  } catch { /* ignore */ }
}
