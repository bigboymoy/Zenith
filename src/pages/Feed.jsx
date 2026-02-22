import React, { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Clock, Zap, TrendingUp, Heart, MessageCircle, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { firestoreFeed, firestoreFollows, firestoreUser } from '../lib/firestore';
import { SPORTS } from '../lib/constants';
import { formatDuration, formatPace } from '../lib/gamification';
import { normalizeTrack } from '../lib/polyline';
import ActivityDetailModal from '../components/ActivityDetailModal';
import { COPY } from '../lib/copy';

const ActivityMap = lazy(() => import('../components/ActivityMap'));

const PAGE_SIZE = 20;

export default function Feed() {
  const { currentUser } = useAuth();
  const [activities, setActivities] = useState([]);
  const [authors, setAuthors] = useState({});
  const [lastDoc, setLastDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [followingCount, setFollowingCount] = useState(null);
  const [detailActivity, setDetailActivity] = useState(null);

  const uid = currentUser?.uid;

  useEffect(() => {
    if (!uid) {
      setLoading(false);
      setFollowingCount(0);
      return;
    }
    let cancelled = false;
    (async () => {
      const following = await firestoreFollows.getFollowing(uid);
      if (!cancelled) setFollowingCount(following?.length ?? 0);
    })();
    return () => { cancelled = true; };
  }, [uid]);

  useEffect(() => {
    if (!uid || followingCount === 0) {
      if (followingCount === 0) setLoading(false);
      return;
    }
    setLoading(true);
    setActivities([]);
    setLastDoc(null);
    let cancelled = false;
    (async () => {
      try {
        const { activities: list, lastDoc: nextLast } = await firestoreFeed.getForUser(uid, { limit: PAGE_SIZE });
        if (cancelled) return;
        setActivities(list);
        setLastDoc(nextLast);

        const authorIds = [...new Set(list.map((a) => a.userId).filter(Boolean))];
        const profiles = await Promise.all(authorIds.map((id) => firestoreUser.get(id)));
        const authorMap = {};
        authorIds.forEach((id, i) => {
          if (profiles[i]) authorMap[id] = profiles[i].name || profiles[i].username || 'Athlete';
        });
        if (!cancelled) setAuthors(authorMap);
      } catch (err) {
        console.error('Feed load failed:', err);
        if (!cancelled) setActivities([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [uid, followingCount]);

  const loadMore = async () => {
    if (!uid || !lastDoc || loadingMore) return;
    setLoadingMore(true);
    try {
      const { activities: list, lastDoc: nextLast } = await firestoreFeed.getForUser(uid, { limit: PAGE_SIZE, startAfterDoc: lastDoc });
      if (!list.length) {
        setLastDoc(null);
        setLoadingMore(false);
        return;
      }
      setActivities((prev) => {
        const byId = new Map(prev.map((a) => [a.id, a]));
        list.forEach((a) => byId.set(a.id, a));
        return [...byId.values()].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      });
      setLastDoc(nextLast);

      const authorIds = [...new Set(list.map((a) => a.userId).filter(Boolean))];
      const needAuthors = authorIds.filter((id) => !authors[id]);
      if (needAuthors.length) {
        const profiles = await Promise.all(needAuthors.map((id) => firestoreUser.get(id)));
        const nextAuthors = { ...authors };
        needAuthors.forEach((id, i) => {
          if (profiles[i]) nextAuthors[id] = profiles[i].name || profiles[i].username || 'Athlete';
        });
        setAuthors(nextAuthors);
      }
    } catch (err) {
      console.error('Feed load more failed:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  const sportColors = useMemo(
    () => ({
      run: { bg: 'rgba(34,197,94,0.12)', color: 'var(--run)' },
      cycle: { bg: 'rgba(59,130,246,0.12)', color: 'var(--cycle)' },
      swim: { bg: 'rgba(6,182,212,0.12)', color: 'var(--swim)' },
      lift: { bg: 'rgba(245,158,11,0.12)', color: 'var(--lift)' },
    }),
    []
  );

  if (!currentUser) return null;

  if (followingCount !== null && followingCount === 0) {
    return (
      <div>
        <div className="page-header">
          <div>
            <h1 className="page-title">{COPY.feedTitle}</h1>
            <p className="page-subtitle">{COPY.feedSubtitle}</p>
          </div>
        </div>
        <div className="empty-state">
          <span className="empty-icon" aria-hidden="true">👋</span>
          <h3 className="empty-title">{COPY.feedEmptyTitle}</h3>
          <p className="empty-desc">{COPY.feedEmptyDesc}</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/leaderboard" className="btn btn-primary">
              <Users size={16} aria-hidden="true" /> {COPY.feedExplore}
            </Link>
            <Link to="/profile" className="btn btn-secondary">{COPY.feedFindPeople}</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{COPY.feedTitle}</h1>
          <p className="page-subtitle">{COPY.feedSubtitle}</p>
        </div>
      </div>

      {loading ? (
        <p className="empty-desc" style={{ textAlign: 'center', padding: 32 }}>{COPY.loading}</p>
      ) : activities.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon" aria-hidden="true">🏃</span>
          <h3 className="empty-title">{COPY.feedEmptyTitle}</h3>
          <p className="empty-desc">{COPY.feedEmptyDesc}</p>
          <Link to="/leaderboard" className="btn btn-primary">{COPY.feedExplore}</Link>
        </div>
      ) : (
        <>
          <div className="activity-list">
            {activities.map((activity) => {
              const sport = SPORTS[activity.sport];
              const colors = sportColors[activity.sport] || sportColors.run;
              const authorName = authors[activity.userId] || 'Athlete';
              const hasTrack = activity.track && normalizeTrack(activity.track).length > 0 && !activity.hideMap;
              const kudosCount = activity.kudosCount ?? 0;
              const commentCount = activity.commentCount ?? 0;

              return (
                <article key={activity.id} className="activity-card feed-card">
                  <div className="feed-card-header">
                    <Link to={`/profile/${activity.userId}`} className="feed-author">
                      {authorName}
                    </Link>
                    <span className="feed-date">
                      {activity.hideStartTime
                        ? COPY.privacyDateHidden
                        : new Date(activity.date || activity.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: activity.date ? 'numeric' : undefined,
                          })}
                    </span>
                  </div>
                  <div
                    className="activity-card feed-card-body"
                    style={{ cursor: 'pointer' }}
                    onClick={() => setDetailActivity(activity)}
                    onKeyDown={(e) => e.key === 'Enter' && setDetailActivity(activity)}
                    role="button"
                    tabIndex={0}
                    aria-label={`${COPY.activitiesViewActivity}: ${activity.title}`}
                  >
                    <div className="activity-sport-icon" style={{ background: colors.bg, color: colors.color }}>
                      {sport?.icon}
                    </div>
                    <div className="activity-info" style={{ flex: 1, minWidth: 0 }}>
                      <div className="activity-title">{activity.title}</div>
                      <div className="activity-meta">
                        <span className={`badge badge-${activity.sport}`}>{sport?.label}</span>
                        {activity.distance != null && activity.distance > 0 && (
                          <span className="activity-stat">
                            <MapPin size={12} /> {activity.distance.toFixed(1)} {sport?.unit}
                          </span>
                        )}
                        {activity.volume != null && activity.volume > 0 && (
                          <span className="activity-stat">
                            <Zap size={12} /> {activity.volume.toLocaleString()} lbs
                          </span>
                        )}
                        <span className="activity-stat">
                          <Clock size={12} /> {formatDuration(activity.duration)}
                        </span>
                        {activity.pace != null && activity.pace > 0 && (
                          <span className="activity-stat">
                            <TrendingUp size={12} /> {formatPace(activity.pace)}/mi
                          </span>
                        )}
                      </div>
                      <div className="feed-stats">
                        <span className="feed-stat" aria-label={`${kudosCount} kudos`}>
                          <Heart size={12} /> {kudosCount}
                        </span>
                        <span className="feed-stat" aria-label={`${commentCount} comments`}>
                          <MessageCircle size={12} /> {commentCount}
                        </span>
                      </div>
                    </div>
                    <div className="activity-right">
                      {activity.xpEarned != null && (
                        <span className="badge badge-xp">+{activity.xpEarned} XP</span>
                      )}
                    </div>
                  </div>
                  {hasTrack && (
                    <div className="feed-map-thumb" aria-hidden="true">
                      <Suspense fallback={<div style={{ height: 72, background: 'var(--surface)' }} />}>
                        <ActivityMap track={activity.track} height={72} className="feed-map-inner" />
                      </Suspense>
                    </div>
                  )}
                </article>
              );
            })}
          </div>

          {lastDoc && (
            <div style={{ textAlign: 'center', marginTop: 24 }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={loadMore}
                disabled={loadingMore}
              >
                {loadingMore ? COPY.loading : COPY.feedLoadMore}
              </button>
            </div>
          )}
        </>
      )}

      {detailActivity && (
        <ActivityDetailModal
          activity={detailActivity}
          onClose={() => setDetailActivity(null)}
          onActivityUpdated={(updated) => setDetailActivity(prev => prev?.id === updated?.id ? { ...prev, ...updated } : prev)}
        />
      )}
    </div>
  );
}
