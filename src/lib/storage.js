const STORAGE_KEYS = {
  USER: 'zenith_user',
  ACTIVITIES: 'zenith_activities',
  ACHIEVEMENTS: 'zenith_achievements',
  CHALLENGES: 'zenith_challenges',
  QUESTS: 'zenith_quests',
  SETTINGS: 'zenith_settings',
};

function load(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('Storage error:', e);
  }
}

// ── User ──────────────────────────────────────────────────────────────────────
export const userStorage = {
  get: () => load(STORAGE_KEYS.USER),
  set: (user) => save(STORAGE_KEYS.USER, user),
  update: (patch) => {
    const user = userStorage.get() || {};
    const updated = { ...user, ...patch };
    save(STORAGE_KEYS.USER, updated);
    return updated;
  },
};

// ── Activities ────────────────────────────────────────────────────────────────
export const activityStorage = {
  getAll: () => load(STORAGE_KEYS.ACTIVITIES, []),
  add: (activity) => {
    const list = activityStorage.getAll();
    list.unshift(activity);
    save(STORAGE_KEYS.ACTIVITIES, list);
    return activity;
  },
  update: (id, patch) => {
    const list = activityStorage.getAll();
    const idx = list.findIndex(a => a.id === id);
    if (idx === -1) return null;
    list[idx] = { ...list[idx], ...patch };
    save(STORAGE_KEYS.ACTIVITIES, list);
    return list[idx];
  },
  delete: (id) => {
    const list = activityStorage.getAll().filter(a => a.id !== id);
    save(STORAGE_KEYS.ACTIVITIES, list);
  },
  setAll: (list) => save(STORAGE_KEYS.ACTIVITIES, list),
};

// ── Achievements ──────────────────────────────────────────────────────────────
export const achievementStorage = {
  getAll: () => load(STORAGE_KEYS.ACHIEVEMENTS, []),
  setAll: (list) => save(STORAGE_KEYS.ACHIEVEMENTS, list),
  markEarned: (id) => {
    const list = achievementStorage.getAll();
    const idx = list.findIndex(a => a.id === id);
    if (idx !== -1) {
      list[idx] = { ...list[idx], earned: true, earnedDate: Date.now() };
      save(STORAGE_KEYS.ACHIEVEMENTS, list);
    }
  },
};

// ── Challenges ────────────────────────────────────────────────────────────────
export const challengeStorage = {
  getAll: () => load(STORAGE_KEYS.CHALLENGES, []),
  add: (challenge) => {
    const list = challengeStorage.getAll();
    list.push(challenge);
    save(STORAGE_KEYS.CHALLENGES, list);
    return challenge;
  },
  update: (id, patch) => {
    const list = challengeStorage.getAll();
    const idx = list.findIndex(c => c.id === id);
    if (idx === -1) return null;
    list[idx] = { ...list[idx], ...patch };
    save(STORAGE_KEYS.CHALLENGES, list);
    return list[idx];
  },
  delete: (id) => {
    const list = challengeStorage.getAll().filter(c => c.id !== id);
    save(STORAGE_KEYS.CHALLENGES, list);
  },
  setAll: (list) => save(STORAGE_KEYS.CHALLENGES, list),
};

// ── Daily Quests ──────────────────────────────────────────────────────────────
export const questStorage = {
  get: () => load(STORAGE_KEYS.QUESTS),
  set: (quests) => save(STORAGE_KEYS.QUESTS, quests),
};

// ── Settings ──────────────────────────────────────────────────────────────────
export const settingsStorage = {
  get: () => load(STORAGE_KEYS.SETTINGS, {
    units: 'imperial',
    theme: 'dark',
    notifications: true,
    privacy: 'public',
  }),
  update: (patch) => {
    const settings = settingsStorage.get();
    const updated = { ...settings, ...patch };
    save(STORAGE_KEYS.SETTINGS, updated);
    return updated;
  },
};
