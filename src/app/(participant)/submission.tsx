import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../_layout';

export default function SubmissionScreen() {
  const auth = useAuth();
  const [github, setGithub] = useState('');
  const [demo, setDemo] = useState('');
  const [devpost, setDevpost] = useState('');
  const [teamId, setTeamId] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load current submission links
  useEffect(() => {
    if (!auth?.user) return;
    const unsub = onSnapshot(doc(db, 'users', auth.user.uid), (snap) => {
      if (snap.exists() && snap.data().teamId) {
        const tid = snap.data().teamId;
        setTeamId(tid);
        const teamUnsub = onSnapshot(doc(db, 'teams', tid), (teamSnap) => {
          if (teamSnap.exists()) {
            const proj = teamSnap.data().projectDetails || {};
            setGithub(proj.github_url || '');
            setDemo(proj.demo_url || '');
            setDevpost(proj.devpost_url || '');
          }
          setLoading(false);
        });
        return teamUnsub;
      } else {
        setLoading(false);
      }
    });
    return unsub;
  }, [auth?.user]);

  const isValidUrl = (s: string) => s.length > 5 && s.includes('.');

  const handleSubmit = async () => {
    if (!teamId) return Alert.alert('No Team', 'Your account is not linked to a team.');
    setSaving(true);
    try {
      await updateDoc(doc(db, 'teams', teamId), {
        'projectDetails.github_url': github,
        'projectDetails.demo_url': demo,
        'projectDetails.devpost_url': devpost,
        'projectDetails.submittedAt': new Date().toISOString(),
      });
      Alert.alert('Submitted! 🎉', 'Your project links have been saved. Good luck!');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <View style={{ flex: 1, backgroundColor: '#121212', justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color="#9d4edd" />
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Project Submission</Text>
      <Text style={styles.subtitle}>Finalize your hard work. You can update these until judging begins.</Text>

      {(['github', 'demo', 'devpost'] as const).map((field) => {
        const val = field === 'github' ? github : field === 'demo' ? demo : devpost;
        const setter = field === 'github' ? setGithub : field === 'demo' ? setDemo : setDevpost;
        const icon = field === 'github' ? 'github' : field === 'demo' ? 'web' : 'post';
        const placeholder = field === 'github' ? 'https://github.com/team/repo'
          : field === 'demo' ? 'https://your-project.vercel.app'
          : 'https://devpost.com/software/project';
        const label = field === 'github' ? 'GitHub Repository'
          : field === 'demo' ? 'Live Demo URL (Optional)'
          : 'DevPost URL';

        return (
          <View key={field} style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <MaterialCommunityIcons name={icon as any} size={20} color="#a0a0a0" />
              <Text style={styles.label}>{label}</Text>
            </View>
            <TextInput
              style={[styles.input, isValidUrl(val) && styles.inputSuccess]}
              placeholder={placeholder}
              placeholderTextColor="#555"
              value={val}
              onChangeText={setter}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {isValidUrl(val) && (
              <MaterialCommunityIcons name="check-circle" size={20} color="#ff006e" style={styles.checkIcon} />
            )}
          </View>
        );
      })}

      <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={saving}>
        {saving ? <ActivityIndicator color="#fff" /> : (
          <>
            <MaterialCommunityIcons name="cloud-upload" size={24} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.submitBtnText}>Confirm Submission</Text>
          </>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  content: { padding: 24, paddingBottom: 100 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#a0a0a0', marginBottom: 32, lineHeight: 20 },
  inputGroup: { marginBottom: 24, position: 'relative' },
  labelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  label: { color: '#e0e0e0', fontSize: 14, fontWeight: '600', marginLeft: 8 },
  input: { backgroundColor: '#1e1e1e', borderWidth: 1, borderColor: '#333', borderRadius: 12, color: '#fff', padding: 16, fontSize: 16 },
  inputSuccess: { borderColor: '#ff006e', backgroundColor: 'rgba(255,0,110,0.05)' },
  checkIcon: { position: 'absolute', right: 16, top: 45 },
  submitBtn: { backgroundColor: '#9d4edd', flexDirection: 'row', padding: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  submitBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});
