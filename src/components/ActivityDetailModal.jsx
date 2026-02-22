import React, { lazy, Suspense, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Clock, Zap, TrendingUp, Flag, Heart, MessageCircle, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { SPORTS } from '../lib/constants';
import { formatDuration, formatPace } from '../lib/gamification';
import { firestoreSegmentResults, firestoreSegments, firestoreKudos, firestoreComments, firestoreActivities, firestoreFeed } from '../lib/firestore';
import { COPY } from '../lib/copy';
import { normalizeTrack } from '../lib/polyline';

const ActivityMap = lazy(() => import('./ActivityMap'));

function formatSegmentTimeMs(ms) {
  if (ms == null) return '—';
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${String(sec).padStart(2, '0')}`;
}

export default function ActivityDetailModal({ activity, onClose, onKudosChange, onActivityUpdated }) {
  const { currentUser, userData } = useAuth();
  const [segmentResults, setSegmentResults] = useState([]);
  const [kudosCount, setKudosCount] = useState(activity?.kudosCount ?? 0);
  const [hasKudoed, setHasKudoed] = useState(false);
  const [kudosLoading, setKudosLoading] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [privacySaving, setPrivacySaving] = useState(false);
  const [visibility, setVisibility] = useState(activity?.visibility ?? 'public');
  const [hideMap, setHideMap] = useState(Boolean(activity?.hideMap));
  const [hideStartTime, setHideStartTime] = useState(Boolean(activity?.hideStartTime));

  useEffect(() => {
    if (!activity?.id) return;
    setKudosCount(activity.kudosCount ?? 0);
  }, [activity?.id, activity?.kudosCount]);

  useEffect(() => {
    setVisibility(activity?.visibility ?? 'public');
    setHideMap(Boolean(activity?.hideMap));
    setHideStartTime(Boolean(activity?.hideStartTime));
  }, [activity?.id, activity?.visibility, activity?.hideMap, activity?.hideStartTime]);

  useEffect(() => {
    if (!activity?.id || !currentUser?.uid) return;
    let cancelled = false;
    firestoreKudos.hasKudoed(activity.id, currentUser.uid).then((v) => {
      if (!cancelled) setHasKudoed(v);
    });
    return () => { cancelled = true; };
  }, [activity?.id, currentUser?.uid]);

  useEffect(() => {
    if (!activity?.id) return;
    const unsub = firestoreComments.subscribeByActivity(activity.id, setComments);
    return () => unsub();
  }, [activity?.id]);

  useEffect(() => {
    if (!activity?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const results = await firestoreSegmentResults.getByActivity(activity.id);
        if (cancelled) return;
        const withNames = await Promise.all(
          results.map(async (r) => {
            const seg = await firestoreSegments.get(r.segmentId);
            return { ...r, segmentName: seg?.name };
          })
        );
        if (!cancelled) setSegmentResults(withNames);
      } catch {
        if (!cancelled) setSegmentResults([]);
      }
    })();
    return () => { cancelled = true; };
  }, [activity?.id]);

  const handleToggleKudos = async () => {
    if (!currentUser?.uid || !activity?.id || kudosLoading) return;
    setKudosLoading(true);
    try {
      if (hasKudoed) {
        await firestoreKudos.remove(activity.id, currentUser.uid);
        setHasKudoed(false);
        setKudosCount((c) => Math.max(0, c - 1));
        onKudosChange?.(activity.id, false);
      } else {
        await firestoreKudos.add(activity.id, currentUser.uid);
        setHasKudoed(true);
        setKudosCount((c) => c + 1);
        onKudosChange?.(activity.id, true);
      }
    } catch {
      // toast on error if desired
    } finally {
      setKudosLoading(false);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    const text = commentText.trim();
    if (!text || !currentUser?.uid || !activity?.id || commentSubmitting) return;
    setCommentSubmitting(true);
    try {
      await firestoreComments.create(activity.id, currentUser.uid, userData?.name ?? currentUser.displayName ?? 'You', text);
      setCommentText('');
    } catch { /* ignore */ }
    setCommentSubmitting(false);
  };

  const handleDeleteComment = async (comment) => {
    if (!comment?.id || deletingId) return;
    setDeletingId(comment.id);
    try {
      await firestoreComments.delete(comment.id, comment.activityId);
    } catch { /* ignore */ }
    setDeletingId(null);
  };

  const isActivityOwner = currentUser?.uid === activity?.userId;
  const canDeleteComment = (c) => isActivityOwner || c.userId === currentUser?.uid;

  const handlePrivacyChange = async (patch) => {
    if (!activity?.id || !isActivityOwner || privacySaving) return;
    setPrivacySaving(true);
    try {
      await firestoreActivities.update(activity.id, patch);
      if (patch.visibility === 'private') {
        try {
          await firestoreFeed.removeActivityFromFeed(activity.id, activity.userId);
        } catch (e) {
          console.warn('Feed remove failed:', e);
        }
      } else if (patch.visibility === 'public' || patch.visibility === 'followers') {
        try {
          await firestoreFeed.fanOutActivityToFeed({ ...activity, ...patch });
        } catch (e) {
          console.warn('Feed fan-out failed:', e);
        }
      }
      const next = { ...activity, ...patch };
      setVisibility(next.visibility ?? 'public');
      setHideMap(Boolean(next.hideMap));
      setHideStartTime(Boolean(next.hideStartTime));
      onActivityUpdated?.(next);
    } finally {
      setPrivacySaving(false);
    }
  };

  if (!activity) return null;

  const sport = SPORTS[activity.sport];
  const hasTrack = activity.track && normalizeTrack(activity.track).length > 0 && !activity.hideMap;

  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div
        className="modal"
        style={{ maxWidth: 480, maxHeight: '90vh', overflow: 'auto' }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="activity-detail-title"
      >
        <div className="modal-header">
          <h2 id="activity-detail-title" className="modal-title">
            {COPY.activitiesActivityDetail}
          </h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label={COPY.profileCloseModal}>
            ×
          </button>
        </div>

        <div style={{ padding: '0 24px 24px' }}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
              {activity.title}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
              <span className={`badge badge-${activity.sport}`}>{sport?.label} {sport?.icon}</span>
              <span style={{ fontSize: '0.875rem', color: 'var(--text-2)' }}>
                {activity.hideStartTime
                  ? COPY.privacyDateHidden
                  : new Date(activity.date).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
              </span>
              {activity.xpEarned != null && (
                <span className="badge badge-xp">+{activity.xpEarned} XP</span>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
            <span className="activity-stat" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Clock size={14} aria-hidden="true" />
              {formatDuration(activity.duration)}
            </span>
            {activity.distance != null && activity.distance > 0 && (
              <span className="activity-stat" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <MapPin size={14} aria-hidden="true" />
                {activity.distance.toFixed(1)} {sport?.unit}
              </span>
            )}
            {activity.pace != null && activity.pace > 0 && (
              <span className="activity-stat" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <TrendingUp size={14} aria-hidden="true" />
                {formatPace(activity.pace)}/mi
              </span>
            )}
            {activity.volume != null && activity.volume > 0 && (
              <span className="activity-stat" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Zap size={14} aria-hidden="true" />
                {activity.volume.toLocaleString()} lbs
              </span>
            )}
          </div>

          {activity.exercises?.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>
                Exercises
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {activity.exercises.map((ex, i) => (
                  <span
                    key={i}
                    style={{
                      fontSize: '0.8rem',
                      padding: '4px 10px',
                      background: 'var(--surface-2)',
                      borderRadius: 6,
                      color: 'var(--text-2)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    {ex.name} ({ex.sets?.length ?? 0} sets)
                  </span>
                ))}
              </div>
            </div>
          )}

          {segmentResults.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>
                Segments
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {segmentResults.map((r) => (
                  <li key={r.segmentId} style={{ marginBottom: 6 }}>
                    <Link
                      to={`/segments/${r.segmentId}`}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--primary)', textDecoration: 'none', fontSize: '0.875rem' }}
                      onClick={onClose}
                    >
                      <Flag size={12} />
                      {COPY.segmentsYouRanSegment} <strong>{r.segmentName || 'Segment'}</strong> in {formatSegmentTimeMs(r.timeMs)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {hasTrack && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
                {COPY.activitiesRouteMap}
              </div>
              <Suspense
                fallback={
                  <div
                    style={{
                      height: 240,
                      background: 'var(--surface-2)',
                      borderRadius: 8,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--text-3)',
                      fontSize: '0.875rem',
                    }}
                  >
                    {COPY.activitiesMapLoading}
                  </div>
                }
              >
                <ActivityMap track={activity.track} height={240} />
              </Suspense>
            </div>
          )}

          {activity.notes?.trim() && (
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>
                Notes
              </div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-2)', margin: 0, whiteSpace: 'pre-wrap' }}>
                {activity.notes.trim()}
              </p>
            </div>
          )}

          {/* Owner: privacy controls */}
          {isActivityOwner && (
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
                {COPY.activityDetailPrivacy}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{ fontSize: '0.875rem', color: 'var(--text-2)' }}>{COPY.addActivityVisibility}</span>
                  <select
                    className="form-select"
                    style={{ width: 'auto', padding: '6px 12px' }}
                    value={visibility}
                    onChange={e => handlePrivacyChange({ visibility: e.target.value })}
                    disabled={privacySaving}
                    aria-label={COPY.addActivityVisibility}
                  >
                    <option value="public">{COPY.privacyVisibilityPublic}</option>
                    <option value="followers">{COPY.privacyVisibilityFollowers}</option>
                    <option value="private">{COPY.privacyVisibilityPrivate}</option>
                  </select>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.875rem', color: 'var(--text-2)' }}>
                  <input
                    type="checkbox"
                    checked={hideMap}
                    onChange={e => handlePrivacyChange({ hideMap: e.target.checked })}
                    disabled={privacySaving}
                    aria-label={COPY.addActivityHideMap}
                  />
                  {COPY.addActivityHideMap}
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.875rem', color: 'var(--text-2)' }}>
                  <input
                    type="checkbox"
                    checked={hideStartTime}
                    onChange={e => handlePrivacyChange({ hideStartTime: e.target.checked })}
                    disabled={privacySaving}
                    aria-label={COPY.addActivityHideStartTime}
                  />
                  {COPY.addActivityHideStartTime}
                </label>
              </div>
            </div>
          )}

          {/* Kudos & Comments */}
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
              {currentUser ? (
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={handleToggleKudos}
                  disabled={kudosLoading}
                  aria-pressed={hasKudoed}
                  aria-label={hasKudoed ? COPY.kudosRemove : COPY.kudosAdd}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <Heart
                    size={18}
                    aria-hidden="true"
                    style={{ fill: hasKudoed ? 'var(--primary)' : 'none', color: hasKudoed ? 'var(--primary)' : 'var(--text-2)' }}
                  />
                  <span>{kudosCount}</span>
                  {hasKudoed && <span style={{ fontSize: '0.8rem', color: 'var(--text-2)' }}>({COPY.kudosYouLiked})</span>}
                </button>
              ) : (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-3)', fontSize: '0.875rem' }}>
                  <Heart size={18} aria-hidden="true" />
                  {kudosCount} {COPY.kudosCount}
                </span>
              )}
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-3)', fontSize: '0.875rem' }}>
                <MessageCircle size={18} aria-hidden="true" />
                {comments.length} {COPY.commentsCount}
              </span>
            </div>

            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
              {COPY.commentsTitle}
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 12px', maxHeight: 200, overflowY: 'auto' }}>
              {comments.length === 0 ? (
                <li style={{ fontSize: '0.875rem', color: 'var(--text-3)' }}>{COPY.commentsEmpty}</li>
              ) : (
                comments.map((c) => (
                  <li
                    key={c.id}
                    style={{
                      padding: '8px 0',
                      borderBottom: '1px solid var(--border)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: 8,
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-2)' }}>{c.userName ?? 'Anonymous'}</span>
                      <p style={{ margin: '2px 0 0', fontSize: '0.875rem', color: 'var(--text)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                        {c.text}
                      </p>
                    </div>
                    {canDeleteComment(c) && (
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => handleDeleteComment(c)}
                        disabled={deletingId === c.id}
                        aria-label={COPY.commentsDelete}
                        style={{ flexShrink: 0 }}
                      >
                        <Trash2 size={14} aria-hidden="true" />
                      </button>
                    )}
                  </li>
                ))
              )}
            </ul>
            {currentUser && (
              <form onSubmit={handleAddComment} style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder={COPY.commentsPlaceholder}
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  maxLength={500}
                  aria-label={COPY.commentsAdd}
                  style={{ flex: 1, minWidth: 0 }}
                />
                <button type="submit" className="btn btn-primary" disabled={!commentText.trim() || commentSubmitting}>
                  {commentSubmitting ? COPY.loading : COPY.commentsPost}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
