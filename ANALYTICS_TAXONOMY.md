# Analytics Event Taxonomy

Analytics events for the Zenith workout app. **Do not include PII** (e.g. user name, email, uid) in event properties; use aggregate or non-identifying dimensions only.

---

## 1. Auth

| Event name    | Suggested properties | Where to fire |
|---------------|----------------------|---------------|
| `sign_up`     | `method: 'email'`    | `src/context/AuthContext.jsx` — after `createUserWithEmailAndPassword` and user doc created successfully |
| `login`       | `method: 'email'`    | `src/context/AuthContext.jsx` — after successful `signInWithEmailAndPassword` (call from Login page after promise resolves), or in Login.jsx after successful `login()` |
| `logout`      | —                    | `src/context/AuthContext.jsx` — inside `logout` callback before/after `signOut(auth)` |

---

## 2. Workouts

| Event name          | Suggested properties | Where to fire |
|---------------------|----------------------|---------------|
| `activity_added`     | `sport`, `has_distance`, `has_duration` (boolean) | `src/components/AddActivityModal.jsx` — after successful `firestoreActivities.add()` and XP added (no PII: sport type only) |
| `activity_edited`   | `sport`, `has_distance`, `has_duration` (boolean) | `src/components/AddActivityModal.jsx` — after successful `firestoreActivities.updateWithXPDelta()` |
| `activity_deleted`  | `sport` (optional, if available from activity before delete) | `src/pages/Activities.jsx` — after successful `firestoreActivities.delete(id)` and `onActivityDeleted(id)` |

---

## 3. Gamification

| Event name             | Suggested properties | Where to fire |
|------------------------|----------------------|---------------|
| `achievement_unlocked` | `achievement_id`     | `src/App.jsx` — inside `onActivityAdded` when `uniqueNew.length > 0`, fire once per achievement id in `uniqueNew` (use achievement id only, not user name) |
| `challenge_joined`     | `challenge_id`, `sport`, `type` ('custom' \| 'weekly') | `src/pages/Challenges.jsx` — in `handleCreateChallenge` after successful `firestoreChallenges.add()` (custom challenge created) |
| `challenge_completed`  | `challenge_id`, `sport`, `xp_reward` | `src/pages/Challenges.jsx` — in the weekly-claim `useEffect` when awarding XP for each `toClaim` item (weekly challenge completed) |
| `quest_completed`      | `quest_id` (e.g. label or index), `xp_reward` | `src/lib/quests.js` — inside `evaluateAndClaimQuests` when a quest is first claimed (when we call `firestoreUser.addXP` and set `claimed: true`) |

---

## 4. Navigation

| Event name   | Suggested properties | Where to fire |
|--------------|----------------------|---------------|
| `page_view`  | `route` (pathname, e.g. `/`, `/activities`, `/challenges`) | `src/App.jsx` — on route change: use `useLocation()` and `useEffect` to fire when `location.pathname` changes (inside app shell that has access to routes) |

---

## 5. Onboarding

| Event name              | Suggested properties | Where to fire |
|-------------------------|----------------------|---------------|
| `onboarding_started`   | —                    | `src/components/Onboarding.jsx` — when the onboarding overlay mounts (e.g. `useEffect` on mount) |
| `onboarding_completed` | `step_reached: 3`    | `src/components/Onboarding.jsx` — in `handleGetStarted` when `step === 3` (user clicks "Log my first workout") |
| `onboarding_skipped`   | `step` (e.g. 2)      | `src/components/Onboarding.jsx` — in `handleSkipProfile` when user clicks "Skip for now" |

---

## Implementation notes

- Use `trackEvent(name, props)` from `src/lib/analytics.js`; ensure `props` is a plain object with no PII.
- Firebase Analytics: use `getAnalytics` in `analytics.js` if available from the Firebase app; otherwise log to console in development and send to Firebase in production when available.
