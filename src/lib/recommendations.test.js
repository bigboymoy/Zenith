import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  getMuscleGroupForExerciseName,
  getActivityFocus,
  getLastWorkoutFocus,
  getSuggestedWorkout,
  isRecommendationDismissedToday,
  dismissRecommendationForToday,
} from './recommendations';

describe('recommendations', () => {
  describe('getMuscleGroupForExerciseName', () => {
    it('returns muscle group for exact catalog name', () => {
      expect(getMuscleGroupForExerciseName('Bench Press')).toBe('chest');
      expect(getMuscleGroupForExerciseName('Back Squat')).toBe('legs');
      expect(getMuscleGroupForExerciseName('Deadlift')).toBe('back');
    });

    it('is case-insensitive', () => {
      expect(getMuscleGroupForExerciseName('bench press')).toBe('chest');
      expect(getMuscleGroupForExerciseName('BENCH PRESS')).toBe('chest');
    });

    it('returns null for empty or unknown exercise', () => {
      expect(getMuscleGroupForExerciseName('')).toBeNull();
      expect(getMuscleGroupForExerciseName('   ')).toBeNull();
      expect(getMuscleGroupForExerciseName('Unknown Exercise XYZ')).toBeNull();
    });
  });

  describe('getActivityFocus', () => {
    it('returns cardio for run, cycle, swim', () => {
      expect(getActivityFocus({ sport: 'run' })).toBe('cardio');
      expect(getActivityFocus({ sport: 'cycle' })).toBe('cardio');
      expect(getActivityFocus({ sport: 'swim' })).toBe('cardio');
    });

    it('returns null for empty or non-lift without exercises', () => {
      expect(getActivityFocus(null)).toBeNull();
      expect(getActivityFocus({ sport: 'lift' })).toBeNull();
      expect(getActivityFocus({ sport: 'lift', exercises: [] })).toBeNull();
    });

    it('returns lower for legs-only lift', () => {
      const act = { sport: 'lift', exercises: [{ name: 'Back Squat' }] };
      expect(getActivityFocus(act)).toBe('lower');
    });

    it('returns upper for upper-body-only lift', () => {
      const act = { sport: 'lift', exercises: [{ name: 'Bench Press' }] };
      expect(getActivityFocus(act)).toBe('upper');
    });

    it('returns core for core-focused lift', () => {
      const act = { sport: 'lift', exercises: [{ name: 'Plank' }, { name: 'Crunch' }] };
      expect(getActivityFocus(act)).toBe('core');
    });
  });

  describe('getLastWorkoutFocus', () => {
    it('returns null for empty activities', () => {
      expect(getLastWorkoutFocus([])).toBeNull();
      expect(getLastWorkoutFocus(null)).toBeNull();
    });

    it('returns focus of most recent workout by date', () => {
      const activities = [
        { date: 1000, sport: 'lift', exercises: [{ name: 'Bench Press' }] },
        { date: 2000, sport: 'run' },
      ];
      expect(getLastWorkoutFocus(activities)).toBe('cardio');
      expect(getLastWorkoutFocus(activities.reverse())).toBe('cardio');
    });

    it('ignores activities with no focus', () => {
      const activities = [
        { date: 2000, sport: 'lift', exercises: [] },
        { date: 1000, sport: 'lift', exercises: [{ name: 'Bench Press' }] },
      ];
      expect(getLastWorkoutFocus(activities)).toBe('upper');
    });
  });

  describe('getSuggestedWorkout', () => {
    it('returns an object with sport, title, reason', () => {
      const suggestion = getSuggestedWorkout([], { primarySport: 'run' });
      expect(suggestion).toHaveProperty('sport');
      expect(suggestion).toHaveProperty('title');
      expect(suggestion).toHaveProperty('reason');
    });

    it('suggests lower or cardio after upper', () => {
      const activities = [{ date: Date.now(), sport: 'lift', exercises: [{ name: 'Bench Press' }] }];
      const suggestion = getSuggestedWorkout(activities, { primarySport: 'run' });
      expect(['run', 'cycle', 'lift']).toContain(suggestion.sport);
      if (suggestion.sport === 'lift') {
        expect(suggestion.exercises).toBeDefined();
        expect(suggestion.exercises.length).toBeGreaterThanOrEqual(3);
        expect(suggestion.exercises.length).toBeLessThanOrEqual(5);
      }
    });

    it('suggests upper after lower', () => {
      const activities = [{ date: Date.now(), sport: 'lift', exercises: [{ name: 'Back Squat' }] }];
      const suggestion = getSuggestedWorkout(activities, { primarySport: 'lift' });
      expect(suggestion.sport).toBe('lift');
      expect(suggestion.exercises).toBeDefined();
    });

    it('suggests lift when no recent activity (stay active)', () => {
      const suggestion = getSuggestedWorkout([], { primarySport: 'cycle' });
      expect(suggestion.sport).toBe('lift');
      expect(suggestion.exercises).toBeDefined();
    });
  });

  describe('isRecommendationDismissedToday / dismissRecommendationForToday', () => {
    const key = '2025-02-21';

    beforeEach(() => {
      localStorage.clear();
    });

    afterEach(() => {
      localStorage.clear();
    });

    it('returns false when not dismissed', () => {
      expect(isRecommendationDismissedToday(key)).toBe(false);
    });

    it('returns true after dismissRecommendationForToday', () => {
      dismissRecommendationForToday(key);
      expect(isRecommendationDismissedToday(key)).toBe(true);
    });

    it('returns false for different day key', () => {
      dismissRecommendationForToday(key);
      expect(isRecommendationDismissedToday('2025-02-22')).toBe(false);
    });
  });
});
