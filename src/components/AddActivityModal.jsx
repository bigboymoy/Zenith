import React, { useState, useEffect, useRef } from 'react';
import { X, Plus, Trash2, Share2, Timer, MapPin } from 'lucide-react';
import { useApp } from '../App';
import { useAuth } from '../context/AuthContext';
import { firestoreActivities, firestoreUser, firestoreOneRepMax, firestoreWorkoutTemplates, firestoreFeed, runSegmentMatchingForActivity } from '../lib/firestore';
import { calculateXP } from '../lib/gamification';
import { getBest1RMForExercise, slugExerciseId } from '../lib/strength';
import { shareContent, getWorkoutShareText } from '../lib/share';
import { trackEvent } from '../lib/analytics';
import { SPORTS } from '../lib/constants';
import { COPY } from '../lib/copy';
import {
  isAvailable as gpsAvailable,
  requestPermissions as gpsRequestPermissions,
  startWatching,
  computeStats,
  truncateTrack,
} from '../lib/gpsRecording';
import {
  isAvailable as audioCuesAvailable,
  announceStart,
  announceStop,
  announceLap,
  parseIntervalSetting,
} from '../lib/audioCues';
import {
  MUSCLE_GROUPS,
  getExercisesByMuscleGroup,
} from '../lib/exerciseLibrary';
import RestTimer from './RestTimer';

// Validation limits (sane maximums to catch typos / bad input)
const MAX_DURATION_MIN = 24 * 60;       // 24 hours
const MAX_DISTANCE_MI = 500;
const MAX_DISTANCE_YD = 100000;
const MAX_PACE_MIN_PER_MI = 60;         // very slow pace
const MAX_VOLUME_LBS = 10000000;

function validateNumber(value, opts = {}) {
  const { max = Infinity, fieldName = 'Value', allowZero = true } = opts;
  const num = parseFloat(value);
  if (value === '' || value === null || value === undefined) return { valid: true, value: null };
  if (Number.isNaN(num)) return { valid: false, error: `${fieldName} must be a number.` };
  if (num < 0) return { valid: false, error: `${fieldName} cannot be negative.` };
  if (!allowZero && num === 0) return { valid: false, error: `${fieldName} must be greater than zero.` };
  if (num > max) return { valid: false, error: `${fieldName} is too large (max ${max}).` };
  return { valid: true, value: num };
}

const SPORT_OPTIONS = [
  { value: 'run', label: '🏃 Run' },
  { value: 'cycle', label: '🚴 Cycle' },
  { value: 'swim', label: '🏊 Swim' },
  { value: 'lift', label: '🏋️ Lift' },
];

function newExercise() {
  return { name: '', sets: [{ reps: '', weight: '' }] };
}

function exercisesFromSuggestion(suggestion) {
  if (!suggestion?.exercises?.length) return [newExercise()];
  return suggestion.exercises.map((e) => ({
    name: e.name || '',
    sets: Array(Math.max(1, e.setsCount || 1))
      .fill(null)
      .map(() => ({ reps: '', weight: '' })),
  }));
}

export default function AddActivityModal({ onClose, editActivity = null, initialSuggestion = null }) {
  const { user, toast, onActivityAdded, addActivityOptimistic, settings } = useApp();
  const { currentUser } = useAuth();

  const [sport, setSport] = useState(
    editActivity?.sport ?? initialSuggestion?.sport ?? 'run'
  );
  const [title, setTitle] = useState(
    editActivity?.title ?? initialSuggestion?.title ?? ''
  );
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
    editActivity?.exercises
      ? editActivity.exercises.map((e) => ({
          name: e.name || '',
          sets: (e.sets || []).length
            ? e.sets.map((s) => ({
                reps: String(s.reps ?? ''),
                weight: String(s.weight ?? ''),
              }))
            : [{ reps: '', weight: '' }],
        }))
      : initialSuggestion
        ? exercisesFromSuggestion(initialSuggestion)
        : [newExercise()]
  );
  const [poolType, setPoolType] = useState(editActivity?.poolType || 'pool');
  const [laps, setLaps] = useState(editActivity?.laps || '');
  const [saving, setSaving] = useState(false);
  const [savedForShare, setSavedForShare] = useState(null); // after new workout save, show Share + Done
  const [showRestTimer, setShowRestTimer] = useState(false);
  const [libraryOpenForIndex, setLibraryOpenForIndex] = useState(null);
  const [librarySearch, setLibrarySearch] = useState('');
  const [libraryMuscleGroup, setLibraryMuscleGroup] = useState('');
  const [templates, setTemplates] = useState([]);
  const [showSaveTemplatePrompt, setShowSaveTemplatePrompt] = useState(false);
  const [saveAsTemplateName, setSaveAsTemplateName] = useState('');
  const [gpsMode, setGpsMode] = useState(null);
  const [gpsTrackPoints, setGpsTrackPoints] = useState([]);
  const [gpsStats, setGpsStats] = useState(null);
  const [gpsElapsedMs, setGpsElapsedMs] = useState(0);
  const [gpsLiveDistanceKm, setGpsLiveDistanceKm] = useState(0);
  const gpsStopWatchRef = useRef(null);
  const gpsStartTimeRef = useRef(null);
  const gpsIntervalRef = useRef(null);
  const gpsLastAnnouncedRef = useRef({ distanceMi: 0, timeMin: 0, lapNumber: 0 });
  const modalRef = useRef(null);
  const previousActiveRef = useRef(null);

  // Privacy: per-activity visibility and hide map/start time (defaults from user settings)
  const defaultVisibility = user?.defaultActivityVisibility ?? 'public';
  const defaultHideMap = Boolean(user?.defaultHideMap);
  const defaultHideStartTime = Boolean(user?.defaultHideStartTime);
  const [visibility, setVisibility] = useState(
    editActivity?.visibility ?? defaultVisibility
  );
  const [hideMap, setHideMap] = useState(
    editActivity?.hideMap ?? defaultHideMap
  );
  const [hideStartTime, setHideStartTime] = useState(
    editActivity?.hideStartTime ?? defaultHideStartTime
  );

  const sportInfo = SPORTS[sport];
  const userId = user?.uid || currentUser?.uid;

  // Load templates when modal opens (for "Start from template")
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    firestoreWorkoutTemplates.getByUser(userId).then(data => {
      if (!cancelled) setTemplates(data || []);
    });
    return () => { cancelled = true; };
  }, [userId]);

  // Focus trap and Escape to close
  useEffect(() => {
    previousActiveRef.current = document.activeElement;
    const focusable = modalRef.current?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable?.[0];
    if (first) first.focus();
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previousActiveRef.current?.focus?.();
    };
  }, [onClose]);

  // Exercise helpers
  const addExercise = () => setExercises(prev => [...prev, newExercise()]);
  const removeExercise = (i) => setExercises(prev => prev.filter((_, idx) => idx !== i));
  const updateExerciseName = (i, name) => setExercises(prev => prev.map((e, idx) => idx === i ? { ...e, name } : e));
  const addSet = (i) => setExercises(prev => prev.map((e, idx) => idx === i ? { ...e, sets: [...e.sets, { reps: '', weight: '' }] } : e));
  const removeSet = (ei, si) => setExercises(prev => prev.map((e, idx) => idx === ei ? { ...e, sets: e.sets.filter((_, s) => s !== si) } : e));
  const updateSet = (ei, si, field, val) => setExercises(prev => prev.map((e, idx) =>
    idx === ei ? { ...e, sets: e.sets.map((s, sidx) => sidx === si ? { ...s, [field]: val } : s) } : e
  ));

  const applyTemplate = (template) => {
    if (!template?.exercises?.length) return;
    setSport('lift');
    setTitle(template.name || '');
    setExercises(template.exercises.map(e => ({
      name: e.name || '',
      sets: Array(Math.max(1, e.setsCount || 1)).fill(null).map(() => ({ reps: '', weight: '' })),
    })));
  };

  const canShowGpsRecord = (sport === 'run' || sport === 'cycle') && !editActivity && gpsAvailable();

  const startGpsRecording = async () => {
    const { granted, message } = await gpsRequestPermissions();
    if (!granted) {
      toast(message || COPY.gpsPermissionDenied, 'error', '❌');
      return;
    }
    setGpsTrackPoints([]);
    setGpsLiveDistanceKm(0);
    setGpsElapsedMs(0);
    gpsLastAnnouncedRef.current = { distanceMi: 0, timeMin: 0, lapNumber: 0 };
    gpsStartTimeRef.current = Date.now();
    setGpsMode('recording');
    if (settings?.audioCuesEnabled && audioCuesAvailable()) {
      announceStart();
    }
    try {
      const stop = await startWatching({
        onPoint: (p) => {
          setGpsTrackPoints((prev) => {
            const next = [...prev, { lat: p.lat, lng: p.lng, timestamp: p.timestamp }];
            if (next.length >= 2) {
              const { distanceKm } = computeStats(next);
              setGpsLiveDistanceKm(distanceKm);
            }
            return next;
          });
        },
        onError: (err) => {
          const msg = err?.message || COPY.gpsErrorGeneric;
          if (/denied|permission/i.test(msg)) toast(COPY.gpsPermissionDenied, 'error', '❌');
          else if (/unavailable|services/i.test(msg)) toast(COPY.gpsLocationUnavailable, 'error', '❌');
          else toast(msg, 'error', '❌');
          setGpsMode(null);
        },
      });
      gpsStopWatchRef.current = stop;
    } catch (err) {
      toast(err?.message || COPY.gpsErrorGeneric, 'error', '❌');
      setGpsMode(null);
    }
  };

  useEffect(() => {
    if (gpsMode !== 'recording' || !gpsStartTimeRef.current) return;
    gpsIntervalRef.current = setInterval(() => {
      setGpsElapsedMs(Date.now() - gpsStartTimeRef.current);
    }, 1000);
    return () => {
      if (gpsIntervalRef.current) clearInterval(gpsIntervalRef.current);
    };
  }, [gpsMode]);

  // Lap/split audio cues during GPS recording
  useEffect(() => {
    if (gpsMode !== 'recording' || !settings?.audioCuesEnabled || !audioCuesAvailable()) return;
    const interval = parseIntervalSetting(settings.audioCuesInterval);
    const distanceMi = gpsLiveDistanceKm * 0.621371;
    const elapsedMin = gpsElapsedMs / 60000;
    const r = gpsLastAnnouncedRef.current;
    if (interval.type === 'distance' && interval.valueMi > 0) {
      let nextMi = r.distanceMi + interval.valueMi;
      while (distanceMi >= nextMi) {
        announceLap({ lapNumber: r.lapNumber + 1, distanceMi: nextMi, playBeep: true });
        r.lapNumber += 1;
        r.distanceMi = nextMi;
        nextMi += interval.valueMi;
      }
    } else if (interval.type === 'time' && interval.valueMin > 0) {
      let nextMin = r.timeMin + interval.valueMin;
      while (elapsedMin >= nextMin) {
        announceLap({ lapNumber: r.lapNumber + 1, elapsedMin: nextMin, playBeep: true });
        r.lapNumber += 1;
        r.timeMin = nextMin;
        nextMin += interval.valueMin;
      }
    }
  }, [gpsMode, gpsLiveDistanceKm, gpsElapsedMs, settings?.audioCuesEnabled, settings?.audioCuesInterval]);

  const stopGpsRecording = () => {
    if (settings?.audioCuesEnabled && audioCuesAvailable()) {
      announceStop();
    }
    if (gpsStopWatchRef.current) {
      gpsStopWatchRef.current();
      gpsStopWatchRef.current = null;
    }
    if (gpsIntervalRef.current) {
      clearInterval(gpsIntervalRef.current);
      gpsIntervalRef.current = null;
    }
    const stats = computeStats(gpsTrackPoints);
    setGpsStats(stats);
    setGpsMode('stopped');
  };

  const discardGpsRecording = () => {
    setGpsMode(null);
    setGpsTrackPoints([]);
    setGpsStats(null);
    setGpsElapsedMs(0);
  };

  const saveGpsRecording = async () => {
    if (!title.trim()) { toast(COPY.addActivityPleaseTitle, 'error', '❌'); return; }
    const uid = user?.uid || currentUser?.uid;
    if (!uid) { toast(COPY.addActivityMustBeLoggedIn, 'error', '❌'); return; }
    const stats = gpsStats || computeStats(gpsTrackPoints);
    const distanceMi = stats.distanceKm * 0.621371;
    const durationMin = stats.durationMs / 60000;
    const paceMinPerMile = stats.paceMinPerMile ?? (distanceMi > 0 ? durationMin / distanceMi : null);
    const track = truncateTrack(gpsTrackPoints.map((p) => ({ lat: p.lat, lng: p.lng })));

    setSaving(true);
    try {
      const activity = {
        id: `act_${Date.now()}`,
        userId: uid,
        sport,
        title: title.trim(),
        duration: durationMin,
        distance: distanceMi,
        pace: paceMinPerMile,
        volume: null,
        exercises: null,
        poolType: null,
        laps: null,
        notes: notes.trim() || null,
        date: new Date(date + 'T12:00:00').getTime(),
        createdAt: Date.now(),
        track,
        source: 'gps',
        visibility: visibility || 'public',
        hideMap: Boolean(hideMap),
        hideStartTime: Boolean(hideStartTime),
      };
      activity.xpEarned = calculateXP(activity);
      await firestoreActivities.add(activity);
      try {
        await firestoreFeed.fanOutActivityToFeed(activity);
      } catch (feedErr) {
        console.warn('Feed fan-out failed:', feedErr);
      }
      try {
        await runSegmentMatchingForActivity(activity);
      } catch (matchErr) {
        console.warn('Segment matching failed:', matchErr);
      }
      addActivityOptimistic?.(activity);
      try {
        await firestoreUser.addXP(uid, activity.xpEarned);
      } catch (xpErr) {
        console.error('Workout saved but XP update failed:', xpErr);
        toast(COPY.addActivityXpDelayed, 'info', 'ℹ️');
      }
      trackEvent('activity_added', { sport: activity.sport, has_distance: true, has_duration: true, source: 'gps' });
      toast(`${COPY.addActivityWorkoutLoggedXp} +${activity.xpEarned} XP 🎉`, 'success', '🏋️');
      try {
        await onActivityAdded({ activity, previousActivity: null });
      } catch (achErr) {
        console.error('Workout saved but achievement check failed:', achErr);
      }
      setSavedForShare(activity);
      setGpsMode(null);
      setGpsTrackPoints([]);
      setGpsStats(null);
    } catch (err) {
      console.error('Error saving GPS workout:', err);
      const msg = typeof err?.message === 'string' ? err.message : '';
      if (msg.toLowerCase().includes('permission')) {
        toast(COPY.addActivityPermissionError, 'error', '❌');
      } else {
        toast(COPY.addActivityCouldNotSave, 'error', '❌');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAsTemplate = async () => {
    const withNames = exercises.filter(e => (e.name || '').trim());
    if (!withNames.length) { toast(COPY.templatesOneExerciseRequired, 'error', '❌'); return; }
    if (!saveAsTemplateName.trim()) { toast(COPY.templatesNameRequired, 'error', '❌'); return; }
    if (!userId) { toast(COPY.addActivityMustBeLoggedIn, 'error', '❌'); return; }
    try {
      await firestoreWorkoutTemplates.create(userId, {
        name: saveAsTemplateName.trim(),
        sport: 'lift',
        exercises: withNames.map(e => ({ name: e.name.trim(), setsCount: e.sets.length })),
      });
      toast(COPY.templatesCreated, 'success', '✅');
      setShowSaveTemplatePrompt(false);
      setSaveAsTemplateName('');
    } catch (err) {
      console.error('Save as template failed:', err);
      toast(COPY.templatesCreateFailed, 'error', '❌');
    }
  };

  // Calculate volume for lifts
  const calcVolume = () => {
    return exercises.reduce((sum, ex) =>
      sum + ex.sets.reduce((s, set) => s + ((parseFloat(set.reps) || 0) * (parseFloat(set.weight) || 0)), 0), 0);
  };

  const handleSave = async () => {
    if (!title.trim()) { toast(COPY.addActivityPleaseTitle, 'error', '❌'); return; }
    const userId = user?.uid || currentUser?.uid;
    if (!userId) { toast(COPY.addActivityMustBeLoggedIn, 'error', '❌'); return; }

    // Validate numeric inputs (non-negative, sane max, user-facing errors)
    const durationResult = validateNumber(duration, { max: MAX_DURATION_MIN, fieldName: 'Duration (min)', allowZero: true });
    if (!durationResult.valid) { toast(durationResult.error, 'error', '❌'); return; }
    const distanceResult = validateNumber(distance, { max: sport === 'swim' ? MAX_DISTANCE_YD : MAX_DISTANCE_MI, fieldName: 'Distance', allowZero: true });
    if (!distanceResult.valid) { toast(distanceResult.error, 'error', '❌'); return; }
    const paceResult = validateNumber(pace, { max: MAX_PACE_MIN_PER_MI, fieldName: 'Pace (min per mile)', allowZero: false });
    if (!paceResult.valid && pace !== '' && pace != null) { toast(paceResult.error, 'error', '❌'); return; }

    let numericDuration = (durationResult.value ?? parseFloat(duration)) || 0;
    let numericDistance = (distanceResult.value ?? parseFloat(distance)) || 0;
    let numericPace = (paceResult.value ?? parseFloat(pace)) || 0;
    let finalDuration = numericDuration;
    let finalPace = numericPace;

    if (sport === 'run' || sport === 'cycle') {
      if (!numericDuration && !numericDistance && !numericPace) {
        toast(COPY.addActivityEnterOneMetric, 'error', '❌');
        return;
      }
      if (!finalDuration && numericPace && numericDistance) finalDuration = numericPace * numericDistance;
      if (!finalPace && finalDuration && numericDistance) finalPace = finalDuration / numericDistance;
      const paceCheck = validateNumber(String(finalPace), { max: MAX_PACE_MIN_PER_MI, fieldName: 'Pace', allowZero: false });
      if (!paceCheck.valid && finalPace > 0) { toast(paceCheck.error, 'error', '❌'); return; }
    }

    if (sport === 'swim' && !numericDuration && !numericDistance) {
      toast(COPY.addActivityEnterDurationOrDistance, 'error', '❌');
      return;
    }

    if (sport === 'lift') {
      const vol = calcVolume();
      const volResult = validateNumber(vol, { max: MAX_VOLUME_LBS, fieldName: 'Total volume (lbs)', allowZero: true });
      if (!volResult.valid) { toast(volResult.error, 'error', '❌'); return; }
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
        visibility: visibility || 'public',
        hideMap: Boolean(hideMap),
        hideStartTime: Boolean(hideStartTime),
      };

      activity.xpEarned = calculateXP(activity);

      if (editActivity) {
        await firestoreActivities.updateWithXPDelta(activity);
        if (activity.visibility === 'private') {
          try {
            await firestoreFeed.removeActivityFromFeed(activity.id, activity.userId);
          } catch (feedErr) {
            console.warn('Feed remove failed:', feedErr);
          }
        } else if (activity.visibility === 'public' || activity.visibility === 'followers') {
          try {
            await firestoreFeed.fanOutActivityToFeed(activity);
          } catch (feedErr) {
            console.warn('Feed fan-out failed:', feedErr);
          }
        }
        if (sport === 'lift' && cleanExercises?.length) {
          try {
            const stored = await firestoreOneRepMax.getAll(userId);
            const storedMap = Object.fromEntries((stored || []).map((d) => [d.exerciseId, d]));
            for (const ex of cleanExercises) {
              const exerciseId = slugExerciseId(ex.name);
              if (!exerciseId) continue;
              const best = getBest1RMForExercise(ex.name, [activity]);
              const newVal = best?.value;
              const current = storedMap[exerciseId]?.value ?? 0;
              if (newVal != null && newVal > current) {
                await firestoreOneRepMax.set(userId, exerciseId, newVal, ex.name.trim());
              }
            }
          } catch (ormErr) {
            console.warn('1RM update failed:', ormErr);
          }
        }
        trackEvent('activity_edited', {
          sport: activity.sport,
          has_distance: Boolean(activity.distance),
          has_duration: Boolean(activity.duration),
        });
        toast(COPY.addActivityWorkoutUpdated, 'success', '✅');
        onClose();
        return;
      }

      await firestoreActivities.add(activity);
      try {
        await firestoreFeed.fanOutActivityToFeed(activity);
      } catch (feedErr) {
        console.warn('Feed fan-out failed:', feedErr);
      }
      if (sport === 'lift' && cleanExercises?.length) {
        try {
          const stored = await firestoreOneRepMax.getAll(userId);
          const storedMap = Object.fromEntries((stored || []).map((d) => [d.exerciseId, d]));
          for (const ex of cleanExercises) {
            const exerciseId = slugExerciseId(ex.name);
            if (!exerciseId) continue;
            const best = getBest1RMForExercise(ex.name, [activity]);
            const newVal = best?.value;
            const current = storedMap[exerciseId]?.value ?? 0;
            if (newVal != null && newVal > current) {
              await firestoreOneRepMax.set(userId, exerciseId, newVal, ex.name.trim());
            }
          }
        } catch (ormErr) {
          console.warn('1RM update failed:', ormErr);
        }
      }
      addActivityOptimistic?.(activity);
      try {
        await firestoreUser.addXP(userId, activity.xpEarned);
      } catch (xpErr) {
        console.error('Workout saved but XP update failed:', xpErr);
        toast(COPY.addActivityXpDelayed, 'info', 'ℹ️');
      }
      trackEvent('activity_added', {
        sport: activity.sport,
        has_distance: Boolean(activity.distance),
        has_duration: Boolean(activity.duration),
      });
      toast(`${COPY.addActivityWorkoutLoggedXp} +${activity.xpEarned} XP 🎉`, 'success', '🏋️');

      try {
        await onActivityAdded({ activity, previousActivity: null });
      } catch (achErr) {
        console.error('Workout saved but achievement check failed:', achErr);
      }

      setSavedForShare(activity);
    } catch (err) {
      console.error('Error saving workout:', err);
      const msg = typeof err?.message === 'string' ? err.message : '';
      if (msg.toLowerCase().includes('permission')) {
        toast(COPY.addActivityPermissionError, 'error', '❌');
      } else {
        toast(COPY.addActivityCouldNotSave, 'error', '❌');
      }
      // Do not clear form so user can retry
    } finally {
      setSaving(false);
    }
  };

  const handleShare = async () => {
    if (!savedForShare) return;
    const text = getWorkoutShareText(savedForShare.sport);
    const result = await shareContent({ text });
    if (result.copied) toast(COPY.linkCopied, 'success', '📋');
  };

  const modalTitleId = 'add-activity-modal-title';

  if (savedForShare) {
    return (
      <div className="modal-overlay" onClick={onClose} role="presentation">
        <div
          ref={modalRef}
          className="modal"
          onClick={e => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby={modalTitleId}
        >
          <div className="modal-header">
            <h2 id={modalTitleId} className="modal-title">{COPY.addActivityWorkoutLogged}</h2>
            <button type="button" className="modal-close" onClick={onClose} aria-label={COPY.addActivityCloseModal}><X aria-hidden="true" /></button>
          </div>
          <p style={{ margin: '0 0 var(--space-4)', color: 'var(--text-2)' }}>
            +{savedForShare.xpEarned} {COPY.addActivityXpEarnedShare}
          </p>
          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>{COPY.done}</button>
            <button type="button" className="btn btn-primary" onClick={handleShare}>
              <Share2 size={16} aria-hidden="true" /> {COPY.share}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={modalRef}
        className="modal"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={modalTitleId}
        aria-describedby={undefined}
      >
        <div className="modal-header">
          <h2 id={modalTitleId} className="modal-title">
            {gpsMode === 'idle' ? `Record ${sport === 'run' ? 'run' : 'ride'}` : gpsMode === 'recording' ? COPY.gpsRecording : gpsMode === 'stopped' ? COPY.gpsSummary : editActivity ? COPY.addActivityEditWorkout : COPY.addActivityLogWorkout}
          </h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label={COPY.addActivityCloseModal}><X aria-hidden="true" /></button>
        </div>

        {/* GPS Record flow (run/cycle only) */}
        {gpsMode !== null && (
          <div className="form-group" style={{ marginBottom: 24 }}>
            {gpsMode === 'idle' && (
              <>
                <p style={{ margin: '0 0 16px', color: 'var(--text-2)', fontSize: '0.9rem' }}>
                  Record an outdoor {sport === 'run' ? 'run' : 'ride'} with GPS. Start when you begin, stop when finished.
                </p>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <button type="button" className="btn btn-primary" onClick={startGpsRecording}>
                    <MapPin size={18} aria-hidden="true" /> {COPY.gpsStartRecording}
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={() => setGpsMode(null)}>
                    {COPY.cancel}
                  </button>
                </div>
              </>
            )}
            {gpsMode === 'recording' && (
              <>
                <div style={{ display: 'flex', gap: 24, marginBottom: 16, flexWrap: 'wrap' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-3)', textTransform: 'uppercase' }}>{COPY.gpsDuration}</span>
                    <p style={{ margin: 4, fontSize: '1.5rem', fontWeight: 700 }}>
                      {Math.floor(gpsElapsedMs / 60000)}:{(Math.floor(gpsElapsedMs / 1000) % 60).toString().padStart(2, '0')}
                    </p>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-3)', textTransform: 'uppercase' }}>{COPY.gpsDistance}</span>
                    <p style={{ margin: 4, fontSize: '1.5rem', fontWeight: 700 }}>
                      {(gpsLiveDistanceKm * 0.621371).toFixed(2)} mi
                    </p>
                  </div>
                </div>
                <p style={{ margin: '0 0 12px', fontSize: '0.85rem', color: 'var(--text-2)' }}>
                  {gpsTrackPoints.length} points recorded
                </p>
                <button type="button" className="btn btn-primary" onClick={stopGpsRecording}>
                  {COPY.gpsStopRecording}
                </button>
              </>
            )}
            {gpsMode === 'stopped' && gpsStats && (
              <>
                <h3 style={{ margin: '0 0 12px', fontSize: '1rem', fontWeight: 600 }}>{COPY.gpsSummary}</h3>
                <div style={{ display: 'flex', gap: 24, marginBottom: 16, flexWrap: 'wrap' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-3)', textTransform: 'uppercase' }}>{COPY.gpsDistance}</span>
                    <p style={{ margin: 4, fontSize: '1.25rem', fontWeight: 700 }}>{(gpsStats.distanceKm * 0.621371).toFixed(2)} mi</p>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-3)', textTransform: 'uppercase' }}>{COPY.gpsDuration}</span>
                    <p style={{ margin: 4, fontSize: '1.25rem', fontWeight: 700 }}>
                      {Math.floor(gpsStats.durationMs / 60000)}:{(Math.floor(gpsStats.durationMs / 1000) % 60).toString().padStart(2, '0')}
                    </p>
                  </div>
                  {gpsStats.paceMinPerMile != null && (
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-3)', textTransform: 'uppercase' }}>{COPY.gpsPace}</span>
                      <p style={{ margin: 4, fontSize: '1.25rem', fontWeight: 700 }}>
                        {Math.floor(gpsStats.paceMinPerMile)}:{(Math.round((gpsStats.paceMinPerMile % 1) * 60)).toString().padStart(2, '0')} /mi
                      </p>
                    </div>
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">{COPY.addActivityTitle}</label>
                  <input className="form-input" placeholder={COPY.addActivityPlaceholderTitle} value={title} onChange={e => setTitle(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">{COPY.addActivityDate}</label>
                  <input type="date" className="form-input" value={date} onChange={e => setDate(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">{COPY.addActivityNotesOptional}</label>
                  <textarea className="form-textarea" placeholder={COPY.addActivityPlaceholderNotes} rows={2} value={notes} onChange={e => setNotes(e.target.value)} style={{ resize: 'vertical' }} />
                </div>
                <div className="form-actions">
                  <button type="button" className="btn btn-secondary" onClick={discardGpsRecording}>{COPY.gpsDiscardRecording}</button>
                  <button type="button" className="btn btn-primary" onClick={saveGpsRecording} disabled={saving}>
                    {saving ? COPY.addActivitySaving : COPY.gpsSaveRecording}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {gpsMode === null && (
        <div>
        {/* Sport selector */}
        <div className="form-group">
          <label className="form-label">{COPY.addActivitySport}</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {SPORT_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setSport(opt.value)}
                aria-pressed={sport === opt.value}
                aria-label={`${COPY.addActivitySelectSport} ${opt.label}`}
                style={{
                  flex: 1,
                  minHeight: 44,
                  padding: '8px 4px',
                  borderRadius: 8,
                  border: `2px solid ${sport === opt.value ? 'var(--border-2)' : 'var(--border)'}`,
                  background: sport === opt.value ? 'var(--surface-3)' : 'var(--surface-2)',
                  color: sport === opt.value ? 'var(--text)' : 'var(--text-2)',
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
          <label className="form-label">{COPY.addActivityTitle}</label>
          <input className="form-input" placeholder={COPY.addActivityPlaceholderTitle} value={title} onChange={e => setTitle(e.target.value)} />
        </div>

        {/* Date + Duration */}
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">{COPY.addActivityDate}</label>
            <input type="date" className="form-input" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">
              {sport === 'run' || sport === 'cycle' ? COPY.addActivityDurationOptional : COPY.addActivityDuration}
            </label>
            <input type="number" className="form-input" placeholder={COPY.addActivityPlaceholderDuration} min="1" value={duration} onChange={e => setDuration(e.target.value)} />
          </div>
        </div>

        {/* Cardio fields */}
        {(sport === 'run' || sport === 'cycle') && (
          <>
          {canShowGpsRecord && (
            <div className="form-group">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setGpsMode('idle')}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
              >
                <MapPin size={18} aria-hidden="true" /> {COPY.gpsRecordWithGps}
              </button>
            </div>
          )}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">{COPY.addActivityDistance} ({sportInfo.unit})</label>
              <input type="number" className="form-input" placeholder={COPY.addActivityPlaceholderDistance} step="0.1" value={distance} onChange={e => setDistance(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">{COPY.addActivityAvgPace.replace('{unit}', sportInfo.unit)}</label>
              <input type="number" className="form-input" placeholder={COPY.addActivityPlaceholderPace} step="0.1" value={pace} onChange={e => setPace(e.target.value)} />
            </div>
          </div>
          </>
        )}

        {/* Swim fields */}
        {sport === 'swim' && (
          <>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">{COPY.addActivityDistanceYards}</label>
                <input type="number" className="form-input" placeholder={COPY.addActivityPlaceholderYards} value={distance} onChange={e => setDistance(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">{COPY.addActivityLapsOptional}</label>
                <input type="number" className="form-input" placeholder={COPY.addActivityPlaceholderLaps} value={laps} onChange={e => setLaps(e.target.value)} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">{COPY.addActivityPoolType}</label>
              <select className="form-select" value={poolType} onChange={e => setPoolType(e.target.value)}>
                <option value="pool">{COPY.addActivityPool}</option>
                <option value="open_water">{COPY.addActivityOpenWater}</option>
              </select>
            </div>
          </>
        )}

        {/* Lift exercises */}
        {sport === 'lift' && (
          <>
            <div className="form-group">
              <label className="form-label">{COPY.templatesStartFromTemplate}</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <select
                  className="form-select"
                  style={{ flex: '1 1 180px', minWidth: 0 }}
                  value=""
                  onChange={e => {
                    const id = e.target.value;
                    if (id) {
                      const t = templates.find(x => x.id === id);
                      if (t) applyTemplate(t);
                    }
                  }}
                  aria-label={COPY.templatesSelectTemplate}
                >
                  <option value="">{COPY.templatesSelectTemplate}</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowSaveTemplatePrompt(true)}
                >
                  {COPY.templatesSaveAsTemplate}
                </button>
              </div>
              {showSaveTemplatePrompt && (
                <div style={{ marginTop: 12, padding: 12, background: 'var(--surface-2)', borderRadius: 8, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <input
                    className="form-input"
                    placeholder={COPY.templatesPlaceholderName}
                    value={saveAsTemplateName}
                    onChange={e => setSaveAsTemplateName(e.target.value)}
                    style={{ flex: '1 1 160px', minWidth: 0 }}
                    autoFocus
                  />
                  <button type="button" className="btn btn-primary btn-sm" onClick={handleSaveAsTemplate}>
                    {COPY.done}
                  </button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setShowSaveTemplatePrompt(false); setSaveAsTemplateName(''); }}>
                    {COPY.cancel}
                  </button>
                </div>
              )}
            </div>
            <div className="form-group">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
              <label className="form-label" style={{ margin: 0 }}>{COPY.addActivityExercises}</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {calcVolume() > 0 && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-2)' }}>
                    {COPY.addActivityTotalVolume} <strong style={{ color: 'var(--lift)' }}>{calcVolume().toLocaleString()} lbs</strong>
                  </span>
                )}
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => setShowRestTimer(true)}
                  aria-label={COPY.restTimerOpenAria}
                >
                  <Timer size={14} aria-hidden="true" /> {COPY.restTimerOpen}
                </button>
              </div>
            </div>
            {exercises.map((ex, ei) => {
              const libraryList = (() => {
                const byMuscle = getExercisesByMuscleGroup(libraryMuscleGroup || null);
                const q = librarySearch.trim().toLowerCase();
                if (!q) return byMuscle;
                return byMuscle.filter(
                  (e) =>
                    e.name.toLowerCase().includes(q) ||
                    (e.equipment && e.equipment.toLowerCase().includes(q))
                );
              })();
              return (
              <div key={ei} className="exercise-block">
                <div className="exercise-name-row">
                  <input
                    className="exercise-name-input"
                    placeholder={COPY.addActivityPlaceholderExercise}
                    value={ex.name}
                    onChange={e => updateExerciseName(ei, e.target.value)}
                  />
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => setLibraryOpenForIndex(libraryOpenForIndex === ei ? null : ei)}
                    aria-expanded={libraryOpenForIndex === ei}
                    aria-label={COPY.exerciseLibraryPickFromLibrary}
                  >
                    {COPY.exerciseLibraryPickFromLibrary}
                  </button>
                  {exercises.length > 1 && (
                    <button className="btn btn-ghost btn-sm" onClick={() => removeExercise(ei)}>
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                {libraryOpenForIndex === ei && (
                  <div
                    className="form-group"
                    style={{
                      marginTop: 8,
                      padding: 12,
                      background: 'var(--surface-2)',
                      borderRadius: 8,
                      border: '1px solid var(--border)',
                    }}
                  >
                    <p style={{ margin: '0 0 8px', fontSize: '0.8rem', color: 'var(--text-2)' }}>
                      {COPY.exerciseLibrarySelectExercise}
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                      <input
                        type="search"
                        className="form-input"
                        placeholder={COPY.exerciseLibrarySearchPlaceholder}
                        value={librarySearch}
                        onChange={e => setLibrarySearch(e.target.value)}
                        style={{ flex: '1 1 140px', minWidth: 0 }}
                        aria-label={COPY.exerciseLibrarySearchPlaceholder}
                      />
                      <select
                        className="form-select"
                        value={libraryMuscleGroup}
                        onChange={e => setLibraryMuscleGroup(e.target.value)}
                        aria-label={COPY.exerciseLibraryFilterByMuscle}
                        style={{ flex: '0 0 auto', minWidth: 120 }}
                      >
                        <option value="">{COPY.exerciseLibraryAllMuscles}</option>
                        {MUSCLE_GROUPS.map((mg) => (
                          <option key={mg.value} value={mg.value}>
                            {mg.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <ul
                      style={{
                        listStyle: 'none',
                        margin: 0,
                        padding: 0,
                        maxHeight: 200,
                        overflowY: 'auto',
                        border: '1px solid var(--border)',
                        borderRadius: 6,
                        background: 'var(--surface-1)',
                      }}
                    >
                      {libraryList.length === 0 ? (
                        <li style={{ padding: 12, color: 'var(--text-2)', fontSize: '0.875rem' }}>
                          No exercises match.
                        </li>
                      ) : (
                        libraryList.map((exercise) => (
                          <li key={exercise.id}>
                            <button
                              type="button"
                              className="btn btn-ghost"
                              style={{
                                width: '100%',
                                justifyContent: 'flex-start',
                                textAlign: 'left',
                                padding: '8px 12px',
                                fontSize: '0.875rem',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                              onClick={() => {
                                setExercises((prev) =>
                                  prev.map((e, idx) =>
                                    idx === ei
                                      ? {
                                          ...e,
                                          name: exercise.name,
                                          sets: [
                                            { reps: '', weight: '' },
                                            { reps: '', weight: '' },
                                            { reps: '', weight: '' },
                                          ],
                                        }
                                      : e
                                  )
                                );
                                setLibraryOpenForIndex(null);
                                setLibrarySearch('');
                                setLibraryMuscleGroup('');
                              }}
                            >
                              {exercise.name}
                              {exercise.equipment && (
                                <span style={{ color: 'var(--text-3)', marginLeft: 6, fontWeight: 400 }}>
                                  ({exercise.equipment})
                                </span>
                              )}
                            </button>
                          </li>
                        ))
                      )}
                    </ul>
                  </div>
                )}
                <table className="sets-table">
<thead>
                  <tr>
                    <th>{COPY.addActivitySet}</th>
                    <th>{COPY.addActivityReps}</th>
                    <th>{COPY.addActivityWeightLbs}</th>
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
                            placeholder={COPY.addActivityPlaceholderReps}
                            value={set.reps}
                            onChange={e => updateSet(ei, si, 'reps', e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            className="set-input"
                            placeholder={COPY.addActivityPlaceholderWeight}
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
                  <Plus size={14} /> {COPY.addActivityAddSet}
                </button>
              </div>
              );
            })}
            <button className="btn btn-secondary btn-sm" onClick={addExercise}>
              <Plus size={14} /> {COPY.addActivityAddExercise}
            </button>
          </div>
          </>
        )}

        {/* Privacy (visibility, hide map, hide start time) */}
        <div className="form-group">
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
            {COPY.addActivityPrivacySection}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <label className="form-label" style={{ margin: 0 }}>{COPY.addActivityVisibility}</label>
              <select
                className="form-select"
                style={{ width: 'auto', padding: '6px 12px' }}
                value={visibility}
                onChange={e => setVisibility(e.target.value)}
                aria-label={COPY.addActivityVisibility}
              >
                <option value="public">{COPY.privacyVisibilityPublic}</option>
                <option value="followers">{COPY.privacyVisibilityFollowers}</option>
                <option value="private">{COPY.privacyVisibilityPrivate}</option>
              </select>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.875rem', color: 'var(--text-2)' }}>
              <input type="checkbox" checked={!!hideMap} onChange={e => setHideMap(e.target.checked)} aria-label={COPY.addActivityHideMap} />
              {COPY.addActivityHideMap}
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.875rem', color: 'var(--text-2)' }}>
              <input type="checkbox" checked={!!hideStartTime} onChange={e => setHideStartTime(e.target.checked)} aria-label={COPY.addActivityHideStartTime} />
              {COPY.addActivityHideStartTime}
            </label>
          </div>
        </div>

        {/* Notes */}
        <div className="form-group">
          <label className="form-label">{COPY.addActivityNotesOptional}</label>
          <textarea
            className="form-textarea"
            placeholder={COPY.addActivityPlaceholderNotes}
            rows={2}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            style={{ resize: 'vertical' }}
          />
        </div>

        <div className="form-actions">
          <button className="btn btn-secondary" onClick={onClose}>{COPY.cancel}</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? COPY.addActivitySaving : editActivity ? COPY.addActivityUpdateWorkout : COPY.addActivityLogWorkout}
          </button>
        </div>
        </div>
        )}
      </div>
      {showRestTimer && (
        <RestTimer onClose={() => setShowRestTimer(false)} />
      )}
    </div>
  );
}
