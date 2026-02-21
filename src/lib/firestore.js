import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot,
  increment,
  writeBatch,
  runTransaction
} from 'firebase/firestore';
import { db } from './firebase';
import { ACHIEVEMENT_DEFS } from './constants';

// ── User Collection ───────────────────────────────────────────────────────────
export const firestoreUser = {
  get: async (uid) => {
    const snap = await getDoc(doc(db, 'users', uid));
    return snap.exists() ? snap.data() : null;
  },
  update: async (uid, data) => {
    return updateDoc(doc(db, 'users', uid), data);
  },
  addXP: async (uid, delta) => {
    return setDoc(doc(db, 'users', uid), { uid, xp: increment(delta) }, { merge: true });
  },
  onUpdate: (uid, callback) => {
    return onSnapshot(doc(db, 'users', uid), (snap) => {
      callback(snap.exists() ? snap.data() : null);
    });
  },
  getAll: async () => {
    const q = query(collection(db, 'users'), orderBy('xp', 'desc'), limit(50));
    const snap = await getDocs(q);
    return snap.docs.map(doc => doc.data());
  }
};

// ── Activities Collection ─────────────────────────────────────────────────────
export const firestoreActivities = {
  add: async (activity) => {
    return setDoc(doc(db, 'activities', activity.id), activity);
  },
  updateWithXPDelta: async (activity) => {
    const activityRef = doc(db, 'activities', activity.id);
    const userRef = doc(db, 'users', activity.userId);

    return runTransaction(db, async (transaction) => {
      const existingSnap = await transaction.get(activityRef);
      const previousXP = existingSnap.exists() ? (existingSnap.data().xpEarned || 0) : 0;
      const nextXP = activity.xpEarned || 0;
      const delta = nextXP - previousXP;

      transaction.set(activityRef, activity, { merge: true });
      if (delta !== 0) {
        transaction.set(userRef, { uid: activity.userId, xp: increment(delta) }, { merge: true });
      }

      return { xpDelta: delta };
    });
  },
  update: async (id, data) => {
    return updateDoc(doc(db, 'activities', id), data);
  },
  delete: async (id) => {
    return deleteDoc(doc(db, 'activities', id));
  },
  getAll: async (userId) => {
    const q = query(
      collection(db, 'activities'), 
      where('userId', '==', userId),
      orderBy('date', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data());
  },
  subscribe: (userId, callback) => {
    const q = query(
      collection(db, 'activities'), 
      where('userId', '==', userId),
      orderBy('date', 'desc')
    );
    return onSnapshot(q, (snap) => {
      callback(snap.docs.map(d => d.data()));
    });
  }
};

// ── Achievements Collection ───────────────────────────────────────────────────
export const firestoreAchievements = {
  withDefaults: (achievements = [], userId = null) => {
    const byId = new Map(achievements.map((a) => [a.id, a]));
    return ACHIEVEMENT_DEFS.map((def) => ({
      ...def,
      userId: achievements[0]?.userId || userId,
      earned: false,
      earnedAt: null,
      ...byId.get(def.id),
    }));
  },
  getAll: async (userId) => {
    const q = query(collection(db, 'achievements'), where('userId', '==', userId));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data());
  },
  ensureInitialized: async (userId) => {
    const existing = await firestoreAchievements.getAll(userId);
    const existingIds = new Set(existing.map((a) => a.id));
    const missing = ACHIEVEMENT_DEFS.filter((def) => !existingIds.has(def.id));

    if (missing.length === 0) return firestoreAchievements.withDefaults(existing, userId);

    const batch = writeBatch(db);
    missing.forEach((def) => {
      batch.set(doc(db, 'achievements', `${userId}_${def.id}`), {
        ...def,
        userId,
        earned: false,
        earnedAt: null,
      }, { merge: true });
    });
    await batch.commit();

    return firestoreAchievements.withDefaults([...existing, ...missing.map((def) => ({
      ...def,
      userId,
      earned: false,
      earnedAt: null,
    }))], userId);
  },
  markEarned: async (userId, achievementIds) => {
    if (!achievementIds.length) return;
    const now = Date.now();
    const batch = writeBatch(db);

    achievementIds.forEach((id) => {
      const def = ACHIEVEMENT_DEFS.find((a) => a.id === id);
      if (!def) return;

      batch.set(doc(db, 'achievements', `${userId}_${id}`), {
        ...def,
        userId,
        earned: true,
        earnedAt: now,
      }, { merge: true });
    });

    await batch.commit();
  },
  setAll: async (userId, achievements) => {
    // Usually we update them individually or as a batch
    // For simplicity, we'll just set them individually in this version
    const promises = achievements.map(ach => 
      setDoc(doc(db, 'achievements', `${userId}_${ach.id}`), { ...ach, userId })
    );
    return Promise.all(promises);
  },
  subscribe: (userId, callback) => {
    const q = query(collection(db, 'achievements'), where('userId', '==', userId));
    return onSnapshot(q, (snap) => {
      callback(firestoreAchievements.withDefaults(snap.docs.map(d => d.data()), userId));
    });
  }
};

// ── Challenges Collection ─────────────────────────────────────────────────────
export const firestoreChallenges = {
  add: async (challenge) => {
    return setDoc(doc(db, 'challenges', challenge.id), challenge);
  },
  delete: async (id) => {
    return deleteDoc(doc(db, 'challenges', id));
  },
  subscribe: (userId, callback) => {
    const q = query(collection(db, 'challenges'), where('userId', '==', userId));
    return onSnapshot(q, (snap) => {
      callback(snap.docs.map(d => d.data()));
    });
  }
};
