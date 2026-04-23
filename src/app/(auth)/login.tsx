import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { COLORS, FONTS, RADIUS, SPACING } from '../../constants/theme';
import { loginUser } from '../../firebase/auth';
import { Role } from '../../types';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const validate = () => {
    const e: { email?: string; password?: string } = {};
    if (!email) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Invalid email';
    if (!password) e.password = 'Password is required';
    else if (password.length < 6) e.password = 'Minimum 6 characters';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const redirectByRole = (role: Role) => {
    if (role === 'admin') {
      router.replace('/(admin)/dashboard');
    } else if (role === 'volunteer') {
      router.replace('/(volunteer)/home');
    } else {
      router.replace('/(participant)/home');
    }
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const { role } = await loginUser(email.trim(), password);
      redirectByRole(role);
    } catch (err: any) {
      const msg =
        err.code === 'auth/invalid-credential'
          ? 'Invalid email or password'
          : err.code === 'auth/too-many-requests'
          ? 'Too many attempts. Try again later.'
          : 'Login failed. Please try again.';
      Alert.alert('Login Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: COLORS.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.tagline}>HACKATHON</Text>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to continue</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@college.edu"
            keyboardType="email-address"
            autoCapitalize="none"
            error={errors.email}
          />
          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            secureTextEntry
            error={errors.password}
          />
          <Button
            title="SIGN IN"
            onPress={handleLogin}
            loading={loading}
            style={{ marginTop: SPACING.sm }}
          />
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
            <Text style={styles.footerLink}>Register</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.accentLine} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: SPACING.lg,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  tagline: {
    color: COLORS.primary,
    fontSize: FONTS.size.sm,
    letterSpacing: 6,
    fontWeight: '700',
    marginBottom: SPACING.sm,
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: FONTS.size.xl,
    fontWeight: '800',
    marginBottom: SPACING.xs,
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: FONTS.size.md,
  },
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: SPACING.lg,
  },
  footerText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.size.sm,
  },
  footerLink: {
    color: COLORS.primary,
    fontSize: FONTS.size.sm,
    fontWeight: '700',
  },
  accentLine: {
    height: 2,
    backgroundColor: COLORS.primary,
    borderRadius: 1,
    marginTop: SPACING.xl,
    opacity: 0.3,
    marginHorizontal: SPACING.xl,
  },
});