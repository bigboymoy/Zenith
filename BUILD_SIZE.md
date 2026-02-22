# Build size and bundle budget

## Budget

- **Main (entry) bundle:** &lt; 150 KB gzipped. The app shell (`index-*.js`) is kept small via route-based code splitting and vendor extraction; current entry is ~10–11 KB gzipped. See comment in `vite.config.js`.

## Route chunks (lazy-loaded)

| Chunk | Minified | Gzip |
|-------|----------|------|
| Dashboard | ~8 kB | ~2.6 kB |
| Activities | ~7.6 kB | ~2.8 kB |
| Progress | ~7.7 kB | ~2.3 kB |
| Challenges | ~12 kB | ~3.6 kB |
| Leaderboard | ~6.2 kB | ~2.4 kB |
| Profile | ~11 kB | ~3.4 kB |
| Login | ~2.7 kB | ~1.2 kB |
| Signup | ~3.8 kB | ~1.3 kB |

Other lazy chunks: `AddActivityModal` (shared by several pages), small lib chunks (e.g. date-fns, lucide) used by route chunks.

## Vendor chunks (cached)

- `vendor-react-*.js` – React + ReactDOM
- `vendor-firebase-*.js` – Firebase Auth + Firestore
- `vendor-router-*.js` – react-router-dom
- `vendor-date-fns-*.js` – date-fns (used by app shell and some routes)
- `vendor-*.js` – other node_modules

## Caching and service worker

- **Caching:** Firebase Hosting is configured with cache headers for `/assets/**` (see `firebase.json`). See `PERFORMANCE.md` for details and for service-worker/offline recommendations.
- **Service worker:** The app does not use a service worker; see `PERFORMANCE.md` for whether to add one for offline-first.

## How to re-measure

```bash
npm run build
```

Check `dist/assets/` for `index-*.js` (entry), `vendor-*.js`, and page chunks (`Dashboard-*.js`, etc.). Gzip sizes are shown in the build output.
