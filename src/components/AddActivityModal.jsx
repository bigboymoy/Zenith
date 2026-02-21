import React, { useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { useApp } from '../App';
import { useAuth } from '../context/AuthContext';
import { firestoreActivities, firestoreUser } from '../lib/firestore';
import { calculateXP } from '../lib/gamification';
import { SPORTS } from '../lib/constants';

const SPORT_OPTIONS = [
  { value: 'run', label: '🏃 Run' },
  { value: 'cycle', label: '🚴 Cycle' },
  { value: 'swim', label: '🏊 Swim' },
  { value: 'lift', label: '🏋️ Lift' },
];

function newExercise() {
  return { name: '', sets: [{ reps: '', weight: '' }] };
}

export default function AddActivityModal({ onClose, editActivity = null }) {
  const { user, toast, onActivityAdded } = useApp();
  const { currentUser } = useAuth();

  const [sport, setSport] = useState(editActivity?.sport || 'run');
  const [title, setTitle] = useState(editActivity?.title || '');
  const [duration, setDuration] = useState(editActivity?.duration || '');
  const [distance, setDistance] = useState(editActivity?.distance || '');
  const [pace, setPace] = useState(editActivity?.pace || '');
  const [notes, setNotes] = useState(editActivity?.notes || '');
  const [date, setDate] = useState(
    editActivity
      ? new Date(editActivity.date).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10)
  );
  const [exercises, setExercises] = useState(
    editActivity?.exercises || [newExercise()]
  );
  const [poolType, setPoolType] = useState(editActivity?.poolType || 'pool');
  const [laps, setLaps] = useState(editActivity?.laps || '');
  const [saving, setSaving] = useState(false);

  const sportInfo = SPORTS[sport];

  // Exercise helpers
  const addExercise = () => setExercises(prev => [...prev, newExercise()]);
  const removeExercise = (i) => setExercises(prev => prev.filter((_, idx) => idx !== i));
  const updateExerciseName = (i, name) => setExercises(prev => prev.map((e, idx) => idx === i ? { ...e, name } : e));
  const addSet = (i) => setExercises(prev => prev.map((e, idx) => idx === i ? { ...e, sets: [...e.sets, { reps: '', weight: '' }] } : e));
  const removeSet = (ei, si) => setExercises(prev => prev.map((e, idx) => idx === ei ? { ...e, sets: e.sets.filter((_, s) => s !== si) } : e));
  const updateSet = (ei, si, field, val) => setExercises(prev => prev.map((e, idx) =>
    idx === ei ? { ...e, sets: e.sets.map((s, sidx) => sidx === si ? { ...s, [field]: val } : s) } : e
  ));

  // Calculate volume for lifts
  const calcVolume = () => {
    return exercises.reduce((sum, ex) =>
      sum + ex.sets.reduce((s, set) => s + ((parseFloat(set.reps) || 0) * (parseFloat(set.weight) || 0)), 0), 0);
  };

  const handleSave = async () => {
    if (!title.trim()) { toast('Please enter a workout title', 'error', '❌'); return; }
    const userId = user?.uid || currentUser?.uid;
    if (!userId) { toast('You must be logged in to save workouts', 'error', '❌'); return; }

    const numericDuration = parseFloat(duration) || 0;
    const numericDistance = parseFloat(distance) || 0;
    const numericPace = parseFloat(pace) || 0;
    let finalDuration = numericDuration;
    let finalPace = numericPace;

    if (sport === 'run' || sport === 'cycle') {
      if (!numericDuration && !numericDistance && !numericPace) {
        toast('Enter at least one metric (duration, distance, or pace)', 'error', '❌');
        return;
      }
      if (!finalDuration && numericPace && numericDistance) finalDuration = numericPace * numericDistance;
      if (!finalPace && finalDuration && numericDistance) finalPace = finalDuration / numericDistance;
    }

    if (sport === 'swim' && !numericDuration && !numericDistance) {
      toast('Enter either duration or distance', 'error', '❌');
      return;
    }

    setSaving(true);
    try {
      let volume = null;
      let cleanExercises = null;

      if (sport === 'lift') {
        cleanExercises = exercises.filter(e => e.name.trim()).map(e => ({
          name: e.name.trim(),
          sets: e.sets.filter(s => s.reps).map(s => ({
            reps: parseInt(s.reps) || 0,
            weight: parseFloat(s.weight) || 0,
          })),
        }));
        volume = calcVolume();
      }

      const activity = {
        id: editActivity?.id || `act_${Date.now()}`,
        userId,
        sport,
        title: title.trim(),
        duration: finalDuration || 0,
        distance: (sport !== 'lift') ? (numericDistance || null) : null,
        pace: (sport === 'run' || sport === 'cycle') ? (finalPace || null) : null,
        volume,
        exercises: cleanExercises,
        poolType: sport === 'swim' ? poolType : null,
        laps: sport === 'swim' ? (parseInt(laps) || null) : null,
        notes: notes.trim() || null,
        date: new Date(date + 'T12:00:00').getTime(),
        createdAt: editActivity?.createdAt || Date.now(),
      };

      activity.xpEarned = calculateXP(activity);

      if (editActivity) {
        await firestoreActivities.updateWithXPDelta(activity);
        toast('Workout updated! ✏️', 'success', '✅');
      } else {
        await firestoreActivities.add(activity);
        // Try XP update, but don't fail workout logging if this step fails.
        try {
          await firestoreUser.addXP(userId, activity.xpEarned);
        } catch (xpErr) {
          console.error('Workout saved but XP update failed:', xpErr);
          toast('Workout logged, but XP update is delayed.', 'info', 'ℹ️');
        }
        toast(`Workout logged! +${activity.xpEarned} XP 🎉`, 'success', '🏋️');
      }

      try {
        await onActivityAdded({ activity, previousActivity: editActivity || null });
      } catch (achErr) {
        console.error('Workout saved but achievement check failed:', achErr);
      }
      onClose();
    } catch (err) {
      console.error('Error saving workout:', err);
      const msg = typeof err?.message === 'string' ? err.message : '';
      if (msg.toLowerCase().includes('permission')) {
        toast('Permission error while saving. Please re-login.', 'error', '❌');
      } else {
        toast('Something went wrong. Try again.', 'error', '❌');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{editActivity ? 'Edit Workout' : 'Log Workout'}</h2>
          <button className="modal-close" onClick={onClose}><X /></button>
        </div>

        {/* Sport selector */}
        <div className="form-group">
          <label className="form-label">Sport</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {SPORT_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setSport(opt.value)}
                style={{
                  flex: 1,
                  padding: '8px 4px',
                  borderRadius: 8,
                  border: `2px solid ${sport === opt.value ? 'var(--accent)' : 'var(--border)'}`,
                  background: sport === opt.value ? 'var(--accent-glow)' : 'var(--surface-2)',
                  color: sport === opt.value ? 'var(--accent-light)' : 'var(--text-2)',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Title */}
        <div className="form-group">
          <label className="form-label">Title</label>
          <input className="form-input" placeholder="e.g. Morning Run" value={title} onChange={e => setTitle(e.target.value)} />
        </div>

        {/* Date + Duration */}
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Date</label>
            <input type="date" className="form-input" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">
              {sport === 'run' || sport === 'cycle' ? 'Duration (min, optional)' : 'Duration (min)'}
            </label>
            <input type="number" className="form-input" placeholder="45" min="1" value={duration} onChange={e => setDuration(e.target.value)} />
          </div>
        </div>

        {/* Cardio fields */}
        {(sport === 'run' || sport === 'cycle') && (
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Distance ({sportInfo.unit})</label>
              <input type="number" className="form-input" placeholder="5.0" step="0.1" value={distance} onChange={e => setDistance(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Avg Pace (min/{sportInfo.unit}, optional)</label>
              <input type="number" className="form-input" placeholder="9.5" step="0.1" value={pace} onChange={e => setPace(e.target.value)} />
            </div>
          </div>
        )}

        {/* Swim fields */}
        {sport === 'swim' && (
          <>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Distance (yards)</label>
                <input type="number" className="form-input" placeholder="1500" value={distance} onChange={e => setDistance(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Laps (optional)</label>
                <input type="number" className="form-input" placeholder="30" value={laps} onChange={e => setLaps(e.target.value)} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Pool Type</label>
              <select className="form-select" value={poolType} onChange={e => setPoolType(e.target.value)}>
                <option value="pool">Pool</option>
                <option value="open_water">Open Water</option>
              </select>
            </div>
          </>
        )}

        {/* Lift exercises */}
        {sport === 'lift' && (
          <div className="form-group">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <label className="form-label" style={{ margin: 0 }}>Exercises</label>
              {calcVolume() > 0 && (
                <span style={{ fontSize: '0.75rem', color: 'var(--text-2)' }}>
                  Total volume: <strong style={{ color: 'var(--lift)' }}>{calcVolume().toLocaleString()} lbs</strong>
                </span>
              )}
            </div>
            {exercises.map((ex, ei) => (
              <div key={ei} className="exercise-block">
                <div className="exercise-name-row">
                  <input
                    className="exercise-name-input"
                    placeholder="Exercise name (e.g. Bench Press)"
                    value={ex.name}
                    onChange={e => updateExerciseName(ei, e.target.value)}
                  />
                  {exercises.length > 1 && (
                    <button className="btn btn-ghost btn-sm" onClick={() => removeExercise(ei)}>
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                <table className="sets-table">
                  <thead>
                    <tr>
                      <th>Set</th>
                      <th>Reps</th>
                      <th>Weight (lbs)</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {ex.sets.map((set, si) => (
                      <tr key={si}>
                        <td style={{ color: 'var(--text-3)', fontSize: '0.8rem', fontWeight: 600 }}>{si + 1}</td>
                        <td>
                          <input
                            type="number"
                            className="set-input"
                            placeholder="10"
                            value={set.reps}
                            onChange={e => updateSet(ei, si, 'reps', e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            className="set-input"
                            placeholder="135"
                            value={set.weight}
                            onChange={e => updateSet(ei, si, 'weight', e.target.value)}
                          />
                        </td>
                        <td>
                          {ex.sets.length > 1 && (
                            <button className="btn btn-ghost btn-sm" onClick={() => removeSet(ei, si)}>
                              <X size={12} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <button className="btn btn-ghost btn-sm" style={{ marginTop: 8 }} onClick={() => addSet(ei)}>
                  <Plus size={14} /> Add Set
                </button>
              </div>
            ))}
            <button className="btn btn-secondary btn-sm" onClick={addExercise}>
              <Plus size={14} /> Add Exercise
            </button>
          </div>
        )}

        {/* Notes */}
        <div className="form-group">
          <label className="form-label">Notes (optional)</label>
          <textarea
            className="form-textarea"
            placeholder="How did it feel? Any PRs?"
            rows={2}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            style={{ resize: 'vertical' }}
          />
        </div>

        <div className="form-actions">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : editActivity ? 'Update Workout' : 'Log Workout'}
          </button>
        </div>
      </div>
    </div>
  );
}
