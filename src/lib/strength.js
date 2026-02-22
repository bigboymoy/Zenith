/**
 * 1RM (one-rep max) estimation and strength analytics.
 * Uses Epley formula: 1RM = weight × (1 + reps/30). For 1 rep, returns weight.
 */

/**
 * Compute estimated 1RM from a single set (weight, reps).
 * Epley formula; returns null if inputs invalid.
 * @param {number} weight - Weight lifted (lbs)
 * @param {number} reps - Repetitions
 * @returns {number|null} Estimated 1RM in lbs, or null
 */
export function computeEstimated1RM(weight, reps) {
  const w = Number(weight);
  const r = Number(reps);
  if (!Number.isFinite(w) || !Number.isFinite(r) || w <= 0 || r < 1) return null;
  if (r === 1) return w;
  // Epley: 1RM = weight * (1 + reps/30)
  return w * (1 + r / 30);
}

/**
 * Get the best (highest) estimated 1RM for an exercise from activity history.
 * @param {string} exerciseName - Exercise name (matched case-insensitive, trimmed)
 * @param {Array<{ sport: string, exercises?: Array<{ name: string, sets: Array<{ reps: number, weight: number }> }> }>} activities - User activities
 * @returns {{ value: number, date?: number } | null} Best 1RM and optional date of that set, or null
 */
export function getBest1RMForExercise(exerciseName, activities) {
  const needle = (exerciseName || '').trim().toLowerCase();
  if (!needle) return null;

  let best = null;
  let bestDate = null;

  const liftActivities = activities.filter((a) => a.sport === 'lift' && a.exercises?.length);
  for (const a of liftActivities) {
    const ex = a.exercises.find(
      (e) => (e.name || '').trim().toLowerCase() === needle
    );
    if (!ex?.sets?.length) continue;
    const date = a.date;
    for (const set of ex.sets) {
      const reps = set.reps ?? 0;
      const weight = set.weight ?? 0;
      const est = computeEstimated1RM(weight, reps);
      if (est != null && (best == null || est > best)) {
        best = est;
        bestDate = date;
      }
    }
  }

  if (best == null) return null;
  return { value: best, date: bestDate ?? undefined };
}

/**
 * Stable id for Firestore oneRepMax subcollection (no spaces, URL-safe).
 * @param {string} name - Exercise name
 * @returns {string}
 */
export function slugExerciseId(name) {
  return (name || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
}

/**
 * Get 1RM history for an exercise for charting (one point per day: max estimated 1RM that day).
 * Matches by normalized name or slug (e.g. "Bench Press" or "bench_press").
 * @param {string} exerciseNameOrId - Exercise name or slug (exerciseId)
 * @param {Array} activities - User activities
 * @returns {Array<{ date: number, value: number }>} Sorted by date ascending
 */
export function get1RMHistoryForExercise(exerciseNameOrId, activities) {
  const needleSlug = slugExerciseId(exerciseNameOrId);
  const needleLower = (exerciseNameOrId || '').trim().toLowerCase();
  if (!needleSlug && !needleLower) return [];

  const byDay = new Map(); // dayStartTime -> max 1RM that day

  const liftActivities = activities.filter((a) => a.sport === 'lift' && a.exercises?.length);
  for (const a of liftActivities) {
    const ex = a.exercises.find((e) => {
      const name = (e.name || '').trim();
      return name.toLowerCase() === needleLower || slugExerciseId(name) === needleSlug;
    });
    if (!ex?.sets?.length) continue;
    const dayStart = new Date(a.date);
    dayStart.setHours(0, 0, 0, 0);
    const key = dayStart.getTime();
    for (const set of ex.sets) {
      const est = computeEstimated1RM(set.weight, set.reps);
      if (est != null) {
        const prev = byDay.get(key) ?? 0;
        byDay.set(key, Math.max(prev, est));
      }
    }
  }

  const points = Array.from(byDay.entries()).map(([date, value]) => ({ date, value }));
  points.sort((a, b) => a.date - b.date);
  return points;
}
