import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { COLORS, FONTS } from '../constants/theme';
import { useAuth } from '../contexts/AuthContext';

export default function Index() {
  const { user, userData, loading } = useAuth();
  const router = useRouter();
  const redirected = useRef(false);

  useEffect(() => {
    if (loading) return;
    if (redirected.current) return;

    if (!user) {
      redirected.current = true;
      router.replace('/(auth)/login');
      return;
    }

    if (!userData) return;

    redirected.current = true;

    if (userData.role === 'admin') {
      router.replace('/(admin)/dashboard');
    } else if (userData.role === 'volunteer') {
      router.replace('/(volunteer)/home');
    } else {
      router.replace('/(participant)/home');
    }
  }, [user, userData, loading]);

  return (
    <View style={{
      flex: 1,
      backgroundColor: COLORS.bg,
      justifyContent: 'center',
      alignItems: 'center',
      gap: 16,
    }}>
      <ActivityIndicator color={COLORS.primary} size="large" />
      <Text style={{
        color: COLORS.textSecondary,
        fontSize: FONTS.size.sm,
        letterSpacing: 1,
      }}>
        {loading ? 'Loading...' : user ? 'Getting profile...' : 'Redirecting...'}
      </Text>
    </View>
  );
}