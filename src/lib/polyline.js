/**
 * Decode Google-style encoded polyline to array of [lat, lng].
 * @param {string} encoded
 * @returns {Array<[number, number]>}
 */
export function decodePolyline(encoded) {
  if (!encoded || typeof encoded !== 'string') return [];
  const points = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let b;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = (result & 1) ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = (result & 1) ? ~(result >> 1) : result >> 1;
    lng += dlng;

    points.push([lat / 1e5, lng / 1e5]);
  }
  return points;
}

/**
 * Normalize activity track to array of [lat, lng].
 * Accepts: array of { lat, lng } or [lat, lng], or encoded polyline string.
 * @param {Array<{lat: number, lng: number}>|Array<[number, number]>|string} track
 * @returns {Array<[number, number]>}
 */
export function normalizeTrack(track) {
  if (!track) return [];
  if (Array.isArray(track)) {
    if (track.length === 0) return [];
    const first = track[0];
    if (typeof first === 'number' && track.length >= 2) return [track];
    return track.map((p) => {
      if (Array.isArray(p)) return [Number(p[0]), Number(p[1])];
      if (p && typeof p.lat === 'number' && typeof p.lng === 'number') return [p.lat, p.lng];
      return null;
    }).filter(Boolean);
  }
  if (typeof track === 'string') return decodePolyline(track);
  return [];
}
