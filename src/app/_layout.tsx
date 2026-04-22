import React, { createContext, useContext, useEffect, useState } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { onAuthStateChanged, signOut as firebaseSignOut, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { ActivityIndicator, View } from 'react-native';

type Role = 'participant' | 'volunteer' | 'admin' | null;

interface AuthContextType {
  user: User | null;
  role: Role;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  return useContext(AuthContext);
}

export default function RootLayout() {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role>(null);
  const [loading, setLoading] = useState(true);
  const segments = useSegments();
  const router = useRouter();

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        // Retry up to 5x to handle race condition where Firestore doc
        // isn't created yet immediately after registration
        let attempts = 0;
        const fetchRole = async () => {
          try {
            const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
            if (userDoc.exists()) {
              setRole(userDoc.data().role as Role);
            } else if (attempts < 5) {
              attempts++;
              setTimeout(fetchRole, 600); // wait 600ms between retries
              return;
            } else {
              setRole(null);
            }
          } catch (err: any) {
            // Only log non-permission errors after rules are properly set
            if (!err.message?.includes('permissions')) {
              console.error('Error fetching user role:', err);
            }
            setRole(null);
          }
          setLoading(false);
        };
        fetchRole();
      } else {
        setUser(null);
        setRole(null);
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  // Handle navigation based on auth state
  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!user && !inAuthGroup) {
      router.replace('/(auth)/login' as any);
    } else if (user && role && inAuthGroup) {
      if (role === 'participant') router.replace('/(participant)/home' as any);
      else if (role === 'volunteer') router.replace('/(volunteer)/home' as any);
      else if (role === 'admin') router.replace('/(admin)/overview' as any);
    }
  }, [user, role, segments, loading]);

  const signOut = async () => {
    await firebaseSignOut(auth);
    router.replace('/(auth)/login' as any);
  };

  // Show loading spinner while checking auth state
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#121212' }}>
        <ActivityIndicator size="large" color="#9d4edd" />
      </View>
    );
  }

  return (
    <AuthContext.Provider value={{ user, role, loading, signOut }}>
      <Slot />
    </AuthContext.Provider>
  );
}
