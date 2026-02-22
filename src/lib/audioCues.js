/**
 * Audio cues during GPS recording: TTS (Web Speech API) and optional lap beep.
 * No external TTS service; uses built-in browser/OS speech.
 */

/**
 * Check if TTS is available (SpeechSynthesis in browser).
 */
export function isAvailable() {
  if (typeof window === 'undefined') return false;
  return Boolean(window.speechSynthesis);
}

/**
 * Cancel any current speech so the next announcement can start immediately.
 */
function cancelSpeech() {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

/**
 * Speak text using Web Speech API. Queues one utterance; cancels previous.
 * @param {string} text
 * @param {object} [opts] - optional rate, pitch, volume
 */
export function speak(text, opts = {}) {
  if (!isAvailable() || !text?.trim()) return;
  cancelSpeech();
  const u = new SpeechSynthesisUtterance(text.trim());
  u.rate = opts.rate ?? 1;
  u.pitch = opts.pitch ?? 1;
  u.volume = opts.volume ?? 1;
  u.lang = opts.lang ?? 'en-US';
  window.speechSynthesis.speak(u);
}

/**
 * Play a short beep using Web Audio API (optional lap cue).
 */
export function playLapBeep() {
  if (typeof window === 'undefined' || !window.AudioContext && !window.webkitAudioContext) return;
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.12);
  } catch {
    // ignore if audio not allowed or unsupported
  }
}

/**
 * Announce workout started. Call when GPS recording starts.
 */
export function announceStart() {
  speak('Workout started.');
}

/**
 * Announce workout stopped. Call when GPS recording stops.
 */
export function announceStop() {
  speak('Workout stopped.');
}

/**
 * Announce a lap/split: optional beep + TTS with lap number and/or distance/time.
 * @param {{ lapNumber?: number, distanceMi?: number, elapsedMin?: number, playBeep?: boolean }} opts
 */
export function announceLap(opts = {}) {
  const { lapNumber, distanceMi, elapsedMin, playBeep = true } = opts;
  if (playBeep) playLapBeep();
  const parts = [];
  if (lapNumber != null && lapNumber > 0) parts.push(`Lap ${lapNumber}`);
  if (distanceMi != null && distanceMi > 0) {
    const mi = distanceMi === Math.floor(distanceMi) ? String(Math.round(distanceMi)) : distanceMi.toFixed(1);
    parts.push(`${mi} mile${distanceMi !== 1 ? 's' : ''}`);
  }
  if (elapsedMin != null && elapsedMin > 0) {
    const m = Math.floor(elapsedMin);
    const s = Math.round((elapsedMin * 60) % 60);
    if (m > 0) parts.push(`${m} minute${m !== 1 ? 's' : ''}`);
    if (s > 0 && m < 60) parts.push(`${s} second${s !== 1 ? 's' : ''}`);
  }
  const text = parts.length ? parts.join('. ') : 'Lap';
  speak(text);
}

/**
 * Parse interval setting string into numeric value and type.
 * e.g. '1_mi' -> { type: 'distance', valueMi: 1 }, '5_min' -> { type: 'time', valueMin: 5 }
 */
export function parseIntervalSetting(value) {
  if (!value || typeof value !== 'string') return { type: 'distance', valueMi: 1 };
  if (value.endsWith('_mi')) {
    const n = parseFloat(value.replace('_mi', ''));
    return { type: 'distance', valueMi: Number.isFinite(n) && n > 0 ? n : 1 };
  }
  if (value.endsWith('_min')) {
    const n = parseFloat(value.replace('_min', ''));
    return { type: 'time', valueMin: Number.isFinite(n) && n > 0 ? n : 5 };
  }
  return { type: 'distance', valueMi: 1 };
}

/**
 * Options for interval dropdown in settings (value is stored in settings.audioCuesInterval).
 */
export const AUDIO_CUES_INTERVAL_OPTIONS = [
  { value: '0.5_mi', labelKey: 'audioCuesEveryHalfMile' },
  { value: '1_mi', labelKey: 'audioCuesEvery1Mile' },
  { value: '2_mi', labelKey: 'audioCuesEvery2Miles' },
  { value: '5_min', labelKey: 'audioCuesEvery5Min' },
  { value: '10_min', labelKey: 'audioCuesEvery10Min' },
];
