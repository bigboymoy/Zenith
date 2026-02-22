import React, { useMemo, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useApp } from '../App';
import { useAuth } from '../context/AuthContext';
import { getPersonalRecords, formatPace } from '../lib/gamification';
import { get1RMHistoryForExercise } from '../lib/strength';
import { firestoreOneRepMax } from '../lib/firestore';
import { ACHIEVEMENT_DEFS, LEVELS } from '../lib/constants';
import { format } from 'date-fns';
import AddActivityModal from '../components/AddActivityModal';
import PerformanceChart from '../components/PerformanceChart';
import { COPY } from '../lib/copy';

function XPSection({ user, levelInfo }) {
  const nextLevel = LEVELS.find(l => l.level === (levelInfo?.level || 1) + 1);

  return (
    <div className="card" style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 20 }}>
        <div style={{
          width: 80, height: 80, borderRadius: '50%',
          background: 'var(--surface-3)',
          border: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.75rem', fontWeight: 700, color: 'var(--text)',
        }}>
          {levelInfo?.level || 1}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.5px' }}>
            {levelInfo?.title || 'Rookie'}
          </div>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-2)', marginTop: 2 }}>
            {(user?.xp || 0).toLocaleString()} XP total
          </div>
          {nextLevel && (
            <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: 2 }}>
              {(nextLevel.minXP - (user?.xp || 0)).toLocaleString()} XP to {nextLevel.title}
            </div>
          )}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginBottom: 4 }}>
            {levelInfo?.progress || 0}{COPY.progressToNextLevel}
          </div>
        </div>
      </div>

      {/* XP bar */}
      <div className="xp-bar-container">
        <div className="xp-bar-labels">
          <span style={{ color: 'var(--text-2)', fontWeight: 600 }}>Level {levelInfo?.level}</span>
          <span style={{ color: 'var(--text-3)' }}>
            {levelInfo?.progressXP?.toLocaleString()} / {levelInfo?.rangeXP?.toLocaleString()} XP
          </span>
          <span style={{ color: 'var(--text-2)', fontWeight: 600 }}>Level {(levelInfo?.level || 1) + 1}</span>
        </div>
        <div className="xp-bar-track">
          <div className="xp-bar-fill" style={{ width: `${levelInfo?.progress || 0}%` }} />
        </div>
      </div>

      {/* Level milestones */}
      <div style={{ marginTop: 20 }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>
          {COPY.progressLevelProgression}
        </div>
        <div style={{ display: 'flex', gap: 4, overflowX: 'auto', paddingBottom: 4 }}>
          {LEVELS.map(lvl => (
            <div key={lvl.level} style={{
              flex: '0 0 auto',
              padding: '6px 12px',
              borderRadius: 8,
              background: (user?.xp || 0) >= lvl.minXP ? 'var(--surface-3)' : 'var(--surface-2)',
              border: `1px solid ${(user?.xp || 0) >= lvl.minXP ? 'var(--border-2)' : 'var(--border)'}`,
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: (user?.xp || 0) >= lvl.minXP ? 'var(--text)' : 'var(--text-3)' }}>
                Lv {lvl.level}
              </div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-3)' }}>{lvl.title}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PRSection({ activities }) {
  const records = useMemo(() => getPersonalRecords(activities), [activities]);

  const prItems = [
    { key: 'fastestMile', label: COPY.progressFastestMile, icon: '⚡', format: (v) => `${formatPace(v)} /mi` },
    { key: 'longestRun', label: COPY.progressLongestRun, icon: '🏃', format: (v) => `${v?.toFixed(1)} mi` },
    { key: 'longestRide', label: COPY.progressLongestRide, icon: '🚴', format: (v) => `${v?.toFixed(1)} mi` },
    { key: 'longestSwim', label: COPY.progressLongestSwim, icon: '🏊', format: (v) => `${v?.toLocaleString()} yd` },
    { key: 'heaviestLift', label: COPY.progressHeaviestLift, icon: '🏋️', format: (v) => `${v} lbs` },
  ];

  return (
    <div className="section">
      <div className="section-header">
        <span className="section-title">{COPY.progressPersonalRecords}</span>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>{COPY.progressAllTimeBests}</span>
      </div>
      <div className="pr-grid">
        {prItems.map(item => {
          const record = records[item.key];
          return (
            <div key={item.key} className="pr-card">
              <div className="pr-label">{item.icon} {item.label}</div>
              {record ? (
                <>
                  <div className="pr-value">
                    {item.format(record.value)}
                  </div>
                  <div className="pr-date">
                    {format(new Date(record.date), 'MMM d, yyyy')}
                  </div>
                </>
              ) : (
                <div style={{ color: 'var(--text-3)', fontSize: '0.875rem', marginTop: 8 }}>
                  {COPY.progressNotYetRecorded}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function OneRMSparkline({ history }) {
  if (!history?.length) return null;
  const values = history.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const w = 80;
  const h = 28;

  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1 || 1)) * w;
      const y = h - ((v - min) / range) * (h - 4) - 2;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      style={{ display: 'block', flexShrink: 0 }}
      aria-hidden="true"
    >
      <polyline
        fill="none"
        stroke="var(--lift)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

function StrengthSection({ oneRepMaxList, activities, sectionRef }) {
  const sorted = useMemo(() => {
    return [...(oneRepMaxList || [])].sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
  }, [oneRepMaxList]);

  if (sorted.length === 0) {
    return (
      <div className="section" id="strength" ref={sectionRef}>
        <div className="section-header">
          <span className="section-title">{COPY.progressStrengthTitle}</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>{COPY.progressStrengthSubtitle}</span>
        </div>
        <p style={{ color: 'var(--text-3)', fontSize: '0.875rem', margin: 0 }}>
          {COPY.progress1RMNotYet}
        </p>
      </div>
    );
  }

  return (
    <div className="section" id="strength" ref={sectionRef}>
      <div className="section-header">
        <span className="section-title">{COPY.progressStrengthTitle}</span>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>{COPY.progressStrengthSubtitle}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {sorted.map((row) => {
          const displayName = row.exerciseName || row.exerciseId || '—';
          const history = get1RMHistoryForExercise(displayName, activities);
          return (
            <div
              key={row.exerciseId}
              className="card"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 16,
                padding: '12px 16px',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>
                  {displayName}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>
                  {row.updatedAt ? format(new Date(row.updatedAt), 'MMM d, yyyy') : null}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <OneRMSparkline history={history} />
                <span style={{ fontWeight: 700, color: 'var(--lift)', fontSize: '1.125rem', whiteSpace: 'nowrap' }}>
                  {Math.round(row.value)} lbs
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AchievementsSection({ achievements }) {
  const earned = achievements.filter(a => a.earned);
  const locked = achievements.filter(a => !a.earned);

  return (
    <div className="section">
      <div className="section-header">
        <span className="section-title">{COPY.progressAchievements}</span>
        <span style={{ fontSize: '0.875rem', color: 'var(--text-2)', fontWeight: 600 }}>
          {earned.length}/{achievements.length} {COPY.progressUnlocked}
        </span>
      </div>

      {earned.length > 0 && (
        <>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>
            {COPY.progressEarned}
          </div>
          <div className="badges-grid" style={{ marginBottom: 24 }}>
            {earned.map(a => (
              <div key={a.id} className="badge-card earned" title={a.description}>
                <span className="badge-icon">{a.icon}</span>
                <div className="badge-name">{a.name}</div>
                <div className="badge-desc">{a.description}</div>
                {a.xpReward > 0 && (
                  <div style={{ marginTop: 4, fontSize: '0.65rem', color: 'var(--text-2)', fontWeight: 600 }}>
                    +{a.xpReward} XP
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {locked.length > 0 && (
        <>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>
            {COPY.progressLocked}
          </div>
          <div className="badges-grid">
            {locked.map(a => (
              <div key={a.id} className="badge-card locked" title={a.description}>
                <span className="badge-icon">{a.icon}</span>
                <div className="badge-name">{a.name}</div>
                <div className="badge-desc">{a.description}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function Progress() {
  const { user, activities, achievements, levelInfo } = useApp();
  const { currentUser } = useAuth();
  const location = useLocation();
  const strengthRef = useRef(null);
  const [showAdd, setShowAdd] = React.useState(false);
  const [oneRepMaxList, setOneRepMaxList] = React.useState([]);

  useEffect(() => {
    if (!currentUser?.uid) {
      setOneRepMaxList([]);
      return;
    }
    let cancelled = false;
    firestoreOneRepMax.getAll(currentUser.uid).then((list) => {
      if (!cancelled) setOneRepMaxList(list || []);
    }).catch((err) => {
      if (!cancelled) console.warn('Failed to load 1RM:', err);
    });
    return () => { cancelled = true; };
  }, [currentUser?.uid]);

  useEffect(() => {
    if (location.state?.scrollTo === 'strength' && strengthRef.current) {
      strengthRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [location.state?.scrollTo]);

  // Stats summary
  const stats = useMemo(() => {
    const totalWorkouts = activities.length;
    const totalDist = activities.filter(a => a.distance).reduce((s, a) => s + (a.distance || 0), 0);
    const totalTime = activities.reduce((s, a) => s + (a.duration || 0), 0);
    const totalVol = activities.filter(a => a.volume).reduce((s, a) => s + (a.volume || 0), 0);
    return { totalWorkouts, totalDist, totalTime, totalVol };
  }, [activities]);

  const hasNoActivities = activities.length === 0;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{COPY.progressTitle}</h1>
          <p className="page-subtitle">{COPY.progressSubtitle}</p>
        </div>
      </div>

      {/* Stats summary row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: COPY.progressWorkouts, value: stats.totalWorkouts, icon: '🏋️' },
          { label: COPY.progressMiles, value: stats.totalDist.toFixed(1), icon: '📍' },
          { label: COPY.progressHours, value: (stats.totalTime / 60).toFixed(1), icon: '⏱️' },
          { label: COPY.progressLbsLifted, value: stats.totalVol > 0 ? `${(stats.totalVol / 1000).toFixed(1)}k` : '0', icon: '⚡' },
        ].map(s => (
          <div key={s.label} className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: 4 }}>{s.icon}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.5px' }}>{s.value}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', fontWeight: 500 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {hasNoActivities ? (
        <div className="empty-state" style={{ marginBottom: 24 }}>
          <span className="empty-icon" aria-hidden="true">📈</span>
          <h3 className="empty-title">{COPY.progressEmptyTitle}</h3>
          <p className="empty-desc">
            {COPY.progressEmptyDesc}
          </p>
          <button type="button" className="btn btn-primary" onClick={() => setShowAdd(true)}>{COPY.dashboardLogWorkout}</button>
        </div>
      ) : null}

      {/* Chart renders after mount so it does not block first paint */}
      {!hasNoActivities && <PerformanceChart />}
      <XPSection user={user} levelInfo={levelInfo} />
      <PRSection activities={activities} />
      <StrengthSection oneRepMaxList={oneRepMaxList} activities={activities} sectionRef={strengthRef} />
      <AchievementsSection achievements={achievements} />
      {showAdd && <AddActivityModal onClose={() => setShowAdd(false)} />}
    </div>
  );
}
