import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Trophy } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { firestoreSegments } from '../lib/firestore';
import { SPORTS } from '../lib/constants';
import { COPY } from '../lib/copy';

export default function Segments() {
  const { currentUser } = useAuth();
  const uid = currentUser?.uid;
  const [tab, setTab] = useState('all');
  const [segments, setSegments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const list = tab === 'mine' && uid
          ? await firestoreSegments.getByCreator(uid)
          : await firestoreSegments.getAll();
        if (!cancelled) setSegments(list);
      } catch (err) {
        console.error('Load segments failed:', err);
        if (!cancelled) setSegments([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [tab, uid]);

  const sportColors = {
    run: { bg: 'rgba(34,197,94,0.12)', color: 'var(--run)' },
    cycle: { bg: 'rgba(59,130,246,0.12)', color: 'var(--cycle)' },
    swim: { bg: 'rgba(6,182,212,0.12)', color: 'var(--swim)' },
    lift: { bg: 'rgba(245,158,11,0.12)', color: 'var(--lift)' },
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{COPY.segmentsTitle}</h1>
          <p className="page-subtitle">{COPY.segmentsSubtitle}</p>
        </div>
      </div>

      <div className="filter-bar" style={{ marginBottom: 16 }}>
        <button
          type="button"
          className={`filter-chip ${tab === 'all' ? 'active' : ''}`}
          onClick={() => setTab('all')}
          aria-pressed={tab === 'all'}
        >
          {COPY.segmentsAllSegments}
        </button>
        {uid && (
          <button
            type="button"
            className={`filter-chip ${tab === 'mine' ? 'active' : ''}`}
            onClick={() => setTab('mine')}
            aria-pressed={tab === 'mine'}
          >
            {COPY.segmentsMySegments}
          </button>
        )}
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-2)', textAlign: 'center', padding: 24 }}>{COPY.loading}</p>
      ) : segments.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon" aria-hidden="true">🏁</span>
          <h3 className="empty-title">{COPY.segmentsEmptyTitle}</h3>
          <p className="empty-desc">{COPY.segmentsEmptyDesc}</p>
          <p className="empty-desc" style={{ marginTop: 8 }}>
            From Activities, open a GPS activity and use “{COPY.segmentsCreateSegment}” to define a segment.
          </p>
        </div>
      ) : (
        <div className="activity-list">
          {segments.map((seg) => {
            const sport = SPORTS[seg.sport];
            const colors = sportColors[seg.sport] || sportColors.run;
            return (
              <Link
                key={seg.id}
                to={`/segments/${seg.id}`}
                className="activity-card"
                style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
              >
                <div className="activity-sport-icon" style={{ background: colors.bg, color: colors.color }}>
                  {sport?.icon ?? '📍'}
                </div>
                <div className="activity-info" style={{ flex: 1 }}>
                  <div className="activity-title">{seg.name}</div>
                  <div className="activity-meta">
                    <span className={`badge badge-${seg.sport}`}>{sport?.label ?? seg.sport}</span>
                    <span className="activity-stat">
                      <MapPin size={12} /> {seg.polyline?.length ?? 0} points
                    </span>
                  </div>
                </div>
                <div className="activity-right">
                  <span className="activity-stat">
                    <Trophy size={14} /> {COPY.segmentsLeaderboard}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
