# Release Checklist

One-page checklist for releasing Zenith. For setup and env vars see [README.md](README.md).

## 1. Pre-release

- [ ] `npm run lint`
- [ ] `npm run build`
- [ ] `npm run test`
- [ ] `npm run test:smoke`
- [ ] Prod env vars: all `VITE_FIREBASE_*` set in hosting/build config. If using Strava: `VITE_STRAVA_CLIENT_ID` (and Cloud Function `STRAVA_CLIENT_ID` / `STRAVA_CLIENT_SECRET` if applicable).

## 2. Firestore

- [ ] Deploy rules and indexes (required for feed, leaderboard, clubs, comments, etc.):  
  `firebase deploy --only firestore:rules,firestore:indexes,hosting`
- [ ] Confirm in Firebase Console: Firestore → Rules and Indexes show expected versions.

## 3. iOS (if used)

- [ ] Version bump in `ios/` (e.g. `Info.plist` / Xcode project).
- [ ] Build: `npm run build` then sync to iOS (see [MOBILE.md](MOBILE.md)).
- [ ] TestFlight upload if applicable.

## 4. Post-release

- [ ] **Login:** Open production URL, log in with a test account.
- [ ] **One workout:** Log one activity (any sport), confirm it appears and XP updates.
- [ ] **Leaderboard:** Open Leaderboard, confirm it loads and shows expected data.
- [ ] **Strava (if enabled):** Profile → Connect Strava, import activities; confirm they appear and count toward XP.
- [ ] **Apple Health (iOS only):** On device, Profile → Connect Apple Health, import workouts; confirm they appear.

## 5. Regression (manual pass)

Verify critical paths: auth, log manual activity, log from template, record GPS, view map, follow/feed, kudos/comments, clubs, privacy, nutrition, import Strava/Health. Fix any regressions before marking release complete.

## 6. Rollback

- **Hosting:** Firebase Console → Hosting → Releases → rollback to last healthy release; or `firebase hosting:rollback`.
- **Firestore:** If rules/indexes caused the issue, redeploy the previous known-good commit (e.g. re-run deploy from that commit).
