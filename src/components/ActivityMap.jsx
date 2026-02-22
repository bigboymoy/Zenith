import React, { useMemo } from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, Polyline, useMap } from 'react-leaflet';
import { normalizeTrack } from '../lib/polyline';
import 'leaflet/dist/leaflet.css';

function FitBounds({ positions }) {
  const map = useMap();
  React.useEffect(() => {
    if (!positions?.length) return;
    const bounds = positions.reduce(
      (acc, [lat, lng]) => acc.extend([lat, lng]),
      L.latLngBounds(positions[0], positions[0])
    );
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [24, 24], maxZoom: 15 });
  }, [map, positions]);
  return null;
}

const OSM_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

export default function ActivityMap({ track, height = 240, className = '' }) {
  const positions = useMemo(() => normalizeTrack(track), [track]);
  const center = useMemo(() => {
    if (!positions.length) return [40, -98];
    const lat = positions.reduce((s, p) => s + p[0], 0) / positions.length;
    const lng = positions.reduce((s, p) => s + p[1], 0) / positions.length;
    return [lat, lng];
  }, [positions]);

  if (!positions.length) {
    return (
      <div
        className={className}
        style={{
          height: typeof height === 'number' ? `${height}px` : height,
          background: 'var(--surface-2)',
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-3)',
          fontSize: '0.875rem',
        }}
        aria-hidden="true"
      >
        No route data
      </div>
    );
  }

  const polylineColor = 'var(--run, #22c55e)';

  return (
    <div className={className} style={{ height: typeof height === 'number' ? `${height}px` : height, borderRadius: 8, overflow: 'hidden' }}>
      <MapContainer
        center={center}
        zoom={12}
        style={{ height: '100%', width: '100%' }}
        zoomControl={true}
        attributionControl={true}
        scrollWheelZoom={true}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution={OSM_ATTR} />
        <FitBounds positions={positions} />
        <Polyline positions={positions} pathOptions={{ color: polylineColor, weight: 4, opacity: 0.9 }} />
      </MapContainer>
    </div>
  );
}
