# Zenith Firestore Schema

Reference for collections, fields, and query patterns. See `src/lib/firestore.js` for implementation. Exercise catalog: `src/lib/exerciseLibrary.js` (or static in `src/lib/constants.js`).

## Collections

### `users`
- **Document ID:** Firebase Auth UID (`users/{uid}`).
- **Fields:** `uid`, `name`, `email`, `username`, `level`, `xp`, `primarySport`, `streak`, `createdAt`, `joinedAt`, `claimedWeeklyChallenges` (optional map of challenge id → week key `YYYY-MM-DD` for idempotent weekly challenge XP). Optional: `avatarUrl` for profile image. **Activity privacy defaults:** `defaultActivityVisibility` (`'public' | 'followers' | 'private'`), `defaultHideMap` (boolean), `defaultHideStartTime` (boolean).
- **Public profile (feed & profile views):** Any signed-in user can read user documents. For displaying other users (feed, profile, discover), use only **minimal public fields**: `username`, `name`, `avatarUrl`, `level`, `xp`, `primarySport`; do not expose `email` in UI.
- **Query patterns:**
  - Single document: `getDoc(doc(db, 'users', uid))`.
  - Leaderboard (top 50 by XP): `query(collection(db, 'users'), orderBy('xp', 'desc'), limit(50))` — requires index `users` / `xp` DESC.

### `activities`
- **Document ID:** Client-generated, e.g. `act_${Date.now()}` (`activities/{activityId}`).
- **Fields:** `id`, `userId`, `date` (timestamp), `sport`, `title`, `duration`, `distance`, `pace`, `volume`, `exercises`, `poolType`, `laps`, `notes`, `xpEarned`, `createdAt`, `kudosCount` (number), `commentCount` (number). **Extension (optional):** `track` (array of `{ lat, lng }` or encoded polyline string), `source` (`'manual' | 'gps' | 'strava' | 'health'`), `externalId`, `visibility` (`'public' | 'followers' | 'private'`), `hideMap`, `hideStartTime`.
- **Query patterns:**
  - By user, newest first: `query(collection(db, 'activities'), where('userId', '==', userId), orderBy('date', 'desc'))` — requires composite index `userId` ASC, `date` DESC.
  - Feed (visibility + time): `query(collection(db, 'activities'), where('visibility', '==', 'public'), orderBy('createdAt', 'desc'), limit(N))` — requires index `visibility` ASC, `createdAt` DESC.
  - Single doc: `doc(db, 'activities', activity.id)` (get/update/delete).

### `achievements`
- **Document ID:** `{userId}_{achievementId}` (e.g. `abc123_first_workout`); IDs from `ACHIEVEMENT_DEFS` in `src/lib/constants.js`.
- **Fields:** From achievement defs plus `userId`, `earned`, `earnedAt`.
- **Query patterns:**
  - By user: `query(collection(db, 'achievements'), where('userId', '==', userId))` (single-field equality, no composite index).

### `challenges`
- **Document ID:** Challenge id (e.g. template id like `wc_run_20`) — `challenges/{challengeId}`.
- **Fields:** `id`, `userId`, plus challenge template fields (e.g. `name`, `sport`, `targetValue`, `currentValue`, `type`, `xpReward`, etc.).
- **Query patterns:**
  - By user: `query(collection(db, 'challenges'), where('userId', '==', userId))` (single-field equality, no composite index).

### `exercises` (optional)
- **Purpose:** Catalog of exercises for templates and 1RM. Can be static JSON in `src/lib/constants.js` or `src/lib/exerciseLibrary.js` instead of a collection.
- **Fields (if collection):** `id`, `name`, `muscleGroup`, `instructions`, `equipment`.

### `workoutTemplates`
- **Document ID:** Client-generated (e.g. `wt_${Date.now()}`) — `workoutTemplates/{templateId}`.
- **Fields:** `userId`, `name`, `sport`, `exercises` (array of `{ name, setsCount }` or `defaultSets`), `createdAt`.
- **Query patterns:**
  - By user: `query(collection(db, 'workoutTemplates'), where('userId', '==', userId), orderBy('createdAt', 'desc'))` — requires index `userId` ASC, `createdAt` DESC.

### `oneRepMax` (subcollection)
- **Path:** `users/{uid}/oneRepMax/{exerciseId}`.
- **Fields:** `exerciseId`, `value`, `updatedAt`.
- **Query patterns:**
  - By user: `getDoc(doc(db, 'users', uid, 'oneRepMax', exerciseId))` per exercise; or `getDocs(collection(db, 'users', uid, 'oneRepMax'))` for all.

### `follows`
- **Document ID:** `{followerId}_{followingId}` or client-generated — `follows/{followId}`.
- **Fields:** `followerId`, `followingId`, `createdAt`.
- **Query patterns:**
  - By follower: `query(collection(db, 'follows'), where('followerId', '==', uid))`. By following: `query(collection(db, 'follows'), where('followingId', '==', uid))`.

### `feed` (fan-out)
- **Document ID:** `{followerId}_{activityId}` — `feed/{feedId}`.
- **Fields:** `followerId`, `activityId`, `userId` (author), `createdAt`.
- **Query patterns:**
  - Feed for user: `query(collection(db, 'feed'), where('followerId', '==', uid), orderBy('createdAt', 'desc'), limit(N), startAfter(lastDoc))` — requires composite index `followerId` ASC, `createdAt` DESC.
- **Write:** On activity create/update, when `visibility` is `public` or `followers`, write one feed doc per follower of the author (fan-out on write).

### `kudos`
- **Document ID:** `{activityId}_{userId}` — `kudos/{kudoId}`.
- **Fields:** `activityId`, `userId`, `createdAt`.
- **Query patterns:**
  - By activity: `query(collection(db, 'kudos'), where('activityId', '==', activityId))`.

### `comments`
- **Document ID:** Client-generated — `comments/{commentId}`.
- **Fields:** `activityId`, `userId`, `userName` (display name at time of post), `text`, `createdAt`.
- **Query patterns:**
  - By activity: `query(collection(db, 'comments'), where('activityId', '==', activityId), orderBy('createdAt', 'asc'))` — requires composite index `activityId` ASC, `createdAt` ASC.

### `clubs`
- **Document ID:** Client-generated — `clubs/{clubId}`.
- **Fields:** `id`, `name`, `description`, `ownerId`, `memberIds` (array of UIDs), `isPublic` (boolean; for discover), `createdAt`.
- **Query patterns:**
  - Clubs I'm in: `query(collection(db, 'clubs'), where('memberIds', 'array-contains', uid))`.
  - Discover: `query(collection(db, 'clubs'), where('isPublic', '==', true), orderBy('createdAt', 'desc'), limit(N))` — requires index `isPublic` ASC, `createdAt` DESC.

### `clubMembers` (optional)
- **Path:** `clubs/{clubId}/members/{userId}` — for scalable member list; alternative is storing `memberIds` on club with a size limit.

### `segments`
- **Document ID:** Client-generated — `segments/{segmentId}`.
- **Fields:** `id`, `name`, `sport`, `polyline` (or `startLatLng`, `endLatLng`), `createdBy`, `createdAt`.
- **Query patterns:**
  - By creator: `query(collection(db, 'segments'), where('createdBy', '==', uid))`. Single: `getDoc(doc(db, 'segments', segmentId))`.

### `segmentResults`
- **Document ID:** Client-generated — `segmentResults/{resultId}`.
- **Fields:** `segmentId`, `activityId`, `userId`, `timeMs`, `createdAt`.
- **Query patterns:**
  - Leaderboard: `query(collection(db, 'segmentResults'), where('segmentId', '==', segmentId), orderBy('timeMs', 'asc'), limit(N))` — requires composite index `segmentId` ASC, `timeMs` ASC.

### `nutrition` (subcollection)
- **Path:** `users/{uid}/nutrition/{date}` (e.g. `YYYY-MM-DD`). Optional goal doc: `users/{uid}/nutrition/_goal`.
- **Fields (per-date doc):** `entries` (array of `{ id, mealName?, protein, carbs, fat, calories? }`), `updatedAt`. Daily totals are derived from entries. Goal doc: `protein`, `carbs`, `fat`, `calories` (optional), `updatedAt`.
- **Query patterns:**
  - By user and date: `getDoc(doc(db, 'users', uid, 'nutrition', date))`.
  - Goal: `getDoc(doc(db, 'users', uid, 'nutrition', '_goal'))`.

## Indexes (`firestore.indexes.json`)

| Collection         | Fields                              | Purpose                          |
|--------------------|-------------------------------------|----------------------------------|
| `activities`       | `userId` ASC, `date` DESC            | User activity list sorted        |
| `activities`       | `visibility` ASC, `createdAt` DESC  | Feed: public activities by time  |
| `feed`             | `followerId` ASC, `createdAt` DESC  | Feed: from people you follow      |
| `users`            | `xp` DESC                           | Leaderboard top 50 by XP         |
| `workoutTemplates` | `userId` ASC, `createdAt` DESC      | User templates sorted            |
| `comments`         | `activityId` ASC, `createdAt` ASC   | Comments by activity             |
| `segmentResults`   | `segmentId` ASC, `timeMs` ASC       | Segment leaderboard              |
| `clubs`            | `memberIds` array-contains          | Clubs I'm in                     |
| `clubs`            | `isPublic` ASC, `createdAt` DESC    | Discover public clubs            |
| `activities`       | `userId` ASC, `createdAt` DESC      | Club feed by member activities   |

## Security (`firestore.rules`)

- **users:** Read by any signed-in user (for feed and profile); create/update only when `request.auth.uid == userId`. Subcollections `oneRepMax`, `nutrition`: owner only.
- **activities:** Read if owner; or if `visibility == 'public'`; or if `visibility == 'followers'` and requester follows author. Write only when `userId == request.auth.uid`.
- **achievements, challenges:** Read/update/delete only when document's `userId == request.auth.uid`; create only when `request.resource.data.userId == request.auth.uid`.
- **follows:** Users can only create/delete where `followerId == request.auth.uid`; read allowed for authenticated.
- **feed:** Read when `followerId == request.auth.uid`; create only when `userId == request.auth.uid` (activity author fan-out).
- **comments, kudos:** Read if requester can read the activity; write authenticated; comment author only for updates/deletes.
- **clubs:** Members can read; only owner can update; join/leave via owner or self for `memberIds`.
- **segments:** Read public or by owner; write only when `createdBy == request.auth.uid`.
- **segmentResults:** Read for leaderboard; write when `userId == request.auth.uid`.
- **workoutTemplates:** Owner only (userId match).
- Catch-all rule denies all other access.
