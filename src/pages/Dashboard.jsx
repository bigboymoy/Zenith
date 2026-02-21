import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Dumbbell, Flame, Sparkles, Target, Trophy, Zap } from 'lucide-react';
import { useApp } from '../App';
import { calculateStreak, formatDuration } from '../lib/gamification';
import { ACHIEVEMENT_DEFS, SPORTS } from '../lib/constants';
import { startOfWeek } from 'date-fns';
import AddActivityModal from '../components/AddActivityModal';

export default function Dashboard() {
  const { user, activities, achievements, levelInfo } = useApp();
  const [showAdd, setShowAdd] = useState(false);

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
    { id: 'quick-run', name: 'Quick Run', detail: '20 min cardio', xp: 60, sport: 'run' },
    { id: 'strength', name: 'Strength Builder', detail: '35 min lifting', xp: 110, sport: 'lift' },
    { id: 'full-body', name: 'Full Body Mix', detail: '45 min challenge', xp: 160, sport: 'cycle' },
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

  return (
    <div className="zen-home">
      <div className="zen-orb zen-orb-one" />
      <div className="zen-orb zen-orb-two" />

      <section className="zen-topbar">
        <div>
          <h1 className="zen-brand">ZENITH</h1>
          <p className="zen-tagline">Performance tracking that feels elite</p>
        </div>
      </section>

      <section className="zen-hero">
        <div className="zen-hero-head">
          <p>Welcome back, {firstName}</p>
          <div className="zen-streak-pill">
            <Flame size={16} />
            <span>{metrics.streak} day streak</span>
          </div>
        </div>
        <div className="zen-hero-main">
          <div>
            <p className="zen-level-label">TOTAL XP</p>
            <h2 className="zen-level-value zen-level-value-hero">
              {totalXp.toLocaleString()}
            </h2>
          </div>
          <div className="zen-level-chip">
            <Zap size={16} />
            <span>Level {levelInfo?.level || 1}</span>
          </div>
        </div>

        <div className="zen-progress-track">
          <div className="zen-progress-fill" style={{ width: `${Math.max(8, levelInfo?.progress || 0)}%` }} />
        </div>
        <p className="zen-level-sub">
          <Sparkles size={14} />
          {isMaxLevel ? 'Max level reached' : `${xpToNext.toLocaleString()} XP to level ${(levelInfo?.level || 1) + 1}`}
        </p>
        <div className="zen-hero-foot">
          <div>
            <small>Weekly goal</small>
            <strong>{Math.min(metrics.weekCount, weeklyGoal)} / {weeklyGoal} sessions</strong>
          </div>
          <div>
            <small>Total workouts</small>
            <strong>{activities.length}</strong>
          </div>
        </div>
      </section>

      <section className="zen-section">
        <div className="zen-section-head">
          <h3>
            <Dumbbell size={18} />
            Quick Start
          </h3>
        </div>
        <div className="zen-quick-track">
          {quickWorkouts.map(workout => (
            <button key={workout.id} className={`zen-quick-card zen-quick-${workout.sport}`} onClick={() => setShowAdd(true)}>
              <div className="zen-quick-card-top">
                <span>{SPORTS[workout.sport]?.icon}</span>
                <strong>+{workout.xp} XP</strong>
              </div>
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
            Weekly Snapshot
          </h3>
          <Link to="/activities">Details</Link>
        </div>
        <div className="zen-ribbon">
          <article>
            <small>Sessions</small>
            <strong>{metrics.weekCount}</strong>
          </article>
          <article>
            <small>Distance</small>
            <strong>{metrics.weekDist.toFixed(1)} mi</strong>
          </article>
          <article>
            <small>Volume</small>
            <strong>{metrics.weekVol.toLocaleString()} lbs</strong>
          </article>
          <article>
            <small>Best streak</small>
            <strong>{metrics.longestStreak} days</strong>
          </article>
        </div>
        <div className="zen-goal-track-wrap">
          <div className="zen-goal-track">
            <div className="zen-goal-fill" style={{ width: `${Math.max(6, weeklyGoalProgress)}%` }} />
          </div>
          <span>{weeklyGoalProgress}% goal completion</span>
        </div>
      </section>

      <section className="zen-section">
        <div className="zen-section-head">
          <h3>
            <Trophy size={18} />
            Recent Achievements
          </h3>
          <Link to="/profile">View all</Link>
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
          <h3>Activity Feed</h3>
          <Link to="/activities">View all</Link>
        </div>
        {recentActivities.length === 0 ? (
          <div className="zen-empty">
            <p>No workouts yet. Log your first one to start building streaks.</p>
            <button className="btn btn-primary" onClick={() => setShowAdd(true)}>Log Workout</button>
          </div>
        ) : (
          <div className="zen-recent-list">
            {recentActivities.map(activity => (
              <article key={activity.id} className="zen-recent-item">
                <div className="zen-recent-left">
                  <span>{SPORTS[activity.sport]?.icon || '🏃'}</span>
                  <div>
                    <p>{activity.title}</p>
                    <small>{formatDuration(activity.duration)}</small>
                  </div>
                </div>
                <strong>+{activity.xpEarned} XP</strong>
              </article>
            ))}
          </div>
        )}
      </section>

      <button className="zen-primary-cta" onClick={() => setShowAdd(true)}>
        START WORKOUT
      </button>

      {showAdd && <AddActivityModal onClose={() => setShowAdd(false)} />}
    </div>
  );
}
