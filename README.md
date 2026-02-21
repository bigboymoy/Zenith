# Zenith

Zenith is a React + Vite fitness app with Firebase Authentication, Firestore, and Firebase Hosting.

## Local setup

1. Install Node.js 20+.
2. Install dependencies:
   - `npm install`
3. Create local env file:
   - `cp .env.example .env`
4. Fill Firebase values in `.env` (see required vars below).
5. Start the app:
   - `npm run dev`

## Required environment variables

These are required at startup by `src/lib/firebase.js`:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_MEASUREMENT_ID`

## Run, test, and build commands

- `npm run dev` - start local Vite dev server.
- `npm run lint` - run ESLint.
- `npm run test` - run all Vitest tests.
- `npm run test:smoke` - run smoke tests only.
- `npm run build` - create production build in `dist/`.
- `npm run preview` - preview the production build locally.

## Deploy (Firebase Hosting + Firestore config)

1. Ensure Firebase project has Authentication, Firestore, and Hosting enabled.
2. Install Firebase CLI and log in:
   - `npm i -g firebase-tools`
   - `firebase login`
3. Link this repository to the target Firebase project:
   - `firebase use --add`
4. Validate before release:
   - `npm run lint`
   - `npm run build`
   - `npm run test:smoke`
5. Deploy:
   - `firebase deploy --only firestore:rules,firestore:indexes,hosting`

## Rollback and basic troubleshooting

### Rollback

- Fastest rollback path: Firebase Console -> Hosting -> Releases -> rollback to the last healthy release.
- CLI alternative (if configured): `firebase hosting:rollback`.
- If Firestore rules/indexes were part of the issue, redeploy the previous known-good commit.

### Troubleshooting

- Missing env vars at startup:
  - Confirm all `VITE_FIREBASE_*` keys exist in `.env`.
  - Restart the dev server after editing env vars.
- Login fails unexpectedly:
  - Verify Firebase Authentication providers are enabled.
  - Check browser console for `auth/*` error codes.
- Firestore read/write permission errors:
  - Confirm deployed Firestore rules match expected environment.
  - Validate the signed-in user and document ownership fields (for example `userId`).
- Build failures on CI:
  - Run `npm ci && npm run lint && npm run build` locally to reproduce quickly.
