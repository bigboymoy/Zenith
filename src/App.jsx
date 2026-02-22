import React, { createContext, useContext, useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { HashRouter, Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Activity, TrendingUp, Trophy, Users, User, Flag, UsersRound,
  Sun, Moon, Bell, Search, Settings, Zap, X, Check, LogOut, Flame, Globe, Rss, Apple
} from 'lucide-react';

import { settingsStorage } from './lib/storage';
import { getLevelInfo, checkAchievements, calculateStreak } from './lib/gamification';
import { ACHIEVEMENT_DEFS } from './lib/constants';
import { evaluateAndClaimQuests } from './lib/quests';
import { shareContent, ACHIEVEMENT_SHARE_TEXT } from './lib/share';
import { trackEvent } from './lib/analytics';
import { COPY } from './lib/copy';

// Route-based code splitting: each page loads in its own chunk
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Activities = lazy(() => import('./pages/Activities'));
const Progress = lazy(() => import('./pages/Progress'));
const Challenges = lazy(() => import('./pages/Challenges'));
const Leaderboard = lazy(() => import('./pages/Leaderboard'));
const Feed = lazy(() => import('./pages/Feed'));
const Segments = lazy(() => import('./pages/Segments'));
const SegmentDetail = lazy(() => import('./pages/SegmentDetail'));
const Clubs = lazy(() => import('./pages/Clubs'));
const ClubDetail = lazy(() => import('./pages/ClubDetail'));
const Nutrition = lazy(() => import('./pages/Nutrition'));
const Profile = lazy(() => import('./pages/Profile'));
const Login = lazy(() => import('./pages/Login'));
const Signup = lazy(() => import('./pages/Signup'));

import { AuthProvider, useAuth } from './context/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import OfflineIndicator from './components/OfflineIndicator';
import Onboarding, { getOnboardingDone } from './components/Onboarding';
import './index.css';

// ── App Context ───────────────────────────────────────────────────────────────
export const AppContext = createContext(null);
export const useApp = () => useContext(AppContext);

// ── Toast System ──────────────────────────────────────────────────────────────
function ToastContainer({ toasts, removeToast }) {
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.type} ${t.exiting ? 'exiting' : ''}`} role="status" aria-live="polite">
          <span className="toast-icon" aria-hidden="true">{t.icon}</span>
          <span style={{ flex: 1 }}>{t.message}</span>
          {t.action && (
            <button
              type="button"
              className="toast-action-btn"
              onClick={() => t.action?.onClick?.()}
            >
              {t.action.label}
            </button>
          )}
          <button type="button" className="icon-btn" onClick={() => removeToast(t.id)} style={{ width: 24, height: 24 }} aria-label={COPY.dismissNotification}>
            <X size={14} aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  );
}

// ── Page view analytics (route changes) ────────────────────────────────────────
function PageViewTracker() {
  const location = useLocation();
  useEffect(() => {
    trackEvent('page_view', { route: location.pathname || '/' });
  }, [location.pathname]);
  return null;
}

// ── Suspense fallback for lazy route chunks ─────────────────────────────────────
function PageLoader() {
  return (
    <div className="page-loader" style={{ padding: 24, textAlign: 'center', color: 'var(--text-2)' }} aria-busy="true">
      {COPY.loading}
    </div>
  );
}

// ── Protected Route ───────────────────────────────────────────────────────────
function ProtectedRoute({ children }) {
  const { currentUser } = useAuth();
  const location = useLocation();

  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

// ── Header ────────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { to: '/', label: COPY.navDashboard, icon: LayoutDashboard, end: true },
  { to: '/feed', label: COPY.navFeed, icon: Rss },
  { to: '/activities', label: COPY.navActivities, icon: Activity },
  { to: '/progress', label: COPY.navProgress, icon: TrendingUp },
  { to: '/nutrition', label: COPY.nutritionTitle, icon: Apple },
  { to: '/challenges', label: COPY.navChallenges, icon: Trophy },
  { to: '/leaderboard', label: COPY.navLeaderboard, icon: Users },
  { to: '/clubs', label: COPY.clubsTitle, icon: UsersRound },
  { to: '/segments', label: COPY.segmentsTitle, icon: Flag },
  { to: '/profile', label: COPY.navProfile, icon: User },
];

const MOBILE_NAV_ITEMS = [
  { to: '/', label: COPY.navHome, icon: LayoutDashboard, end: true },
  { to: '/feed', label: COPY.navFeed, icon: Rss },
  { to: '/activities', label: COPY.navHistory, icon: Activity },
  { to: '/challenges', label: COPY.navWorkout, icon: Trophy },
  { to: '/profile', label: COPY.navProfile, icon: User },
];

function Header({ userData, levelInfo, theme, toggleTheme, streak = 0, totalXp = 0 }) {
  const { logout } = useAuth();
  const initials = userData?.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'U';

  return (
    <header className="app-header" role="banner">
      <div className="header-inner">
        {/* Logo */}
        <div className="header-logo" aria-hidden="true">
          <Zap size={22} color="var(--text)" aria-hidden="true" />
          {COPY.zenith}
        </div>

        {/* Nav */}
        <nav className="header-nav" aria-label="Main navigation">
          {NAV_ITEMS.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `nav-tab ${isActive ? 'active' : ''}`}
            >
              <item.icon size={16} aria-hidden="true" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Gamification stats (reference: flame streak, globe points) */}
        <div className="header-actions header-stats">
          <span className="header-stat-pill" title="Day streak" aria-label={`${streak} day streak`}>
            <Flame size={12} aria-hidden="true" />
            {streak}
          </span>
          <span className="header-stat-pill globe" title="Total XP" aria-label={`${totalXp.toLocaleString()} XP`}>
            <Globe size={12} aria-hidden="true" />
            {totalXp >= 1000 ? `${(totalXp / 1000).toFixed(1)}k` : totalXp}
          </span>
        </div>

        {/* Actions */}
        <div className="header-actions">
          <button
            type="button"
            className="icon-btn"
            onClick={toggleTheme}
            title={COPY.toggleTheme}
            aria-label={theme === 'dark' ? COPY.switchToLightTheme : COPY.switchToDarkTheme}
          >
            {theme === 'dark' ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
          </button>
          <button
            type="button"
            className="icon-btn"
            onClick={logout}
            title={COPY.logOut}
            aria-label={COPY.logOut}
          >
            <LogOut size={18} aria-hidden="true" />
          </button>

          {/* User avatar + XP mini bar */}
          <NavLink to="/profile" className="user-avatar-btn" aria-label={COPY.goToProfile}>
            <div className="avatar">
              {initials}
            </div>
            <div className="xp-mini">
              <span className="xp-mini-label">Lv {levelInfo?.level} · {levelInfo?.title}</span>
              <div className="xp-mini-bar">
                <div className="xp-mini-fill" style={{ width: `${levelInfo?.progress || 0}%` }} />
              </div>
            </div>
          </NavLink>
        </div>
      </div>
    </header>
  );
}

import { firestoreActivities, firestoreAchievements, firestoreUser } from './lib/firestore';

// ── Provider ──────────────────────────────────────────────────────────────────
function AppProvider({ children }) {
  const { currentUser, userData } = useAuth();
  
  const [activities, setActivities] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [settings, setSettings] = useState(() => settingsStorage.get());
  const [toasts, setToasts] = useState([]);
  const [levelInfo, setLevelInfo] = useState(() => getLevelInfo(userData?.xp || 0));

  // Sync Theme
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', settings.theme || 'dark');
    }
  }, [settings.theme]);

  // Sync Level Info
  useEffect(() => {
    setLevelInfo(getLevelInfo(userData?.xp || 0));
  }, [userData]);

  // Subscribe to Firestore Activities
  useEffect(() => {
    if (!currentUser) {
      setActivities([]);
      return;
    }
    const unsub = firestoreActivities.subscribe(currentUser.uid, (data) => {
      setActivities(data);
    });
    return unsub;
  }, [currentUser]);

  // Subscribe to Firestore Achievements
  useEffect(() => {
    if (!currentUser) {
      setAchievements([]);
      return;
    }

    let cancelled = false;
    firestoreAchievements.ensureInitialized(currentUser.uid).catch((err) => {
      if (!cancelled) {
        console.error('Failed to initialize achievements:', err);
      }
    });

    const unsub = firestoreAchievements.subscribe(currentUser.uid, (data) => {
      setAchievements(data);
    });
    return () => {
      cancelled = true;
      unsub();
    };
  }, [currentUser]);

  const toggleTheme = useCallback(() => {
    setSettings(prev => {
      const newTheme = prev.theme === 'dark' ? 'light' : 'dark';
      settingsStorage.update({ theme: newTheme });
      document.documentElement.setAttribute('data-theme', newTheme);
      return { ...prev, theme: newTheme };
    });
  }, []);

  const toast = useCallback((message, type = 'info', icon = '✨', options = null) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type, icon, action: options?.action, exiting: false }]);
    setTimeout(() => {
      setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 350);
    }, 3500);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Safe refresh: subscriptions keep user and activities in sync; no refetch here to avoid
  // any code path that could re-award XP. Level is derived from user.xp via getLevelInfo.
  const refreshUser = () => {};
  const refreshActivities = () => {};

  const onActivityAdded = useCallback(async ({ activity, previousActivity = null } = {}) => {
    if (!currentUser) return;

    // Ensure achievement docs exist before evaluating unlock state.
    const seeded = await firestoreAchievements.ensureInitialized(currentUser.uid);

    const [dbUser, dbActivities] = await Promise.all([
      firestoreUser.get(currentUser.uid),
      firestoreActivities.getAll(currentUser.uid),
    ]);

    // Defensive merge for eventual consistency: if the newest activity isn't visible yet
    // in the query snapshot, include the in-flight payload so unlock checks stay correct.
    let activitiesForCheck = dbActivities;
    if (activity) {
      const hasSavedActivity = dbActivities.some((a) => a.id === activity.id);
      if (!hasSavedActivity) {
        activitiesForCheck = [
          ...dbActivities.filter((a) => a.id !== activity.id),
          activity,
        ];
      }
    } else if (previousActivity) {
      activitiesForCheck = dbActivities.filter((a) => a.id !== previousActivity.id);
    }

    const currentAchievements = seeded.length ? seeded : achievements;
    const safeUser = dbUser || userData || { xp: 0 };
    const newlyEarned = checkAchievements(safeUser, activitiesForCheck, currentAchievements);
    if (!newlyEarned.length) return;

    const alreadyEarned = new Set(currentAchievements.filter((a) => a.earned).map((a) => a.id));
    const uniqueNew = newlyEarned.filter((id) => !alreadyEarned.has(id));
    if (!uniqueNew.length) return;

    await firestoreAchievements.markEarned(currentUser.uid, uniqueNew);
    uniqueNew.forEach((id) => {
      trackEvent('achievement_unlocked', { achievement_id: id });
      const def = ACHIEVEMENT_DEFS.find((d) => d.id === id);
      if (def) {
        toast(`${COPY.toastAchievementUnlocked} ${def.name} ${def.icon}`, 'success', '🏆', {
          action: {
            label: COPY.toastShare,
            onClick: async () => {
              const result = await shareContent({ text: ACHIEVEMENT_SHARE_TEXT });
              if (result.copied) toast(COPY.linkCopied, 'success', '📋');
            },
          },
        });
      }
    });

    // After activity save (and achievement check), evaluate daily quest completion and award XP once per quest per day.
    try {
      await evaluateAndClaimQuests(currentUser.uid, activitiesForCheck, firestoreUser, toast);
    } catch (questErr) {
      console.error('Quest evaluation failed:', questErr);
    }
  }, [userData, achievements, currentUser, toast]);

  const onActivityDeleted = useCallback(async (activityId) => {
    if (!currentUser || !activityId) return;
    try {
      await onActivityAdded({ previousActivity: { id: activityId } });
    } catch (err) {
      console.error('Post-delete achievement reconciliation failed:', err);
    }
  }, [currentUser, onActivityAdded]);

  // Optimistic update: show new activity in the list immediately after save.
  // The Firestore subscription will replace with server state when it fires (no duplicate).
  const addActivityOptimistic = useCallback((activity) => {
    if (!activity?.id) return;
    setActivities((prev) => {
      if (prev.some((a) => a.id === activity.id)) return prev;
      return [activity, ...prev];
    });
  }, []);

  const value = {
    user: userData, activities, achievements, settings,
    levelInfo, toast, toggleTheme,
    refreshUser, refreshActivities, onActivityAdded, onActivityDeleted, addActivityOptimistic,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </AppContext.Provider>
  );
}

// ── Bottom Nav (Mobile) ──────────────────────────────────────────────────────
function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Mobile navigation">
      {MOBILE_NAV_ITEMS.map(item => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) => `bottom-tab ${isActive ? 'active' : ''}`}
          aria-label={item.label}
        >
          <item.icon size={20} aria-hidden="true" />
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

// ── Skip to main content link (a11y) ────────────────────────────────────────
function SkipToMain() {
  return (
    <a href="#main-content" className="skip-to-main">
      {COPY.skipToMain}
    </a>
  );
}

// ── App Shell ─────────────────────────────────────────────────────────────────
function AppShell() {
  const { user, activities, levelInfo, settings, toggleTheme } = useApp();
  const [onboardingDone, setOnboardingDone] = useState(() => getOnboardingDone());
  const streak = calculateStreak(activities || []);

  return (
    <div className="app-wrapper">
      {!onboardingDone && (
        <Onboarding
          user={user}
          onComplete={() => setOnboardingDone(true)}
        />
      )}
      <SkipToMain />
      <Header
        userData={user}
        levelInfo={levelInfo}
        theme={settings?.theme || 'dark'}
        toggleTheme={toggleTheme}
        streak={streak}
        totalXp={user?.xp || 0}
      />
      <main id="main-content" className="app-main" role="main" tabIndex={-1}>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/activities" element={<Activities />} />
            <Route path="/progress" element={<Progress />} />
            <Route path="/challenges" element={<Challenges />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/feed" element={<Feed />} />
            <Route path="/segments" element={<Segments />} />
            <Route path="/segments/:segmentId" element={<SegmentDetail />} />
            <Route path="/clubs" element={<Clubs />} />
            <Route path="/clubs/:clubId" element={<ClubDetail />} />
            <Route path="/nutrition" element={<Nutrition />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/profile/:userId" element={<Profile />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>
      <BottomNav />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <OfflineIndicator />
      <AuthProvider>
        <AppProvider>
          <HashRouter>
            <PageViewTracker />
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="*" element={
                  <ProtectedRoute>
                    <AppShell />
                  </ProtectedRoute>
                } />
              </Routes>
            </Suspense>
          </HashRouter>
        </AppProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
