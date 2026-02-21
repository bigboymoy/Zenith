import React, { useState, useMemo, useEffect } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useApp } from '../App';
import { firestoreUser } from '../lib/firestore';
import { getLevelInfo, calculateStreak } from '../lib/gamification';

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

  useEffect(() => {
    async function fetchUsers() {
      try {
        const users = await firestoreUser.getAll();
        setDbUsers(users);
      } catch (err) {
        console.error('Error fetching leaderboard:', err);
      }
    }
    fetchUsers();
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
      name: user?.name || 'You',
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

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Leaderboard</h1>
          <p className="page-subtitle">
            {tab === 'global' ? `Your rank: #${myRank} of ${displayUsers.length}` : `Your rank: #${myRank} among friends`}
          </p>
        </div>
      </div>

      <div className="tabs">
        <button className={`tab-btn ${tab === 'global' ? 'active' : ''}`} onClick={() => setTab('global')}>
          Global
        </button>
        <button className={`tab-btn ${tab === 'friends' ? 'active' : ''}`} onClick={() => setTab('friends')}>
          Friends
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
            const colors = { 1: '#f59e0b', 2: '#94a3b8', 3: '#cd7c3a' };
            const initials = u.name.split(' ').map(w => w[0]).join('').slice(0, 2);
            const userKey = u.uid || u.id || u.username || u.name;
            return (
              <div key={userKey} style={{ textAlign: 'center', flex: 1, maxWidth: 140 }}>
                <div style={{ fontSize: '1.5rem', marginBottom: 4 }}>
                  {rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'}
                </div>
                <div style={{
                  width: 48, height: 48, borderRadius: '50%', margin: '0 auto 8px',
                  background: u.isMe
                    ? 'linear-gradient(135deg, var(--accent), var(--accent-dark))'
                    : `linear-gradient(135deg, ${colors[rank]}88, ${colors[rank]}44)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1rem', fontWeight: 700, color: 'white',
                  border: `2px solid ${colors[rank]}`,
                }}>
                  {initials}
                </div>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>
                  {u.isMe ? 'You' : u.name.split(' ')[0]}
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
                <div className="avatar" style={{
                  background: u.isMe
                    ? 'linear-gradient(135deg, var(--accent), var(--accent-dark))'
                    : `hsl(${(avatarSeed || 0) * 37 % 360}, 60%, 45%)`
                }}>
                  {initials}
                </div>
                <div>
                  <div className="lb-name">{u.isMe ? 'You' : u.name}</div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span className="badge badge-level" style={{ fontSize: '0.65rem', padding: '1px 6px' }}>
                      Lv {lvlInfo.level}
                    </span>
                    <span className="lb-username">@{u.username}</span>
                  </div>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div className="lb-value">{formatMetric(sortMetric, u[sortMetric] || 0)}</div>
                <div className="lb-unit">{SORT_METRICS.find(m => m.value === sortMetric)?.label}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
