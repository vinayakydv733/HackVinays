import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from 'react';
import { auth, db } from '../firebase/config';
import { UserData } from '../types';

interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userData: null,
  loading: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);

        // Retry up to 3 times with 1s delay
        // handles race condition where Firestore doc
        // isn't written yet right after register
        let snap = await getDoc(doc(db, 'users', firebaseUser.uid));

        if (!snap.exists()) {
          await new Promise(res => setTimeout(res, 1000));
          snap = await getDoc(doc(db, 'users', firebaseUser.uid));
        }

        if (!snap.exists()) {
          await new Promise(res => setTimeout(res, 1500));
          snap = await getDoc(doc(db, 'users', firebaseUser.uid));
        }

        if (snap.exists()) {
          setUserData(snap.data() as UserData);
        }
      } else {
        setUser(null);
        setUserData(null);
      }

      // Always called no matter what
      setLoading(false);
    });

    return unsub;
  }, []);

  return (
    <AuthContext.Provider value={{ user, userData, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);