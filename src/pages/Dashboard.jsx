import React, { useMemo, useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Dumbbell, Flame, Sparkles, Target, Trophy, Zap, Check } from 'lucide-react';
import { useApp } from '../App';
import { calculateStreak, formatDuration } from '../lib/gamification';
import { ACHIEVEMENT_DEFS, SPORTS } from '../lib/constants';
import { startOfWeek } from 'date-fns';
import AddActivityModal from '../components/AddActivityModal';
import FirstWeekBanner from '../components/FirstWeekBanner';
import { getOrCreateDailyQuests, getTodayKey, computeQuestProgress, evaluateAndClaimQuests } from '../lib/quests';
import { firestoreUser } from '../lib/firestore';
import { COPY } from '../lib/copy';
import {
  getSuggestedWorkout,
  isRecommendationDismissedToday,
  dismissRecommendationForToday,
} from '../lib/recommendations';

export default function Dashboard() {
  const { user, activities, achievements, levelInfo, toast } = useApp();
  const [showAdd, setShowAdd] = useState(false);
  const [addModalSuggestion, setAddModalSuggestion] = useState(null);
  const [dailyQuests, setDailyQuests] = useState(() => getOrCreateDailyQuests());
  const location = useLocation();
  const navigate = useNavigate();

  // After onboarding "Log my first workout", open Add Activity
  useEffect(() => {
    if (location.state?.openAddActivity) {
      setShowAdd(true);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state?.openAddActivity, location.pathname, navigate]);

  // Evaluate and claim completed quests when activities or user change (e.g. after save or on load).
  useEffect(() => {
    if (!user?.uid) return;
    evaluateAndClaimQuests(user.uid, activities, firestoreUser, toast).then((r) => r && setDailyQuests(r));
  }, [user?.uid, activities, toast]);

  useEffect(() => {
    if (dailyQuests?.date && dailyQuests.date !== getTodayKey()) {
      setDailyQuests(getOrCreateDailyQuests());
    }
  }, [dailyQuests?.date]);

  const questsWithProgress = useMemo(
    () => computeQuestProgress(dailyQuests?.quests || [], activities),
    [dailyQuests, activities]
  );

  const metrics = useMemo(() => {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const thisWeek = activities.filter(a => new Date(a.date) >= weekStart);
    const weekCount = thisWeek.length;
    const weekDist = thisWeek.filter(a => a.distance).reduce((s, a) => s + (a.distance || 0), 0);
    const weekVol = thisWeek.filter(a => a.volume).reduce((s, a) => s + (a.volume || 0), 0);
    const streak = calculateStreak(activities);
    const longestStreak = user?.longestStreak || streak;
    return { weekCount, weekDist, weekVol, streak, longestStreak };
  }, [activities, user]);

  const recentActivities = activities.slice(0, 5);
  const totalXp = user?.xp || 0;
  const isMaxLevel = levelInfo?.level === 10;
  const xpToNext = isMaxLevel ? 0 : Math.max(0, (levelInfo?.next?.minXP || totalXp) - totalXp);
  const weeklyGoal = 5;
  const weeklyGoalProgress = Math.min(100, Math.round((metrics.weekCount / weeklyGoal) * 100));
  const firstName = (user?.name || 'Athlete').split(' ')[0];

  const quickWorkouts = [
    { id: 'quick-run', name: COPY.dashboardQuickRun, detail: COPY.dashboardQuickRunDetail, xp: 60, sport: 'run' },
    { id: 'strength', name: COPY.dashboardStrengthBuilder, detail: COPY.dashboardStrengthBuilderDetail, xp: 110, sport: 'lift' },
    { id: 'full-body', name: COPY.dashboardFullBodyMix, detail: COPY.dashboardFullBodyMixDetail, xp: 160, sport: 'cycle' },
  ];

  const recentAchievements = useMemo(() => {
    const earned = achievements
      .filter(a => a.earned)
      .map(a => {
        const def = ACHIEVEMENT_DEFS.find(d => d.id === a.id);
        return def ? { ...def, earnedAt: a.earnedAt || 0 } : null;
      })
      .filter(Boolean)
      .sort((a, b) => (b.earnedAt || 0) - (a.earnedAt || 0))
      .slice(0, 3);

    if (earned.length > 0) return earned;
    return ACHIEVEMENT_DEFS.slice(0, 3);
  }, [achievements]);

  const todayKey = getTodayKey();
  const suggestion = getSuggestedWorkout(activities, user);
  const showSuggestion =
    suggestion && !isRecommendationDismissedToday(todayKey);

  const handleStartSuggestion = () => {
    setAddModalSuggestion(suggestion);
    setShowAdd(true);
  };

  const handleCloseAdd = () => {
    setShowAdd(false);
    setAddModalSuggestion(null);
  };

  return (
    <div className="zen-home">
      <FirstWeekBanner
        user={user}
        activityCount={activities.length}
        onLogWorkout={() => setShowAdd(true)}
      />

      <section className="zen-hero">
        <div className="zen-hero-head">
          <p className="zen-hero-welcome">{COPY.dashboardWelcomeBack} {firstName}</p>
          <div className="zen-hero-pills">
            <div className="zen-streak-pill">
              <Flame size={14} />
              <span>{metrics.streak} {COPY.dashboardDayStreak}</span>
            </div>
            <div className="zen-level-chip">
              <Zap size={14} />
              <span>Level {levelInfo?.level || 1}</span>
            </div>
          </div>
        </div>
        <div className="zen-hero-main">
          <div>
            <p className="zen-level-label">{COPY.dashboardTotalXp}</p>
            <h2 className="zen-level-value zen-level-value-hero">
              {totalXp.toLocaleString()}
            </h2>
          </div>
        </div>
        <div className="zen-progress-track">
          <div className="zen-progress-fill" style={{ width: `${Math.max(8, levelInfo?.progress || 0)}%` }} />
        </div>
        <p className="zen-level-sub">
          <Sparkles size={12} />
          {isMaxLevel ? COPY.dashboardMaxLevel : `${xpToNext.toLocaleString()} ${COPY.dashboardXpToLevel} ${(levelInfo?.level || 1) + 1}`}
        </p>
        <hr className="zen-hero-divider" />
        <div className="zen-hero-foot">
          <div>
            <small>{COPY.dashboardWeeklyGoal}</small>
            <strong>{Math.min(metrics.weekCount, weeklyGoal)} / {weeklyGoal} {COPY.dashboardSessions}</strong>
          </div>
          <div>
            <small>{COPY.dashboardTotalWorkouts}</small>
            <strong>{activities.length}</strong>
          </div>
        </div>
      </section>

      {showSuggestion && (
        <section className="zen-section" aria-labelledby="suggested-heading">
          <div className="zen-section-head">
            <h3 id="suggested-heading">
              <Target size={18} aria-hidden="true" />
              {COPY.recommendationsSuggestedForToday}
            </h3>
          </div>
          <div
            className="zen-recommendation-card"
            style={{
              padding: 16,
              background: 'var(--surface-2)',
              borderRadius: 12,
              border: '1px solid var(--border)',
            }}
          >
            <p style={{ margin: '0 0 12px', color: 'var(--text-2)', fontSize: '0.9rem' }}>
              {suggestion.reason}
            </p>
            <p style={{ margin: '0 0 16px', fontWeight: 600, color: 'var(--text)' }}>
              {SPORTS[suggestion.sport]?.icon} {suggestion.title}
            </p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleStartSuggestion}
                aria-label={COPY.recommendationsStartThisWorkoutAria}
              >
                {COPY.recommendationsStartThisWorkout}
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => dismissRecommendationForToday(todayKey)}
              >
                {COPY.recommendationsNotNow}
              </button>
            </div>
          </div>
        </section>
      )}

      <section className="zen-section">
        <div className="zen-section-head">
          <h3>
            <Dumbbell size={18} />
            {COPY.dashboardQuickStart}
          </h3>
        </div>
        <div className="zen-quick-track">
          {quickWorkouts.map(workout => (
            <button key={workout.id} type="button" className={`zen-quick-card zen-quick-${workout.sport}`} onClick={() => setShowAdd(true)} aria-label={`Quick start: ${workout.name}, ${workout.detail}`}>
              <span className="zen-quick-card-emoji">{SPORTS[workout.sport]?.icon}</span>
              <span className="zen-quick-xp-badge">+{workout.xp} XP</span>
              <p className="zen-quick-title">{workout.name}</p>
              <p className="zen-quick-sub">{workout.detail}</p>
            </button>
          ))}
        </div>
      </section>

      <section className="zen-section">
        <div className="zen-section-head">
          <h3>
            <Target size={18} />
            {COPY.dashboardWeeklySnapshot}
          </h3>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            {metrics.weekVol > 0 && (
              <Link to="/progress" state={{ scrollTo: 'strength' }}>{COPY.dashboardView1RM}</Link>
            )}
            <Link to="/activities">{COPY.dashboardDetails}</Link>
          </div>
        </div>
        <div className="zen-ribbon">
          <article>
            <small>{COPY.dashboardSessionsLabel}</small>
            <strong>{metrics.weekCount}</strong>
          </article>
          <article>
            <small>{COPY.dashboardDistance}</small>
            <strong>{metrics.weekDist.toFixed(1)} {COPY.dashboardMiles}</strong>
          </article>
          <article>
            <small>{COPY.dashboardVolume}</small>
            <strong>{metrics.weekVol.toLocaleString()} {COPY.dashboardLbs}</strong>
          </article>
          <article>
            <small>{COPY.dashboardBestStreak}</small>
            <strong>{metrics.longestStreak} {COPY.dashboardDays}</strong>
          </article>
        </div>
        <div className="zen-goal-track-wrap">
          <div className="zen-goal-track">
            <div className="zen-goal-fill" style={{ width: `${Math.max(6, weeklyGoalProgress)}%` }} />
          </div>
          <span>{weeklyGoalProgress}% {COPY.dashboardGoalCompletion}</span>
        </div>
      </section>

      <section className="zen-section">
        <div className="zen-section-head">
          <h3>{COPY.dashboardDailyQuests}</h3>
          <span className="zen-section-sub">{COPY.dashboardQuestsSubtitle}</span>
        </div>
        <div className="zen-quests">
          {questsWithProgress.length === 0 ? (
            <p className="zen-quests-loading">{COPY.dashboardQuestsLoading}</p>
          ) : (
            <>
              <div className="zen-quests-progress">
                {questsWithProgress.filter((q) => q.completed).length} / {questsWithProgress.length} {COPY.dashboardQuestsDone}
              </div>
              {questsWithProgress.map((q) => {
                const done = q.completed;
                const sportIcon = q.sport ? (SPORTS[q.sport]?.icon || '🏃') : '✨';
                const progressText = q.unit === 'workout' ? `${q.currentValue || 0} / ${q.target}` : `${q.currentValue ?? 0} / ${q.target} ${q.unit}`;
                return (
                  <article key={q.id} className={`zen-quest-row ${done ? 'done' : ''}`}>
                    <span className="zen-quest-icon">{sportIcon}</span>
                    <div className="zen-quest-body">
                      <p className="zen-quest-label">{q.label}</p>
                      <p className="zen-quest-progress">{progressText}</p>
                    </div>
                    <div className="zen-quest-right">
                      {done ? (
                        <span className="zen-quest-done"><Check size={14} /> {COPY.dashboardQuestDone}</span>
                      ) : (
                        <span className="zen-quest-xp">+{q.xpReward} XP</span>
                      )}
                    </div>
                  </article>
                );
              })}
            </>
          )}
        </div>
      </section>

      <section className="zen-section">
        <div className="zen-section-head">
          <h3>
            <Trophy size={18} />
            {COPY.dashboardRecentAchievements}
          </h3>
          <Link to="/profile">{COPY.dashboardViewAll}</Link>
        </div>
        <div className="zen-achievements-row">
          {recentAchievements.map(item => (
            <article key={item.id} className="zen-achievement">
              <div className="zen-achievement-icon">{item.icon}</div>
              <p>{item.name}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="zen-section">
        <div className="zen-section-head">
          <h3>{COPY.dashboardActivityFeed}</h3>
          <Link to="/activities">{COPY.dashboardViewAll}</Link>
        </div>
        {recentActivities.length === 0 ? (
          <div className="empty-state zen-empty">
            <span className="empty-icon" aria-hidden="true">🏃</span>
            <h3 className="empty-title">{COPY.dashboardNoWorkoutsYet}</h3>
            <p className="empty-desc">{COPY.dashboardNoWorkoutsDesc}</p>
            <button type="button" className="btn btn-primary" onClick={() => setShowAdd(true)}>{COPY.dashboardLogWorkout}</button>
          </div>
        ) : (
          <div className="zen-recent-list">
            {recentActivities.map(activity => (
              <article key={activity.id} className="zen-recent-item">
                <div className="zen-recent-left">
                  <div className="zen-recent-avatar" aria-hidden="true">
                    {SPORTS[activity.sport]?.icon || '🏃'}
                  </div>
                  <div>
                    <p>{activity.title}</p>
                    <small>{formatDuration(activity.duration)}</small>
                  </div>
                </div>
                <strong style={{ fontSize: '13px', fontWeight: 600 }}>+{activity.xpEarned} XP</strong>
              </article>
            ))}
          </div>
        )}
      </section>

      <button type="button" className="zen-primary-cta" onClick={() => setShowAdd(true)} aria-label={COPY.dashboardStartWorkoutAria}>
        {COPY.dashboardStartWorkout}
      </button>

      {showAdd && (
        <AddActivityModal
          onClose={handleCloseAdd}
          initialSuggestion={addModalSuggestion}
        />
      )}
    </div>
  );
}
