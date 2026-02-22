# Copy Audit — Zenith

Audit of user-facing strings in `src/`. Tone: **encouraging, elite, concise**.  
Recommendations: Simplify, Add period, Consistency (capitalization/terminology), or OK.

---

## App.jsx

| Location | Component / usage | String | Recommendation |
|----------|-------------------|--------|----------------|
| ToastContainer | aria-label | "Dismiss notification" | OK |
| PageLoader | Loading text | "Loading…" | OK (ellipsis consistent) |
| NAV_ITEMS | Nav labels | "Dashboard", "Activities", "Progress", "Challenges", "Leaderboard", "Profile" | OK |
| MOBILE_NAV_ITEMS | Mobile nav | "Home", "History", "Workout", "Profile" | OK — "History" for Activities is clear |
| Header | Logo | "Zenith" | OK |
| Header | title | "Toggle theme" | OK |
| Header | aria-label theme | "Switch to light theme" / "Switch to dark theme" | OK |
| Header | title/aria | "Logout", "Log out" | Unify: use "Log out" (verb) for both. |
| Header | aria-label | "Go to profile" | OK |
| Header | xp-mini label | "Lv {n} · {title}" | OK |
| Toast (achievement) | message | "Achievement unlocked: {name} {icon}" | Add period for consistency. |
| Toast (achievement) | action label | "Share" | OK |
| Toast (copy) | message | "Link copied" | OK |
| SkipToMain | link text | "Skip to main content" | OK |

---

## Login.jsx

| Location | Component | String | Recommendation |
|----------|-----------|--------|----------------|
| auth-header | Title | "Welcome Back" | OK |
| auth-subtitle | Subtitle | "Log in to your Zenith account" | OK |
| getLoginErrorMessage | Error | "Login is taking too long. Please check your connection and try again." | Simplify: "Login timed out. Check your connection and try again." |
| getLoginErrorMessage | Error | "Incorrect email or password." | OK |
| getLoginErrorMessage | Error | "Too many attempts. Please wait a bit and try again." | OK |
| getLoginErrorMessage | Error | "Unable to log in right now. Please try again." | OK |
| form | aria-label | "Log in form" | OK |
| form | Labels | "Email Address", "Password" | OK |
| form | Placeholders | "name@example.com", "••••••••" | OK |
| button | "Logging in...", "Log In" | Use ellipsis: "Logging in…" for consistency. |
| auth-footer | "Don't have an account? Sign Up" | OK |

---

## Signup.jsx

| Location | Component | String | Recommendation |
|----------|-----------|--------|----------------|
| auth-header | Title | "Create Account" | OK |
| auth-subtitle | "Join the Zenith fitness community" | OK — elite, concise |
| getSignupErrorMessage | "An account with this email already exists. Try logging in instead." | OK |
| getSignupErrorMessage | "Please enter a valid email address." | OK |
| getSignupErrorMessage | "Password is too weak. Use at least 6 characters." | OK |
| getSignupErrorMessage | "Could not save; check your connection." | OK |
| getSignupErrorMessage | "Unable to create account right now. Please try again." | OK |
| Inline error | "Passwords do not match" | Add period. |
| form | Labels | "Full Name", "Email Address", "Password", "Confirm Password" | OK |
| form | Placeholders | "John Doe", "name@example.com", "••••••••" | OK |
| button | "Creating account...", "Sign Up" | Use ellipsis: "Creating account…". |
| auth-footer | "Already have an account? Log In" | OK |

---

## Dashboard.jsx

| Location | Component | String | Recommendation |
|----------|-----------|--------|----------------|
| zen-brand | "ZENITH" | OK |
| zen-tagline | "Performance tracking that feels elite" | OK |
| zen-hero | "Welcome back, {name}" | OK |
| zen-streak-pill | "{n} day streak" | OK |
| zen-level-label | "TOTAL XP" | OK |
| zen-level-sub | "Max level reached" / "{n} XP to level {m}" | OK |
| zen-hero-foot | "Weekly goal", "Total workouts" | OK |
| zen-hero-foot | "{n} / {goal} sessions" | OK |
| Quick Start | Section title | "Quick Start" | OK |
| Quick Start | Card names | "Quick Run", "Strength Builder", "Full Body Mix" | OK |
| Quick Start | Card details | "20 min cardio", "35 min lifting", "45 min challenge" | OK |
| Weekly Snapshot | "Weekly Snapshot", "Details" | OK |
| zen-ribbon | "Sessions", "Distance", "Volume", "Best streak" | OK |
| zen-goal-track | "{n}% goal completion" | OK |
| Daily Quests | "Daily Quests", "Complete to earn bonus XP." | OK |
| zen-quests-loading | "Your daily quests are loading…" | OK |
| zen-quests-progress | "{n} / {m} quests done" | OK |
| zen-quest-done | "Done" | OK |
| Recent Achievements | "Recent Achievements", "View all" | OK |
| Activity Feed | "Activity Feed", "View all" | OK |
| empty-state | "No workouts yet" | OK |
| empty-desc | "Log your first one to start building streaks and earning XP." | OK |
| empty-state button | "Log Workout" | OK |
| zen-primary-cta | "START WORKOUT" | OK |
| aria-label | "Start a new workout" | OK |

---

## Activities.jsx

| Location | Component | String | Recommendation |
|----------|-----------|--------|----------------|
| page-header | "Activities", "{n} total workouts logged" | OK |
| button | "Log Workout" | OK |
| search | placeholder | "Search workouts..." | Add space before ellipsis or use "Search workouts…". |
| search | aria-label | "Search workouts by title or sport" | OK |
| SPORT_FILTERS | "All Sports", "🏃 Run", etc. | OK |
| sort | "Sort: {label}" | OK |
| empty-state (none) | "No workouts yet", "No workouts found" | OK |
| empty-desc | Two variants (no data vs no match) | OK |
| buttons | "Log Workout", "Clear filters" | OK |
| toast | "Workout deleted", "Failed to delete workout" | OK |
| modal | "Delete Workout?", body, "Cancel", "Delete" | OK — body: add period at end. |
| Load more | "Load more ({n} remaining)" | OK |

---

## Progress.jsx

| Location | Component | String | Recommendation |
|----------|-----------|--------|----------------|
| page-header | "Progress", "Your fitness journey at a glance" | OK |
| Stats row | "Workouts", "Miles", "Hours", "lbs Lifted" | OK |
| empty-state | "Your progress starts with your first workout" | OK |
| empty-desc | "Once you log runs, rides…" | OK |
| XPSection | "XP total", "XP to {title}", "% to next level" | OK |
| XPSection | "Level Progression" | OK |
| PRSection | "Personal Records", "All-time bests" | OK |
| PRSection | "Fastest Mile", "Longest Run", etc., "Not yet recorded" | OK |
| AchievementsSection | "Achievements", "{n}/{m} unlocked", "Earned", "Locked" | OK |

---

## Challenges.jsx

| Location | Component | String | Recommendation |
|----------|-----------|--------|----------------|
| page-header | "Challenges", "Push your limits and earn XP" | OK |
| button | "Create Challenge" | OK |
| tabs | "Weekly Challenges", "My Challenges ({n})" | OK |
| filter | "All Sports" | OK |
| empty (weekly) | "No weekly challenges for this sport", "Switch to another sport…" | OK |
| empty (custom) | "No custom challenges yet", description, "Show All Sports" | OK |
| empty (custom filter) | "No custom challenges for this sport", "Switch your sport filter…" | OK |
| CreateChallengeModal | "Create Challenge", "Challenge Name *", "Type", "Sport", "Target…", "XP Reward", "Deadline *" | OK |
| CreateChallengeModal | "Please fill in all required fields" | OK |
| CreateChallengeModal | "Cancel", "Create Challenge" | OK |
| toast | "Challenge created! 🎯", "Failed to create challenge", "Challenge deleted", "Failed to delete challenge" | OK |
| ChallengeCard | "✓ DONE", "Community Challenge" | OK |

---

## Leaderboard.jsx

| Location | Component | String | Recommendation |
|----------|-----------|--------|----------------|
| page-header | "Leaderboard", "Loading…", "Your rank: #{} of {}", "Your rank: #{} among friends" | OK |
| tabs | "Global", "Friends" | OK |
| SORT_METRICS | "Total XP", "Weekly Distance", "Monthly Volume", "Streak" | OK |
| empty-state | "You're the first on the board" | OK |
| empty-desc | "Keep logging workouts…" | OK |
| buttons | "Log Workout", "Back to Dashboard" | OK |
| myEntry | "You" | OK |

---

## Profile.jsx

| Location | Component | String | Recommendation |
|----------|-----------|--------|----------------|
| page-header | "Profile", "Edit Profile", "Log Out" | OK |
| Fallback name | "Athlete" | OK |
| badge | "Joined {date}" | OK |
| tabs | "Stats", "Badges ({n})", "History", "Settings" | OK |
| Stats grid | "Total Workouts", "Total Distance", "Total Time", "Total XP", "Current Streak", "Volume Lifted" | OK |
| empty (badges) | "No badges yet", description | OK |
| empty (history) | "No workouts logged yet", "Your workout history will appear here…" | OK |
| EditProfileModal | "Edit Profile", "Display Name", "Username", "Primary Sport", "Cancel", "Save Changes" | OK |
| EditProfileModal | placeholder "@username" | OK |
| toast | "Name is required", "Profile updated! ✨", "Failed to update profile" | OK |
| SettingsPanel | "Settings", "Units", "Privacy", "Notifications" | OK |
| Settings options | "Imperial (mi, lbs)", "Metric (km, kg)", "Public", "Friends Only", "Private" | OK |

---

## AddActivityModal.jsx

| Location | Component | String | Recommendation |
|----------|-----------|--------|----------------|
| modal title | "Log Workout", "Edit Workout" | OK |
| success screen | "Workout logged!", "+{n} XP earned. Share your progress?", "Done", "Share" | OK |
| Validation toasts | "Please enter a workout title", "You must be logged in to save workouts" | OK |
| Validation | "Duration (min)", "Distance", "Pace (min per mile)", "Total volume (lbs)" errors | OK — keep as-is (dynamic). |
| Toast | "Enter at least one metric (duration, distance, or pace)", "Enter either duration or distance" | OK |
| Toast | "Workout updated! ✏️", "Workout logged, but XP update is delayed.", "Workout logged! +{} XP 🎉" | OK |
| Toast | "Permission error while saving. Please re-login.", "Could not save; check your connection." | OK |
| Toast | "Link copied" | OK |
| Labels | "Sport", "Title", "Date", "Duration (min…)", "Distance", "Avg Pace", "Laps (optional)", "Pool Type", "Exercises", "Notes (optional)" | OK |
| Placeholders | "e.g. Morning Run", "45", "5.0", "9.5", "1500", "30", "Exercise name (e.g. Bench Press)", "10", "135", "How did it feel? Any PRs?" | OK |
| Pool options | "Pool", "Open Water" | OK |
| Sets table | "Set", "Reps", "Weight (lbs)" | OK |
| Buttons | "Add Set", "Add Exercise", "Cancel", "Update Workout", "Log Workout", "Saving..." | Use "Saving…" (ellipsis). |

---

## Onboarding.jsx

| Location | Component | String | Recommendation |
|----------|-----------|--------|----------------|
| Step 1 | "Track like a pro. Stay consistent." | OK |
| Step 1 | "Log workouts, build streaks, and level up. Zenith turns your effort into progress you can see — and rewards you for showing up." | OK |
| Step 1 | "Get started" | OK |
| Step 2 | "Quick setup — we'll personalize your experience" | OK |
| Step 2 | "What's your main focus?", "What's your main goal right now?" | OK |
| GOAL_OPTIONS | "Lose weight", "Build muscle", "Stay active" | OK |
| Step 2 | "Continue", "Skip for now" | OK |
| Step 3 | "You're in. Time to move." | OK |
| Step 3 | "Your dashboard is ready. Log your first workout…" | OK |
| Step 3 | "Log my first workout" | OK |

---

## ErrorBoundary.jsx

| Location | Component | String | Recommendation |
|----------|-----------|--------|----------------|
| fallback | "Something went wrong." | OK |
| button | "Retry" | OK |

---

## OfflineIndicator.jsx

| Location | Component | String | Recommendation |
|----------|-----------|--------|----------------|
| banner | "You're offline" | OK — consider "You're offline. Some features may be limited." for clarity; current is concise. |

---

## AuthContext.jsx

| Location | Component | String | Recommendation |
|----------|-----------|--------|----------------|
| loading screen | "ZENITH", "Syncing with cloud..." | Use "Syncing with cloud…" (ellipsis). |

---

## PerformanceChart.jsx

| Location | Component | String | Recommendation |
|----------|-----------|--------|----------------|
| FILTERS | "7D", "30D", "3M", "1Y" | OK (abbreviations) |

---

## index.html

| Location | String | Recommendation |
|----------|--------|----------------|
| title | "zenith" | Capitalize: "Zenith" (brand). |

---

## Typos and capitalization

- **AuthProvider**: No typo found in codebase (AuthProvider is correct).
- **Ellipsis**: Prefer Unicode ellipsis (…) over three dots (...) for "Loading…", "Logging in…", "Creating account…", "Saving…", "Syncing with cloud…" where applicable.
- **index.html**: Page title "zenith" → "Zenith".

---

## i18n readiness

User-facing strings are centralized in **`src/lib/copy.js`** as a single object `COPY = { key: 'string', ... }`. Components import and use `COPY.key` instead of hardcoded strings. This structure is **ready for a future i18n solution** (e.g. react-i18next, react-intl): replace the static object with a function that returns strings for the active locale (e.g. `t('key')` or `COPY(locale)`), or point `COPY` to namespaced JSON. One language (en) is used for now.
