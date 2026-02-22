# Zenith — Empty States & First-Time Guidance

Spec and copy for empty states and first-time hints on each main page. Tone: encouraging, elite but not intimidating.

---

## Conventions

- **Empty state:** Shown when there is no data (or no data for current filter) for that section.
- **First-time hint:** One-time tooltip or inline message for new users (e.g. after first visit to the page). Dismissible; do not show again once dismissed.
- **CTA:** Single primary button unless noted.

---

## 1. Dashboard  
**Component/Page:** `Dashboard.jsx` (sections: Activity Feed, Quick Start, Weekly Snapshot, Recent Achievements)

### Activity Feed (no workouts yet)

**Empty state**

- **Icon:** 🏃 (or existing zen-empty treatment)
- **Title:** No workouts yet
- **Description:** Log your first one to start building streaks and earning XP.
- **CTA:** Log Workout

**First-time hint (tooltip or banner above feed)**  
*Show when `activities.length === 0` and user has not dismissed.*

- **Copy:** Your recent workouts will show up here. Tap **Log Workout** to add your first session.
- **CTA (optional):** Got it

### Whole-dashboard first-time (optional)

If the entire dashboard is “empty” (e.g. no activities and new user):

- **Hint:** Welcome to your command center. Log a workout to see your stats, streak, and level come to life.
- **CTA:** Log my first workout

---

## 2. Activities  
**Component/Page:** `Activities.jsx`

### No workouts at all (no filters applied)

**Empty state**

- **Icon:** 🔍 (or a workout-focused icon)
- **Title:** No workouts yet
- **Description:** Your logged sessions will appear here. Start with one — every streak begins with a single workout.
- **CTA:** Log Workout

**First-time hint**

- **Copy:** Search and filter by sport or sort by date, distance, or XP. Add your first workout to get started.
- **CTA:** Got it

### No results (filters applied)

**Empty state**

- **Title:** No workouts found
- **Description:** Nothing matches your filters. Try a different sport or search, or log a new workout.
- **CTA:** Log Workout  
**Secondary (optional):** Clear filters

---

## 3. Progress  
**Component/Page:** `Progress.jsx` (stats summary, XP, Personal Records, Achievements)

### No activities (whole page feels empty)

**Empty state (suggest placing after stats row or as a gentle overlay)**

- **Icon:** 📈
- **Title:** Your progress starts with your first workout
- **Description:** Once you log runs, rides, swims, or lifts, you’ll see personal records, level growth, and achievements here.
- **CTA:** Log Workout

**First-time hint**

- **Copy:** This page fills up as you train — PRs, level, and badges all update from your logged activities.
- **CTA:** Got it

### Personal Records (all “Not yet recorded”)

*Existing PR cards already show “Not yet recorded” for each. No separate empty state needed; optional section-level message.*

- **Optional section subtitle when all PRs empty:** Log activities to unlock your first personal records.

### Achievements (all locked)

*Handled by existing “Locked” list. No extra empty state required.*

---

## 4. Challenges  
**Component/Page:** `Challenges.jsx` (tabs: Weekly Challenges, My Challenges)

### Weekly tab — no challenges for selected sport filter

**Empty state**

- **Icon:** 🔎
- **Title:** No weekly challenges for this sport
- **Description:** Switch to another sport to see available weekly challenges, or try “All Sports.”
- **CTA:** Show All Sports (or change filter to “All”)

### Custom tab — no custom challenges

**Empty state**

- **Icon:** 🎯
- **Title:** No custom challenges yet
- **Description:** Set your own target and deadline — we’ll track your progress and you’ll earn XP when you complete it.
- **CTA:** Create Challenge

**First-time hint (Challenges page)**

- **Copy:** Weekly challenges reset each week. You can also create personal challenges with custom goals and XP rewards.
- **CTA:** Got it

---

## 5. Leaderboard  
**Component/Page:** `Leaderboard.jsx`

### No other users / empty list (e.g. only current user)

**Empty state**

- **Icon:** 🏆
- **Title:** You’re the first on the board
- **Description:** Keep logging workouts to build your XP and level. When others join, you’ll see how you stack up.
- **CTA:** Log Workout  
**Secondary (optional):** Back to Dashboard

**First-time hint**

- **Copy:** Rank by Total XP, Weekly Distance, Monthly Volume, or Streak. Your position updates as you train.
- **CTA:** Got it

---

## 6. Profile  
**Component/Page:** `Profile.jsx` (tabs: Stats, Badges, History, Settings)

### Badges tab — no badges earned

**Empty state**

- **Icon:** 🏅
- **Title:** No badges yet
- **Description:** Unlock achievements by logging workouts, building streaks, and hitting distance or volume milestones.
- **CTA:** Log Workout

### History tab — no workouts

**Empty state**

- **Icon:** 📋
- **Title:** No workouts logged yet
- **Description:** Your workout history will appear here once you start logging sessions.
- **CTA:** Log Workout

**First-time hint (Profile)**

- **Copy:** Your stats, badges, and history all live here. Edit your profile to set your primary sport and display name.
- **CTA:** Got it

---

## Summary table

| Page        | Empty state title (main)              | Primary CTA       | First-time hint (short)                          |
|------------|---------------------------------------|-------------------|--------------------------------------------------|
| Dashboard  | No workouts yet                       | Log Workout       | Recent workouts show here; tap Log Workout.     |
| Activities | No workouts yet / No workouts found   | Log Workout       | Search, filter, sort; add first workout.          |
| Progress   | Your progress starts with first workout | Log Workout     | PRs, level, badges update from activities.       |
| Challenges | No weekly/custom challenges (context) | Create / Filter   | Weekly reset; create personal challenges.        |
| Leaderboard| You’re the first on the board         | Log Workout       | Rank by XP, distance, volume, streak.            |
| Profile    | No badges yet / No workouts logged yet| Log Workout       | Stats, badges, history; edit profile.            |

All copy above is implementation-ready for the frontend.
