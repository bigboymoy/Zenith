import { describe, it, expect } from 'vitest';
import {
  computeEstimated1RM,
  getBest1RMForExercise,
  slugExerciseId,
  get1RMHistoryForExercise,
} from './strength';

describe('strength', () => {
  describe('computeEstimated1RM', () => {
    it('returns weight for 1 rep', () => {
      expect(computeEstimated1RM(135, 1)).toBe(135);
      expect(computeEstimated1RM(225, 1)).toBe(225);
    });

    it('uses Epley formula for multiple reps', () => {
      // 100 * (1 + 10/30) = 100 * 1.333... = 133.33...
      expect(computeEstimated1RM(100, 10)).toBeCloseTo(133.33, 1);
      expect(computeEstimated1RM(135, 5)).toBeCloseTo(157.5, 1);
    });

    it('returns null for invalid inputs', () => {
      expect(computeEstimated1RM(0, 5)).toBeNull();
      expect(computeEstimated1RM(100, 0)).toBeNull();
      expect(computeEstimated1RM(-10, 5)).toBeNull();
      expect(computeEstimated1RM(NaN, 5)).toBeNull();
      expect(computeEstimated1RM(100, NaN)).toBeNull();
    });

    it('accepts number-like values', () => {
      expect(computeEstimated1RM('135', 1)).toBe(135);
      expect(computeEstimated1RM(135, '5')).toBeCloseTo(157.5, 1);
    });
  });

  describe('getBest1RMForExercise', () => {
    it('returns null for empty or no matching activities', () => {
      expect(getBest1RMForExercise('Bench Press', [])).toBeNull();
      expect(getBest1RMForExercise('', [{ sport: 'lift', exercises: [{ name: 'Squat', sets: [{ reps: 5, weight: 225 }] }] }])).toBeNull();
      expect(getBest1RMForExercise('Unknown', [{ sport: 'lift', exercises: [{ name: 'Bench Press', sets: [] }] }])).toBeNull();
    });

    it('matches exercise name case-insensitively', () => {
      const activities = [
        {
          sport: 'lift',
          date: 1000,
          exercises: [{ name: 'Bench Press', sets: [{ reps: 5, weight: 185 }, { reps: 3, weight: 205 }] }],
        },
      ];
      const result = getBest1RMForExercise('bench press', activities);
      expect(result).not.toBeNull();
      expect(result.value).toBeGreaterThanOrEqual(205);
      expect(result.date).toBe(1000);
    });

    it('returns best estimated 1RM across sets and activities', () => {
      const activities = [
        {
          sport: 'lift',
          date: 1000,
          exercises: [{ name: 'Squat', sets: [{ reps: 5, weight: 225 }] }],
        },
        {
          sport: 'lift',
          date: 2000,
          exercises: [{ name: 'Squat', sets: [{ reps: 3, weight: 275 }, { reps: 1, weight: 315 }] }],
        },
      ];
      const result = getBest1RMForExercise('Squat', activities);
      expect(result).not.toBeNull();
      expect(result.value).toBe(315);
      expect(result.date).toBe(2000);
    });

    it('ignores non-lift activities', () => {
      const activities = [
        { sport: 'run', date: 1000 },
        {
          sport: 'lift',
          date: 2000,
          exercises: [{ name: 'Bench Press', sets: [{ reps: 1, weight: 185 }] }],
        },
      ];
      const result = getBest1RMForExercise('Bench Press', activities);
      expect(result?.value).toBe(185);
    });
  });

  describe('slugExerciseId', () => {
    it('lowercases and replaces spaces with underscores', () => {
      expect(slugExerciseId('Bench Press')).toBe('bench_press');
      expect(slugExerciseId('Incline Dumbbell Press')).toBe('incline_dumbbell_press');
    });

    it('strips non-alphanumeric except underscore', () => {
      expect(slugExerciseId('Close-Grip Bench Press')).toBe('closegrip_bench_press');
      expect(slugExerciseId('  Trim  ')).toBe('trim');
    });

    it('handles empty or whitespace', () => {
      expect(slugExerciseId('')).toBe('');
      expect(slugExerciseId('   ')).toBe('');
    });
  });

  describe('get1RMHistoryForExercise', () => {
    it('returns empty for no match or empty activities', () => {
      expect(get1RMHistoryForExercise('Unknown', [])).toEqual([]);
      expect(get1RMHistoryForExercise('', [{ sport: 'lift' }])).toEqual([]);
    });

    it('returns one point per day with max 1RM that day', () => {
      const day1 = new Date(2000, 0, 1).getTime();
      const day2 = new Date(2000, 0, 2).getTime();
      const activities = [
        {
          sport: 'lift',
          date: day1,
          exercises: [{ name: 'Bench Press', sets: [{ reps: 5, weight: 135 }, { reps: 3, weight: 155 }] }],
        },
        {
          sport: 'lift',
          date: day2,
          exercises: [{ name: 'Bench Press', sets: [{ reps: 1, weight: 185 }] }],
        },
      ];
      const history = get1RMHistoryForExercise('Bench Press', activities);
      expect(history).toHaveLength(2);
      expect(history[0].date).toBeLessThanOrEqual(history[1].date);
      const byDay = Object.fromEntries(history.map((p) => [p.date, p.value]));
      expect(Object.keys(byDay)).toHaveLength(2);
    });

    it('matches by slug (exerciseId)', () => {
      const activities = [
        {
          sport: 'lift',
          date: 1000,
          exercises: [{ name: 'Bench Press', sets: [{ reps: 1, weight: 185 }] }],
        },
      ];
      const history = get1RMHistoryForExercise('bench_press', activities);
      expect(history).toHaveLength(1);
      expect(history[0].value).toBe(185);
    });
  });
});
