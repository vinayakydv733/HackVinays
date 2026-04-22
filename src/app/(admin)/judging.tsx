import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { collection, query, onSnapshot, addDoc, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../_layout';

export default function AdminJudging() {
  const auth = useAuth();
  const [teams, setTeams] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [scores, setScores] = useState({ ux: '', technical: '', business: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'teams'), (snap) => {
      setTeams(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, []);

  const currentTeam = teams[currentIndex];

  const saveScore = async () => {
    if (!currentTeam) return;
    const ux = parseFloat(scores.ux);
    const tech = parseFloat(scores.technical);
    const biz = parseFloat(scores.business);

    if ([ux, tech, biz].some(v => isNaN(v) || v < 0 || v > 10)) {
      return Alert.alert('Invalid Scores', 'All scores must be between 0 and 10.');
    }

    setSaving(true);
    try {
      await addDoc(collection(db, 'judging_scores'), {
        teamId: currentTeam.id,
        teamName: currentTeam.teamName,
        judgedBy: auth?.user?.uid,
        round: 1,
        scores: { ux_design: ux, technical: tech, business: biz },
        locked: false,
        createdAt: new Date().toISOString(),
      });
      setScores({ ux: '', technical: '', business: '' });
      if (currentIndex < teams.length - 1) setCurrentIndex(i => i + 1);
      else Alert.alert('Done!', 'All teams have been judged!');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  if (!currentTeam) return (
    <View style={{ flex: 1, backgroundColor: '#121212', justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color="#3a86ff" />
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <Text style={styles.title}>Judging Matrix</Text>
        <Text style={styles.progress}>{currentIndex + 1} / {teams.length}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.teamTitle}>Evaluating: {currentTeam.teamName}</Text>
        <Text style={styles.teamSub}>{currentTeam.memberCount || 0} members · {currentTeam.checkInStatus}</Text>

        {[
          { key: 'ux', label: 'UX / Design', weight: '30%', color: '#9d4edd', desc: 'Usability, aesthetics, accessibility' },
          { key: 'technical', label: 'Technical Complexity', weight: '40%', color: '#3a86ff', desc: 'Architecture, backend, difficulty' },
          { key: 'business', label: 'Business Viability', weight: '30%', color: '#ff006e', desc: 'Market fit, monetization potential' },
        ].map(c => (
          <View key={c.key} style={styles.criteriaRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.critLabel}>{c.label} <Text style={{ color: c.color }}>({c.weight})</Text></Text>
              <Text style={styles.critDesc}>{c.desc}</Text>
            </View>
            <TextInput
              style={[styles.scoreInput, { borderColor: c.color }]}
              keyboardType="numeric"
              placeholder="0-10"
              placeholderTextColor="#555"
              value={scores[c.key as keyof typeof scores]}
              onChangeText={v => setScores(s => ({ ...s, [c.key]: v }))}
              maxLength={4}
            />
          </View>
        ))}

        <TouchableOpacity style={styles.saveBtn} onPress={saveScore} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : (
            <Text style={styles.saveBtnText}>
              Save & Next Team {currentIndex < teams.length - 1 ? '→' : '✓'}
            </Text>
          )}
        </TouchableOpacity>

        {/* Skip */}
        {currentIndex < teams.length - 1 && (
          <TouchableOpacity style={styles.skipBtn} onPress={() => setCurrentIndex(i => i + 1)}>
            <Text style={styles.skipText}>Skip Team →</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  content: { padding: 16, paddingBottom: 100 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  progress: { color: '#3a86ff', fontSize: 16, fontWeight: 'bold' },
  card: { backgroundColor: '#1e1e1e', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#333' },
  teamTitle: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  teamSub: { color: '#888', marginBottom: 24, marginTop: 4 },
  criteriaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  critLabel: { color: '#fff', fontSize: 16, fontWeight: '600' },
  critDesc: { color: '#a0a0a0', fontSize: 12, marginTop: 4 },
  scoreInput: { backgroundColor: '#121212', borderWidth: 1.5, width: 72, height: 52, borderRadius: 10, color: '#fff', fontSize: 20, textAlign: 'center' },
  saveBtn: { backgroundColor: '#3a86ff', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 12 },
  saveBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  skipBtn: { alignItems: 'center', marginTop: 16 },
  skipText: { color: '#888', fontWeight: 'bold' }
});
