import React, { useState, useMemo, useEffect } from 'react';
import { Plus, Search, MapPin, Clock, Zap, Trash2, Edit2, TrendingUp, Filter, Map, Flag, Heart, MessageCircle } from 'lucide-react';
import { useApp } from '../App';
import { useAuth } from '../context/AuthContext';
import { firestoreActivities, firestoreUser, firestoreKudos } from '../lib/firestore';
import { SPORTS } from '../lib/constants';
import { formatDuration, formatPace } from '../lib/gamification';
import AddActivityModal from '../components/AddActivityModal';
import ActivityDetailModal from '../components/ActivityDetailModal';
import CreateSegmentModal from '../components/CreateSegmentModal';
import { trackEvent } from '../lib/analytics';
import { COPY } from '../lib/copy';

const SPORT_FILTERS = [
  { value: 'all', label: COPY.activitiesAllSports },
  { value: 'run', label: '🏃 Run' },
  { value: 'cycle', label: '🚴 Cycle' },
  { value: 'swim', label: '🏊 Swim' },
  { value: 'lift', label: '🏋️ Lift' },
];

const SORT_OPTIONS = [
  { value: 'date', label: 'Date' },
  { value: 'distance', label: 'Distance' },
  { value: 'duration', label: 'Duration' },
  { value: 'xp', label: 'XP Earned' },
];

const PAGE_SIZE = 15;

export default function Activities() {
  const { activities, toast, onActivityDeleted } = useApp();
  const { currentUser } = useAuth();
  const [showAdd, setShowAdd] = useState(false);
  const [editActivity, setEditActivity] = useState(null);
  const [createSegmentActivity, setCreateSegmentActivity] = useState(null);
  const [search, setSearch] = useState('');
  const [sportFilter, setSportFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [page, setPage] = useState(1);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [detailActivity, setDetailActivity] = useState(null);
  const [viewerKudoedSet, setViewerKudoedSet] = useState(new Set());

  const sportColors = {
    run: { bg: 'rgba(34,197,94,0.12)', color: 'var(--run)' },
    cycle: { bg: 'rgba(59,130,246,0.12)', color: 'var(--cycle)' },
    swim: { bg: 'rgba(6,182,212,0.12)', color: 'var(--swim)' },
    lift: { bg: 'rgba(245,158,11,0.12)', color: 'var(--lift)' },
  };

  const filtered = useMemo(() => {
    let list = [...activities];
    if (sportFilter !== 'all') list = list.filter(a => a.sport === sportFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(a => a.title.toLowerCase().includes(q) || a.sport.includes(q));
    }
    list.sort((a, b) => {
      if (sortBy === 'date') return b.date - a.date;
      if (sortBy === 'distance') return (b.distance || 0) - (a.distance || 0);
      if (sortBy === 'duration') return (b.duration || 0) - (a.duration || 0);
      if (sortBy === 'xp') return (b.xpEarned || 0) - (a.xpEarned || 0);
      return 0;
    });
    return list;
  }, [activities, sportFilter, search, sortBy]);

  const paginated = filtered.slice(0, page * PAGE_SIZE);
  const hasMore = paginated.length < filtered.length;
  const visibleActivityIds = useMemo(
    () => filtered.slice(0, page * PAGE_SIZE).map((a) => a.id).sort().join(','),
    [filtered, page]
  );

  useEffect(() => {
    if (!currentUser?.uid || !visibleActivityIds) {
      setViewerKudoedSet(new Set());
      return;
    }
    const ids = visibleActivityIds.split(',').filter(Boolean);
    let cancelled = false;
    Promise.all(ids.map((id) => firestoreKudos.hasKudoed(id, currentUser.uid))).then((results) => {
      if (cancelled) return;
      const set = new Set();
      results.forEach((v, i) => { if (v) set.add(ids[i]); });
      setViewerKudoedSet(set);
    });
    return () => { cancelled = true; };
  }, [currentUser?.uid, visibleActivityIds]);

  const handleKudosChange = (activityId, hasKudoed) => {
    setViewerKudoedSet((prev) => {
      const next = new Set(prev);
      if (hasKudoed) next.add(activityId);
      else next.delete(activityId);
      return next;
    });
  };

  const handleDelete = async (id) => {
    const activity = activities.find(a => a.id === id);
    try {
      await firestoreActivities.delete(id);
      // Deduct XP
      if (activity?.xpEarned && activity?.userId) {
        await firestoreUser.addXP(activity.userId, -activity.xpEarned);
      }
      await onActivityDeleted(id);
      trackEvent('activity_deleted', { sport: activity?.sport ?? 'unknown' });
      setDeleteConfirm(null);
      toast(COPY.activitiesWorkoutDeleted, 'info', '🗑️');
    } catch (err) {
      console.error('Error deleting workout:', err);
      toast(COPY.activitiesFailedDelete, 'error', '❌');
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{COPY.activitiesTitle}</h1>
          <p className="page-subtitle">{activities.length} {COPY.activitiesTotalWorkouts}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
          <Plus size={16} /> {COPY.dashboardLogWorkout}
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Search */}
        <div className="search-bar" style={{ flex: '1 1 200px', minWidth: 200 }} role="search">
          <Search size={16} aria-hidden="true" />
          <input
            id="activities-search"
            className="search-input"
            type="search"
            placeholder={COPY.activitiesSearchPlaceholder}
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            aria-label={COPY.activitiesSearchAria}
          />
        </div>

        {/* Sport filter chips */}
        <div className="filter-bar" style={{ margin: 0 }}>
          {SPORT_FILTERS.map(f => (
          <button
            key={f.value}
            type="button"
            className={`filter-chip ${sportFilter === f.value ? 'active' : ''}`}
            onClick={() => { setSportFilter(f.value); setPage(1); }}
            aria-pressed={sportFilter === f.value}
            aria-label={`${COPY.activitiesFilterBy} ${f.label}`}
          >{f.label}</button>
          ))}
        </div>

        {/* Sort */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label htmlFor="activities-sort" className="visually-hidden">{COPY.activitiesSortActivitiesBy}</label>
          <Filter size={14} style={{ color: 'var(--text-3)' }} aria-hidden="true" />
          <select
            id="activities-sort"
            className="form-select"
            style={{ width: 'auto', padding: '6px 12px' }}
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            aria-label={COPY.activitiesSortActivitiesBy}
          >
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{COPY.activitiesSortBy} {o.label}</option>)}
          </select>
        </div>
      </div>

      {/* Activity list */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon" aria-hidden="true">{activities.length === 0 ? '🔍' : '🔍'}</span>
          <h3 className="empty-title">{activities.length === 0 ? COPY.activitiesNoWorkoutsYet : COPY.activitiesNoWorkoutsFound}</h3>
          <p className="empty-desc">
            {activities.length === 0
              ? COPY.activitiesEmptyDescNone
              : COPY.activitiesEmptyDescFilter}
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-primary" onClick={() => setShowAdd(true)}>
              <Plus size={16} aria-hidden="true" /> {COPY.dashboardLogWorkout}
            </button>
            {activities.length > 0 && (search.trim() || sportFilter !== 'all') && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => { setSearch(''); setSportFilter('all'); setPage(1); }}
              >
                {COPY.activitiesClearFilters}
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="activity-list">
            {paginated.map(activity => {
              const sport = SPORTS[activity.sport];
              const colors = sportColors[activity.sport] || sportColors.run;
              return (
                <div key={activity.id} className="activity-card" style={{ cursor: 'default' }}>
                  <div className="activity-sport-icon" style={{ background: colors.bg, color: colors.color }}>
                    {sport?.icon}
                  </div>
                  <div
                    className="activity-info"
                    style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}
                    onClick={() => setDetailActivity(activity)}
                    onKeyDown={(e) => e.key === 'Enter' && setDetailActivity(activity)}
                    role="button"
                    tabIndex={0}
                    aria-label={`${COPY.activitiesViewActivity}: ${activity.title}`}
                  >
                    <div className="activity-title">{activity.title}</div>
                    <div className="activity-meta">
                      <span className={`badge badge-${activity.sport}`}>{sport?.label}</span>
                      {activity.distance && (
                        <span className="activity-stat">
                          <MapPin size={12} /> {activity.distance.toFixed(1)} {sport?.unit}
                        </span>
                      )}
                      {activity.volume && (
                        <span className="activity-stat">
                          <Zap size={12} /> {activity.volume.toLocaleString()} lbs
                        </span>
                      )}
                      <span className="activity-stat">
                        <Clock size={12} /> {formatDuration(activity.duration)}
                      </span>
                      {activity.pace && (
                        <span className="activity-stat">
                          <TrendingUp size={12} /> {formatPace(activity.pace)}/mi
                        </span>
                      )}
                    </div>
                    {/* Exercise list for lifts */}
                    {activity.exercises && (
                      <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {activity.exercises.map((ex, i) => (
                          <span key={i} style={{
                            fontSize: '0.7rem', padding: '2px 8px',
                            background: 'var(--surface-2)', borderRadius: 4,
                            color: 'var(--text-2)', border: '1px solid var(--border)'
                          }}>
                            {ex.name} ({ex.sets.length} sets)
                          </span>
                        ))}
                      </div>
                    )}
                    {/* Kudos & comments summary */}
                    <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.75rem', color: 'var(--text-3)' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <Heart size={12} aria-hidden="true" style={{ fill: viewerKudoedSet.has(activity.id) ? 'var(--primary)' : 'none' }} />
                        {(activity.kudosCount ?? 0) > 0 && (activity.kudosCount)}
                        {viewerKudoedSet.has(activity.id) && <span> · {COPY.kudosYouLiked}</span>}
                      </span>
                      {(activity.commentCount ?? 0) > 0 && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <MessageCircle size={12} aria-hidden="true" />
                          {activity.commentCount} {COPY.commentsCount}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="activity-right">
                    <span className="badge badge-xp">+{activity.xpEarned} XP</span>
                    <span className="activity-date">
                      {activity.hideStartTime
                        ? COPY.privacyDateHidden
                        : new Date(activity.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={(e) => { e.stopPropagation(); setDetailActivity(activity); }}
                        title={COPY.activitiesViewActivity}
                        aria-label={`${COPY.activitiesViewActivity}: ${activity.title}`}
                      >
                        <Map size={13} aria-hidden="true" />
                      </button>
                      {activity.track?.length > 0 && (
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={(e) => { e.stopPropagation(); setCreateSegmentActivity(activity); }}
                          title={COPY.segmentsCreateSegment}
                          aria-label={COPY.segmentsCreateFromActivity}
                        >
                          <Flag size={13} aria-hidden="true" /> Segment
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={(e) => { e.stopPropagation(); setEditActivity(activity); }}
                        title="Edit"
                        aria-label={`Edit ${activity.title}`}
                      >
                        <Edit2 size={13} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        onClick={(e) => { e.stopPropagation(); setDeleteConfirm(activity.id); }}
                        title="Delete"
                        aria-label={`Delete ${activity.title}`}
                      >
                        <Trash2 size={13} aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {hasMore && (
            <div style={{ textAlign: 'center', marginTop: 24 }}>
              <button className="btn btn-secondary" onClick={() => setPage(p => p + 1)}>
                {COPY.activitiesLoadMore} ({filtered.length - paginated.length} {COPY.activitiesRemaining})
              </button>
            </div>
          )}
        </>
      )}

      {/* Delete confirmation */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)} role="presentation">
          <div
            className="modal"
            style={{ maxWidth: 360 }}
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-workout-title"
            aria-describedby="delete-workout-desc"
          >
            <div className="modal-header">
              <h2 id="delete-workout-title" className="modal-title">{COPY.activitiesDeleteTitle}</h2>
              <button type="button" className="modal-close" onClick={() => setDeleteConfirm(null)} aria-label={COPY.profileCloseModal}>×</button>
            </div>
            <p id="delete-workout-desc" style={{ color: 'var(--text-2)', marginBottom: 24 }}>
              {COPY.activitiesDeleteDesc}
            </p>
            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setDeleteConfirm(null)}>{COPY.cancel}</button>
              <button type="button" className="btn btn-danger" onClick={() => handleDelete(deleteConfirm)}>{COPY.activitiesDelete}</button>
            </div>
          </div>
        </div>
      )}

      {showAdd && <AddActivityModal onClose={() => setShowAdd(false)} />}
      {editActivity && (
        <AddActivityModal
          editActivity={editActivity}
          onClose={() => setEditActivity(null)}
        />
      )}
      {detailActivity && (
        <ActivityDetailModal
          activity={detailActivity}
          onClose={() => setDetailActivity(null)}
          onKudosChange={handleKudosChange}
          onActivityUpdated={(updated) => {
            setDetailActivity(prev => prev?.id === updated?.id ? { ...prev, ...updated } : prev);
          }}
        />
      )}
      {createSegmentActivity && (
        <CreateSegmentModal
          activity={createSegmentActivity}
          onClose={() => setCreateSegmentActivity(null)}
          onCreated={() => toast(COPY.segmentsCreated, 'success', '🏁')}
        />
      )}
    </div>
  );
}
