import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, initializeAuth } from 'firebase/auth';
// @ts-ignore
import { getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { Platform } from 'react-native';

export const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// 1. Initialize App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// 2. Initialize Auth with AsyncStorage persistence for React Native
let auth: any;
try {
  if (Platform.OS === 'web') {
    // Only initialize Auth if running in an actual browser, not during Expo's Node export
    if (typeof window !== 'undefined') {
      auth = getAuth(app);
    }
  } else {
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(ReactNativeAsyncStorage),
    });
  }
} catch (e: any) {
  // If auth is already initialized (e.g., during hot reload), get the existing instance
  if (e.code === 'auth/already-initialized') {
    auth = getAuth(app);
  } else {
    console.warn("Auth initialization warning:", e);
  }
}

// 3. Initialize Firestore (Safe, standard version for React Native)
const db = getFirestore(app);

// 4. Initialize Storage
const storage = getStorage(app);

export { auth, db, storage };