import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { HashRouter, Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Activity, TrendingUp, Trophy, Users, User,
  Sun, Moon, Bell, Search, Settings, Zap, X, Check, LogOut
} from 'lucide-react';

import { settingsStorage } from './lib/storage';
import { getLevelInfo, checkAchievements } from './lib/gamification';
import { ACHIEVEMENT_DEFS } from './lib/constants';

import Dashboard from './pages/Dashboard';
import Activities from './pages/Activities';
import Progress from './pages/Progress';
import Challenges from './pages/Challenges';
import Leaderboard from './pages/Leaderboard';
import Profile from './pages/Profile';
import Login from './pages/Login';
import Signup from './pages/Signup';

import { AuthProvider, useAuth } from './context/AuthContext';
import './index.css';

// ── App Context ───────────────────────────────────────────────────────────────
export const AppContext = createContext(null);
export const useApp = () => useContext(AppContext);

// ── Toast System ──────────────────────────────────────────────────────────────
function ToastContainer({ toasts, removeToast }) {
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.type} ${t.exiting ? 'exiting' : ''}`}>
          <span className="toast-icon">{t.icon}</span>
          <span style={{ flex: 1 }}>{t.message}</span>
          <button className="icon-btn" onClick={() => removeToast(t.id)} style={{ width: 24, height: 24 }}>
            <X size={14} />
          </button>
        </div>
      ))}
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
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/activities', label: 'Activities', icon: Activity },
  { to: '/progress', label: 'Progress', icon: TrendingUp },
  { to: '/challenges', label: 'Challenges', icon: Trophy },
  { to: '/leaderboard', label: 'Leaderboard', icon: Users },
  { to: '/profile', label: 'Profile', icon: User },
];

const MOBILE_NAV_ITEMS = [
  { to: '/', label: 'Home', icon: LayoutDashboard, end: true },
  { to: '/activities', label: 'History', icon: Activity },
  { to: '/challenges', label: 'Workout', icon: Trophy },
  { to: '/profile', label: 'Profile', icon: User },
];

function Header({ userData, levelInfo, theme, toggleTheme }) {
  const { logout } = useAuth();
  const initials = userData?.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'U';

  return (
    <header className="app-header">
      <div className="header-inner">
        {/* Logo */}
        <div className="header-logo">
          <Zap size={22} color="var(--accent)" fill="var(--accent)" />
          Zenith
        </div>

        {/* Nav */}
        <nav className="header-nav">
          {NAV_ITEMS.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `nav-tab ${isActive ? 'active' : ''}`}
            >
              <item.icon size={16} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Actions */}
        <div className="header-actions">
          <button className="icon-btn" onClick={toggleTheme} title="Toggle theme">
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          
          <button className="icon-btn" onClick={logout} title="Logout">
            <LogOut size={18} />
          </button>

          {/* User avatar + XP mini bar */}
          <NavLink to="/profile" className="user-avatar-btn">
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

  const toast = useCallback((message, type = 'info', icon = '✨') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type, icon, exiting: false }]);
    setTimeout(() => {
      setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 350);
    }, 3500);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const refreshUser = () => {}; // AuthContext/Firestore handles this
  const refreshActivities = () => {}; // Subscription handles this

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
      const def = ACHIEVEMENT_DEFS.find((d) => d.id === id);
      if (def) {
        toast(`Achievement unlocked: ${def.name} ${def.icon}`, 'success', '🏆');
      }
    });
  }, [userData, achievements, currentUser, toast]);

  const onActivityDeleted = useCallback(async (activityId) => {
    if (!currentUser || !activityId) return;
    try {
      await onActivityAdded({ previousActivity: { id: activityId } });
    } catch (err) {
      console.error('Post-delete achievement reconciliation failed:', err);
    }
  }, [currentUser, onActivityAdded]);

  const value = {
    user: userData, activities, achievements, settings,
    levelInfo, toast, toggleTheme,
    refreshUser, refreshActivities, onActivityAdded, onActivityDeleted,
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
    <nav className="bottom-nav">
      {MOBILE_NAV_ITEMS.map(item => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) => `bottom-tab ${isActive ? 'active' : ''}`}
        >
          <item.icon size={20} />
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

// ── App Shell ─────────────────────────────────────────────────────────────────
function AppShell() {
  const { user, levelInfo, settings, toggleTheme } = useApp();

  return (
    <div className="app-wrapper">
      <Header
        userData={user}
        levelInfo={levelInfo}
        theme={settings?.theme || 'dark'}
        toggleTheme={toggleTheme}
      />
      <main className="app-main">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/activities" element={<Activities />} />
          <Route path="/progress" element={<Progress />} />
          <Route path="/challenges" element={<Challenges />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <BottomNav />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <HashRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="*" element={
              <ProtectedRoute>
                <AppShell />
              </ProtectedRoute>
            } />
          </Routes>
        </HashRouter>
      </AppProvider>
    </AuthProvider>
  );
}
