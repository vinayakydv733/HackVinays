import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { doc, onSnapshot, collection, query, where } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../_layout';

export default function ParticipantHome() {
  const auth = useAuth();
  const [userData, setUserData] = useState<any>(null);
  const [teamData, setTeamData] = useState<any>(null);
  const [activePasses, setActivePasses] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [hackTime, setHackTime] = useState<{ end: string } | null>(null);
  const [timeLeft, setTimeLeft] = useState('');
  const [loading, setLoading] = useState(true);

  // Load user + team data
  useEffect(() => {
    if (!auth?.user) return;

    const userUnsub = onSnapshot(doc(db, 'users', auth.user.uid), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setUserData(data);

        // Load team if teamId exists
        if (data.teamId) {
          const teamUnsub = onSnapshot(doc(db, 'teams', data.teamId), (tSnap) => {
            if (tSnap.exists()) setTeamData(tSnap.data());
          });
          return teamUnsub;
        }
      }
      setLoading(false);
    });

    return userUnsub;
  }, [auth?.user]);

  // Load active passes for this user's team
  useEffect(() => {
    if (!teamData?.teamId) return;
    const q = query(
      collection(db, 'passes'),
      where('teamId', '==', teamData.teamId),
      where('status', '==', 'Active')
    );
    const unsub = onSnapshot(q, (snap) => {
      setActivePasses(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [teamData?.teamId]);

  // Load announcements (live)
  useEffect(() => {
    const q = query(collection(db, 'announcements'));
    const unsub = onSnapshot(q, (snap) => {
      const sorted = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a: any, b: any) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      setAnnouncements(sorted.slice(0, 3));
      setLoading(false);
    });
    return unsub;
  }, []);

  // Load hackathon timer
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'hackathon_times'), (snap) => {
      if (snap.exists()) setHackTime(snap.data() as any);
    });
    return unsub;
  }, []);

  // Countdown ticker
  useEffect(() => {
    if (!hackTime?.end) return;
    const tick = () => {
      const diff = new Date(hackTime.end).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft('TIME UP!'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [hackTime]);

  const triggerSOS = async () => {
    Alert.alert('SOS Sent', 'Medical team has been alerted to your location!', [{ text: 'OK' }]);
    // In production, this writes to Firestore alerts collection
    // await addDoc(collection(db, 'alerts'), { type: 'SOS', teamId: teamData?.teamId, zone: 'Unknown', resolved: false, createdAt: new Date().toISOString() });
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#121212', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#9d4edd" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Greeting */}
      <View style={styles.greetingRow}>
        <Text style={styles.greeting}>Hey, {userData?.name?.split(' ')[0] || 'Hacker'} 👋</Text>
        <TouchableOpacity onPress={auth?.signOut}>
          <MaterialCommunityIcons name="logout" size={24} color="#888" />
        </TouchableOpacity>
      </View>

      {/* Timer */}
      <View style={styles.timerCard}>
        <Text style={styles.timerLabel}>⏱ Time Remaining</Text>
        <Text style={styles.timerValue}>{timeLeft || '-- : -- : --'}</Text>
        <Text style={styles.timerSub}>Keep building!</Text>
      </View>

      {/* Team Status */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Your Team</Text>
        <Text style={styles.teamName}>{teamData?.teamName || 'Not Assigned Yet'}</Text>
        <View style={styles.teamRow}>
          <View style={styles.teamStat}>
            <Text style={styles.statNum}>{teamData?.membersArrived ?? '--'}</Text>
            <Text style={styles.statLabel}>Present</Text>
          </View>
          <View style={styles.teamStat}>
            <Text style={styles.statNum}>{teamData?.membersExpected ?? '--'}</Text>
            <Text style={styles.statLabel}>Expected</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: teamData?.checkInStatus === 'Checked In' ? '#21c45d20' : '#ff006e20' }]}>
            <Text style={[styles.statusText, { color: teamData?.checkInStatus === 'Checked In' ? '#21c45d' : '#ff006e' }]}>
              {teamData?.checkInStatus || 'Pending'}
            </Text>
          </View>
        </View>
      </View>

      {/* Active Passes */}
      {activePasses.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Active Passes</Text>
          {activePasses.map(p => (
            <View key={p.id} style={styles.passRow}>
              <MaterialCommunityIcons name="ticket-confirmation" size={20} color="#ff006e" />
              <Text style={styles.passText}>{p.participantName} — {p.type}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Announcements */}
      {announcements.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📢 Latest Updates</Text>
          {announcements.map(a => (
            <View key={a.id} style={styles.annoRow}>
              <Text style={styles.annoTitle}>{a.title}</Text>
              <Text style={styles.annoBody}>{a.body}</Text>
            </View>
          ))}
        </View>
      )}

      {/* SOS Button */}
      <TouchableOpacity style={styles.sosBtn} onPress={triggerSOS}>
        <MaterialCommunityIcons name="alert-circle" size={24} color="#fff" />
        <Text style={styles.sosBtnText}>Medical Emergency SOS</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  content: { padding: 16, paddingBottom: 100 },
  greetingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  greeting: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  timerCard: {
    backgroundColor: '#1a0a2e', borderRadius: 20, padding: 28,
    alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: '#9d4edd40'
  },
  timerLabel: { color: '#9d4edd', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 },
  timerValue: { fontSize: 52, fontWeight: '900', color: '#fff', marginVertical: 8, letterSpacing: 2 },
  timerSub: { color: '#888', fontSize: 13 },
  card: { backgroundColor: '#1e1e1e', borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#2a2a2a' },
  cardTitle: { color: '#888', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
  teamName: { color: '#fff', fontSize: 22, fontWeight: 'bold', marginBottom: 16 },
  teamRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  teamStat: { alignItems: 'center' },
  statNum: { color: '#fff', fontSize: 28, fontWeight: 'bold' },
  statLabel: { color: '#888', fontSize: 12 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, marginLeft: 'auto' },
  statusText: { fontWeight: 'bold', fontSize: 12 },
  passRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 12 },
  passText: { color: '#fff', fontSize: 15 },
  annoRow: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#2a2a2a' },
  annoTitle: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  annoBody: { color: '#a0a0a0', fontSize: 14, marginTop: 4 },
  sosBtn: {
    backgroundColor: '#ba1a1a', flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', padding: 18, borderRadius: 16, marginTop: 8, gap: 10
  },
  sosBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});
