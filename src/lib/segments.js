/**
 * Segment creation and matching (Strava-like).
 * - Create segment from activity track (by distance or indices).
 * - Match activity track to segments and compute time for overlapping portion.
 */

const EARTH_RADIUS_KM = 6371;

/** Haversine distance in km between two { lat, lng } points. */
export function haversineKm(a, b) {
  const toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lng - a.lng);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(x));
}

/** Cumulative distances (km) along track; first element 0. */
export function cumulativeDistancesKm(track) {
  if (!track?.length) return [];
  const out = [0];
  for (let i = 1; i < track.length; i++) {
    out.push(out[i - 1] + haversineKm(track[i - 1], track[i]));
  }
  return out;
}

/** Find start and end indices for a track given start/end distance in km. */
export function indicesForDistanceRange(track, startKm, endKm) {
  const cum = cumulativeDistancesKm(track);
  if (cum.length === 0) return { startIndex: 0, endIndex: 0 };
  const totalKm = cum[cum.length - 1];
  const startIndex = cum.findIndex((d) => d >= startKm);
  const endIndex = cum.findIndex((d) => d >= endKm);
  return {
    startIndex: startIndex === -1 ? 0 : Math.min(startIndex, track.length - 1),
    endIndex: endIndex === -1 ? track.length - 1 : Math.min(endIndex, track.length - 1),
    totalKm,
  };
}

/**
 * Create segment data from an activity track.
 * @param {Object} opts - { track, sport, name, startKm, endKm, createdBy }
 *   Or { track, sport, name, startIndex, endIndex, createdBy }
 * @returns {Object} segment: { id, name, sport, polyline, startLatLng, endLatLng, createdBy, createdAt }
 */
export function createSegmentFromTrack(opts) {
  const { track, sport, name, createdBy } = opts;
  if (!track?.length || !name?.trim() || !createdBy) return null;

  let startIndex = opts.startIndex;
  let endIndex = opts.endIndex;
  if (startIndex == null || endIndex == null) {
    const startKm = Math.max(0, Number(opts.startKm) || 0);
    const endKm = Math.max(startKm, Number(opts.endKm) || startKm + 0.1);
    const range = indicesForDistanceRange(track, startKm, endKm);
    startIndex = range.startIndex;
    endIndex = range.endIndex;
  }
  startIndex = Math.max(0, Math.min(startIndex, track.length - 1));
  endIndex = Math.max(startIndex, Math.min(endIndex, track.length - 1));

  const polyline = track.slice(startIndex, endIndex + 1);
  if (polyline.length < 2) return null;

  return {
    id: `seg_${Date.now()}`,
    name: name.trim(),
    sport: sport || 'run',
    polyline,
    startLatLng: polyline[0],
    endLatLng: polyline[polyline.length - 1],
    createdBy,
    createdAt: Date.now(),
  };
}

/**
 * Bounding box of a polyline: { minLat, maxLat, minLng, maxLng }.
 */
function bbox(points) {
  if (!points?.length) return null;
  let minLat = points[0].lat, maxLat = points[0].lat;
  let minLng = points[0].lng, maxLng = points[0].lng;
  for (let i = 1; i < points.length; i++) {
    minLat = Math.min(minLat, points[i].lat);
    maxLat = Math.max(maxLat, points[i].lat);
    minLng = Math.min(minLng, points[i].lng);
    maxLng = Math.max(maxLng, points[i].lng);
  }
  return { minLat, maxLat, minLng, maxLng };
}

/** Check if two bboxes overlap (with small tolerance in degrees). */
function bboxOverlap(a, b, toleranceDeg = 0.0005) {
  if (!a || !b) return false;
  return !(a.maxLat < b.minLat - toleranceDeg || b.maxLat < a.minLat - toleranceDeg ||
           a.maxLng < b.minLng - toleranceDeg || b.maxLng < a.minLng - toleranceDeg);
}

/**
 * Find best alignment of activity track to segment polyline: start index in activity track.
 * Uses sliding window: find where segment polyline best fits (min mean distance).
 */
function findBestOverlap(activityTrack, segmentPolyline, maxPointDistanceKm = 0.05) {
  const seg = segmentPolyline;
  if (!activityTrack?.length || !seg?.length) return null;
  let bestStart = -1;
  let bestCost = Infinity;
  const windowSize = seg.length;

  for (let i = 0; i <= activityTrack.length - windowSize; i++) {
    let cost = 0;
    for (let j = 0; j < windowSize; j++) {
      const d = haversineKm(activityTrack[i + j], seg[j]);
      if (d > maxPointDistanceKm) { cost = Infinity; break; }
      cost += d;
    }
    if (cost < bestCost) {
      bestCost = cost;
      bestStart = i;
    }
  }
  if (bestStart === -1) return null;
  return { startIndex: bestStart, endIndex: bestStart + windowSize - 1 };
}

/**
 * Compute segment time (ms) for an activity that overlaps the segment.
 * If activity has track timestamps (trackTimestamps[i] for track[i]), use them.
 * Otherwise estimate: durationMs * (segmentDistance / totalDistance).
 */
export function computeSegmentTimeMs(activity, startIndex, endIndex, totalDurationMs) {
  const track = activity.track;
  if (!track?.length || endIndex <= startIndex) return null;

  if (activity.trackTimestamps?.length === track.length) {
    const startTs = activity.trackTimestamps[startIndex];
    const endTs = activity.trackTimestamps[endIndex];
    if (startTs != null && endTs != null) return Math.round(endTs - startTs);
  }

  const cum = cumulativeDistancesKm(track);
  const totalKm = cum[cum.length - 1] || 0.001;
  const segStartKm = cum[startIndex] ?? 0;
  const segEndKm = cum[endIndex] ?? totalKm;
  const segKm = Math.max(0, segEndKm - segStartKm);
  if (totalKm <= 0) return null;
  return Math.round((totalDurationMs * segKm) / totalKm);
}

/**
 * Match one activity to a list of segments. Returns array of { segmentId, timeMs }.
 * Only includes segments of same sport and overlapping bbox.
 */
export function matchActivityToSegments(activity, segments) {
  const results = [];
  const track = activity.track;
  if (!track?.length || !segments?.length) return results;
  const sport = activity.sport;
  const totalDurationMs = activity.duration ? activity.duration * 60 * 1000 : 0;
  if (totalDurationMs <= 0) return results;

  const activityBbox = bbox(track);

  for (const seg of segments) {
    if (seg.sport !== sport) continue;
    const segPoly = seg.polyline || (seg.startLatLng && seg.endLatLng ? [seg.startLatLng, seg.endLatLng] : null);
    if (!segPoly?.length) continue;
    if (!bboxOverlap(activityBbox, bbox(segPoly))) continue;

    const overlap = findBestOverlap(track, segPoly);
    if (!overlap) continue;

    const timeMs = computeSegmentTimeMs(activity, overlap.startIndex, overlap.endIndex, totalDurationMs);
    if (timeMs == null || timeMs <= 0) continue;

    results.push({
      segmentId: seg.id,
      activityId: activity.id,
      userId: activity.userId,
      timeMs,
      createdAt: Date.now(),
    });
  }
  return results;
}
