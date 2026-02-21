import React, { useState, useMemo } from 'react';
import { Plus, Search, MapPin, Clock, Zap, Trash2, Edit2, TrendingUp, Filter } from 'lucide-react';
import { useApp } from '../App';
import { firestoreActivities, firestoreUser } from '../lib/firestore';
import { SPORTS } from '../lib/constants';
import { formatDuration, formatPace } from '../lib/gamification';
import AddActivityModal from '../components/AddActivityModal';

const SPORT_FILTERS = [
  { value: 'all', label: 'All Sports' },
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
  const [showAdd, setShowAdd] = useState(false);
  const [editActivity, setEditActivity] = useState(null);
  const [search, setSearch] = useState('');
  const [sportFilter, setSportFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [page, setPage] = useState(1);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

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

  const handleDelete = async (id) => {
    const activity = activities.find(a => a.id === id);
    try {
      await firestoreActivities.delete(id);
      // Deduct XP
      if (activity?.xpEarned && activity?.userId) {
        await firestoreUser.addXP(activity.userId, -activity.xpEarned);
      }
      await onActivityDeleted(id);
      setDeleteConfirm(null);
      toast('Workout deleted', 'info', '🗑️');
    } catch (err) {
      console.error('Error deleting workout:', err);
      toast('Failed to delete workout', 'error', '❌');
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Activities</h1>
          <p className="page-subtitle">{activities.length} total workouts logged</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
          <Plus size={16} /> Log Workout
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Search */}
        <div className="search-bar" style={{ flex: '1 1 200px', minWidth: 200 }}>
          <Search size={16} />
          <input
            className="search-input"
            placeholder="Search workouts..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>

        {/* Sport filter chips */}
        <div className="filter-bar" style={{ margin: 0 }}>
          {SPORT_FILTERS.map(f => (
            <button
              key={f.value}
              className={`filter-chip ${sportFilter === f.value ? 'active' : ''}`}
              onClick={() => { setSportFilter(f.value); setPage(1); }}
            >{f.label}</button>
          ))}
        </div>

        {/* Sort */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Filter size={14} style={{ color: 'var(--text-3)' }} />
          <select
            className="form-select"
            style={{ width: 'auto', padding: '6px 12px' }}
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
          >
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>Sort: {o.label}</option>)}
          </select>
        </div>
      </div>

      {/* Activity list */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">🔍</span>
          <div className="empty-title">No workouts found</div>
          <div className="empty-desc">Try adjusting your filters or log a new workout.</div>
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
            <Plus size={16} /> Log Workout
          </button>
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
                  <div className="activity-info">
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
                  </div>
                  <div className="activity-right">
                    <span className="badge badge-xp">+{activity.xpEarned} XP</span>
                    <span className="activity-date">
                      {new Date(activity.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => setEditActivity(activity)}
                        title="Edit"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => setDeleteConfirm(activity.id)}
                        title="Delete"
                      >
                        <Trash2 size={13} />
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
                Load more ({filtered.length - paginated.length} remaining)
              </button>
            </div>
          )}
        </>
      )}

      {/* Delete confirmation */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal" style={{ maxWidth: 360 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Delete Workout?</h2>
            </div>
            <p style={{ color: 'var(--text-2)', marginBottom: 24 }}>
              This will permanently delete this workout and deduct the XP earned. This cannot be undone.
            </p>
            <div className="form-actions">
              <button className="btn btn-secondary" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => handleDelete(deleteConfirm)}>Delete</button>
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
    </div>
  );
}
