import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Trophy, Clock } from 'lucide-react';
import { firestoreSegments, firestoreSegmentResults, firestoreUser } from '../lib/firestore';
import { SPORTS } from '../lib/constants';
import { COPY } from '../lib/copy';

function formatTimeMs(ms) {
  if (ms == null) return '—';
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  if (min >= 60) {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  }
  return `${min}:${String(sec).padStart(2, '0')}`;
}

export default function SegmentDetail() {
  const { segmentId } = useParams();
  const [segment, setSegment] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [userNames, setUserNames] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!segmentId) return;
      setLoading(true);
      try {
        const seg = await firestoreSegments.get(segmentId);
        if (cancelled) return;
        setSegment(seg);
        if (!seg) {
          setLeaderboard([]);
          setLoading(false);
          return;
        }
        const best = await firestoreSegmentResults.getLeaderboardBestPerUser(segmentId, 50);
        if (cancelled) return;
        setLeaderboard(best);
        const uids = [...new Set(best.map((r) => r.userId))];
        const names = {};
        await Promise.all(
          uids.map(async (uid) => {
            const u = await firestoreUser.get(uid);
            if (u?.name) names[uid] = u.name;
          })
        );
        if (!cancelled) setUserNames(names);
      } catch (err) {
        console.error('Load segment failed:', err);
        if (!cancelled) {
          setSegment(null);
          setLeaderboard([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [segmentId]);

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-2)' }}>
        {COPY.loading}
      </div>
    );
  }

  if (!segment) {
    return (
      <div className="empty-state">
        <h3 className="empty-title">Segment not found</h3>
        <Link to="/segments" className="btn btn-primary">
          <ArrowLeft size={16} /> {COPY.segmentsBackToSegments}
        </Link>
      </div>
    );
  }

  const sport = SPORTS[segment.sport];

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Link
          to="/segments"
          className="btn btn-ghost"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          <ArrowLeft size={16} /> {COPY.segmentsBackToSegments}
        </Link>
      </div>

      <div className="page-header" style={{ marginBottom: 24 }}>
        <div>
          <h1 className="page-title">{segment.name}</h1>
          <p className="page-subtitle">
            <span className={`badge badge-${segment.sport}`}>{sport?.label ?? segment.sport}</span>
            {segment.polyline?.length > 0 && (
              <span style={{ marginLeft: 8, color: 'var(--text-2)' }}>
                {segment.polyline.length} points
              </span>
            )}
          </p>
        </div>
      </div>

      <section aria-labelledby="segment-leaderboard-heading">
        <h2 id="segment-leaderboard-heading" className="page-title" style={{ fontSize: '1.1rem', marginBottom: 12 }}>
          <Trophy size={18} style={{ verticalAlign: 'middle', marginRight: 6 }} />
          {COPY.segmentsBestTimes}
        </h2>
        {leaderboard.length === 0 ? (
          <p style={{ color: 'var(--text-2)', padding: 16 }}>No times yet. Run or ride this segment to appear here.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {leaderboard.map((row, idx) => (
              <li
                key={row.userId + (row.activityId || '')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 12px',
                  borderBottom: '1px solid var(--border)',
                  background: idx < 3 ? 'var(--surface-2)' : 'transparent',
                }}
              >
                <span style={{ fontWeight: 600, minWidth: 28 }}>#{idx + 1}</span>
                <span style={{ flex: 1 }}>{userNames[row.userId] || 'Unknown'}</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Clock size={14} /> {formatTimeMs(row.timeMs)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
