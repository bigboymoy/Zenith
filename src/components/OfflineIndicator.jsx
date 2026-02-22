import React, { useState, useEffect } from 'react';
import { COPY } from '../lib/copy';

/**
 * Small, non-intrusive banner when the app is offline (navigator.onLine === false).
 */
export default function OfflineIndicator() {
  const [online, setOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (online) return null;

  return (
    <div
      className="offline-indicator"
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        padding: '8px 16px',
        background: 'var(--warning, #888)',
        color: 'var(--text-inv, #0a0e27)',
        fontSize: '0.875rem',
        fontWeight: 600,
        textAlign: 'center',
        boxShadow: 'var(--shadow-sm, 0 1px 3px rgba(0,0,0,0.12))',
      }}
    >
      {COPY.offlineMessage}
    </div>
  );
}
