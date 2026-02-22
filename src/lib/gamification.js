import { LEVELS, ACHIEVEMENT_DEFS, SPORTS } from './constants';

// XP is awarded only on activity save; level is derived from total XP.
// Calculate XP earned for an activity
export function calculateXP(activity) {
  let xp = 20; // base XP for any workout
  const duration = activity.duration || 0;

  // Duration bonus: 1 XP per minute
  xp += Math.floor(duration);

  if (activity.sport === 'run' || activity.sport === 'cycle') {
    const distance = activity.distance || 0;
    xp += Math.floor(distance * 10); // 10 XP per mile
  } else if (activity.sport === 'swim') {
    const distance = activity.distance || 0;
    xp += Math.floor(distance * 0.05); // 0.05 XP per yard
  } else if (activity.sport === 'lift') {
    const volume = activity.volume || 0;
    xp += Math.floor(volume / 100); // 1 XP per 100 lbs volume
  }

  return Math.max(xp, 25); // minimum 25 XP
}

// Get level info from total XP
export function getLevelInfo(totalXP) {
  let current = LEVELS[0];
  for (const lvl of LEVELS) {
    if (totalXP >= lvl.minXP) {
      current = lvl;
    } else {
      break;
    }
  }
  const next = LEVELS.find(l => l.level === current.level + 1) || current;
  const progressXP = totalXP - current.minXP;
  const rangeXP = next.minXP - current.minXP;
  const progress = current.level === 10 ? 100 : Math.min(100, Math.floor((progressXP / rangeXP) * 100));
  return { ...current, next, progressXP, rangeXP, progress };
}

// Calculate streak from activities array
export function calculateStreak(activities) {
  if (!activities.length) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const activeDays = new Set(
    activities.map(a => {
      const d = new Date(a.date);
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    })
  );

  let streak = 0;
  let current = new Date(today);

  // Check if active today or yesterday (grace period)
  if (!activeDays.has(current.getTime())) {
    current.setDate(current.getDate() - 1);
    if (!activeDays.has(current.getTime())) return 0;
  }

  while (activeDays.has(current.getTime())) {
    streak++;
    current.setDate(current.getDate() - 1);
  }

  return streak;
}

// Check which achievements are newly unlocked
export function checkAchievements(user, activities, existingAchievements) {
  const earned = new Set(existingAchievements.filter(a => a.earned).map(a => a.id));
  const newlyEarned = [];

  const totalWorkouts = activities.length;
  const totalXP = user.xp;
  const streak = calculateStreak(activities);
  const totalVolume = activities.filter(a => a.sport === 'lift').reduce((sum, a) => sum + (a.volume || 0), 0);
  const totalRunDist = activities.filter(a => a.sport === 'run').reduce((sum, a) => sum + (a.distance || 0), 0);
  const totalCycleDist = activities.filter(a => a.sport === 'cycle').reduce((sum, a) => sum + (a.distance || 0), 0);
  const longestRun = Math.max(0, ...activities.filter(a => a.sport === 'run').map(a => a.distance || 0));

  for (const def of ACHIEVEMENT_DEFS) {
    if (earned.has(def.id)) continue;

    let unlocked = false;
    switch (def.requirementType) {
      case 'workouts': unlocked = totalWorkouts >= def.requirementValue; break;
      case 'streak': unlocked = streak >= def.requirementValue; break;
      case 'xp': unlocked = totalXP >= def.requirementValue; break;
      case 'total_volume': unlocked = totalVolume >= def.requirementValue; break;
      case 'total_distance':
        if (def.sport === 'run') unlocked = totalRunDist >= def.requirementValue;
        if (def.sport === 'cycle') unlocked = totalCycleDist >= def.requirementValue;
        break;
      case 'distance':
        if (def.sport === 'run') unlocked = longestRun >= def.requirementValue;
        break;
    }

    if (unlocked) newlyEarned.push(def.id);
  }

  return newlyEarned;
}

// Get personal records from activities
export function getPersonalRecords(activities) {
  const records = {
    fastestMile: null,
    longestRun: null,
    heaviestLift: null,
    longestRide: null,
    longestSwim: null,
  };

  for (const a of activities) {
    if (a.sport === 'run') {
      if (!records.longestRun || (a.distance || 0) > records.longestRun.value) {
        records.longestRun = { value: a.distance, unit: 'mi', date: a.date, activityId: a.id };
      }
      if (a.pace && (!records.fastestMile || a.pace < records.fastestMile.value)) {
        records.fastestMile = { value: a.pace, unit: 'min/mi', date: a.date, activityId: a.id };
      }
    }
    if (a.sport === 'cycle') {
      if (!records.longestRide || (a.distance || 0) > records.longestRide.value) {
        records.longestRide = { value: a.distance, unit: 'mi', date: a.date, activityId: a.id };
      }
    }
    if (a.sport === 'swim') {
      if (!records.longestSwim || (a.distance || 0) > records.longestSwim.value) {
        records.longestSwim = { value: a.distance, unit: 'yd', date: a.date, activityId: a.id };
      }
    }
    if (a.sport === 'lift') {
      const maxWeight = a.exercises
        ? Math.max(0, ...a.exercises.flatMap(e => e.sets.map(s => s.weight || 0)))
        : 0;
      if (!records.heaviestLift || maxWeight > records.heaviestLift.value) {
        records.heaviestLift = { value: maxWeight, unit: 'lbs', date: a.date, activityId: a.id };
      }
    }
  }

  return records;
}

// Format pace (decimal minutes → "M:SS")
export function formatPace(decimalMinutes) {
  if (!decimalMinutes) return '--';
  const mins = Math.floor(decimalMinutes);
  const secs = Math.round((decimalMinutes - mins) * 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Format duration in minutes → "Xh Ym" or "Ym"
export function formatDuration(minutes) {
  if (!minutes) return '--';
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}
