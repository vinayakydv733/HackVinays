import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, SafeAreaView, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform, ScrollView
} from 'react-native';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../config/firebase';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type Tab = 'login' | 'register';
type Role = 'participant' | 'volunteer' | 'admin';

export default function LoginScreen() {
  const [tab, setTab] = useState<Tab>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<Role>('participant');
  const [teamId, setTeamId] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) return Alert.alert('Missing Fields', 'Please enter email and password.');
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      // _layout.tsx onAuthStateChanged will auto redirect based on role
    } catch (err: any) {
      Alert.alert('Login Failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!email || !password || !name) return Alert.alert('Missing Fields', 'Please fill all fields.');
    if (password.length < 6) return Alert.alert('Weak Password', 'Password must be at least 6 characters.');
    if (!email.includes('@')) return Alert.alert('Invalid Email', 'Please enter a valid email address.');
    
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      // Save user profile + role to Firestore
      await setDoc(doc(db, 'users', cred.user.uid), {
        uid: cred.user.uid,
        name,
        email: email.trim(),
        role,
        teamId: role === 'participant' ? teamId : null,
        createdAt: new Date().toISOString(),
      });
    } catch (err: any) {
      // Decode Firebase error codes into readable messages
      const code = err?.code || '';
      let msg = err.message;
      if (code === 'auth/email-already-in-use')   msg = 'This email is already registered. Try signing in instead.';
      else if (code === 'auth/invalid-email')      msg = 'Invalid email address format.';
      else if (code === 'auth/weak-password')      msg = 'Password must be at least 6 characters.';
      else if (code === 'auth/operation-not-allowed') msg = '⚠️ Email/Password sign-in is not enabled!\n\nGo to:\nFirebase Console → Authentication → Sign-in method → Enable Email/Password';
      else if (code === 'auth/network-request-failed') msg = 'Network error. Check your internet connection.';
      Alert.alert('Registration Failed', msg);
      console.log('Firebase error code:', code);
    } finally {
      setLoading(false);
    }
  };

  const RoleButton = ({ r, label, color }: { r: Role; label: string; color: string }) => (
    <TouchableOpacity
      style={[styles.roleBtn, { borderColor: color, backgroundColor: role === r ? color + '30' : 'transparent' }]}
      onPress={() => setRole(r)}
    >
      <Text style={[styles.roleBtnText, { color: role === r ? color : '#888' }]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoBox}>
              <MaterialCommunityIcons name="lightning-bolt" size={40} color="#9d4edd" />
            </View>
            <Text style={styles.title}>Hackathon Ops</Text>
            <Text style={styles.subtitle}>The Command Center for HackEvents</Text>
          </View>

          {/* Tab Switch */}
          <View style={styles.tabRow}>
            <TouchableOpacity style={[styles.tabBtn, tab === 'login' && styles.tabActive]} onPress={() => setTab('login')}>
              <Text style={[styles.tabText, tab === 'login' && styles.tabTextActive]}>Sign In</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.tabBtn, tab === 'register' && styles.tabActive]} onPress={() => setTab('register')}>
              <Text style={[styles.tabText, tab === 'register' && styles.tabTextActive]}>Register</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.form}>
            {tab === 'register' && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Full Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Your full name"
                  placeholderTextColor="#555"
                  value={name}
                  onChangeText={setName}
                />
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email Address</Text>
              <TextInput
                style={styles.input}
                placeholder="team@hackathon.com"
                placeholderTextColor="#555"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.passwordRow}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="••••••••"
                  placeholderTextColor="#555"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword(!showPassword)}>
                  <MaterialCommunityIcons name={showPassword ? 'eye-off' : 'eye'} size={20} color="#888" />
                </TouchableOpacity>
              </View>
            </View>

            {tab === 'register' && (
              <>
                <Text style={styles.label}>Your Role</Text>
                <View style={styles.roleRow}>
                  <RoleButton r="participant" label="Participant" color="#9d4edd" />
                  <RoleButton r="volunteer" label="Volunteer" color="#ff006e" />
                  <RoleButton r="admin" label="Admin" color="#3a86ff" />
                </View>

                {role === 'participant' && (
                  <View style={[styles.inputGroup, { marginTop: 16 }]}>
                    <Text style={styles.label}>Team ID (given at registration)</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. TEAM-042"
                      placeholderTextColor="#555"
                      value={teamId}
                      onChangeText={setTeamId}
                      autoCapitalize="characters"
                    />
                  </View>
                )}
              </>
            )}

            <TouchableOpacity
              style={styles.submitBtn}
              onPress={tab === 'login' ? handleLogin : handleRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitText}>{tab === 'login' ? 'Sign In →' : 'Create Account'}</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  scroll: { flexGrow: 1, padding: 24, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: 40 },
  logoBox: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: '#1e1e1e', alignItems: 'center', justifyContent: 'center',
    marginBottom: 16, borderWidth: 1, borderColor: '#2a2a2a'
  },
  title: { fontSize: 32, fontWeight: '900', color: '#fff', letterSpacing: -0.5 },
  subtitle: { color: '#888', fontSize: 14, marginTop: 4 },
  tabRow: {
    flexDirection: 'row', backgroundColor: '#1e1e1e',
    borderRadius: 12, padding: 4, marginBottom: 28
  },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 10 },
  tabActive: { backgroundColor: '#9d4edd' },
  tabText: { color: '#888', fontWeight: '600' },
  tabTextActive: { color: '#fff' },
  form: {},
  inputGroup: { marginBottom: 20 },
  label: { color: '#a0a0a0', fontSize: 13, fontWeight: '600', marginBottom: 8, textTransform: 'uppercase' },
  input: {
    backgroundColor: '#1e1e1e', borderWidth: 1, borderColor: '#2a2a2a',
    borderRadius: 12, color: '#fff', padding: 16, fontSize: 16,
  },
  passwordRow: { flexDirection: 'row', alignItems: 'center' },
  eyeBtn: { position: 'absolute', right: 16 },
  roleRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  roleBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1.5, alignItems: 'center' },
  roleBtnText: { fontWeight: 'bold', fontSize: 12 },
  submitBtn: {
    backgroundColor: '#9d4edd', padding: 18, borderRadius: 14,
    alignItems: 'center', marginTop: 28,
  },
  submitText: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
});
