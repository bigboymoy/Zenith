import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  updateProfile
} from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Debug: check if Firebase initialized
  useEffect(() => {
    console.log('AuthProvder checking Firebase:', !!auth, !!db);
    if (auth) console.log('Auth App Name:', auth.app.name);
  }, []);

  // Sign up
  async function signup(email, password, name) {
    console.log('Firebase signup call starting...');
    const res = await createUserWithEmailAndPassword(auth, email, password);
    const user = res.user;
    
    console.log('User created, updating profile...', user.uid);
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
    
    console.log('Creating Firestore document...');
    await setDoc(doc(db, 'users', user.uid), userDoc);
    console.log('Firestore document created!');
    return res;
  }

  // Login
  function login(email, password) {
    console.log('Firebase login call starting...');
    return signInWithEmailAndPassword(auth, email, password);
  }

  // Logout
  function logout() {
    return signOut(auth);
  }

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
  }, []);

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
        console.error('Error subscribing to user profile:', err);
      }
    );

    return unsub;
  }, [currentUser]);

  const value = {
    currentUser,
    userData,
    signup,
    login,
    logout
  };

  if (loading) {
    return (
      <div style={{ 
        height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', 
        background: '#0a0a0f', color: 'white', fontFamily: 'sans-serif' 
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '8px' }}>ZENITH</div>
          <div style={{ fontSize: '0.8rem', opacity: 0.5 }}>Syncing with cloud...</div>
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
