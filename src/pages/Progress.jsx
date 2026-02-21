import React, { useMemo } from 'react';
import { useApp } from '../App';
import { getPersonalRecords, formatPace } from '../lib/gamification';
import { ACHIEVEMENT_DEFS, LEVELS } from '../lib/constants';
import { format } from 'date-fns';

function XPSection({ user, levelInfo }) {
  const nextLevel = LEVELS.find(l => l.level === (levelInfo?.level || 1) + 1);

  return (
    <div className="card" style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 20 }}>
        <div style={{
          width: 80, height: 80, borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--accent), var(--accent-dark))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.75rem', fontWeight: 900, color: 'white',
          boxShadow: '0 0 24px var(--accent-glow)',
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
            {levelInfo?.progress || 0}% to next level
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
          Level Progression
        </div>
        <div style={{ display: 'flex', gap: 4, overflowX: 'auto', paddingBottom: 4 }}>
          {LEVELS.map(lvl => (
            <div key={lvl.level} style={{
              flex: '0 0 auto',
              padding: '6px 12px',
              borderRadius: 8,
              background: (user?.xp || 0) >= lvl.minXP ? 'var(--accent-glow)' : 'var(--surface-2)',
              border: `1px solid ${(user?.xp || 0) >= lvl.minXP ? 'var(--accent)' : 'var(--border)'}`,
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: (user?.xp || 0) >= lvl.minXP ? 'var(--accent-light)' : 'var(--text-3)' }}>
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
    { key: 'fastestMile', label: 'Fastest Mile', icon: '⚡', format: (v) => `${formatPace(v)} /mi` },
    { key: 'longestRun', label: 'Longest Run', icon: '🏃', format: (v) => `${v?.toFixed(1)} mi` },
    { key: 'longestRide', label: 'Longest Ride', icon: '🚴', format: (v) => `${v?.toFixed(1)} mi` },
    { key: 'longestSwim', label: 'Longest Swim', icon: '🏊', format: (v) => `${v?.toLocaleString()} yd` },
    { key: 'heaviestLift', label: 'Heaviest Lift', icon: '🏋️', format: (v) => `${v} lbs` },
  ];

  return (
    <div className="section">
      <div className="section-header">
        <span className="section-title">Personal Records</span>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>All-time bests</span>
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
                  Not yet recorded
                </div>
              )}
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
        <span className="section-title">Achievements</span>
        <span style={{ fontSize: '0.875rem', color: 'var(--text-2)', fontWeight: 600 }}>
          {earned.length}/{achievements.length} unlocked
        </span>
      </div>

      {earned.length > 0 && (
        <>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>
            Earned
          </div>
          <div className="badges-grid" style={{ marginBottom: 24 }}>
            {earned.map(a => (
              <div key={a.id} className="badge-card earned" title={a.description}>
                <span className="badge-icon">{a.icon}</span>
                <div className="badge-name">{a.name}</div>
                <div className="badge-desc">{a.description}</div>
                {a.xpReward > 0 && (
                  <div style={{ marginTop: 4, fontSize: '0.65rem', color: 'var(--accent-light)', fontWeight: 600 }}>
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
            Locked
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

  // Stats summary
  const stats = useMemo(() => {
    const totalWorkouts = activities.length;
    const totalDist = activities.filter(a => a.distance).reduce((s, a) => s + (a.distance || 0), 0);
    const totalTime = activities.reduce((s, a) => s + (a.duration || 0), 0);
    const totalVol = activities.filter(a => a.volume).reduce((s, a) => s + (a.volume || 0), 0);
    return { totalWorkouts, totalDist, totalTime, totalVol };
  }, [activities]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Progress</h1>
          <p className="page-subtitle">Your fitness journey at a glance</p>
        </div>
      </div>

      {/* Stats summary row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Workouts', value: stats.totalWorkouts, icon: '🏋️' },
          { label: 'Miles', value: stats.totalDist.toFixed(1), icon: '📍' },
          { label: 'Hours', value: (stats.totalTime / 60).toFixed(1), icon: '⏱️' },
          { label: 'lbs Lifted', value: stats.totalVol > 0 ? `${(stats.totalVol / 1000).toFixed(1)}k` : '0', icon: '⚡' },
        ].map(s => (
          <div key={s.label} className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: 4 }}>{s.icon}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.5px' }}>{s.value}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', fontWeight: 500 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <XPSection user={user} levelInfo={levelInfo} />
      <PRSection activities={activities} />
      <AchievementsSection achievements={achievements} />
    </div>
  );
}
