# Offline Behavior

This document describes what works offline and what does not in the Zenith workout app.

## What works offline

- **Cached data**: If you have previously loaded the app while online, Firestore’s in-memory cache may still hold recent data. While offline you may see:
  - Your profile and level
  - Previously loaded activities list
  - Achievements and challenges data that was already fetched
- **Auth state**: If you were already logged in, your session is retained (Auth uses local persistence). You can continue to view cached screens.
- **UI**: The app shell, navigation, and theme work offline. The **offline indicator** (banner at the top) appears when `navigator.onLine` is false so you know you’re offline.

## What does not work offline

- **New signup**: Creating an account requires a network connection (Auth + Firestore user document).
- **Login**: Signing in requires Firebase Auth and therefore a connection.
- **Logging or editing workouts**: Adding or updating activities writes to Firestore; these operations fail without a connection. The app shows: *“Could not save; check your connection.”* and does not clear the form so you can retry when back online.
- **Deleting activities**: Deletes are written to Firestore and will fail offline.
- **Leaderboard / live data**: Any data that must be fetched from the server (e.g. leaderboard) will not update offline.
- **Achievement unlocks**: Unlock state is written to Firestore and will not update until online.

## Save-failure behavior

- **Add/Edit activity**: On write failure (e.g. offline or server error), the app shows *“Could not save; check your connection.”* and keeps the form data so you can try again.
- **Signup**: On network or write failure, the app shows *“Could not save; check your connection.”* and does not clear the signup form.

## Summary

| Action              | Offline |
|---------------------|--------|
| View cached data    | Yes    |
| Stay logged in      | Yes    |
| Sign up / Log in    | No     |
| Log / edit workout  | No     |
| Delete workout      | No     |
| See offline banner  | Yes    |
