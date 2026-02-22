import { describe, it, expect } from 'vitest';
import {
  calculateXP,
  getLevelInfo,
  calculateStreak,
  checkAchievements,
  getPersonalRecords,
  formatPace,
  formatDuration,
} from './gamification';
import { LEVELS, ACHIEVEMENT_DEFS } from './constants';

describe('gamification', () => {
  describe('calculateXP', () => {
    it('returns minimum 25 XP for any activity', () => {
      expect(calculateXP({})).toBe(25);
      expect(calculateXP({ duration: 0 })).toBe(25);
    });

    it('adds base 20 XP plus 1 XP per minute duration', () => {
      expect(calculateXP({ duration: 10 })).toBe(20 + 10);
      expect(calculateXP({ duration: 0 })).toBe(25); // floored 20, min 25
    });

    it('adds 10 XP per mile for run', () => {
      expect(calculateXP({ sport: 'run', duration: 0, distance: 2 })).toBe(20 + 20);
      expect(calculateXP({ sport: 'run', duration: 30, distance: 3 })).toBe(20 + 30 + 30);
    });

    it('adds 10 XP per mile for cycle', () => {
      expect(calculateXP({ sport: 'cycle', duration: 0, distance: 1 })).toBe(20 + 10);
    });

    it('adds 0.05 XP per yard for swim', () => {
      expect(calculateXP({ sport: 'swim', duration: 0, distance: 1000 })).toBe(20 + 50);
    });

    it('adds 1 XP per 100 lbs volume for lift', () => {
      expect(calculateXP({ sport: 'lift', duration: 0, volume: 500 })).toBe(20 + 5);
      expect(calculateXP({ sport: 'lift', duration: 45, volume: 1000 })).toBe(20 + 45 + 10);
    });

    it('handles missing optional fields with 0', () => {
      expect(calculateXP({ sport: 'run' })).toBe(25);
      expect(calculateXP({ sport: 'lift' })).toBe(25);
    });
  });

  describe('getLevelInfo', () => {
    it('returns level 1 for 0 XP', () => {
      const info = getLevelInfo(0);
      expect(info.level).toBe(1);
      expect(info.title).toBe('Rookie');
      expect(info.minXP).toBe(0);
      expect(info.progress).toBeDefined();
      expect(info.next).toBeDefined();
    });

    it('returns correct level at boundary', () => {
      const info500 = getLevelInfo(500);
      expect(info500.level).toBe(2);
      expect(info500.title).toBe('Contender');

      const info1200 = getLevelInfo(1200);
      expect(info1200.level).toBe(3);
    });

    it('returns level 10 for very high XP', () => {
      const info = getLevelInfo(100000);
      expect(info.level).toBe(10);
      expect(info.title).toBe('Immortal');
      expect(info.progress).toBe(100);
    });

    it('returns progress between 0 and 100 for mid-level', () => {
      const info = getLevelInfo(1000); // between 500 and 1200 (level 2)
      expect(info.level).toBe(2);
      expect(info.progressXP).toBe(500);
      expect(info.rangeXP).toBe(700);
      expect(info.progress).toBeGreaterThanOrEqual(0);
      expect(info.progress).toBeLessThanOrEqual(100);
    });

    it('includes next level reference', () => {
      const info = getLevelInfo(0);
      expect(info.next).toBe(LEVELS[1]);
      const infoMax = getLevelInfo(36000);
      expect(infoMax.next).toBeDefined();
    });
  });

  describe('calculateStreak', () => {
    it('returns 0 for empty activities', () => {
      expect(calculateStreak([])).toBe(0);
    });

    it('returns 1 for single activity today', () => {
      const today = new Date();
      today.setHours(12, 0, 0, 0);
      expect(calculateStreak([{ date: today.getTime() }])).toBe(1);
    });

    it('counts consecutive days going backward from today', () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const twoDaysAgo = new Date(today);
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      const activities = [
        { date: today.getTime() },
        { date: yesterday.getTime() },
        { date: twoDaysAgo.getTime() },
      ];
      expect(calculateStreak(activities)).toBe(3);
    });

    it('returns 0 if not active today or yesterday', () => {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      threeDaysAgo.setHours(0, 0, 0, 0);
      expect(calculateStreak([{ date: threeDaysAgo.getTime() }])).toBe(0);
    });

    it('allows grace period: active yesterday but not today still has streak', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      expect(calculateStreak([{ date: yesterday.getTime() }])).toBe(1);
    });
  });

  describe('checkAchievements', () => {
    it('returns empty when no new achievements unlocked', () => {
      const user = { xp: 0 };
      const activities = [];
      const existing = ACHIEVEMENT_DEFS.slice(0, 2).map((d) => ({ ...d, earned: false }));
      expect(checkAchievements(user, activities, existing)).toEqual([]);
    });

    it('unlocks first_workout after 1 workout', () => {
      const user = { xp: 50 };
      const today = Date.now();
      const activities = [{ id: 'a1', date: today, sport: 'run' }];
      const existing = ACHIEVEMENT_DEFS.map((d) => ({ ...d, earned: false }));
      const newly = checkAchievements(user, activities, existing);
      expect(newly).toContain('first_workout');
    });

    it('does not return already earned achievements', () => {
      const user = { xp: 1000 };
      const activities = Array.from({ length: 5 }, (_, i) => ({
        id: `a${i}`,
        date: Date.now() - i * 86400000,
        sport: 'run',
      }));
      const existing = ACHIEVEMENT_DEFS.map((d) => ({
        ...d,
        earned: d.id === 'first_workout',
      }));
      const newly = checkAchievements(user, activities, existing);
      expect(newly).not.toContain('first_workout');
    });

    it('unlocks streak achievement when streak requirement met', () => {
      const user = { xp: 100 };
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const activities = [];
      for (let i = 0; i < 3; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        activities.push({ id: `a${i}`, date: d.getTime(), sport: 'run' });
      }
      const existing = ACHIEVEMENT_DEFS.map((d) => ({ ...d, earned: false }));
      const newly = checkAchievements(user, activities, existing);
      expect(newly).toContain('streak_3');
    });

    it('unlocks run distance achievement for longest run', () => {
      const user = { xp: 200 };
      const activities = [{ id: 'a1', date: Date.now(), sport: 'run', distance: 5 }];
      const existing = ACHIEVEMENT_DEFS.map((d) => ({ ...d, earned: false }));
      const newly = checkAchievements(user, activities, existing);
      expect(newly).toContain('distance_5k'); // 3.1 mi
    });
  });

  describe('getPersonalRecords', () => {
    it('returns nulls for empty activities', () => {
      const records = getPersonalRecords([]);
      expect(records.fastestMile).toBeNull();
      expect(records.longestRun).toBeNull();
      expect(records.heaviestLift).toBeNull();
      expect(records.longestRide).toBeNull();
      expect(records.longestSwim).toBeNull();
    });

    it('tracks longest run and fastest mile', () => {
      const activities = [
        { id: '1', sport: 'run', distance: 5, pace: 9, date: 1000 },
        { id: '2', sport: 'run', distance: 3, pace: 8, date: 2000 },
      ];
      const records = getPersonalRecords(activities);
      expect(records.longestRun?.value).toBe(5);
      expect(records.fastestMile?.value).toBe(8);
    });

    it('tracks longest ride for cycle', () => {
      const activities = [{ id: '1', sport: 'cycle', distance: 50, date: 1000 }];
      const records = getPersonalRecords(activities);
      expect(records.longestRide?.value).toBe(50);
      expect(records.longestRide?.unit).toBe('mi');
    });

    it('tracks longest swim', () => {
      const activities = [{ id: '1', sport: 'swim', distance: 1500, date: 1000 }];
      const records = getPersonalRecords(activities);
      expect(records.longestSwim?.value).toBe(1500);
      expect(records.longestSwim?.unit).toBe('yd');
    });

    it('tracks heaviest lift from exercises', () => {
      const activities = [
        {
          id: '1',
          sport: 'lift',
          date: 1000,
          exercises: [
            { name: 'Bench', sets: [{ reps: 10, weight: 135 }, { reps: 5, weight: 185 }] },
          ],
        },
      ];
      const records = getPersonalRecords(activities);
      expect(records.heaviestLift?.value).toBe(185);
      expect(records.heaviestLift?.unit).toBe('lbs');
    });
  });

  describe('formatPace', () => {
    it('returns "--" for falsy input', () => {
      expect(formatPace(0)).toBe('--');
      expect(formatPace(null)).toBe('--');
      expect(formatPace(undefined)).toBe('--');
    });

    it('formats decimal minutes as M:SS', () => {
      expect(formatPace(9)).toBe('9:00');
      expect(formatPace(9.5)).toBe('9:30');
      expect(formatPace(8.25)).toBe('8:15');
    });

    it('pads seconds with zero', () => {
      expect(formatPace(10.05)).toBe('10:03');
    });
  });

  describe('formatDuration', () => {
    it('returns "--" for falsy input', () => {
      expect(formatDuration(0)).toBe('--');
      expect(formatDuration(null)).toBe('--');
    });

    it('formats minutes only when under 60', () => {
      expect(formatDuration(45)).toBe('45m');
      expect(formatDuration(30)).toBe('30m');
    });

    it('formats hours and minutes when >= 60', () => {
      expect(formatDuration(60)).toBe('1h');
      expect(formatDuration(90)).toBe('1h 30m');
      expect(formatDuration(125)).toBe('2h 5m');
    });
  });
});
