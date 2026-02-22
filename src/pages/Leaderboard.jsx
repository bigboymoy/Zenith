import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useApp } from '../App';
import { firestoreUser } from '../lib/firestore';
import { getLevelInfo, calculateStreak } from '../lib/gamification';
import AddActivityModal from '../components/AddActivityModal';
import { COPY } from '../lib/copy';

const SORT_METRICS = [
  { value: 'xp', label: 'Total XP' },
  { value: 'weeklyDistance', label: 'Weekly Distance' },
  { value: 'monthlyVolume', label: 'Monthly Volume' },
  { value: 'streak', label: 'Streak' },
];

function getRankColor(rank) {
  if (rank === 1) return 'gold';
  if (rank === 2) return 'silver';
  if (rank === 3) return 'bronze';
  return '';
}

function getRankEmoji(rank) {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return rank;
}

function formatMetric(metric, value) {
  if (metric === 'xp') return `${value.toLocaleString()} XP`;
  if (metric === 'weeklyDistance') return `${value.toFixed(1)} mi`;
  if (metric === 'monthlyVolume') return `${(value / 1000).toFixed(1)}k lbs`;
  if (metric === 'streak') return `${value}d`;
  return value;
}

export default function Leaderboard() {
  const { user, activities, levelInfo } = useApp();
  const [sortMetric, setSortMetric] = useState('xp');
  const [tab, setTab] = useState('global');
  const [dbUsers, setDbUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function fetchUsers() {
      setLoading(true);
      try {
        const users = await firestoreUser.getAll();
        if (!cancelled) setDbUsers(users);
      } catch (err) {
        console.error('Error fetching leaderboard:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchUsers();
    return () => { cancelled = true; };
  }, []);

  // Build user's entry
  const myEntry = useMemo(() => {
    const streak = calculateStreak(activities);
    const weeklyDist = activities
      .filter(a => {
        const d = new Date(a.date);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return d >= weekAgo && a.distance;
      })
      .reduce((s, a) => s + (a.distance || 0), 0);
    const monthlyVol = activities
      .filter(a => {
        const d = new Date(a.date);
        const monthAgo = new Date();
        monthAgo.setDate(monthAgo.getDate() - 30);
        return d >= monthAgo && a.volume;
      })
      .reduce((s, a) => s + (a.volume || 0), 0);

    return {
      uid: user?.uid || 'me',
      name: user?.name || COPY.leaderboardYou,
      username: user?.username || 'you',
      avatar: null,
      xp: user?.xp || 0,
      level: levelInfo?.level || 1,
      weeklyDistance: Math.round(weeklyDist * 10) / 10,
      monthlyVolume: monthlyVol,
      streak,
      isMe: true,
    };
  }, [user, activities, levelInfo]);

  const allUsers = useMemo(() => {
    const others = dbUsers.filter(u => (u.uid || u.id) !== user?.uid);
    const combined = [...others, myEntry];
    return combined.sort((a, b) => (b[sortMetric] || 0) - (a[sortMetric] || 0));
  }, [sortMetric, myEntry, dbUsers, user]);

  const friendUsers = useMemo(() => {
    return allUsers; // For now, friends = global
  }, [allUsers]);

  const displayUsers = tab === 'global' ? allUsers : friendUsers;
  const myRank = displayUsers.findIndex(u => u.isMe) + 1;
  const isEmptyBoard = !loading && displayUsers.length <= 1;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{COPY.leaderboardTitle}</h1>
          <p className="page-subtitle">
            {loading ? COPY.leaderboardLoading : tab === 'global' ? `${COPY.leaderboardYourRank} #${myRank} ${COPY.leaderboardOf} ${displayUsers.length}` : `${COPY.leaderboardYourRank} #${myRank} ${COPY.leaderboardAmongFriends}`}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="loading-skeleton" aria-busy="true" aria-live="polite">
          <div className="skeleton-block" style={{ height: 48, marginBottom: 16 }} />
          <div className="skeleton-block" style={{ height: 200, marginBottom: 16 }} />
          <div className="skeleton-block" style={{ height: 56 }} />
        </div>
      ) : isEmptyBoard ? (
        <div className="empty-state">
          <span className="empty-icon" aria-hidden="true">🏆</span>
          <h3 className="empty-title">{COPY.leaderboardEmptyTitle}</h3>
          <p className="empty-desc">{COPY.leaderboardEmptyDesc}</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-primary" onClick={() => setShowAdd(true)}>{COPY.dashboardLogWorkout}</button>
            <Link to="/" className="btn btn-secondary">{COPY.leaderboardBackToDashboard}</Link>
          </div>
        </div>
      ) : (
        <>
      <div className="tabs">
        <button className={`tab-btn ${tab === 'global' ? 'active' : ''}`} onClick={() => setTab('global')}>
          {COPY.leaderboardGlobal}
        </button>
        <button className={`tab-btn ${tab === 'friends' ? 'active' : ''}`} onClick={() => setTab('friends')}>
          {COPY.leaderboardFriends}
        </button>
      </div>

      {/* Metric selector */}
      <div className="filter-bar" style={{ marginBottom: 20 }}>
        {SORT_METRICS.map(m => (
          <button
            key={m.value}
            className={`filter-chip ${sortMetric === m.value ? 'active' : ''}`}
            onClick={() => setSortMetric(m.value)}
          >{m.label}</button>
        ))}
      </div>

      {/* Top 3 podium */}
      {displayUsers.length >= 3 && (
        <div style={{
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          gap: 12, marginBottom: 32, padding: '0 20px'
        }}>
          {[displayUsers[1], displayUsers[0], displayUsers[2]].map((u, podiumIdx) => {
            const rank = podiumIdx === 0 ? 2 : podiumIdx === 1 ? 1 : 3;
            const heights = { 1: 120, 2: 90, 3: 70 };
            const colors = { 1: '#888', 2: '#999', 3: '#777' };
            const initials = u.name.split(' ').map(w => w[0]).join('').slice(0, 2);
            const userKey = u.uid || u.id || u.username || u.name;
            return (
              <div key={userKey} style={{ textAlign: 'center', flex: 1, maxWidth: 140 }}>
                <div style={{ fontSize: '1.5rem', marginBottom: 4 }}>
                  {rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'}
                </div>
                {u.isMe ? (
                  <div style={{
                    width: 48, height: 48, borderRadius: '50%', margin: '0 auto 8px',
                    background: 'var(--surface-2)',
                    border: '2px solid var(--border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1rem', fontWeight: 700, color: 'var(--text)',
                  }}>
                    {initials}
                  </div>
                ) : (
                  <Link to={`/profile/${u.uid || u.id}`} style={{ display: 'block', marginBottom: 8 }}>
                    <div style={{
                      width: 48, height: 48, borderRadius: '50%', margin: '0 auto 8px',
                      background: colors[rank],
                      border: `2px solid ${colors[rank]}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '1rem', fontWeight: 700, color: '#fff',
                    }}>
                      {initials}
                    </div>
                  </Link>
                )}
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>
                  {u.isMe ? COPY.leaderboardYou : (
                    <Link to={`/profile/${u.uid || u.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                      {u.name.split(' ')[0]}
                    </Link>
                  )}
                </div>
                <div style={{
                  height: heights[rank], background: `${colors[rank]}22`,
                  border: `1px solid ${colors[rank]}44`,
                  borderRadius: '8px 8px 0 0',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexDirection: 'column', gap: 4,
                }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: colors[rank] }}>
                    #{rank}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-3)', textAlign: 'center', padding: '0 4px' }}>
                    {formatMetric(sortMetric, u[sortMetric] || 0)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Full list */}
      <div className="leaderboard-list">
        {displayUsers.map((u, idx) => {
          const rank = idx + 1;
          const rankChange = 0; // consistent for now
          const initials = u.name.split(' ').map(w => w[0]).join('').slice(0, 2);
          const lvlInfo = getLevelInfo(u.xp || 0);
          const userKey = u.uid || u.id || u.username || u.name;
          const avatarSeed = userKey.length > 1 ? userKey.charCodeAt(1) : userKey.charCodeAt(0);

          return (
            <div key={userKey} className={`leaderboard-row ${u.isMe ? 'is-me' : ''}`}>
              <div className={`rank-num ${getRankColor(rank)}`}>
                {rank <= 3 ? getRankEmoji(rank) : rank}
              </div>

              {/* Rank change */}
              <div className={`rank-change ${rankChange > 0 ? 'up' : rankChange < 0 ? 'down' : 'same'}`}>
                {rankChange > 0 ? <TrendingUp size={12} /> : rankChange < 0 ? <TrendingDown size={12} /> : <Minus size={12} />}
              </div>

              <div className="lb-user">
                {u.isMe ? (
                  <>
                    <div className="avatar" style={{
                      background: 'var(--surface-2)',
                      border: '2px solid var(--border)'
                    }}>
                      {initials}
                    </div>
                    <div>
                      <div className="lb-name">{COPY.leaderboardYou}</div>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <span className="badge badge-level" style={{ fontSize: '0.65rem', padding: '1px 6px' }}>
                          Lv {lvlInfo.level}
                        </span>
                        <span className="lb-username">@{u.username}</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <Link
                    to={`/profile/${u.uid || u.id}`}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none', color: 'inherit', flex: 1
                    }}
                  >
                    <div className="avatar" style={{
                      background: `hsl(${(avatarSeed || 0) * 37 % 360}, 60%, 45%)`
                    }}>
                      {initials}
                    </div>
                    <div>
                      <div className="lb-name">{u.name}</div>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <span className="badge badge-level" style={{ fontSize: '0.65rem', padding: '1px 6px' }}>
                          Lv {lvlInfo.level}
                        </span>
                        <span className="lb-username">@{u.username}</span>
                      </div>
                    </div>
                  </Link>
                )}
              </div>

              <div style={{ textAlign: 'right' }}>
                <div className="lb-value">{formatMetric(sortMetric, u[sortMetric] || 0)}</div>
                <div className="lb-unit">{SORT_METRICS.find(m => m.value === sortMetric)?.label}</div>
              </div>
            </div>
          );
        })}
      </div>
        </>
      )}
      {showAdd && <AddActivityModal onClose={() => setShowAdd(false)} />}
    </div>
  );
}
