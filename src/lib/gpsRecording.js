/**
 * GPS recording for runs/rides: permissions, watch position, distance/duration/pace.
 * Uses @capacitor/geolocation on native and navigator.geolocation on web.
 */

import { Capacitor } from '@capacitor/core';

const KM_TO_MI = 0.621371;
const MIN_DISTANCE_M = 10;
const MIN_INTERVAL_MS = 5000;

/** Earth radius in km for Haversine */
const R = 6371;

/**
 * Haversine distance between two points in km.
 * @param {{ lat: number, lng: number }} a
 * @param {{ lat: number, lng: number }} b
 * @returns {number} distance in km
 */
export function haversineKm(a, b) {
  const toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

/**
 * Check if geolocation is available (browser or Capacitor).
 */
export function isAvailable() {
  if (typeof navigator === 'undefined') return false;
  if (Capacitor.isNativePlatform()) return true;
  return Boolean(navigator?.geolocation);
}

/**
 * Request location permissions. On native uses Capacitor; on web permissions
 * are requested when we start watching. Resolves to true if granted/ok.
 * @returns {Promise<{ granted: boolean, message?: string }>}
 */
export async function requestPermissions() {
  if (!isAvailable()) {
    return { granted: false, message: 'Location is not available on this device.' };
  }
  if (Capacitor.isNativePlatform()) {
    try {
      const { Geolocation } = await import('@capacitor/geolocation');
      const status = await Geolocation.requestPermissions();
      const granted = status?.location === 'granted';
      return {
        granted,
        message: granted ? undefined : 'Location permission was denied.',
      };
    } catch (err) {
      const msg = err?.message || String(err);
      if (/denied|permission|OS-PLUG-GLOC-0003/i.test(msg))
        return { granted: false, message: 'Location permission was denied.' };
      if (/not enabled|OS-PLUG-GLOC-0007|services/i.test(msg))
        return { granted: false, message: 'Location services are turned off.' };
      return { granted: false, message: msg || 'Could not get location permission.' };
    }
  }
  return { granted: true };
}

/**
 * Normalize position to { lat, lng, timestamp }.
 * @param {import('@capacitor/geolocation').Position | GeolocationPosition} p
 */
function toPoint(p) {
  if (!p?.coords) return null;
  const c = p.coords;
  return {
    lat: c.latitude,
    lng: c.longitude,
    timestamp: p.timestamp ?? Date.now(),
  };
}

/**
 * Start watching position; call onPoint for each new point (throttled: min interval and/or min distance).
 * @param {{ onPoint: (p: { lat: number, lng: number, timestamp: number }) => void, onError?: (err: Error & { code?: number }) => void }} opts
 * @returns {Promise<() => void>} stop function
 */
export async function startWatching({ onPoint, onError }) {
  const points = [];
  let lastTime = 0;
  let lastLat = null;
  let lastLng = null;
  const pushIfNeeded = (p) => {
    if (!p) return;
    const now = p.timestamp;
    const dist =
      lastLat != null && lastLng != null
        ? haversineKm({ lat: lastLat, lng: lastLng }, { lat: p.lat, lng: p.lng }) * 1000
        : Infinity;
    const elapsed = now - lastTime;
    if (points.length === 0 || elapsed >= MIN_INTERVAL_MS || dist >= MIN_DISTANCE_M) {
      points.push(p);
      lastTime = now;
      lastLat = p.lat;
      lastLng = p.lng;
      onPoint({ lat: p.lat, lng: p.lng, timestamp: p.timestamp });
    }
  };

  const handleError = (err) => {
    const code = err?.code ?? err?.message;
    const msg =
      code === 1 || /denied|permission/i.test(String(code))
        ? 'Location permission was denied.'
        : code === 2 || /unavailable|position/i.test(String(code))
          ? 'Location is unavailable. Check that location is on and try again.'
          : err?.message || 'Could not get location.';
    onError?.(Object.assign(new Error(msg), { code }));
  };

  if (Capacitor.isNativePlatform()) {
    const { Geolocation } = await import('@capacitor/geolocation');
    const id = await Geolocation.watchPosition(
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 5000,
      },
      (position, err) => {
        if (err) {
          handleError(err);
          return;
        }
        pushIfNeeded(toPoint(position));
      }
    );
    return () => {
      Geolocation.clearWatch({ id }).catch(() => {});
    };
  }

  if (!navigator?.geolocation) {
    onError?.(Object.assign(new Error('Geolocation is not supported.'), { code: 2 }));
    return () => {};
  }

  const watchId = navigator.geolocation.watchPosition(
    (position) => pushIfNeeded(toPoint(position)),
    handleError,
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
  );
  return () => navigator.geolocation.clearWatch(watchId);
}

/**
 * Compute distance (km), duration (ms), and pace (min/mi) from track points.
 * @param {{ lat: number, lng: number, timestamp?: number }[]} points
 * @returns {{ distanceKm: number, durationMs: number, paceMinPerMile: number | null }}
 */
export function computeStats(points) {
  if (!points?.length) {
    return { distanceKm: 0, durationMs: 0, paceMinPerMile: null };
  }
  let distanceKm = 0;
  for (let i = 1; i < points.length; i++) {
    distanceKm += haversineKm(points[i - 1], points[i]);
  }
  const first = points[0];
  const last = points[points.length - 1];
  const durationMs =
    first?.timestamp && last?.timestamp
      ? Math.max(0, last.timestamp - first.timestamp)
      : 0;
  const distanceMi = distanceKm * KM_TO_MI;
  const paceMinPerMile =
    distanceMi > 0 && durationMs > 0
      ? (durationMs / 60000) / distanceMi
      : null;
  return { distanceKm, durationMs, paceMinPerMile };
}

/** Max track points to store (Firestore doc size; ~2000 points is safe). */
export const MAX_TRACK_POINTS = 2000;

/**
 * Truncate track to max points by sampling evenly.
 * @param {{ lat: number, lng: number }[]} points
 * @param {number} max
 * @returns {{ lat: number, lng: number }[]}
 */
export function truncateTrack(points, max = MAX_TRACK_POINTS) {
  if (!points?.length || points.length <= max) return points || [];
  const step = (points.length - 1) / (max - 1);
  const out = [];
  for (let i = 0; i < max; i++) {
    const idx = i === max - 1 ? points.length - 1 : Math.round(i * step);
    const p = points[idx];
    if (p) out.push({ lat: p.lat, lng: p.lng });
  }
  return out;
}
