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
  runTransaction,
  startAfter
} from 'firebase/firestore';
import { db } from './firebase';
import { ACHIEVEMENT_DEFS } from './constants';
import { matchActivityToSegments } from './segments';

// ── User integrations (users/{uid}/integrations/{id}) — tokens, last import ─────
export const firestoreIntegrations = {
  get: async (uid, integrationId) => {
    const snap = await getDoc(doc(db, 'users', uid, 'integrations', integrationId));
    return snap.exists() ? snap.data() : null;
  },
  set: async (uid, integrationId, data) => {
    return setDoc(doc(db, 'users', uid, 'integrations', integrationId), { ...data, updatedAt: Date.now() }, { merge: true });
  },
  delete: async (uid, integrationId) => {
    return deleteDoc(doc(db, 'users', uid, 'integrations', integrationId));
  },
};

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
    const data = { ...activity, kudosCount: activity.kudosCount ?? 0, commentCount: activity.commentCount ?? 0 };
    return setDoc(doc(db, 'activities', activity.id), data);
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

// ── Workout Templates ────────────────────────────────────────────────────────
export const firestoreWorkoutTemplates = {
  /** Create a new template (generates id and createdAt). exercises: [{ name, setsCount }]. */
  create: async (userId, { name, sport, exercises }) => {
    const id = `wt_${Date.now()}`;
    const template = {
      id,
      userId,
      name: (name || '').trim(),
      sport: sport || 'lift',
      exercises: Array.isArray(exercises) ? exercises.map(e => ({
        name: (e.name || '').trim(),
        setsCount: Math.max(1, parseInt(e.setsCount, 10) || 1),
      })) : [],
      createdAt: Date.now(),
    };
    await setDoc(doc(db, 'workoutTemplates', id), template);
    return template;
  },
  add: async (template) => {
    return setDoc(doc(db, 'workoutTemplates', template.id), template);
  },
  getByUser: async (userId) => {
    const q = query(
      collection(db, 'workoutTemplates'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data());
  },
  update: async (id, data) => {
    return updateDoc(doc(db, 'workoutTemplates', id), data);
  },
  delete: async (id) => {
    return deleteDoc(doc(db, 'workoutTemplates', id));
  },
  getAll: async (userId) => {
    const q = query(
      collection(db, 'workoutTemplates'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data());
  },
  subscribe: (userId, callback) => {
    const q = query(
      collection(db, 'workoutTemplates'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    return onSnapshot(q, (snap) => callback(snap.docs.map(d => d.data())));
  }
};

// ── One Rep Max (users/{uid}/oneRepMax/{exerciseId}) ───────────────────────────
export const firestoreOneRepMax = {
  get: async (uid, exerciseId) => {
    const snap = await getDoc(doc(db, 'users', uid, 'oneRepMax', exerciseId));
    return snap.exists() ? snap.data() : null;
  },
  set: async (uid, exerciseId, value, exerciseName = null) => {
    const data = { exerciseId, value, updatedAt: Date.now() };
    if (exerciseName != null) data.exerciseName = exerciseName;
    return setDoc(doc(db, 'users', uid, 'oneRepMax', exerciseId), data, { merge: true });
  },
  getAll: async (uid) => {
    const snap = await getDocs(collection(db, 'users', uid, 'oneRepMax'));
    return snap.docs.map(d => d.data());
  }
};

// ── Activities: feed by visibility (public) and feed collection (from following) ─
export const firestoreFeed = {
  getPublic: async (limitCount = 50) => {
    const q = query(
      collection(db, 'activities'),
      where('visibility', '==', 'public'),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data());
  },
  subscribePublic: (callback, limitCount = 50) => {
    const q = query(
      collection(db, 'activities'),
      where('visibility', '==', 'public'),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    return onSnapshot(q, (snap) => callback(snap.docs.map(d => d.data())));
  },

  /** Feed from people the user follows (fan-out collection). Returns { activities, lastDoc } for pagination. */
  getForUser: async (followerId, { limit: limitCount = 20, startAfterDoc = null } = {}) => {
    const constraints = [
      where('followerId', '==', followerId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    ];
    if (startAfterDoc) constraints.push(startAfter(startAfterDoc));
    const q = query(collection(db, 'feed'), ...constraints);
    const snap = await getDocs(q);
    const feedDocs = snap.docs;
    if (!feedDocs.length) return { activities: [], lastDoc: null };

    const activityIds = feedDocs.map(d => d.data().activityId).filter(Boolean);
    const activitySnaps = await Promise.all(activityIds.map(id => getDoc(doc(db, 'activities', id))));
    const activities = activitySnaps
      .map((s) => (s.exists() ? { id: s.id, ...s.data() } : null))
      .filter(Boolean);
    // Preserve order by createdAt (feed is already sorted)
    activities.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    const lastDoc = feedDocs[feedDocs.length - 1] || null;
    return { activities, lastDoc };
  },

  /** Write feed entries for each follower when an activity is visible to followers. Call after activity create/update. */
  fanOutActivityToFeed: async (activity) => {
    const visibility = activity.visibility || 'private';
    if (visibility !== 'public' && visibility !== 'followers') return;
    const authorId = activity.userId;
    const activityId = activity.id;
    const createdAt = activity.createdAt ?? Date.now();
    const followers = await firestoreFollows.getFollowers(authorId);
    if (!followers.length) return;
    const batch = writeBatch(db);
    for (const { followerId } of followers) {
      if (!followerId) continue;
      const feedId = `${followerId}_${activityId}`;
      batch.set(doc(db, 'feed', feedId), { followerId, activityId, userId: authorId, createdAt });
    }
    await batch.commit();
  },

  /** Remove activity from all followers' feeds (e.g. when visibility set to private). */
  removeActivityFromFeed: async (activityId, authorId) => {
    const followers = await firestoreFollows.getFollowers(authorId);
    if (!followers.length) return;
    const batch = writeBatch(db);
    for (const { followerId } of followers) {
      if (!followerId) continue;
      const feedId = `${followerId}_${activityId}`;
      batch.delete(doc(db, 'feed', feedId));
    }
    await batch.commit();
  }
};

// ── Follows ───────────────────────────────────────────────────────────────────
export const firestoreFollows = {
  follow: async (followerId, followingId) => {
    const id = `${followerId}_${followingId}`;
    return setDoc(doc(db, 'follows', id), { followerId, followingId, createdAt: Date.now() });
  },
  unfollow: async (followerId, followingId) => {
    return deleteDoc(doc(db, 'follows', `${followerId}_${followingId}`));
  },
  getFollowing: async (followerId) => {
    const q = query(collection(db, 'follows'), where('followerId', '==', followerId));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data());
  },
  getFollowers: async (followingId) => {
    const q = query(collection(db, 'follows'), where('followingId', '==', followingId));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data());
  },
  isFollowing: async (followerId, followingId) => {
    const snap = await getDoc(doc(db, 'follows', `${followerId}_${followingId}`));
    return snap.exists();
  },
  /** Returns list of user profiles for users that followerId is following. */
  getFollowingWithProfiles: async (followerId) => {
    const followDocs = await firestoreFollows.getFollowing(followerId);
    if (!followDocs.length) return [];
    const uids = followDocs.map(d => d.followingId).filter(Boolean);
    const profiles = await Promise.all(uids.map(uid => firestoreUser.get(uid)));
    return profiles
      .map((data, i) => data ? { uid: uids[i], ...data } : null)
      .filter(Boolean);
  },
  /** Returns list of user profiles for users that follow followingId. */
  getFollowersWithProfiles: async (followingId) => {
    const followDocs = await firestoreFollows.getFollowers(followingId);
    if (!followDocs.length) return [];
    const uids = followDocs.map(d => d.followerId).filter(Boolean);
    const profiles = await Promise.all(uids.map(uid => firestoreUser.get(uid)));
    return profiles
      .map((data, i) => data ? { uid: uids[i], ...data } : null)
      .filter(Boolean);
  },
};

// ── Kudos ─────────────────────────────────────────────────────────────────────
export const firestoreKudos = {
  add: async (activityId, userId) => {
    const id = `${activityId}_${userId}`;
    const activityRef = doc(db, 'activities', activityId);
    await setDoc(doc(db, 'kudos', id), { activityId, userId, createdAt: Date.now() });
    await updateDoc(activityRef, { kudosCount: increment(1) });
  },
  remove: async (activityId, userId) => {
    const id = `${activityId}_${userId}`;
    const activityRef = doc(db, 'activities', activityId);
    await deleteDoc(doc(db, 'kudos', id));
    await updateDoc(activityRef, { kudosCount: increment(-1) });
  },
  hasKudoed: async (activityId, userId) => {
    const snap = await getDoc(doc(db, 'kudos', `${activityId}_${userId}`));
    return snap.exists();
  },
  getByActivity: async (activityId) => {
    const q = query(collection(db, 'kudos'), where('activityId', '==', activityId));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data());
  }
};

// ── Comments ───────────────────────────────────────────────────────────────────
export const firestoreComments = {
  create: async (activityId, userId, userName, text) => {
    const id = `comment_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const comment = { id, activityId, userId, userName: userName || 'Anonymous', text: (text || '').trim(), createdAt: Date.now() };
    await setDoc(doc(db, 'comments', id), comment);
    await updateDoc(doc(db, 'activities', activityId), { commentCount: increment(1) });
    return comment;
  },
  add: async (comment) => {
    return setDoc(doc(db, 'comments', comment.id), comment);
  },
  update: async (id, data) => {
    return updateDoc(doc(db, 'comments', id), data);
  },
  delete: async (id, activityId) => {
    const commentRef = doc(db, 'comments', id);
    const activityRef = doc(db, 'activities', activityId);
    await deleteDoc(commentRef);
    await updateDoc(activityRef, { commentCount: increment(-1) });
  },
  getByActivity: async (activityId) => {
    const q = query(
      collection(db, 'comments'),
      where('activityId', '==', activityId),
      orderBy('createdAt', 'asc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data());
  },
  subscribeByActivity: (activityId, callback) => {
    const q = query(
      collection(db, 'comments'),
      where('activityId', '==', activityId),
      orderBy('createdAt', 'asc')
    );
    return onSnapshot(q, (snap) => callback(snap.docs.map(d => d.data())));
  }
};

// ── Clubs ─────────────────────────────────────────────────────────────────────
export const firestoreClubs = {
  /** Create a club (owner is first member). isPublic: true so it appears in Discover. */
  create: async (userId, { name, description }) => {
    const id = `club_${Date.now()}`;
    const club = {
      id,
      name: (name || '').trim(),
      description: (description || '').trim(),
      ownerId: userId,
      memberIds: [userId],
      isPublic: true,
      createdAt: Date.now(),
    };
    await setDoc(doc(db, 'clubs', id), club);
    return club;
  },
  add: async (club) => {
    return setDoc(doc(db, 'clubs', club.id), club);
  },
  update: async (id, data) => {
    return updateDoc(doc(db, 'clubs', id), data);
  },
  get: async (clubId) => {
    const snap = await getDoc(doc(db, 'clubs', clubId));
    return snap.exists() ? snap.data() : null;
  },
  getByMember: async (uid) => {
    const q = query(collection(db, 'clubs'), where('memberIds', 'array-contains', uid));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data());
  },
  /** Discover public clubs (for join). */
  getDiscover: async (limitCount = 50) => {
    const q = query(
      collection(db, 'clubs'),
      where('isPublic', '==', true),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data());
  },
  join: async (clubId, uid) => {
    const club = await firestoreClubs.get(clubId);
    if (!club || (club.memberIds || []).includes(uid)) return club;
    const memberIds = [...(club.memberIds || []), uid];
    await updateDoc(doc(db, 'clubs', clubId), { memberIds });
    return { ...club, memberIds };
  },
  leave: async (clubId, uid) => {
    const club = await firestoreClubs.get(clubId);
    if (!club) return null;
    if (club.ownerId === uid) return club; // owner cannot leave; could transfer ownership later
    const memberIds = (club.memberIds || []).filter(id => id !== uid);
    await updateDoc(doc(db, 'clubs', clubId), { memberIds });
    return { ...club, memberIds };
  },
  /** Recent activities from club members (merge from each member, sort by date). Firestore "in" supports up to 30. */
  getFeedActivities: async (memberIds, limitCount = 50) => {
    if (!memberIds?.length) return [];
    const ids = memberIds.slice(0, 30);
    const q = query(
      collection(db, 'activities'),
      where('userId', 'in', ids),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data());
  },
  /** Leaderboard: members with XP, sorted by xp desc. */
  getLeaderboard: async (memberIds) => {
    if (!memberIds?.length) return [];
    const users = await Promise.all(memberIds.map(uid => firestoreUser.get(uid)));
    return users
      .filter(Boolean)
      .map(u => ({ ...u, uid: u.uid || u.id || '' }))
      .sort((a, b) => (b.xp || 0) - (a.xp || 0));
  },
};

// ── Segments ──────────────────────────────────────────────────────────────────
export const firestoreSegments = {
  add: async (segment) => {
    return setDoc(doc(db, 'segments', segment.id), segment);
  },
  update: async (id, data) => {
    return updateDoc(doc(db, 'segments', id), data);
  },
  delete: async (id) => {
    return deleteDoc(doc(db, 'segments', id));
  },
  get: async (segmentId) => {
    const snap = await getDoc(doc(db, 'segments', segmentId));
    return snap.exists() ? snap.data() : null;
  },
  getByCreator: async (uid) => {
    const q = query(collection(db, 'segments'), where('createdBy', '==', uid));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data());
  },
  /** All segments (for matching). Limit 500. */
  getAll: async (limitCount = 500) => {
    const q = query(collection(db, 'segments'), limit(limitCount));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data());
  },
  getBySport: async (sport, limitCount = 200) => {
    const q = query(
      collection(db, 'segments'),
      where('sport', '==', sport),
      limit(limitCount)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data());
  }
};

// ── Segment Results (leaderboard) ─────────────────────────────────────────────
export const firestoreSegmentResults = {
  add: async (result) => {
    const id = result.id || `${result.segmentId}_${result.activityId}`;
    return setDoc(doc(db, 'segmentResults', id), { ...result, id });
  },
  /** Upsert: one doc per segmentId+activityId. Use for matching. */
  addOrUpdate: async (result) => {
    const id = `${result.segmentId}_${result.activityId}`;
    return setDoc(doc(db, 'segmentResults', id), { ...result, id }, { merge: true });
  },
  getLeaderboard: async (segmentId, limitCount = 50) => {
    const q = query(
      collection(db, 'segmentResults'),
      where('segmentId', '==', segmentId),
      orderBy('timeMs', 'asc'),
      limit(limitCount)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data());
  },
  getByActivity: async (activityId) => {
    const q = query(
      collection(db, 'segmentResults'),
      where('activityId', '==', activityId)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data());
  },
  /** Best time per user (for display). Fetches more then dedupes by userId. */
  getLeaderboardBestPerUser: async (segmentId, limitCount = 50) => {
    const q = query(
      collection(db, 'segmentResults'),
      where('segmentId', '==', segmentId),
      orderBy('timeMs', 'asc'),
      limit(500)
    );
    const snap = await getDocs(q);
    const seen = new Set();
    const best = [];
    for (const d of snap.docs) {
      const data = d.data();
      if (seen.has(data.userId)) continue;
      seen.add(data.userId);
      best.push(data);
      if (best.length >= limitCount) break;
    }
    return best;
  }
};

/** Run segment matching for a GPS activity and persist results. No-op if activity has no track. */
export async function runSegmentMatchingForActivity(activity) {
  if (!activity?.track?.length || !activity?.userId) return;
  try {
    const segments = await firestoreSegments.getBySport(activity.sport);
    const results = matchActivityToSegments(activity, segments);
    for (const r of results) {
      await firestoreSegmentResults.addOrUpdate({
        ...r,
        id: `${r.segmentId}_${r.activityId}`,
      });
    }
  } catch (err) {
    console.warn('Segment matching failed:', err);
  }
}

// ── Nutrition (users/{uid}/nutrition/{date}) ────────────────────────────────────
// Per-date doc: { entries: [{ id, mealName?, protein, carbs, fat, calories? }], updatedAt? }.
// Daily totals are derived from entries. Optional goal doc at _goal for target P/C/F/calories.
export const firestoreNutrition = {
  get: async (uid, date) => {
    const snap = await getDoc(doc(db, 'users', uid, 'nutrition', date));
    return snap.exists() ? snap.data() : null;
  },
  set: async (uid, date, data) => {
    const payload = { ...data, updatedAt: Date.now() };
    return setDoc(doc(db, 'users', uid, 'nutrition', date), payload, { merge: true });
  },
  getGoal: async (uid) => {
    const snap = await getDoc(doc(db, 'users', uid, 'nutrition', '_goal'));
    return snap.exists() ? snap.data() : null;
  },
  setGoal: async (uid, goal) => {
    return setDoc(doc(db, 'users', uid, 'nutrition', '_goal'), { ...goal, updatedAt: Date.now() }, { merge: true });
  },
};
