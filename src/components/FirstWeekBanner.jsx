import React, { useState, useMemo } from 'react';

const STORAGE_REMINDER = 'zenith_first_week_reminder_shown';
const STORAGE_CELEBRATED = 'zenith_first_week_celebrated';

function getStored(key) {
  try {
    return localStorage.getItem(key) === 'true';
  } catch {
    return false;
  }
}

function setStored(key, value) {
  try {
    localStorage.setItem(key, value ? 'true' : 'false');
  } catch { /* ignore localStorage errors */ }
}

/**
 * Returns days since join (0 = join day, 1 = next day, etc.). Uses start-of-day
 * comparison in local time for "calendar day".
 */
export function getDaysSinceJoin(joinedAt) {
  if (!joinedAt) return null;
  const join = new Date(joinedAt);
  const now = new Date();
  join.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  const diff = now.getTime() - join.getTime();
  return Math.floor(diff / (24 * 60 * 60 * 1000));
}

/**
 * Minimal first-week banner: Day 1 first-workout CTA, Day 2–3 gentle reminder (once),
 * Day 7+ "Week one complete" celebration (once). See FIRST_WEEK_SPEC.md.
 */
export default function FirstWeekBanner({ user, activityCount, onLogWorkout }) {
  const [dismissed, setDismissed] = useState(false);
  const [reminderShown, _setReminderShown] = useState(() => getStored(STORAGE_REMINDER));
  const [celebrated, _setCelebrated] = useState(() => getStored(STORAGE_CELEBRATED));

  const state = useMemo(() => {
    const joinedAt = user?.joinedAt ?? user?.createdAt;
    const days = getDaysSinceJoin(joinedAt);
    if (days == null || days < 0) return null;
    const inFirstWeek = days < 7;
    const isDay1 = days <= 1;
    const isDay2Or3 = days === 1 || days === 2; // Day 2 = 1 day after join, Day 3 = 2 days after
    const isDay7OrLater = days >= 6; // Day 7 = 6 zero-indexed from join day

    // Day 1 + 0 activities → first workout CTA
    if (inFirstWeek && isDay1 && activityCount === 0) {
      return { type: 'first', message: 'Log your first workout — every journey starts with one session.', cta: 'Log workout' };
    }
    // Day 2–3 + < 2 activities + reminder not shown → gentle reminder (once)
    if (inFirstWeek && isDay2Or3 && activityCount < 2 && !reminderShown) {
      return {
        type: 'reminder',
        message: `You're on day ${days + 1} — ready for workout number two? Log a session to keep the momentum going.`,
        cta: 'Log workout',
      };
    }
    // Day 7+ + 3+ activities + not yet celebrated → week one complete
    if (isDay7OrLater && activityCount >= 3 && !celebrated) {
      return {
        type: 'celebration',
        message: "Week one complete — you've logged 3+ workouts. Here's to many more.",
        cta: null,
      };
    }
    return null;
  }, [user?.joinedAt, user?.createdAt, activityCount, reminderShown, celebrated]);

  // Persist "reminder shown" / "celebrated" when banner is first displayed (so we don't show again on future visits). Banner stays visible until user dismisses.
  React.useEffect(() => {
    if (state?.type === 'reminder') setStored(STORAGE_REMINDER, true);
    else if (state?.type === 'celebration') setStored(STORAGE_CELEBRATED, true);
  }, [state?.type]);

  if (!state || dismissed) return null;

  return (
    <div className="first-week-banner" role="region" aria-label="First week">
      <p className="first-week-banner-message">{state.message}</p>
      <div className="first-week-banner-actions">
        {state.cta && (
          <button type="button" className="btn btn-primary btn-sm" onClick={onLogWorkout}>
            {state.cta}
          </button>
        )}
        <button
          type="button"
          className="icon-btn first-week-banner-dismiss"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
    </div>
  );
}
