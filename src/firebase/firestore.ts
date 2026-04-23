import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  Unsubscribe,
  updateDoc,
  where
} from 'firebase/firestore';
import { db } from './config';

// ─── Generic helpers ───────────────────────────────────────────

export const getDocument = async (col: string, id: string) => {
  const snap = await getDoc(doc(db, col, id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

export const getCollection = async (col: string) => {
  const snap = await getDocs(collection(db, col));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const addDocument = async (col: string, data: object) => {
  const ref = await addDoc(collection(db, col), {
    ...data,
    createdAt: Date.now(),
  });
  return ref.id;
};

export const updateDocument = async (
  col: string,
  id: string,
  data: object
) => {
  await updateDoc(doc(db, col, id), data);
};

export const deleteDocument = async (col: string, id: string) => {
  await deleteDoc(doc(db, col, id));
};

// ─── Realtime listeners ────────────────────────────────────────

export const listenToCollection = (
  col: string,
  orderField: string,
  callback: (data: any[]) => void
): Unsubscribe => {
  const q = query(collection(db, col), orderBy(orderField, 'desc'));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
};

export const listenToQuery = (
  col: string,
  field: string,
  value: any,
  orderField: string,
  callback: (data: any[]) => void
): Unsubscribe => {
  const q = query(
    collection(db, col),
    where(field, '==', value),
    orderBy(orderField, 'desc')
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
};