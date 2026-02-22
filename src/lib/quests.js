/**
 * Daily quests: selection, progress from activities, and one-time XP on completion.
 * Completion is derived from today's activities; XP is awarded once per quest per day (idempotent via claimed).
 */

import { QUEST_POOL } from './constants';
import { questStorage } from './storage';
import { trackEvent } from './analytics';

export function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Get today's quests; if stored date is not today, generate a new set of 3 from QUEST_POOL and persist. */
export function getOrCreateDailyQuests() {
  const today = getTodayKey();
  const stored = questStorage.get();
  if (stored && stored.date === today && Array.isArray(stored.quests) && stored.quests.length > 0) {
    return stored;
  }
  const picked = shuffle(QUEST_POOL).slice(0, 3).map((q) => ({
    ...q,
    completed: false,
    claimed: false,
    currentValue: 0,
  }));
  const payload = { date: today, quests: picked };
  questStorage.set(payload);
  return payload;
}

/** Filter activities to those on the given calendar day (local). */
function activitiesForDay(activities, dateStr) {
  const dayStart = new Date(dateStr + 'T00:00:00').getTime();
  const dayEnd = new Date(dateStr + 'T23:59:59.999').getTime();
  return activities.filter((a) => {
    const t = a.date && (typeof a.date === 'number' ? a.date : new Date(a.date).getTime());
    return t >= dayStart && t <= dayEnd;
  });
}

/** Compute currentValue for a single quest from today's activities. */
function currentValueForQuest(quest, todayActivities) {
  if (quest.unit === 'mi') {
    const sum = todayActivities
      .filter((a) => a.sport === quest.sport)
      .reduce((s, a) => s + (a.distance || 0), 0);
    return Math.round(sum * 10) / 10;
  }
  if (quest.unit === 'yd') {
    const sum = todayActivities
      .filter((a) => a.sport === 'swim')
      .reduce((s, a) => s + (a.distance || 0), 0);
    return Math.round(sum);
  }
  if (quest.unit === 'min') {
    const sum = todayActivities
      .filter((a) => a.sport === quest.sport)
      .reduce((s, a) => s + (a.duration || 0), 0);
    return Math.round(sum);
  }
  if (quest.unit === 'sets') {
    const sum = todayActivities
      .filter((a) => a.sport === 'lift' && a.exercises)
      .reduce((s, a) => s + (a.exercises?.reduce((s2, e) => s2 + (e.sets?.length || 0), 0) || 0), 0);
    return sum;
  }
  if (quest.unit === 'workout' || (quest.sport === null && quest.target === 1)) {
    return todayActivities.length;
  }
  return 0;
}

/** Compute progress for all quests from activities (today only). Returns quests with currentValue and completed set from progress. */
export function computeQuestProgress(quests, activities) {
  const today = getTodayKey();
  const todayActivities = activitiesForDay(activities || [], today);
  return quests.map((q) => {
    const currentValue = currentValueForQuest(q, todayActivities);
    const met = currentValue >= q.target;
    return {
      ...q,
      currentValue,
      completed: q.completed || met,
    };
  });
}

/**
 * Evaluate completion and award XP once per quest per day.
 * When a quest first reaches target, mark completed; if not yet claimed, call addXP and mark claimed, then persist.
 * Call after activity save or when Daily Quests block is in view (e.g. Dashboard load).
 */
export async function evaluateAndClaimQuests(uid, activities, firestoreUser, toast) {
  if (!uid) return;
  const stored = getOrCreateDailyQuests();
  if (stored.date !== getTodayKey()) {
    const fresh = getOrCreateDailyQuests();
    stored.quests = fresh.quests;
    stored.date = fresh.date;
  }
  const withProgress = computeQuestProgress(stored.quests, activities);
  let updated = false;
  const nextQuests = withProgress.map((q, i) => {
    const met = q.currentValue >= q.target;
    const completed = q.completed || met;
    const wasClaimed = stored.quests[i]?.claimed ?? q.claimed;
    return { ...q, completed, claimed: wasClaimed };
  });

  for (let i = 0; i < nextQuests.length; i++) {
    const q = nextQuests[i];
    if (q.completed && !q.claimed && q.currentValue >= q.target) {
      try {
        await firestoreUser.addXP(uid, q.xpReward);
        nextQuests[i] = { ...q, claimed: true };
        updated = true;
        trackEvent('quest_completed', { quest_id: q.id ?? q.label ?? i, xp_reward: q.xpReward });
        if (toast) toast(`Quest complete: ${q.label} +${q.xpReward} XP`, 'success', '✅');
      } catch (err) {
        console.error('Quest XP award failed:', err);
      }
    }
  }
  if (updated || nextQuests.some((q, i) => q.completed !== (stored.quests[i]?.completed))) {
    questStorage.set({ date: stored.date, quests: nextQuests });
  }
  return { date: stored.date, quests: nextQuests };
}
