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
  mentorName?: string
) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  const uid = cred.user.uid;

  await setDoc(doc(db, 'users', uid), {
    uid,
    name,
    email,
    role,
    teamName: teamName || '',
    mentorName: mentorName || '',
    teamId: '',
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