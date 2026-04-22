import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// ⚠️ Credentials are here for runtime reliability.
// The .env file exists for git safety — never commit secrets to public repos.
const firebaseConfig = {
  apiKey: "AIzaSyDrSpqry2wmPrDoDeoE3E816S_MS5NwCAQ",
  authDomain: "hackathonops-5b20a.firebaseapp.com",
  projectId: "hackathonops-5b20a",
  storageBucket: "hackathonops-5b20a.firebasestorage.app",
  messagingSenderId: "125982064621",
  appId: "1:125982064621:web:50383330acab399a2631e4",
  measurementId: "G-8CYBHBKRH9",
};

// Prevent duplicate initialization on Expo hot-reload
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };
export default app;
