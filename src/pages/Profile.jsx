import React, { useState, useMemo } from 'react';
import { Edit2, MapPin, Clock, Zap, Flame, Calendar, Settings } from 'lucide-react';
import { useApp } from '../App';
import { useAuth } from '../context/AuthContext';
import { firestoreUser } from '../lib/firestore';
import { settingsStorage } from '../lib/storage';
import { calculateStreak, formatDuration, getLevelInfo } from '../lib/gamification';
import { SPORTS } from '../lib/constants';
import { format } from 'date-fns';

function EditProfileModal({ user, onClose, onSave }) {
  const [name, setName] = useState(user?.name || '');
  const [username, setUsername] = useState(user?.username || '');
  const [primarySport, setPrimarySport] = useState(user?.primarySport || 'run');
  const { toast } = useApp();

  const handleSave = async () => {
    if (!name.trim()) { toast('Name is required', 'error', '❌'); return; }
    try {
      await firestoreUser.update(user.uid, { 
        name: name.trim(), 
        username: username.trim(), 
        primarySport 
      });
      toast('Profile updated! ✨', 'success', '✅');
      onSave(); // Refresh via context listener
      onClose();
    } catch (err) {
      console.error('Error updating profile:', err);
      toast('Failed to update profile', 'error', '❌');
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">Edit Profile</h2>
          <button className="modal-close" onClick={onClose}><Edit2 size={18} /></button>
        </div>
        <div className="form-group">
          <label className="form-label">Display Name</label>
          <input className="form-input" value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Username</label>
          <input className="form-input" value={username} onChange={e => setUsername(e.target.value)} placeholder="@username" />
        </div>
        <div className="form-group">
          <label className="form-label">Primary Sport</label>
          <select className="form-select" value={primarySport} onChange={e => setPrimarySport(e.target.value)}>
            {Object.entries(SPORTS).map(([k, s]) => (
              <option key={k} value={k}>{s.icon} {s.label}</option>
            ))}
          </select>
        </div>
        <div className="form-actions">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave}>Save Changes</button>
        </div>
      </div>
    </div>
  );
}

function SettingsPanel({ settings, onUpdate }) {
  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Settings</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {[
          {
            label: 'Units', key: 'units',
            options: [{ value: 'imperial', label: 'Imperial (mi, lbs)' }, { value: 'metric', label: 'Metric (km, kg)' }]
          },
          {
            label: 'Privacy', key: 'privacy',
            options: [{ value: 'public', label: 'Public' }, { value: 'friends', label: 'Friends Only' }, { value: 'private', label: 'Private' }]
          },
        ].map(s => (
          <div key={s.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-2)', fontWeight: 500 }}>{s.label}</span>
            <select
              className="form-select"
              style={{ width: 'auto', padding: '6px 12px' }}
              value={settings[s.key] || s.options[0].value}
              onChange={e => onUpdate({ [s.key]: e.target.value })}
            >
              {s.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '0.875rem', color: 'var(--text-2)', fontWeight: 500 }}>Notifications</span>
          <button
            onClick={() => onUpdate({ notifications: !settings.notifications })}
            style={{
              width: 44, height: 24, borderRadius: 12,
              background: settings.notifications ? 'var(--accent)' : 'var(--surface-3)',
              border: 'none', cursor: 'pointer', position: 'relative',
              transition: 'background 0.2s',
            }}
          >
            <div style={{
              width: 18, height: 18, borderRadius: '50%', background: 'white',
              position: 'absolute', top: 3,
              left: settings.notifications ? 23 : 3,
              transition: 'left 0.2s',
            }} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Profile() {
  const { logout } = useAuth();
  const { user, activities, achievements, settings, refreshUser } = useApp();
  const [showEdit, setShowEdit] = useState(false);
  const [localSettings, setLocalSettings] = useState(settings || {});
  const [tab, setTab] = useState('stats');

  const stats = useMemo(() => {
    const streak = calculateStreak(activities);
    const totalDist = activities.filter(a => a.distance).reduce((s, a) => s + (a.distance || 0), 0);
    const totalTime = activities.reduce((s, a) => s + (a.duration || 0), 0);
    const totalVol = activities.filter(a => a.volume).reduce((s, a) => s + (a.volume || 0), 0);
    const totalXP = user?.xp || 0;
    return { streak, totalDist, totalTime, totalVol, totalXP, totalWorkouts: activities.length };
  }, [activities, user]);

  const levelInfo = getLevelInfo(user?.xp || 0);
  const earnedBadges = achievements.filter(a => a.earned);
  const initials = user?.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'U';
  const sport = SPORTS[user?.primarySport || 'run'];

  const handleSettingsUpdate = (patch) => {
    const updated = settingsStorage.update(patch);
    setLocalSettings(updated);
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Profile</h1>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn-secondary" onClick={() => setShowEdit(true)}>
            <Edit2 size={16} /> Edit Profile
          </button>
          <button className="btn btn-danger" onClick={logout}>
            Log Out
          </button>
        </div>
      </div>

      {/* Profile header */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 20 }}>
          <div className="avatar xl">{initials}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.5px' }}>
              {user?.name || 'Athlete'}
            </div>
            <div style={{ color: 'var(--text-3)', fontSize: '0.875rem', marginBottom: 6 }}>
              @{user?.username || 'you'} · {sport?.icon} {sport?.label}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <span className="badge badge-level">Level {levelInfo.level} · {levelInfo.title}</span>
              <span className="badge" style={{ background: 'rgba(245,158,11,0.15)', color: 'var(--warning)' }}>
                🔥 {stats.streak}d streak
              </span>
              {user?.joinedAt && (
                <span className="badge" style={{ background: 'var(--surface-2)', color: 'var(--text-3)' }}>
                  <Calendar size={10} /> Joined {format(new Date(user.joinedAt), 'MMM yyyy')}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* XP bar */}
        <div className="xp-bar-container">
          <div className="xp-bar-labels">
            <span style={{ color: 'var(--text-2)', fontWeight: 600, fontSize: '0.8rem' }}>
              {(user?.xp || 0).toLocaleString()} XP
            </span>
            <span style={{ color: 'var(--text-3)', fontSize: '0.75rem' }}>
              {levelInfo.progress}% to Level {levelInfo.level + 1}
            </span>
          </div>
          <div className="xp-bar-track">
            <div className="xp-bar-fill" style={{ width: `${levelInfo.progress}%` }} />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button className={`tab-btn ${tab === 'stats' ? 'active' : ''}`} onClick={() => setTab('stats')}>Stats</button>
        <button className={`tab-btn ${tab === 'badges' ? 'active' : ''}`} onClick={() => setTab('badges')}>
          Badges ({earnedBadges.length})
        </button>
        <button className={`tab-btn ${tab === 'history' ? 'active' : ''}`} onClick={() => setTab('history')}>History</button>
        <button className={`tab-btn ${tab === 'settings' ? 'active' : ''}`} onClick={() => setTab('settings')}>
          <Settings size={14} /> Settings
        </button>
      </div>

      {/* Stats tab */}
      {tab === 'stats' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {[
            { icon: '🏋️', label: 'Total Workouts', value: stats.totalWorkouts },
            { icon: '📍', label: 'Total Distance', value: `${stats.totalDist.toFixed(1)} mi` },
            { icon: '⏱️', label: 'Total Time', value: formatDuration(stats.totalTime) },
            { icon: '⚡', label: 'Total XP', value: stats.totalXP.toLocaleString() },
            { icon: '🔥', label: 'Current Streak', value: `${stats.streak}d` },
            { icon: '💪', label: 'Volume Lifted', value: stats.totalVol > 0 ? `${(stats.totalVol / 1000).toFixed(1)}k lbs` : '—' },
          ].map(s => (
            <div key={s.label} className="card" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.75rem', marginBottom: 4 }}>{s.icon}</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.5px' }}>{s.value}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-3)', fontWeight: 500, marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Badges tab */}
      {tab === 'badges' && (
        earnedBadges.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">🏅</span>
            <div className="empty-title">No badges yet</div>
            <div className="empty-desc">Log workouts to start earning achievements!</div>
          </div>
        ) : (
          <div className="badges-grid">
            {earnedBadges.map(a => (
              <div key={a.id} className="badge-card earned">
                <span className="badge-icon">{a.icon}</span>
                <div className="badge-name">{a.name}</div>
                <div className="badge-desc">{a.description}</div>
                {a.earnedDate && (
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-3)', marginTop: 4 }}>
                    {format(new Date(a.earnedDate), 'MMM d, yyyy')}
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      )}

      {/* History tab */}
      {tab === 'history' && (
        activities.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">📋</span>
            <div className="empty-title">No workouts logged yet</div>
          </div>
        ) : (
          <div className="activity-list">
            {activities.slice(0, 20).map(a => {
              const s = SPORTS[a.sport];
              const colors = {
                run: { bg: 'rgba(34,197,94,0.12)', color: 'var(--run)' },
                cycle: { bg: 'rgba(59,130,246,0.12)', color: 'var(--cycle)' },
                swim: { bg: 'rgba(6,182,212,0.12)', color: 'var(--swim)' },
                lift: { bg: 'rgba(245,158,11,0.12)', color: 'var(--lift)' },
              }[a.sport] || {};
              return (
                <div key={a.id} className="activity-card" style={{ cursor: 'default' }}>
                  <div className="activity-sport-icon" style={{ background: colors.bg, color: colors.color }}>
                    {s?.icon}
                  </div>
                  <div className="activity-info">
                    <div className="activity-title">{a.title}</div>
                    <div className="activity-meta">
                      {a.distance && <span className="activity-stat"><MapPin size={12} /> {a.distance.toFixed(1)} {s?.unit}</span>}
                      {a.volume && <span className="activity-stat"><Zap size={12} /> {a.volume.toLocaleString()} lbs</span>}
                      <span className="activity-stat"><Clock size={12} /> {formatDuration(a.duration)}</span>
                    </div>
                  </div>
                  <div className="activity-right">
                    <span className="badge badge-xp">+{a.xpEarned} XP</span>
                    <span className="activity-date">
                      {new Date(a.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* Settings tab */}
      {tab === 'settings' && (
        <SettingsPanel settings={localSettings} onUpdate={handleSettingsUpdate} />
      )}

      {showEdit && (
        <EditProfileModal
          user={user}
          onClose={() => setShowEdit(false)}
          onSave={refreshUser}
        />
      )}
    </div>
  );
}
