import { initializeApp } from 'firebase/app';
import {
  getAuth,
  initializeAuth,
  indexedDBLocalPersistence,
  browserLocalPersistence
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { Capacitor } from '@capacitor/core';

const requiredFirebaseEnvKeys = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
  'VITE_FIREBASE_MEASUREMENT_ID'
];

const missingFirebaseEnvKeys = requiredFirebaseEnvKeys.filter((key) => !import.meta.env[key]);

if (missingFirebaseEnvKeys.length > 0) {
  throw new Error(
    `[Firebase] Missing required environment variables: ${missingFirebaseEnvKeys.join(', ')}. ` +
      'Define them in your .env file before starting the app.'
  );
}

// In production, ensure authDomain and config match the deployed app (e.g. correct domain for redirects).
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);

// Auth persistence: on native (Capacitor) we use indexedDBLocalPersistence so
// sign-in state is retained in the WebView; on web, getAuth() uses default (e.g. localStorage).
const auth = Capacitor.isNativePlatform()
  ? initializeAuth(app, {
      persistence: [indexedDBLocalPersistence, browserLocalPersistence]
    })
  : getAuth(app);

export { auth };
export const db = getFirestore(app);
export default app;
