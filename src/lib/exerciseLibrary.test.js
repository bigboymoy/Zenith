import { describe, it, expect } from 'vitest';
import {
  MUSCLE_GROUPS,
  EXERCISE_CATALOG,
  getExerciseById,
  getExercisesByMuscleGroup,
  searchExercises,
} from './exerciseLibrary';

describe('exerciseLibrary', () => {
  describe('MUSCLE_GROUPS', () => {
    it('includes expected groups with value and label', () => {
      const values = MUSCLE_GROUPS.map((g) => g.value);
      expect(values).toContain('chest');
      expect(values).toContain('back');
      expect(values).toContain('shoulders');
      expect(values).toContain('legs');
      expect(values).toContain('arms');
      expect(values).toContain('core');
      MUSCLE_GROUPS.forEach((g) => {
        expect(g).toHaveProperty('value');
        expect(g).toHaveProperty('label');
      });
    });
  });

  describe('EXERCISE_CATALOG', () => {
    it('has exercises with id, name, muscleGroup, equipment', () => {
      expect(EXERCISE_CATALOG.length).toBeGreaterThan(0);
      EXERCISE_CATALOG.forEach((e) => {
        expect(e).toHaveProperty('id');
        expect(e).toHaveProperty('name');
        expect(e).toHaveProperty('muscleGroup');
        expect(e).toHaveProperty('equipment');
      });
    });

    it('has Bench Press in chest', () => {
      const bench = EXERCISE_CATALOG.find((e) => e.name === 'Bench Press');
      expect(bench).toBeDefined();
      expect(bench.muscleGroup).toBe('chest');
    });
  });

  describe('getExerciseById', () => {
    it('returns exercise for valid id', () => {
      const e = getExerciseById('bench_press');
      expect(e).not.toBeNull();
      expect(e.name).toBe('Bench Press');
      expect(e.muscleGroup).toBe('chest');
    });

    it('returns null for unknown id', () => {
      expect(getExerciseById('unknown_id')).toBeNull();
      expect(getExerciseById('')).toBeNull();
    });
  });

  describe('getExercisesByMuscleGroup', () => {
    it('returns only exercises for that group', () => {
      const chest = getExercisesByMuscleGroup('chest');
      expect(chest.length).toBeGreaterThan(0);
      chest.forEach((e) => expect(e.muscleGroup).toBe('chest'));
    });

    it('returns full catalog for null/undefined group', () => {
      expect(getExercisesByMuscleGroup(null).length).toBe(EXERCISE_CATALOG.length);
      expect(getExercisesByMuscleGroup(undefined).length).toBe(EXERCISE_CATALOG.length);
    });

    it('returns empty for non-existent group', () => {
      expect(getExercisesByMuscleGroup('nonexistent')).toEqual([]);
    });
  });

  describe('searchExercises', () => {
    it('returns all when query is empty or whitespace', () => {
      expect(searchExercises('').length).toBe(EXERCISE_CATALOG.length);
      expect(searchExercises('   ').length).toBe(EXERCISE_CATALOG.length);
      expect(searchExercises(null).length).toBe(EXERCISE_CATALOG.length);
    });

    it('matches by name case-insensitively', () => {
      const results = searchExercises('bench');
      expect(results.length).toBeGreaterThan(0);
      expect(results.some((e) => e.name.toLowerCase().includes('bench'))).toBe(true);
    });

    it('matches by muscle group', () => {
      const results = searchExercises('chest');
      expect(results.length).toBeGreaterThan(0);
      results.forEach((e) => expect(e.muscleGroup).toBe('chest'));
    });

    it('matches by equipment', () => {
      const results = searchExercises('barbell');
      expect(results.length).toBeGreaterThan(0);
      results.forEach((e) => expect(e.equipment).toBe('barbell'));
    });
  });
});
