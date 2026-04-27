import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { auth, db } from '../firebase/config';
import { UserData } from '../types';

interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  /** Call this after a successful registration to reload the profile without re-triggering onAuthStateChanged */
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userData: null,
  loading: true,
  refreshUserData: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  // Ref to track whether we're in the middle of a registration flow.
  // When true, the onAuthStateChanged listener will skip its Firestore fetch
  // because register.tsx will call refreshUserData() directly after setDoc.
  const isRegistering = useRef(false);

  const fetchUserData = async (firebaseUser: User) => {
    try {
      const snap = await getDoc(doc(db, 'users', firebaseUser.uid));
      if (snap.exists()) {
        setUserData(snap.data() as UserData);
      } else {
        // Document genuinely missing after auth — clear data, let router handle redirect
        console.warn('AuthContext: user logged in but no Firestore profile found.');
        setUserData(null);
      }
    } catch (err) {
      console.error('AuthContext: error fetching profile:', err);
      setUserData(null);
    } finally {
      setLoading(false);
    }
  };

  /** Called by register.tsx AFTER setDoc succeeds to hydrate the context. */
  const refreshUserData = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    setLoading(true);
    await fetchUserData(currentUser);
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);

        // If register.tsx flagged that it is handling the profile write itself,
        // skip the automatic fetch — refreshUserData() will be called instead.
        if (isRegistering.current) {
          return;
        }

        await fetchUserData(firebaseUser);
      } else {
        setUser(null);
        setUserData(null);
        isRegistering.current = false;
        setLoading(false);
      }
    });

    return unsub;
  }, []);

  return (
    <AuthContext.Provider value={{ user, userData, loading, refreshUserData }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);