# External Integrations Roadmap (Zenith)

High-level scope and data mapping for planned integrations. No code.

---

## 1. Strava — OAuth and Import Activities

### Scope

- **OAuth:** User connects Strava from the app (e.g. Profile → Connect accounts). We request read-only scope to list and import activities.
- **Import:** One-time or periodic import of Strava activities into Zenith. Imported activities are mapped to Zenith’s activity model and stored in Firestore (same `activities` collection, with optional `source: 'strava'` and `externalId` for deduplication).

### Data mapping (Strava → Zenith activity model)

| Strava field / concept      | Zenith field / note                                      |
|----------------------------|----------------------------------------------------------|
| `type` (Run, Ride, Swim…)  | `sport`: map Run→run, Ride→cycle, Swim→swim; others→run or skip |
| `name`                     | `title`                                                  |
| `elapsed_time` / `moving_time` (seconds) | `duration`: store in minutes (e.g. `moving_time / 60`)   |
| `distance` (meters)        | `distance`: convert to miles for run/cycle, yards for swim if applicable |
| `average_speed` (m/s)      | Derive `pace` (min/mi or min/yd) if needed               |
| N/A (Strava has no sets)   | `volume`, `exercises`: leave null for cardio imports     |
| `start_date`               | `date` (timestamp)                                       |
| `id` (Strava activity id)  | Store as `externalId`; use for dedupe on re-import       |
| N/A                        | `userId`: current Zenith user; `xpEarned`: compute via `calculateXP` |

### Where in app

- **Profile → Connect accounts:** “Connect Strava” button; OAuth flow; on success show “Connected” and optional “Import activities” action.
- **Import flow:** Trigger from Profile (or a one-time onboarding step). Fetch recent Strava activities (e.g. last 90 days), map each to Zenith model, skip if `externalId` already exists for this user, then write to Firestore and optionally run achievement/quest logic for new activities.

### Implementation notes

- **OAuth:** Redirect to Strava; code is exchanged server-side via Firebase Callable `exchangeStravaCode` (keeps client secret safe). Set `STRAVA_CLIENT_ID` and `STRAVA_CLIENT_SECRET` in Firebase Functions config (or env). In the app set `VITE_STRAVA_CLIENT_ID` for the auth URL. In the Strava API app settings, set the Authorization Redirect URI to your app origin (e.g. `https://yourapp.com/` or `https://yourapp.com/profile`).
- **Tokens:** Stored in `users/{uid}/integrations/strava` (Firestore rules: owner-only).
- **Rate limits:** Import throttled to ~6 requests per 15 min (100/15min limit).
- **Scopes:** `activity:read_all` for listing activities.
- **Deauthorization:** Profile → Connect → Disconnect removes the stored token; imported activities remain in Zenith.

---

## 2. Apple Health — Read-Only Import

### Scope

- **Read-only:** Read workouts (and optionally other metrics) from Apple Health. No write-back to Health.
- **Where:** Profile → Connect accounts → “Connect Apple Health” (or “Import from Health”). On iOS/macOS this uses HealthKit; for web or Android this is N/A or “Coming soon”.

### Data mapping (HealthKit workout → Zenith activity model)

| HealthKit / concept              | Zenith field / note                                      |
|----------------------------------|----------------------------------------------------------|
| `HKWorkoutActivityType` (Running, Cycling, Swimming, Traditional Strength…) | `sport`: Running→run, Cycling→cycle, Swimming→swim, Traditional Strength Training→lift; others map or skip |
| Workout metadata / optional title | `title` (or default “Run”, “Ride”, etc.)                 |
| `duration` (seconds)             | `duration`: convert to minutes                           |
| `totalDistance` (meters)        | `distance`: convert to miles (run/cycle) or yards (swim) |
| N/A (Health doesn’t store pace) | `pace`: optional, derive from duration + distance        |
| N/A                              | `volume`, `exercises`: for strength, leave null or optional mapping if HK supports it |
| `startDate` / `endDate`          | `date`: use start (or end) as activity date              |
| `UUID` or similar                | Store as `externalId` (e.g. `health_${uuid}`) for dedupe |
| N/A                              | `userId`, `xpEarned`: set by Zenith                       |

### Where in app

- **Profile → Connect accounts:** “Import from Apple Health” (shown on supported platforms). Triggers HealthKit authorization request (read workouts).
- **Import flow:** User selects date range or “Import last 30 days”; app reads workouts from HealthKit, maps to Zenith model, dedupes by `externalId`, then writes to Firestore. Optionally run achievement/quest logic.

### Notes

- **Platform:** HealthKit is iOS/macOS only; web and Android cannot use it. Show option only on supported platforms or document “Coming soon” elsewhere.
- **Permissions:** Request only workout read permission; explain why in UI.
- **Incremental import:** Use `externalId` to avoid re-importing the same workout; support “Import new since last import” if desired.

---

## Summary

| Integration   | Auth / access     | Primary data     | Where in app           |
|---------------|-------------------|------------------|------------------------|
| Strava        | OAuth (read)      | Activities API   | Profile → Connect → Import |
| Apple Health  | HealthKit (read)  | Workouts         | Profile → Connect → Import (iOS/macOS) |

Both flows produce activities that match the existing Zenith activity model and can be stored in the same Firestore `activities` collection with optional `source` and `externalId` for attribution and deduplication.
