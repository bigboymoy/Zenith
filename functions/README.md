# Zenith Firebase Functions

Callable function used by the web app for Strava OAuth token exchange (client secret stays server-side).

## Setup

1. Install dependencies: `npm install` (from repo root or from `functions/`).
2. Set Strava credentials for the callable:
   - **Option A:** Firebase params (recommended)
     ```bash
     firebase functions:config:set params.STRAVA_CLIENT_ID="YOUR_ID" params.STRAVA_CLIENT_SECRET="YOUR_SECRET"
     ```
     For 2nd-gen functions, use a `.env` file in `functions/` or set environment in Firebase Console (Functions → your project → Environment variables).
   - **Option B:** In Firebase Console → Project settings → Functions → Environment variables, add `STRAVA_CLIENT_ID` and `STRAVA_CLIENT_SECRET`.
3. In the **Strava API app** (developers.strava.com), set the **Authorization Redirect URI** to your app’s URL (e.g. `https://yourapp.com/` or `https://yourapp.com/profile`).
4. In the app’s `.env`, set `VITE_STRAVA_CLIENT_ID` to the same Strava app **Client ID** (public).

## Deploy

From the repo root:

```bash
firebase deploy --only functions
```

## Local emulator

```bash
cd functions && npm run serve
```

Then in the app, connect the client to the emulator (see Firebase docs for `connectFunctionsEmulator`).
