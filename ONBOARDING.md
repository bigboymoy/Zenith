# Zenith — First-Run Onboarding

Spec and copy for the post-signup onboarding flow. No backend changes required. For local setup, env vars, and deploy see [README.md](README.md).

---

## Overview

- **Screens:** 3–5 (value prop → optional permissions → optional quick profile → Get started → first action).
- **Goal:** Set expectations, optionally collect profile/goal, and drive first action: "Log your first workout."
- **Tone:** Confident, elite but welcoming — not intimidating.

---

## Screen 1 — Welcome / Value prop

**Headline:**  
Track like a pro. Stay consistent.

**Body:**  
Log workouts, build streaks, and level up. Zenith turns your effort into progress you can see — and rewards you for showing up.

**CTA:**  
Get started

**Notes:** Full-screen or card. Optional: subtle motion on "level up" or streak visual.

---

## Screen 2 — Permissions (optional)

*Show only if the app will request any permissions (e.g. notifications, health). If none, skip.*

**Headline:**  
Never miss a beat

**Body:**  
Allow notifications so we can nudge you when your streak is on the line or a challenge is about to end.

**Primary CTA:**  
Enable notifications  
**Secondary:**  
Maybe later

**Notes:** If no permissions are used, omit this screen.

---

## Screen 3 — Quick profile (optional)

*Single screen with 2 short questions. Skip option available.*

**Headline:**  
Quick setup — we’ll personalize your experience

**Question 1 — Primary sport**  
What’s your main focus?  
- Run  
- Cycle  
- Swim  
- Lift  

**Question 2 — Goal**  
What’s your main goal right now?  
- Lose weight  
- Build muscle  
- Stay active  

**Primary CTA:**  
Continue  
**Secondary (text link):**  
Skip for now

**Notes:** Selections can be stored on user profile (e.g. `primarySport`, `goal`) for future personalization. Not required to proceed.

---

## Screen 4 — Get started / You’re in

**Headline:**  
You’re in. Time to move.

**Body:**  
Your dashboard is ready. Log your first workout to start earning XP and building your streak.

**CTA:**  
Log my first workout

**Notes:** This CTA should navigate to the main app and either open the “Add activity” flow immediately or land on Dashboard with a clear first-action prompt.

---

## Screen 5 — First action (Dashboard + CTA)

*If the user taps “Log my first workout” on Screen 4, go straight to Add Activity. Otherwise, show Dashboard with a prominent first-action block.*

**First-action block (when activity count is 0):**

**Headline:**  
Log your first workout

**Body:**  
Every journey starts with one session. Log a run, ride, swim, or lift — and we’ll take it from there.

**CTA (single, prominent):**  
Log workout

**Notes:** Same CTA as existing Dashboard empty state; copy here is the canonical “first workout” messaging. No secondary CTA on this block.

---

## Flow summary

| Step | Screen           | Headline (short)           | Primary CTA            |
|------|------------------|----------------------------|------------------------|
| 1    | Value prop       | Track like a pro. Stay consistent. | Get started            |
| 2    | Permissions      | Never miss a beat          | Enable notifications   |
| 3    | Quick profile    | Quick setup                | Continue / Skip        |
| 4    | Get started      | You’re in. Time to move.   | Log my first workout   |
| 5    | First action     | Log your first workout     | Log workout            |

**Minimum flow (no permissions, skip profile):** 1 → 4 → 5 (3 steps).  
**Full flow:** 1 → 2 → 3 → 4 → 5 (5 steps).

---

## Copy checklist

- [ ] Screen 1: headline, body, “Get started”
- [ ] Screen 2 (if used): headline, body, “Enable notifications”, “Maybe later”
- [ ] Screen 3 (if used): headline, sport options, goal options, “Continue”, “Skip for now”
- [ ] Screen 4: headline, body, “Log my first workout”
- [ ] Screen 5 / first-action block: headline, body, “Log workout”

All copy above is implementation-ready for the frontend.
