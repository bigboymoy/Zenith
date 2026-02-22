# Zenith — First Week Flow

Spec for the post-signup “first week” sequence to improve onboarding retention. Uses existing `joinedAt` / `createdAt` on the user document and activity count; implementation can be minimal (e.g. conditional banner text).

---

## Overview

- **Goal:** Guide the user through a clear Day 1 → Day 7 journey: first workout, gentle re-engagement if needed, then “Week one complete” celebration.
- **Data:** User `joinedAt` or `createdAt` (Firestore `users`); activity count from `activities` collection. No new backend fields required.
- **Day math:** “Day N” = calendar days since join (e.g. join Monday 00:00 → Tuesday 00:00 = Day 2). Use start-of-day in user’s local timezone where possible.

---

## Day-by-day sequence

### Day 1 (post-signup)

- **Trigger:** User has completed onboarding (or has just signed up and is in first calendar day).
- **Condition:** Activity count = 0.
- **Action:** Emphasize **first workout** CTA.
- **Implementation:** Same as existing onboarding “Log my first workout” and Dashboard empty state: prominent CTA and/or banner text, e.g. “Log your first workout — every journey starts with one session.”
- **Note:** If onboarding ends with “Log my first workout” → Add Activity, Day 1 is already covered; the banner can reinforce the same message when they land on Dashboard with 0 activities.

### Day 2–3 (gentle reminder)

- **Trigger:** User is on Day 2 or Day 3 since join.
- **Condition:** Fewer than 2 workouts logged (0 or 1).
- **Action:** Show a **gentle reminder** once (banner or single modal).
- **Copy (example):** “You’re on day 2 — ready for workout number two? Log a session to keep the momentum going.”
- **Frequency:** Once per user (e.g. first time they hit Day 2 or 3 with &lt; 2 activities). Persist “reminder shown” in `localStorage` (e.g. `zenith_first_week_reminder_shown`) so we don’t repeat.
- **Implementation:** Optional dismiss; after dismiss or once shown, do not show again.

### Day 7 (week one complete)

- **Trigger:** User is on Day 7 (or later) since join.
- **Condition:** User has **3+ workouts** total (lifetime).
- **Action:** Show **“Week one complete”** celebration.
- **Rewards (choose one or more):**
  - **Extra XP:** One-time bonus (e.g. +50 or +100 XP) awarded when condition is first met; persist “week one bonus awarded” (e.g. `users.weekOneBonusAwarded` or a dedicated achievement).
  - **Badge:** Unlock a “Week One Complete” badge/achievement (e.g. in `achievements` and/or `ACHIEVEMENT_DEFS`).
- **Copy (example):** “Week one complete — you’ve logged 3+ workouts. Here’s to many more.” + optional “+50 XP” or badge reveal.
- **Frequency:** Once per user. If using XP, award once and set a flag so we don’t double-award.

---

## Implementation notes (minimal)

- **Signup date:** Already stored as `createdAt` / `joinedAt` on `users` (see `AuthContext` and SCHEMA.md). Use `joinedAt` (or `createdAt`) for “days since join.”
- **Activity count:** Use existing `activities` array (or Firestore query by `userId`). Count total activities for “3+ workouts”; no need to restrict to “first 7 days” unless product wants to (spec uses “3+ total” for simplicity).
- **Banner logic (straightforward):**
  - Compute `daysSinceJoin = floor((now - joinedAt) / (24 * 60 * 60 * 1000))` in local time (or UTC if preferred; keep consistent).
  - **Day 1, 0 activities:** Show first-workout CTA banner (or rely on existing empty state).
  - **Day 2 or 3, &lt; 2 activities, reminder not yet shown:** Show reminder banner once; set `zenith_first_week_reminder_shown = true`.
  - **Day ≥ 7, 3+ activities, celebration not yet shown:** Show “Week one complete” banner (and optionally award XP/badge); set `zenith_first_week_celebrated = true` (and backend flag if awarding XP).
- **Where to show:** Dashboard is the natural place for the banner (above or below hero). Can be a slim, dismissible bar or a compact card.

---

## Summary table

| Day   | Condition              | Action                    | Frequency   |
|-------|------------------------|---------------------------|------------|
| 1     | 0 activities           | First workout CTA         | Always in first week when 0 activities |
| 2–3   | &lt; 2 activities       | Gentle reminder           | Once (localStorage) |
| 7+    | 3+ workouts (total)    | Week one complete + XP/badge | Once (flag + optional backend) |

---

## Copy checklist

- [ ] Day 1: first workout CTA (reuse ONBOARDING.md / Dashboard empty state).
- [ ] Day 2–3: gentle reminder copy; “reminder shown” persisted.
- [ ] Day 7: “Week one complete” copy; optional +XP and/or badge; “celebrated” persisted.

All copy above is implementation-ready; adjust tone to match Zenith’s voice as needed.
