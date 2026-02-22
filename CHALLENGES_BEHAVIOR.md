# Zenith — Challenges Completion & XP Behavior

Documents when a weekly challenge is marked complete and when XP is awarded. Based on `src/pages/Challenges.jsx` and `src/lib/firestore.js` (`firestoreChallenges`).

---

## Current behavior

### Weekly challenges (in-app only)

- **Source:** Weekly challenges are **not** stored in Firestore. They are defined in `Challenges.jsx` as `WEEKLY_CHALLENGES` and their **progress** is computed client-side from the user’s **activities** each time the Challenges page is rendered.
- **Progress calculation:** For the current week (Monday–Sunday), activities are filtered by `date` and `sport`. For each weekly challenge:
  - **Distance type:** `currentValue` = sum of `activity.distance` for that sport this week.
  - **Frequency type:** `currentValue` = count of activities for that sport this week.
- **Completion (visual only):** A challenge is shown as complete when `(currentValue / targetValue) * 100 >= 100` (i.e. `currentValue >= targetValue`). The card shows “✓ DONE” and the progress bar is full. This is **purely visual**; there is no persisted “completed” state and **no XP is awarded** for weekly challenges in the current codebase.

### Custom challenges (Firestore)

- **Storage:** Custom challenges are stored in the `challenges` collection via `firestoreChallenges` (add, delete, subscribe). They have `userId`, `targetValue`, `currentValue`, `deadline`, `xpReward`, etc.
- **Progress:** Custom challenges’ `currentValue` is **not** updated by the current app code when the user logs activities. So custom challenges do not auto-update progress or completion from activities.
- **XP:** There is no code that calls `firestoreUser.addXP` when a custom challenge’s target is met. So **XP is not awarded** for custom challenge completion either.

### Summary

| Challenge type | Progress source        | When “complete” is shown     | XP awarded? |
|----------------|------------------------|------------------------------|-------------|
| Weekly         | Computed from activities (weekly) on Challenges page | When `currentValue >= targetValue` on render | **No**       |
| Custom         | Stored in Firestore; not updated from activities      | Not automatically detected   | **No**       |

---

## When is a weekly challenge “marked complete”?

**Exact rule today:** A weekly challenge is **shown as complete** on the Challenges page whenever the user has that page open and the computed `currentValue` for the current week meets or exceeds `targetValue`. There is no separate “mark complete” step; it’s a **derived state on each render**. There is no persistence of “user completed challenge X this week” and no XP grant.

---

## Recommendation

### Weekly challenges

1. **Award XP once per challenge per week when target is hit.**  
   When, for the first time in the current week, a weekly challenge’s computed progress reaches or exceeds 100%:
   - Call `firestoreUser.addXP(userId, challenge.xpReward)`.
   - Persist that this challenge was “claimed” for this week (e.g. in Firestore: a `weeklyChallengeCompletions` subcollection or a `users` field like `claimedWeeklyChallenges: { "<challengeId>": "<weekKey>" }`) so XP is not granted again for the same challenge in the same week.

2. **When to run the check (pick one or combine):**
   - **Option A — On opening Challenges page:** When the Challenges page loads (or when the Weekly tab is selected), compute progress for all weekly challenges. For any challenge that is at or above target and not yet claimed for this week, award XP and mark as claimed.
   - **Option B — After activity sync:** Whenever the app’s activity list is updated (e.g. after adding/editing an activity or on subscription update), run the same weekly progress calculation. If any weekly challenge crosses from below target to at/above target for the first time this week, award XP and mark as claimed.

   **Recommendation:** Option A is simpler and avoids duplicate logic in multiple places. Option B gives faster feedback (user sees XP right after logging the workout that tips the challenge). Implementing **Option A** first is sufficient; Option B can be added later for a snappier feel.

### Custom challenges

- **Progress:** Update custom challenges’ `currentValue` from the user’s activities (same week or within challenge `deadline`) when activities are loaded or when the Challenges page is opened, so progress bars and completion state are accurate.
- **Completion and XP:** When a custom challenge’s `currentValue >= targetValue` and it hasn’t been marked complete yet, mark it complete (e.g. `completed: true`, `completedAt: timestamp`), call `firestoreUser.addXP(userId, challenge.xpReward)` once, and optionally hide it or move it to a “Completed” list so it’s not claimed again.

---

## Exact rule to implement (weekly, recommended)

- **Event:** User opens the **Challenges** page and the **Weekly** tab is active (or the page loads with Weekly as default).
- **Logic:**  
  For the current week (same Monday–Sunday as in `Challenges.jsx`), compute `currentValue` for each weekly challenge from activities.  
  For each challenge where `currentValue >= targetValue`:
  - If this challenge has **not** been claimed for this week (e.g. no entry in `claimedWeeklyChallenges` for this `challengeId` and week key):
    - Call `firestoreUser.addXP(uid, challenge.xpReward)`.
    - Record that this challenge was claimed for this week (e.g. write to Firestore so the check is idempotent on next open).
- **Result:** Weekly challenges are still “complete” when target is hit (visual state unchanged). XP is awarded once per challenge per week, on the next open of Challenges (or on next activity sync if that option is implemented).

---

This document is the single source of truth for current behavior and the recommended completion/XP rules. Frontend (and any backend) can implement the “claim once per week” and `addXP` logic as above.
