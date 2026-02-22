import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Plus, Trash2, Target, Calendar } from 'lucide-react';
import { useApp } from '../App';
import { firestoreChallenges, firestoreUser } from '../lib/firestore';
import { trackEvent } from '../lib/analytics';
import { SPORTS } from '../lib/constants';
import { formatDistanceToNow } from 'date-fns';
import { COPY } from '../lib/copy';

// Week key (Monday YYYY-MM-DD) for idempotent weekly challenge claims.
function getWeekKey(date = new Date()) {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay() + 1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

const WEEKLY_CHALLENGES = [
  {
    id: 'wc_run_20', name: 'Run the Week', icon: '🏃', sport: 'run',
    description: 'Log 20 miles of running this week', type: 'distance',
    targetValue: 20, unit: 'mi', xpReward: 300,
  },
  {
    id: 'wc_lift_4', name: 'Iron Week', icon: '🏋️', sport: 'lift',
    description: 'Complete 4 strength sessions this week', type: 'frequency',
    targetValue: 4, unit: 'workouts', xpReward: 250,
  },
  {
    id: 'wc_cycle_50', name: 'Cycle Century', icon: '🚴', sport: 'cycle',
    description: 'Ride 50 miles this week', type: 'distance',
    targetValue: 50, unit: 'mi', xpReward: 350,
  },
  {
    id: 'wc_swim_5k', name: 'Swim Challenge', icon: '🏊', sport: 'swim',
    description: 'Swim 5,000 yards this week', type: 'distance',
    targetValue: 5000, unit: 'yd', xpReward: 280,
  },
  {
    id: 'wc_run_4', name: 'Consistency Runner', icon: '🏃', sport: 'run',
    description: 'Complete 4 running workouts this week', type: 'frequency',
    targetValue: 4, unit: 'workouts', xpReward: 220,
  },
  {
    id: 'wc_cycle_3', name: 'Bike Base Builder', icon: '🚴', sport: 'cycle',
    description: 'Complete 3 cycling sessions this week', type: 'frequency',
    targetValue: 3, unit: 'workouts', xpReward: 210,
  },
  {
    id: 'wc_swim_3', name: 'Pool Regular', icon: '🏊', sport: 'swim',
    description: 'Swim 3 sessions this week', type: 'frequency',
    targetValue: 3, unit: 'workouts', xpReward: 200,
  },
  {
    id: 'wc_run_30', name: 'Distance Hunter', icon: '🏃', sport: 'run',
    description: 'Log 30 miles of running this week', type: 'distance',
    targetValue: 30, unit: 'mi', xpReward: 420,
  },
  {
    id: 'wc_cycle_75', name: 'Road Grinder', icon: '🚴', sport: 'cycle',
    description: 'Ride 75 miles this week', type: 'distance',
    targetValue: 75, unit: 'mi', xpReward: 500,
  },
  {
    id: 'wc_lift_6', name: 'Strength Streak', icon: '🏋️', sport: 'lift',
    description: 'Complete 6 strength sessions this week', type: 'frequency',
    targetValue: 6, unit: 'workouts', xpReward: 380,
  },
  {
    id: 'wc_swim_8k', name: 'Deep End', icon: '🏊', sport: 'swim',
    description: 'Swim 8,000 yards this week', type: 'distance',
    targetValue: 8000, unit: 'yd', xpReward: 450,
  },
];

function ChallengeCard({ challenge, onDelete, isWeekly }) {
  const pct = Math.min(100, Math.round(((challenge.currentValue || 0) / challenge.targetValue) * 100));
  const sport = SPORTS[challenge.sport];
  const sportColors = {
    run: 'var(--run)', cycle: 'var(--cycle)', swim: 'var(--swim)', lift: 'var(--lift)',
  };
  const color = sportColors[challenge.sport] || 'var(--text)';
  const isComplete = pct >= 100;

  return (
    <div className="challenge-card" style={{ borderColor: isComplete ? 'var(--success)' : undefined }}>
      <div className="challenge-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: '1.25rem' }}>{challenge.icon || sport?.icon}</span>
            <div className="challenge-name">{challenge.name}</div>
            {isComplete && <span style={{ fontSize: '0.7rem', color: 'var(--success)', fontWeight: 700 }}>{COPY.challengesDone}</span>}
          </div>
          <div className="challenge-desc">{challenge.description}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
          <span className="badge badge-xp">+{challenge.xpReward} XP</span>
          {!isWeekly && onDelete && (
            <button className="btn btn-danger btn-sm" onClick={() => onDelete(challenge.id)}>
              <Trash2 size={12} />
            </button>
          )}
        </div>
      </div>

      <div className="challenge-progress-label">
        <span>{challenge.currentValue || 0} / {challenge.targetValue} {challenge.unit}</span>
        <span style={{ fontWeight: 700, color }}>{pct}%</span>
      </div>
      <div className="progress-bar">
        <div
          className="progress-fill"
          style={{ width: `${pct}%`, background: isComplete ? 'var(--success)' : color }}
        />
      </div>

      <div className="challenge-footer">
        {challenge.deadline ? (
          <span>
            <Calendar size={12} style={{ display: 'inline', marginRight: 4 }} />
            Ends {formatDistanceToNow(new Date(challenge.deadline), { addSuffix: true })}
          </span>
        ) : <span />}
        {isWeekly && <span style={{ color: 'var(--text-2)', fontWeight: 600, fontSize: '0.75rem' }}>{COPY.challengesCommunity}</span>}
      </div>
    </div>
  );
}

function CreateChallengeModal({ onClose, onSave }) {
  const [name, setName] = useState('');
  const [type, setType] = useState('distance');
  const [sport, setSport] = useState('run');
  const [targetValue, setTargetValue] = useState('');
  const [deadline, setDeadline] = useState('');
  const [xpReward, setXpReward] = useState(100);
  const { toast } = useApp();

  const handleSave = () => {
    if (!name.trim() || !targetValue || !deadline) {
      toast(COPY.challengesFillRequired, 'error', '❌');
      return;
    }
    const challenge = {
      id: `custom_${Date.now()}`,
      name: name.trim(),
      type,
      sport,
      targetValue: parseFloat(targetValue),
      currentValue: 0,
      unit: type === 'distance' ? SPORTS[sport]?.unit : type === 'frequency' ? 'workouts' : 'min',
      deadline: new Date(deadline).getTime(),
      xpReward: parseInt(xpReward) || 100,
      description: `${name} — ${targetValue} ${type === 'distance' ? SPORTS[sport]?.unit : type === 'frequency' ? 'workouts' : 'minutes'}`,
      icon: SPORTS[sport]?.icon,
      isCustom: true,
    };
    onSave(challenge);
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()} role="presentation">
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="create-challenge-title">
        <div className="modal-header">
          <h2 id="create-challenge-title" className="modal-title">{COPY.challengesModalTitle}</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label={COPY.challengesCloseModal}><Target size={18} aria-hidden="true" /></button>
        </div>

        <div className="form-group">
          <label className="form-label">{COPY.challengesChallengeName}</label>
          <input className="form-input" placeholder={COPY.challengesPlaceholderName} value={name} onChange={e => setName(e.target.value)} />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">{COPY.challengesType}</label>
            <select className="form-select" value={type} onChange={e => setType(e.target.value)}>
              <option value="distance">{COPY.challengesTypeDistance}</option>
              <option value="frequency">{COPY.challengesTypeFrequency}</option>
              <option value="duration">{COPY.challengesTypeDuration}</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">{COPY.challengesSport}</label>
            <select className="form-select" value={sport} onChange={e => setSport(e.target.value)}>
              {Object.entries(SPORTS).map(([k, s]) => (
                <option key={k} value={k}>{s.icon} {s.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">
              {COPY.challengesTarget} ({type === 'distance' ? SPORTS[sport]?.unit : type === 'frequency' ? COPY.challengesWorkouts : COPY.challengesMinutes}) *
            </label>
            <input type="number" className="form-input" placeholder={COPY.challengesPlaceholderTarget} value={targetValue} onChange={e => setTargetValue(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">{COPY.challengesXpReward}</label>
            <input type="number" className="form-input" value={xpReward} onChange={e => setXpReward(e.target.value)} />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">{COPY.challengesDeadline}</label>
          <input type="date" className="form-input" value={deadline} onChange={e => setDeadline(e.target.value)} />
        </div>

        <div className="form-actions">
          <button className="btn btn-secondary" onClick={onClose}>{COPY.cancel}</button>
          <button className="btn btn-primary" onClick={handleSave}>{COPY.challengesCreateButton}</button>
        </div>
      </div>
    </div>
  );
}

export default function Challenges() {
  const { activities, user, toast } = useApp();
  const [customChallenges, setCustomChallenges] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [tab, setTab] = useState('weekly');
  const [sportFilter, setSportFilter] = useState('all');

  // Subscribe to custom challenges
  useEffect(() => {
    if (!user) return;
    const unsub = firestoreChallenges.subscribe(user.uid, (data) => {
      setCustomChallenges(data);
    });
    return unsub;
  }, [user]);

  // Calculate weekly challenge progress from activities (must be declared before useEffect that uses it)
  const weeklyWithProgress = useMemo(() => {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() + 1);
    weekStart.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(weekStart);
    endOfWeek.setDate(weekStart.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 0);

    const weekActivities = activities.filter(a => new Date(a.date) >= weekStart);

    return WEEKLY_CHALLENGES.map(c => {
      let currentValue = 0;
      const sportActs = weekActivities.filter(a => a.sport === c.sport);
      if (c.type === 'distance') {
        currentValue = sportActs.reduce((s, a) => s + (a.distance || 0), 0);
      } else if (c.type === 'frequency') {
        currentValue = sportActs.length;
      }
      return { ...c, currentValue: Math.round(currentValue * 10) / 10, deadline: endOfWeek.getTime() };
    });
  }, [activities]);

  // Weekly challenge completion is evaluated here on Challenges page load (Weekly tab).
  // When a challenge's progress meets or exceeds target, we award XP once per challenge per week
  // and persist the claim in Firestore so it is idempotent on next open.
  const claimedThisSession = useRef(new Set());
  useEffect(() => {
    if (tab !== 'weekly' || !user?.uid || weeklyWithProgress.length === 0) return;
    const weekKey = getWeekKey();
    (async () => {
      const dbUser = await firestoreUser.get(user.uid);
      const claimed = dbUser?.claimedWeeklyChallenges || {};
      const toClaim = weeklyWithProgress.filter(
        (c) => (c.currentValue || 0) >= c.targetValue && claimed[c.id] !== weekKey && !claimedThisSession.current.has(c.id)
      );
      if (toClaim.length === 0) return;
      try {
        for (const c of toClaim) {
          await firestoreUser.addXP(user.uid, c.xpReward);
          claimedThisSession.current.add(c.id);
          trackEvent('challenge_completed', { challenge_id: c.id, sport: c.sport, xp_reward: c.xpReward });
          toast(`Weekly challenge complete: ${c.name} +${c.xpReward} XP`, 'success', '🏆');
        }
        await firestoreUser.update(user.uid, {
          claimedWeeklyChallenges: { ...claimed, ...Object.fromEntries(toClaim.map((c) => [c.id, weekKey])) },
        });
      } catch (err) {
        console.error('Failed to claim weekly challenges:', err);
      }
    })();
  }, [tab, user?.uid, weeklyWithProgress, toast]);

  const handleCreateChallenge = async (challenge) => {
    try {
      await firestoreChallenges.add({ ...challenge, userId: user.uid });
      trackEvent('challenge_joined', { challenge_id: challenge.id, sport: challenge.sport, type: 'custom' });
      setShowCreate(false);
      toast(COPY.challengesCreated, 'success', '🏆');
    } catch (err) {
      console.error('Error creating challenge:', err);
      toast(COPY.challengesCreateFailed, 'error', '❌');
    }
  };

  const handleDeleteChallenge = async (id) => {
    try {
      await firestoreChallenges.delete(id);
      toast(COPY.challengesDeleted, 'info', '🗑️');
    } catch (err) {
      console.error('Error deleting challenge:', err);
      toast(COPY.challengesDeleteFailed, 'error', '❌');
    }
  };

  const filteredWeeklyChallenges = useMemo(() => {
    if (sportFilter === 'all') return weeklyWithProgress;
    return weeklyWithProgress.filter(c => c.sport === sportFilter);
  }, [weeklyWithProgress, sportFilter]);

  const filteredCustomChallenges = useMemo(() => {
    if (sportFilter === 'all') return customChallenges;
    return customChallenges.filter(c => c.sport === sportFilter);
  }, [customChallenges, sportFilter]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{COPY.challengesTitle}</h1>
          <p className="page-subtitle">{COPY.challengesSubtitle}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <Plus size={16} /> {COPY.challengesCreate}</button>
      </div>

      <div className="tabs">
        <button className={`tab-btn ${tab === 'weekly' ? 'active' : ''}`} onClick={() => setTab('weekly')}>
          {COPY.challengesWeekly}
        </button>
        <button className={`tab-btn ${tab === 'custom' ? 'active' : ''}`} onClick={() => setTab('custom')}>
          {COPY.challengesMyChallenges} ({customChallenges.length})
        </button>
      </div>

      <div className="filter-bar">
        <button
          className={`filter-chip ${sportFilter === 'all' ? 'active' : ''}`}
          onClick={() => setSportFilter('all')}
        >
          {COPY.challengesAllSports}
        </button>
        {Object.entries(SPORTS).map(([key, sport]) => (
          <button
            key={key}
            className={`filter-chip ${sportFilter === key ? 'active' : ''}`}
            onClick={() => setSportFilter(key)}
          >
            {sport.icon} {sport.label}
          </button>
        ))}
      </div>

      {tab === 'weekly' && (
        filteredWeeklyChallenges.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon" aria-hidden="true">🔎</span>
            <h3 className="empty-title">{COPY.challengesEmptyWeeklyTitle}</h3>
            <p className="empty-desc">{COPY.challengesEmptyWeeklyDesc}</p>
            <button type="button" className="btn btn-primary" onClick={() => setSportFilter('all')}>{COPY.challengesShowAllSports}</button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
            {filteredWeeklyChallenges.map(c => (
              <ChallengeCard key={c.id} challenge={c} isWeekly />
            ))}
          </div>
        )
      )}

      {tab === 'custom' && (
        customChallenges.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon" aria-hidden="true">🎯</span>
            <h3 className="empty-title">{COPY.challengesEmptyCustomTitle}</h3>
            <p className="empty-desc">{COPY.challengesEmptyCustomDesc}</p>
            <button type="button" className="btn btn-primary" onClick={() => setShowCreate(true)}>
              <Plus size={16} aria-hidden="true" /> {COPY.challengesCreate}
            </button>
          </div>
        ) : filteredCustomChallenges.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon" aria-hidden="true">🔎</span>
            <h3 className="empty-title">{COPY.challengesEmptyCustomFilterTitle}</h3>
            <p className="empty-desc">{COPY.challengesEmptyCustomFilterDesc}</p>
            <button type="button" className="btn btn-secondary" onClick={() => setSportFilter('all')}>{COPY.challengesShowAllSports}</button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
            {filteredCustomChallenges.map(c => (
              <ChallengeCard key={c.id} challenge={c} onDelete={handleDeleteChallenge} />
            ))}
          </div>
        )
      )}

      {showCreate && (
        <CreateChallengeModal
          onClose={() => setShowCreate(false)}
          onSave={handleCreateChallenge}
        />
      )}
    </div>
  );
}
