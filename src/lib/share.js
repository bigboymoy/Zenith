/**
 * Share flow: Web Share API when available; fallback copy-to-clipboard.
 * Used after logging a workout or unlocking an achievement.
 */

export const SHARE_APP_URL =
  typeof window !== 'undefined' ? window.location.origin : '';

/**
 * Share content. Uses navigator.share when available; otherwise copies text + url to clipboard.
 * @param {{ text: string, url?: string, title?: string }} opts
 * @returns {Promise<{ shared?: boolean, copied?: boolean }>} shared true if native share used, copied true if fallback copy succeeded
 */
export async function shareContent({ text, url = SHARE_APP_URL, title = 'Zenith' }) {
  const fullUrl = url || SHARE_APP_URL;
  const copyText = fullUrl ? `${text} ${fullUrl}`.trim() : text;

  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({
        title,
        text,
        url: fullUrl || undefined,
      });
      return { shared: true };
    } catch (err) {
      if (err?.name === 'AbortError') return {};
      // Fall through to copy
    }
  }

  try {
    await navigator.clipboard.writeText(copyText);
    return { copied: true };
  } catch {
    return {};
  }
}

/** Pre-filled text for sharing a logged workout (sport-agnostic or by sport). */
export function getWorkoutShareText(sport) {
  const verb = sport ? `logged a ${sport}` : 'logged a workout';
  return `I just ${verb} on Zenith!`;
}

/** Pre-filled text for sharing an achievement. */
export const ACHIEVEMENT_SHARE_TEXT = 'I just unlocked an achievement on Zenith!';
