# Zenith — Daily Quests Spec

One-page product spec for the quest system. The app has `QUEST_POOL` in `src/lib/constants.js` and quest storage (`questStorage` in `src/lib/storage.js`); this doc defines where and how quests appear in the UI and how completion and rewards work.

---

## 1. Where quests appear

**Primary placement: Dashboard**

- Show a **Daily Quests** section on the Dashboard (e.g. below Weekly Snapshot or above Activity Feed).
- Section header: **Daily Quests** with a short subtitle, e.g. “Complete to earn bonus XP.”
- Optional: small “Quests” or “Daily” entry in the main nav or a secondary tab that opens the same content in a fuller view. Recommendation: start with Dashboard-only to maximize visibility and first action.

**Wireframe (description)**

- Dashboard scroll: Hero → Quick Start → Weekly Snapshot → **Daily Quests** (new) → Recent Achievements → Activity Feed → FAB/CTA.
- Daily Quests block: 3 quest rows (or cards), each with: icon/sport, label, progress (e.g. “0 / 3 mi”), reward (“+75 XP”), and a visual completed state (checkmark, strikethrough, or “Done”).

---

## 2. How the user sees daily quests

**Selection and refresh**

- Each day (calendar day or 24h window, TZ = user/local): show a **new set of 3 quests** drawn from `QUEST_POOL` (e.g. random 3, or weighted by `primarySport` later).
- Stored shape: `{ date: "<YYYY-MM-DD or dateString>", quests: [ { id, sport, label, target, unit, xpReward, completed?, currentValue? }, ... ] }`. Existing `questStorage.get()` / `questStorage.set()` and sampleData’s `{ quests, date }` align with this.
- If stored `date` is not today, generate a new set (same logic as sampleData: shuffle QUEST_POOL, take 3, set `completed: false`), persist, then show.

**UI per quest**

- **Incomplete:** Label (e.g. “Run 3 miles”), progress text (e.g. “1.2 / 3 mi”), progress bar (optional), “+75 XP” badge.
- **Complete:** Same row with completed state (e.g. checkmark, “Done”, green or muted style). Optionally show “+75 XP claimed” or animate XP once on completion (see Rewards below).

**Empty / loading**

- If no quests for today yet, show a single line: “Your daily quests are loading…” or “Complete a workout to see today’s quests,” then generate and display (prefer generating on first app open for the day).

---

## 3. How completion is detected

**Tie to existing activities (and achievements)**

- Completion is **derived from the same activity data** used for achievements and challenges: user’s activities (from Firestore or in-memory), filtered by **today** (or “since midnight” local).
- No separate “quest completion” event; the app **recomputes** progress whenever activities (or quest state) are loaded/updated.

**Rules per quest type (from QUEST_POOL)**

| Quest type (inferred from `unit` / `id`) | Completion rule |
|------------------------------------------|------------------|
| Distance (mi) — run/cycle                 | Sum of `activity.distance` for today, same `sport` ≥ `target`. |
| Distance (yd) — swim                      | Sum of `activity.distance` (yards) for today, sport swim ≥ `target`. |
| Duration (min) — cycle/lift              | Sum of `activity.duration` (minutes) for today, same `sport` ≥ `target`. |
| Sets (lift)                              | Sum of sets from today’s lift activities (e.g. from `activity.exercises[].sets.length`) ≥ `target`. |
| “Complete any workout” (`sport: null`)   | At least one activity logged today (`target: 1`). |

**When to run the check**

- On **Dashboard load** (or whenever the Daily Quests block is in view).
- After **adding or editing an activity** (refresh activities then recompute quest progress).
- Optionally: when app comes to foreground so same-day progress is up to date.

**Marking complete and idempotent XP**

- When computed progress for a quest first reaches or exceeds `target`, set that quest’s `completed: true` in the stored quest object.
- **XP reward:** Award `xpReward` **once per quest per day**. When transitioning a quest to `completed: true`, if not already “claimed,” call the same XP pipeline used elsewhere (e.g. `firestoreUser.addXP(uid, xpReward)`), then mark that quest as “claimed” (e.g. `claimed: true` or rely on “only award when transitioning to completed”). Backend: no new APIs required if user XP is updated via existing `addXP`.

---

## 4. How the reward (XP) is shown

**In-UI**

- Each quest row shows “+{xpReward} XP” (e.g. “+75 XP”). When the quest is completed, optionally:
  - Show a short toast: “Quest complete: +75 XP” or “Run 3 miles — +75 XP earned.”
  - Briefly highlight the XP badge or total XP in the header so the user sees the number change.
- No separate “quest rewards” screen required for v1; Dashboard hero XP and level bar already reflect total XP.

**Persistence**

- User’s total XP is updated via existing `addXP`. Level and progress in the app update from existing user/level logic.

---

## 5. UI flow (bullets)

1. User opens app (or Dashboard). If `questStorage` has a different date than today, generate new daily quests (3 from QUEST_POOL), save, then render.
2. Dashboard shows “Daily Quests” with 3 rows. Each row shows label, progress (e.g. “0 / 3 mi”), and “+XP.”
3. User logs a workout (existing Add Activity flow). On save, activities refresh; quest progress is recomputed from today’s activities.
4. When a quest’s progress ≥ target, that row is marked complete and XP is awarded once (e.g. toast + `addXP`). Stored quest gets `completed: true` (and optionally `claimed: true`).
5. Next day: new set of 3 quests; same flow.

---

## 6. Edge cases (short)

- **Date rollover during session:** If the app stays open past midnight, either refresh quests when date changes or on next Dashboard focus.
- **No activities today:** All quests show 0 progress; no completion.
- **Multiple activities that over-fulfill:** Progress shows the sum; completion and XP still only once per quest per day.

---

This spec is ready for the frontend agent to implement: Dashboard section, daily quest generation from QUEST_POOL, progress from activities, one-time XP on completion, and the copy/UI above.
