import { userStorage, activityStorage, achievementStorage, challengeStorage, questStorage } from './storage';
import { ACHIEVEMENT_DEFS, QUEST_POOL } from './constants';
import { calculateXP } from './gamification';

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(Math.floor(Math.random() * 8) + 7, Math.floor(Math.random() * 60), 0, 0);
  return d.getTime();
}

export function seedData() {
  // Only seed if no user exists
  if (userStorage.get()) return;

  // Create user
  userStorage.set({
    id: 'me',
    username: 'you',
    name: 'You',
    avatar: null,
    level: 3,
    xp: 1850,
    primarySport: 'run',
    streak: 5,
    longestStreak: 12,
    joinedAt: daysAgo(90),
  });

  // Create activities (last 30 days)
  const rawActivities = [
    { sport: 'run', title: 'Morning Run', distance: 5.2, duration: 48, pace: 9.2, date: daysAgo(0) },
    { sport: 'lift', title: 'Upper Body Strength', duration: 55, exercises: [
      { name: 'Bench Press', sets: [{ reps: 10, weight: 135 }, { reps: 8, weight: 145 }, { reps: 6, weight: 155 }] },
      { name: 'Pull-Ups', sets: [{ reps: 10, weight: 0 }, { reps: 8, weight: 0 }, { reps: 7, weight: 0 }] },
      { name: 'Shoulder Press', sets: [{ reps: 10, weight: 95 }, { reps: 8, weight: 100 }] },
    ], date: daysAgo(1) },
    { sport: 'cycle', title: 'Evening Ride', distance: 18.4, duration: 62, pace: 17.8, date: daysAgo(2) },
    { sport: 'run', title: 'Tempo Run', distance: 4.0, duration: 32, pace: 8.0, date: daysAgo(3) },
    { sport: 'lift', title: 'Leg Day', duration: 60, exercises: [
      { name: 'Squat', sets: [{ reps: 8, weight: 185 }, { reps: 8, weight: 195 }, { reps: 6, weight: 205 }] },
      { name: 'Romanian Deadlift', sets: [{ reps: 10, weight: 155 }, { reps: 10, weight: 165 }] },
      { name: 'Leg Press', sets: [{ reps: 12, weight: 270 }, { reps: 10, weight: 290 }] },
    ], date: daysAgo(4) },
    { sport: 'swim', title: 'Pool Session', distance: 1500, duration: 45, date: daysAgo(5) },
    { sport: 'run', title: 'Long Run', distance: 8.5, duration: 82, pace: 9.6, date: daysAgo(7) },
    { sport: 'cycle', title: 'Weekend Ride', distance: 32.1, duration: 105, pace: 18.3, date: daysAgo(9) },
    { sport: 'lift', title: 'Push Day', duration: 50, exercises: [
      { name: 'Incline Bench', sets: [{ reps: 10, weight: 115 }, { reps: 8, weight: 125 }] },
      { name: 'Tricep Dips', sets: [{ reps: 12, weight: 0 }, { reps: 10, weight: 0 }] },
      { name: 'Lateral Raises', sets: [{ reps: 15, weight: 20 }, { reps: 12, weight: 25 }] },
    ], date: daysAgo(10) },
    { sport: 'run', title: 'Recovery Jog', distance: 3.1, duration: 30, pace: 9.7, date: daysAgo(12) },
    { sport: 'swim', title: 'Open Water Swim', distance: 2000, duration: 60, date: daysAgo(14) },
    { sport: 'lift', title: 'Full Body', duration: 65, exercises: [
      { name: 'Deadlift', sets: [{ reps: 5, weight: 225 }, { reps: 5, weight: 235 }, { reps: 3, weight: 245 }] },
      { name: 'Barbell Row', sets: [{ reps: 10, weight: 135 }, { reps: 8, weight: 145 }] },
    ], date: daysAgo(16) },
    { sport: 'run', title: '10K Race Pace', distance: 6.2, duration: 52, pace: 8.4, date: daysAgo(18) },
    { sport: 'cycle', title: 'Hill Repeats', distance: 14.0, duration: 58, pace: 14.5, date: daysAgo(21) },
    { sport: 'run', title: 'Easy Run', distance: 4.5, duration: 45, pace: 10.0, date: daysAgo(24) },
    { sport: 'lift', title: 'Back & Biceps', duration: 55, exercises: [
      { name: 'Lat Pulldown', sets: [{ reps: 12, weight: 120 }, { reps: 10, weight: 130 }] },
      { name: 'Barbell Curl', sets: [{ reps: 12, weight: 65 }, { reps: 10, weight: 70 }] },
    ], date: daysAgo(26) },
    { sport: 'run', title: 'Morning Miles', distance: 5.8, duration: 55, pace: 9.5, date: daysAgo(28) },
  ];

  const activities = rawActivities.map((a, i) => {
    let volume = 0;
    if (a.sport === 'lift' && a.exercises) {
      volume = a.exercises.reduce((sum, ex) =>
        sum + ex.sets.reduce((s, set) => s + (set.reps * (set.weight || 0)), 0), 0);
    }
    const activity = {
      id: `seed_${i}_${Date.now()}`,
      userId: 'me',
      sport: a.sport,
      title: a.title,
      distance: a.distance || null,
      duration: a.duration,
      pace: a.pace || null,
      volume: volume || null,
      exercises: a.exercises || null,
      notes: null,
      date: a.date,
      createdAt: a.date,
    };
    activity.xpEarned = calculateXP(activity);
    return activity;
  });

  activityStorage.setAll(activities);

  // Seed achievements
  const achievements = ACHIEVEMENT_DEFS.map(def => ({
    ...def,
    earned: ['first_workout', 'workouts_10', 'streak_3', 'distance_5k', 'xp_1000'].includes(def.id),
    earnedDate: ['first_workout', 'workouts_10', 'streak_3', 'distance_5k', 'xp_1000'].includes(def.id)
      ? daysAgo(Math.floor(Math.random() * 30)) : null,
  }));
  achievementStorage.setAll(achievements);

  // Seed weekly challenges
  const endOfWeek = new Date();
  endOfWeek.setDate(endOfWeek.getDate() + (7 - endOfWeek.getDay()));
  endOfWeek.setHours(23, 59, 59, 0);

  challengeStorage.setAll([
    {
      id: 'wc_1', name: 'Run the Week', type: 'distance', sport: 'run',
      targetValue: 20, currentValue: 13.7, unit: 'mi',
      deadline: endOfWeek.getTime(), xpReward: 300, isWeekly: true,
      description: 'Log 20 miles of running this week',
    },
    {
      id: 'wc_2', name: 'Iron Week', type: 'frequency', sport: 'lift',
      targetValue: 4, currentValue: 2, unit: 'workouts',
      deadline: endOfWeek.getTime(), xpReward: 250, isWeekly: true,
      description: 'Complete 4 strength sessions this week',
    },
    {
      id: 'wc_3', name: 'Cycle Century', type: 'distance', sport: 'cycle',
      targetValue: 50, currentValue: 32.1, unit: 'mi',
      deadline: endOfWeek.getTime(), xpReward: 350, isWeekly: true,
      description: 'Ride 50 miles this week',
    },
  ]);

  // Seed daily quests (pick 3 random)
  const today = new Date().toDateString();
  const shuffled = [...QUEST_POOL].sort(() => Math.random() - 0.5);
  const dailyQuests = shuffled.slice(0, 3).map(q => ({
    ...q,
    completed: false,
    date: today,
  }));
  questStorage.set({ quests: dailyQuests, date: today });
}
