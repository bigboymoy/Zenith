/**
 * Tests that every Firestore write path is callable and does not throw when given valid input.
 * Firebase is mocked; these are unit tests for our write API surface.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSetDoc = vi.fn(() => Promise.resolve());
const mockUpdateDoc = vi.fn(() => Promise.resolve());
const mockDeleteDoc = vi.fn(() => Promise.resolve());
const mockGetDoc = vi.fn(() => Promise.resolve({ exists: () => false }));
const mockGetDocs = vi.fn(() => Promise.resolve({ docs: [] }));
const mockRunTransaction = vi.fn((db, fn) => fn({
  get: vi.fn(() => Promise.resolve({ exists: () => false })),
  set: vi.fn(),
}));
const mockWriteBatch = vi.fn(() => ({
  set: vi.fn(),
  commit: vi.fn(() => Promise.resolve()),
}));
const mockDoc = vi.fn(() => ({}));
const mockCollection = vi.fn(() => ({}));
const mockQuery = vi.fn(() => ({}));
const mockWhere = vi.fn(() => ({}));
const mockOrderBy = vi.fn(() => ({}));
const mockLimit = vi.fn(() => ({}));
const mockIncrement = vi.fn(() => ({}));

vi.mock('./firebase', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({
  collection: (...args) => mockCollection(...args),
  doc: (...args) => mockDoc(...args),
  setDoc: (...args) => mockSetDoc(...args),
  getDoc: (...args) => mockGetDoc(...args),
  getDocs: (...args) => mockGetDocs(...args),
  updateDoc: (...args) => mockUpdateDoc(...args),
  deleteDoc: (...args) => mockDeleteDoc(...args),
  query: (...args) => mockQuery(...args),
  where: (...args) => mockWhere(...args),
  orderBy: (...args) => mockOrderBy(...args),
  limit: (...args) => mockLimit(...args),
  onSnapshot: vi.fn(),
  increment: (...args) => mockIncrement(...args),
  writeBatch: (...args) => mockWriteBatch(...args),
  runTransaction: (...args) => mockRunTransaction(...args),
}));

describe('Firestore write paths', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDoc.mockResolvedValue({ exists: () => false });
    mockRunTransaction.mockImplementation((db, fn) => {
      const transaction = {
        get: vi.fn(() => Promise.resolve({ exists: () => false })),
        set: vi.fn(),
      };
      return fn(transaction);
    });
    const batchInstance = { set: vi.fn(), commit: vi.fn(() => Promise.resolve()) };
    mockWriteBatch.mockReturnValue(batchInstance);
  });

  it('firestoreUser.update is callable', async () => {
    const { firestoreUser } = await import('./firestore');
    await expect(firestoreUser.update('uid1', { name: 'Test' })).resolves.not.toThrow();
    expect(mockUpdateDoc).toHaveBeenCalled();
  });

  it('firestoreUser.addXP is callable', async () => {
    const { firestoreUser } = await import('./firestore');
    await expect(firestoreUser.addXP('uid1', 50)).resolves.not.toThrow();
    expect(mockSetDoc).toHaveBeenCalled();
  });

  it('firestoreActivities.add is callable', async () => {
    const { firestoreActivities } = await import('./firestore');
    const activity = {
      id: 'act_1',
      userId: 'uid1',
      sport: 'run',
      title: 'Test',
      duration: 30,
      date: Date.now(),
      xpEarned: 50,
    };
    await expect(firestoreActivities.add(activity)).resolves.not.toThrow();
    expect(mockSetDoc).toHaveBeenCalled();
  });

  it('firestoreActivities.updateWithXPDelta is callable', async () => {
    const { firestoreActivities } = await import('./firestore');
    const activity = {
      id: 'act_1',
      userId: 'uid1',
      sport: 'run',
      title: 'Test',
      duration: 30,
      xpEarned: 60,
      date: Date.now(),
    };
    await expect(firestoreActivities.updateWithXPDelta(activity)).resolves.toEqual({ xpDelta: expect.any(Number) });
    expect(mockRunTransaction).toHaveBeenCalled();
  });

  it('firestoreActivities.update is callable', async () => {
    const { firestoreActivities } = await import('./firestore');
    await expect(firestoreActivities.update('act_1', { title: 'Updated' })).resolves.not.toThrow();
    expect(mockUpdateDoc).toHaveBeenCalled();
  });

  it('firestoreActivities.delete is callable', async () => {
    const { firestoreActivities } = await import('./firestore');
    await expect(firestoreActivities.delete('act_1')).resolves.not.toThrow();
    expect(mockDeleteDoc).toHaveBeenCalled();
  });

  it('firestoreAchievements.ensureInitialized is callable', async () => {
    const { firestoreAchievements } = await import('./firestore');
    const result = await firestoreAchievements.ensureInitialized('uid1');
    expect(Array.isArray(result)).toBe(true);
  });

  it('firestoreAchievements.markEarned is callable', async () => {
    const { firestoreAchievements } = await import('./firestore');
    await expect(firestoreAchievements.markEarned('uid1', ['first_workout'])).resolves.not.toThrow();
    expect(mockWriteBatch).toHaveBeenCalled();
  });

  it('firestoreChallenges.add is callable', async () => {
    const { firestoreChallenges } = await import('./firestore');
    const challenge = { id: 'ch_1', userId: 'uid1', title: 'Test', target: 5 };
    await expect(firestoreChallenges.add(challenge)).resolves.not.toThrow();
    expect(mockSetDoc).toHaveBeenCalled();
  });

  it('firestoreChallenges.delete is callable', async () => {
    const { firestoreChallenges } = await import('./firestore');
    await expect(firestoreChallenges.delete('ch_1')).resolves.not.toThrow();
    expect(mockDeleteDoc).toHaveBeenCalled();
  });
});
