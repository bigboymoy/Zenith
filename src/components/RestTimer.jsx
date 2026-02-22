import React, { useState, useEffect, useRef } from 'react';
import { X, Play, Pause, RotateCcw } from 'lucide-react';
import { COPY } from '../lib/copy';

const STORAGE_KEYS = {
  lastDuration: 'zenith_rest_timer_last_duration',
  soundOn: 'zenith_rest_timer_sound_on',
  vibrateOn: 'zenith_rest_timer_vibrate_on',
};

const PRESETS = [30, 60, 90, 120];
const DEFAULT_DURATION = 90;

function getStoredNumber(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    if (v == null) return fallback;
    const n = parseInt(v, 10);
    return Number.isNaN(n) ? fallback : Math.max(1, Math.min(600, n));
  } catch {
    return fallback;
  }
}

function getStoredBool(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    if (v == null) return fallback;
    return v === 'true';
  } catch {
    return fallback;
  }
}

function setStored(key, value) {
  try {
    localStorage.setItem(key, String(value));
  } catch { /* ignore */ }
}

// Short beep via Web Audio
function playBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 800;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.15);
  } catch { /* ignore */ }
}

// Vibration (works in many mobile browsers; no Capacitor Haptics required)
function triggerVibrate() {
  try {
    if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
  } catch { /* ignore */ }
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function RestTimer({ onClose }) {
  const [duration, setDuration] = useState(() =>
    getStoredNumber(STORAGE_KEYS.lastDuration, DEFAULT_DURATION)
  );
  const [remaining, setRemaining] = useState(duration);
  const [running, setRunning] = useState(false);
  const [soundOn, setSoundOn] = useState(() =>
    getStoredBool(STORAGE_KEYS.soundOn, true)
  );
  const [vibrateOn, setVibrateOn] = useState(() =>
    getStoredBool(STORAGE_KEYS.vibrateOn, true)
  );
  const [expired, setExpired] = useState(false);
  const intervalRef = useRef(null);
  const modalRef = useRef(null);

  // Persist last duration when it changes (user picked preset or will use current)
  useEffect(() => {
    if (!running && !expired) setStored(STORAGE_KEYS.lastDuration, duration);
  }, [duration, running, expired]);

  useEffect(() => {
    setStored(STORAGE_KEYS.soundOn, soundOn);
  }, [soundOn]);
  useEffect(() => {
    setStored(STORAGE_KEYS.vibrateOn, vibrateOn);
  }, [vibrateOn]);

  // Countdown
  useEffect(() => {
    if (!running || remaining <= 0) return;
    intervalRef.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          setRunning(false);
          setExpired(true);
          if (soundOn) playBeep();
          if (vibrateOn) triggerVibrate();
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- interval must not reset when remaining ticks
  }, [running, soundOn, vibrateOn]);

  const start = () => {
    setExpired(false);
    setRemaining(duration);
    setRunning(true);
  };
  const pause = () => setRunning(false);
  const reset = () => {
    setRunning(false);
    setExpired(false);
    setRemaining(duration);
  };
  const setPreset = (sec) => {
    setDuration(sec);
    setRemaining(sec);
    setRunning(false);
    setExpired(false);
  };

  // Focus trap and Escape
  useEffect(() => {
    const focusable = modalRef.current?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable?.[0];
    if (first) first.focus();
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const modalTitleId = 'rest-timer-modal-title';

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      role="presentation"
      style={{ zIndex: 1001 }}
    >
      <div
        ref={modalRef}
        className="modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={modalTitleId}
        style={{ maxWidth: 320 }}
      >
        <div className="modal-header">
          <h2 id={modalTitleId} className="modal-title">
            {COPY.restTimerTitle}
          </h2>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label={COPY.restTimerClose}
          >
            <X aria-hidden="true" />
          </button>
        </div>

        <div className="form-group" style={{ marginBottom: 16 }}>
          <div
            style={{
              fontSize: 36,
              fontWeight: 700,
              textAlign: 'center',
              color: expired ? 'var(--success)' : 'var(--text)',
              fontVariantNumeric: 'tabular-nums',
            }}
            aria-live="polite"
            aria-label={`${COPY.restTimerTimeRemaining} ${formatTime(remaining)}`}
          >
            {formatTime(remaining)}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 16 }}>
          {PRESETS.map((sec) => (
            <button
              key={sec}
              type="button"
              className="btn btn-sm"
              style={{
                borderColor: duration === sec ? 'var(--accent)' : undefined,
                background: duration === sec ? 'var(--surface-3)' : undefined,
              }}
              onClick={() => setPreset(sec)}
              aria-pressed={duration === sec}
            >
              {sec}s
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 16 }}>
          {!running ? (
            <button type="button" className="btn btn-primary" onClick={start}>
              <Play size={16} aria-hidden="true" /> {COPY.restTimerStart}
            </button>
          ) : (
            <button type="button" className="btn btn-secondary" onClick={pause}>
              <Pause size={16} aria-hidden="true" /> {COPY.restTimerPause}
            </button>
          )}
          <button
            type="button"
            className="btn btn-secondary"
            onClick={reset}
            disabled={!running && remaining === duration && !expired}
          >
            <RotateCcw size={16} aria-hidden="true" /> {COPY.restTimerReset}
          </button>
        </div>

        <div
          className="form-group"
          style={{
            paddingTop: 12,
            borderTop: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={soundOn}
              onChange={(e) => setSoundOn(e.target.checked)}
              aria-label={COPY.restTimerSoundOn}
            />
            <span style={{ fontSize: 14, color: 'var(--text-2)' }}>
              {COPY.restTimerSoundOn}
            </span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={vibrateOn}
              onChange={(e) => setVibrateOn(e.target.checked)}
              aria-label={COPY.restTimerVibrateOn}
            />
            <span style={{ fontSize: 14, color: 'var(--text-2)' }}>
              {COPY.restTimerVibrateOn}
            </span>
          </label>
        </div>
      </div>
    </div>
  );
}
