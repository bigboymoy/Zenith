import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, UsersRound, Trophy, MapPin, Clock, Zap, TrendingUp } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../App';
import { firestoreClubs, firestoreUser } from '../lib/firestore';
import { SPORTS } from '../lib/constants';
import { formatDuration, formatPace } from '../lib/gamification';
import ActivityDetailModal from '../components/ActivityDetailModal';
import { COPY } from '../lib/copy';

const sportColors = {
  run: { bg: 'rgba(34,197,94,0.12)', color: 'var(--run)' },
  cycle: { bg: 'rgba(59,130,246,0.12)', color: 'var(--cycle)' },
  swim: { bg: 'rgba(6,182,212,0.12)', color: 'var(--swim)' },
  lift: { bg: 'rgba(245,158,11,0.12)', color: 'var(--lift)' },
};

function getRankEmoji(rank) {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return rank;
}

export default function ClubDetail() {
  const { clubId } = useParams();
  const { currentUser } = useAuth();
  const { toast } = useApp();
  const uid = currentUser?.uid;

  const [club, setClub] = useState(null);
  const [tab, setTab] = useState('feed');
  const [feedActivities, setFeedActivities] = useState([]);
  const [feedUserNames, setFeedUserNames] = useState({});
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joinLeaveLoading, setJoinLeaveLoading] = useState(false);
  const [detailActivity, setDetailActivity] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!clubId) return;
      setLoading(true);
      try {
        const c = await firestoreClubs.get(clubId);
        if (cancelled) return;
        setClub(c);
        if (!c) {
          setFeedActivities([]);
          setLeaderboard([]);
          setLoading(false);
          return;
        }
        const memberIds = c.memberIds || [];
        const [activities, lb] = await Promise.all([
          firestoreClubs.getFeedActivities(memberIds, 50),
          firestoreClubs.getLeaderboard(memberIds),
        ]);
        if (cancelled) return;
        setFeedActivities(activities);
        setLeaderboard(lb);
        const uids = [...new Set(activities.map((a) => a.userId))];
        const names = {};
        await Promise.all(
          uids.map(async (id) => {
            const u = await firestoreUser.get(id);
            if (u?.name) names[id] = u.name;
          })
        );
        if (!cancelled) setFeedUserNames(names);
      } catch (err) {
        console.error('Load club failed:', err);
        if (!cancelled) {
          setClub(null);
          setFeedActivities([]);
          setLeaderboard([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [clubId]);

  const isMember = uid && club && (club.memberIds || []).includes(uid);
  const isOwner = uid && club && club.ownerId === uid;
  const canLeave = isMember && !isOwner;

  const handleJoin = async () => {
    if (!uid || !clubId || isMember) return;
    setJoinLeaveLoading(true);
    try {
      await firestoreClubs.join(clubId, uid);
      const updated = await firestoreClubs.get(clubId);
      setClub(updated);
      toast(COPY.clubsJoined, 'success', '✅');
    } catch (err) {
      console.error('Join club failed:', err);
      toast(COPY.clubsJoinFailed, 'error', '❌');
    } finally {
      setJoinLeaveLoading(false);
    }
  };

  const handleLeave = async () => {
    if (!uid || !clubId || !canLeave) return;
    setJoinLeaveLoading(true);
    try {
      await firestoreClubs.leave(clubId, uid);
      const updated = await firestoreClubs.get(clubId);
      setClub(updated);
      setFeedActivities((prev) => prev.filter((a) => a.userId !== uid));
      setLeaderboard((prev) => prev.filter((u) => (u.uid || u.id) !== uid));
      toast(COPY.clubsLeft, 'success', '✅');
    } catch (err) {
      console.error('Leave club failed:', err);
      toast(COPY.clubsLeaveFailed, 'error', '❌');
    } finally {
      setJoinLeaveLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-2)' }}>
        {COPY.loading}
      </div>
    );
  }

  if (!club) {
    return (
      <div className="empty-state">
        <h3 className="empty-title">Club not found</h3>
        <Link to="/clubs" className="btn btn-primary">
          <ArrowLeft size={16} /> {COPY.clubsBackToClubs}
        </Link>
      </div>
    );
  }

  const memberCount = (club.memberIds || []).length;

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
        <Link
          to="/clubs"
          className="btn btn-ghost"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          <ArrowLeft size={16} /> {COPY.clubsBackToClubs}
        </Link>
        {!isMember && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleJoin}
            disabled={joinLeaveLoading}
          >
            {joinLeaveLoading ? COPY.loading : COPY.clubsJoin}
          </button>
        )}
        {canLeave && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleLeave}
            disabled={joinLeaveLoading}
          >
            {joinLeaveLoading ? COPY.loading : COPY.clubsLeave}
          </button>
        )}
      </div>

      <div className="card" style={{ marginBottom: 24, padding: 20 }}>
        <h1 className="page-title" style={{ marginBottom: 8 }}>{club.name}</h1>
        {club.description ? (
          <p style={{ color: 'var(--text-2)', marginBottom: 12 }}>{club.description}</p>
        ) : null}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="activity-stat">
            <UsersRound size={16} /> {memberCount} {memberCount === 1 ? COPY.clubsMemberCount : COPY.clubsMemberCountPlural}
          </span>
          {isOwner && (
            <span className="badge" style={{ background: 'var(--surface-2)', color: 'var(--text-2)' }}>
              {COPY.clubsOwner}
            </span>
          )}
        </div>
      </div>

      <div className="filter-bar" style={{ marginBottom: 16 }}>
        <button
          type="button"
          className={`filter-chip ${tab === 'feed' ? 'active' : ''}`}
          onClick={() => setTab('feed')}
          aria-pressed={tab === 'feed'}
        >
          {COPY.clubsFeed}
        </button>
        <button
          type="button"
          className={`filter-chip ${tab === 'leaderboard' ? 'active' : ''}`}
          onClick={() => setTab('leaderboard')}
          aria-pressed={tab === 'leaderboard'}
        >
          {COPY.clubsLeaderboard}
        </button>
      </div>

      {tab === 'feed' && (
        feedActivities.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon" aria-hidden="true">📋</span>
            <h3 className="empty-title">{COPY.clubsFeedEmpty}</h3>
          </div>
        ) : (
          <div className="activity-list">
            {feedActivities.map((activity) => {
              const sport = SPORTS[activity.sport];
              const colors = sportColors[activity.sport] || sportColors.run;
              const authorName = feedUserNames[activity.userId] || 'Someone';
              return (
                <div
                  key={activity.id}
                  className="activity-card"
                  style={{ cursor: 'pointer' }}
                  onClick={() => setDetailActivity(activity)}
                  onKeyDown={(e) => e.key === 'Enter' && setDetailActivity(activity)}
                  role="button"
                  tabIndex={0}
                  aria-label={`${activity.title} by ${authorName}`}
                >
                  <div className="activity-sport-icon" style={{ background: colors.bg, color: colors.color }}>
                    {sport?.icon}
                  </div>
                  <div className="activity-info" style={{ flex: 1, minWidth: 0 }}>
                    <div className="activity-title">{activity.title}</div>
                    <div className="activity-meta" style={{ fontSize: '0.8rem', color: 'var(--text-2)' }}>
                      {authorName}
                    </div>
                    <div className="activity-meta">
                      <span className={`badge badge-${activity.sport}`}>{sport?.label}</span>
                      {activity.distance != null && (
                        <span className="activity-stat">
                          <MapPin size={12} /> {activity.distance.toFixed(1)} {sport?.unit}
                        </span>
                      )}
                      {activity.volume != null && (
                        <span className="activity-stat">
                          <Zap size={12} /> {activity.volume.toLocaleString()} lbs
                        </span>
                      )}
                      <span className="activity-stat">
                        <Clock size={12} /> {formatDuration(activity.duration)}
                      </span>
                      {activity.pace != null && (
                        <span className="activity-stat">
                          <TrendingUp size={12} /> {formatPace(activity.pace)}/mi
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="activity-right">
                    <span className="badge badge-xp">+{activity.xpEarned ?? 0} XP</span>
                    <span className="activity-date">
                      {new Date(activity.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {tab === 'leaderboard' && (
        leaderboard.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon" aria-hidden="true">🏆</span>
            <h3 className="empty-title">{COPY.clubsLeaderboardEmpty}</h3>
          </div>
        ) : (
          <div className="activity-list">
            {leaderboard.map((user, index) => {
              const rank = index + 1;
              const isMe = (user.uid || user.id) === uid;
              return (
                <div
                  key={user.uid || user.id || index}
                  className="activity-card"
                  style={{ display: 'flex', alignItems: 'center', gap: 12 }}
                >
                  <span style={{ fontWeight: 700, minWidth: 28 }} aria-label={`Rank ${rank}`}>
                    {getRankEmoji(rank)}
                  </span>
                  <div className="activity-info" style={{ flex: 1 }}>
                    <div className="activity-title">
                      {user.name || 'Anonymous'}
                      {isMe && ' (you)'}
                    </div>
                    <div className="activity-meta">
                      <span className="badge badge-xp">{(user.xp || 0).toLocaleString()} XP</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {detailActivity && (
        <ActivityDetailModal
          activity={detailActivity}
          onClose={() => setDetailActivity(null)}
        />
      )}
    </div>
  );
}
