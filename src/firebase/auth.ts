import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Role } from '../types';
import { auth, db, firebaseConfig } from './config';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

/**
 * Creates a new user without swapping the current auth session.
 * Used by Admins to create Volunteers/Mentors/etc.
 */
export async function registerUserByAdmin(
  name: string,
  email: string,
  password: string,
  role: Role,
  teamName?: string,
  mentorName?: string,
  teamId?: string
) {
  // 1. Initialize a secondary Firebase app instance
  const tempAppName = `temp-app-${Date.now()}`;
  const tempApp = initializeApp(firebaseConfig, tempAppName);
  const tempAuth = getAuth(tempApp);

  try {
    // 2. Create the user on the secondary auth instance
    const cred = await createUserWithEmailAndPassword(tempAuth, email, password);
    const uid = cred.user.uid;

    // 3. Prepare the data
    const userData = {
      uid,
      name,
      email,
      role: role || 'participant',
      teamName: teamName || '',
      mentorName: mentorName || '',
      teamId: teamId || '',
      createdAt: new Date().toISOString(),
    };

    // 4. Write to Firestore using the PRIMARY db instance (Admin is still logged in here)
    await setDoc(doc(db, 'users', uid), userData);

    return { user: cred.user, role: userData.role };
  } finally {
    // 5. Clean up the secondary app
    await deleteApp(tempApp);
  }
}

export async function registerUser(
  name: string,
  email: string,
  password: string,
  role: Role,
  teamName?: string,
  mentorName?: string,
  teamId?: string
) {
  // 1. Create the user on the PRIMARY auth (Swaps session - used for self-registration)
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  const uid = cred.user.uid;

  // 2. Prepare the data
  const userData = {
    uid,
    name,
    email,
    role: role || 'participant',
    teamName: teamName || '',
    mentorName: mentorName || '',
    teamId: teamId || '',
    createdAt: new Date().toISOString(),
  };

  // 3. Write to Firestore (This will now work because the user is still logged in)
  await setDoc(doc(db, 'users', uid), userData);

  return { user: cred.user, role: userData.role };
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