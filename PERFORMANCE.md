# Performance notes

## First paint and charts

- **Progress charts:** The Performance chart on the Progress page is rendered only after the component has mounted (`useEffect` sets `mounted` to true). Chart.js and the chart canvas are not used until then, so first paint is not blocked. A small “Loading chart…” placeholder is shown until the chart is ready.
- **Lists:**
  - **Activities:** The activities list is paginated (page size 15) with a “Load more” button. Only the current page is rendered in the DOM, so long lists do not block or overload the initial render.
  - **Leaderboard:** The leaderboard fetches a capped set of users: `firestoreUser.getAll()` uses a Firestore `limit(50)`. No client-side pagination; the list is limited to 50 entries. See `src/lib/firestore.js`.

## AuthContext re-renders

- `AuthContext` exposes a memoized value (`useMemo`) so the context reference only changes when `currentUser`, `userData`, or the auth callbacks change. The callbacks (`signup`, `login`, `logout`) are wrapped in `useCallback` so they are stable. Only components that actually depend on auth state re-render when that state changes.

## Caching (Firebase Hosting)

- **Cache headers:** In `firebase.json`, the `/assets/**` path (Vite’s hashed JS/CSS) is served with `Cache-Control: public, max-age=31536000, immutable` so browsers can cache build artifacts. `index.html` is not under `/assets/`, so it still gets the default behaviour and users receive app updates when you deploy.

## Service worker / offline

- The app does **not** currently register a service worker. Auth and Firestore are used directly; there is no offline-first layer.
- **Recommendation:** For an offline-first experience (e.g. view cached data when offline, queue writes), add a service worker (e.g. Workbox) that:
  - Caches static assets (e.g. from `/assets/`) and optionally `index.html` with a network-first or stale-while-revalidate strategy.
  - Does **not** cache Auth or Firestore API endpoints in a way that could serve stale tokens or break re-authentication; keep auth and Firestore traffic network-first or use Firebase’s own offline persistence (Firestore offline persistence is enabled by default in the SDK).
- Until a service worker is introduced, the app is online-only after load; the existing `OfflineIndicator` can still be used to inform the user when the network is unavailable.
