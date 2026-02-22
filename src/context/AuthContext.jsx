import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  updateProfile
} from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { COPY } from '../lib/copy';
import { trackEvent } from '../lib/analytics';

// PII (do not log in production): email, name, uid.
const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Debug: check if Firebase initialized (no PII — do not log user, email, or uid)
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('AuthProvider checking Firebase:', !!auth, !!db);
      if (auth) console.log('Auth app name:', auth.app.name);
    }
  }, []);

  // Sign up (stable callback so context value reference stays stable)
  const signup = useCallback(async (email, password, name) => {
    if (import.meta.env.DEV) {
      console.log('Firebase signup call starting...');
    }
    const res = await createUserWithEmailAndPassword(auth, email, password);
    const user = res.user;

    await updateProfile(user, { displayName: name });
    
    // Create user document in Firestore
    const userDoc = {
      uid: user.uid,
      name,
      email,
      username: email.split('@')[0],
      level: 1,
      xp: 0,
      primarySport: 'run',
      streak: 0,
      createdAt: Date.now(),
      joinedAt: Date.now()
    };

    await setDoc(doc(db, 'users', user.uid), userDoc);
    trackEvent('sign_up', { method: 'email' });
    if (import.meta.env.DEV) {
      console.log('Firestore user document created');
    }
    return res;
  }, []);

  // Login (stable callback)
  const login = useCallback((email, password) => {
    if (import.meta.env.DEV) {
      console.log('Firebase login call starting...');
    }
    return signInWithEmailAndPassword(auth, email, password);
  }, []);

  // Logout (stable callback)
  const logout = useCallback(() => {
    trackEvent('logout');
    return signOut(auth);
  }, []);

  // Handle user authentication state
  useEffect(() => {
    // Fail-safe: if Firebase doesn't respond in 8 seconds, stop loading
    const timeout = setTimeout(() => {
      if (loading) {
        console.warn("Firebase Auth timed out. Proceeding...");
        setLoading(false);
      }
    }, 8000);

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
      clearTimeout(timeout);
    });

    return () => {
      unsubscribe();
      clearTimeout(timeout);
    };
  }, [loading]);

  // Keep user profile reactive to Firestore updates.
  useEffect(() => {
    if (!currentUser) {
      setUserData(null);
      return;
    }

    const unsub = onSnapshot(
      doc(db, 'users', currentUser.uid),
      (snap) => {
        setUserData(snap.exists() ? snap.data() : null);
      },
      (err) => {
        if (import.meta.env.DEV) {
          console.error('Error subscribing to user profile:', err);
        }
      }
    );

    return unsub;
  }, [currentUser]);

  const value = useMemo(
    () => ({ currentUser, userData, signup, login, logout }),
    [currentUser, userData, signup, login, logout]
  );

  if (loading) {
    return (
      <div style={{ 
        height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', 
        background: '#0a0a0f', color: 'white', fontFamily: 'sans-serif' 
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '8px' }}>{COPY.zenith.toUpperCase()}</div>
          <div style={{ fontSize: '0.8rem', opacity: 0.5 }}>{COPY.syncingWithCloud}</div>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
