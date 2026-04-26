import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Role } from '../types';
import { auth, db } from './config';

export async function registerUser(
  name: string,
  email: string,
  password: string,
  role: Role,
  teamName?: string,
  mentorName?: string,
  teamId?: string
) {
  // Use a secondary app to create the user without logging out the Admin
  const { getApp, getApps, initializeApp } = await import('firebase/app');
  const { getAuth, signOut } = await import('firebase/auth');
  const { firebaseConfig } = await import('./config');
  
  const secondaryApp = getApps().find(app => app.name === 'SecondaryApp') || initializeApp(firebaseConfig, 'SecondaryApp');
  const secondaryAuth = getAuth(secondaryApp);
  
  const cred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
  const uid = cred.user.uid;
  await signOut(secondaryAuth);

  await setDoc(doc(db, 'users', uid), {
    uid,
    name,
    email,
    role,
    teamName: teamName || '',
    mentorName: mentorName || '',
    teamId: teamId || '',
    createdAt: Date.now(),
  });

  return { user: cred.user, role };
}

export async function loginUser(email: string, password: string) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  const snap = await getDoc(doc(db, 'users', cred.user.uid));
  const role = snap.exists() ? (snap.data().role as Role) : 'participant';
  return { user: cred.user, role };
}

export async function logoutUser() {
  await signOut(auth);
}