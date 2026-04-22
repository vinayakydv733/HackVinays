import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { collection, query, where, onSnapshot, doc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../_layout';
import { useRouter } from 'expo-router';

export default function VolunteerHome() {
  const auth = useAuth();
  const router = useRouter();
  const [volunteerData, setVolunteerData] = useState<any>(null);
  const [overtimePasses, setOvertimePasses] = useState(0);
  const [pendingTasks, setPendingTasks] = useState<any[]>([]);

  useEffect(() => {
    if (!auth?.user) return;
    const unsub = onSnapshot(doc(db, 'users', auth.user.uid), (snap) => {
      if (snap.exists()) setVolunteerData(snap.data());
    });
    return unsub;
  }, [auth?.user]);

  // Count overtime passes
  useEffect(() => {
    const q = query(collection(db, 'passes'), where('status', '==', 'Overtime'));
    const unsub = onSnapshot(q, (snap) => setOvertimePasses(snap.size));
    return unsub;
  }, []);

  // Listen to tasks assigned to this zone
  useEffect(() => {
    const q = query(collection(db, 'tasks'), where('resolved', '==', false));
    const unsub = onSnapshot(q, (snap) => {
      setPendingTasks(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.greetingRow}>
        <Text style={styles.greeting}>Hey, {volunteerData?.name?.split(' ')[0] || 'Volunteer'} 👋</Text>
        <TouchableOpacity onPress={auth?.signOut}>
          <MaterialCommunityIcons name="logout" size={24} color="#888" />
        </TouchableOpacity>
      </View>

      <View style={styles.zoneBanner}>
        <MaterialCommunityIcons name="map-marker-radius" size={24} color="#fff" />
        <Text style={styles.zoneText}>Zone: {volunteerData?.assignedZone || 'Unassigned'}</Text>
        {overtimePasses > 0 && (
          <View style={styles.alertPill}>
            <Text style={styles.alertPillText}>{overtimePasses} OVERTIME!</Text>
          </View>
        )}
      </View>

      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.grid}>
        <TouchableOpacity style={styles.gridBtn} onPress={() => router.push('/(volunteer)/checkin' as any)}>
          <MaterialCommunityIcons name="qrcode-scan" size={36} color="#ff006e" />
          <Text style={styles.btnText}>Scan QR</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.gridBtn} onPress={() => router.push('/(volunteer)/passes' as any)}>
          <MaterialCommunityIcons name="ticket-confirmation" size={36} color="#3a86ff" />
          <Text style={styles.btnText}>Issue Pass</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.gridBtn} onPress={() => router.push('/(volunteer)/resources' as any)}>
          <MaterialCommunityIcons name="cable-data" size={36} color="#fb5607" />
          <Text style={styles.btnText}>Log Cable</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.gridBtn}>
          <MaterialCommunityIcons name="food-apple" size={36} color="#8338ec" />
          <Text style={styles.btnText}>Confirm Meal</Text>
        </TouchableOpacity>
      </View>

      {pendingTasks.length > 0 && (
        <>
          <Text style={[styles.sectionTitle, { marginTop: 32 }]}>Active Tasks</Text>
          {pendingTasks.map(task => (
            <View key={task.id} style={styles.taskCard}>
              <MaterialCommunityIcons name="alert-circle" size={24} color="#ffbe0b" />
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={styles.taskTitle}>{task.title}</Text>
                <Text style={styles.taskDesc}>{task.description}</Text>
              </View>
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  content: { padding: 16, paddingBottom: 100 },
  greetingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  greeting: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  zoneBanner: { backgroundColor: '#333', padding: 16, borderRadius: 12, flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  zoneText: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginLeft: 12, flex: 1 },
  alertPill: { backgroundColor: '#ff006e', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  alertPillText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  sectionTitle: { color: '#a0a0a0', fontSize: 14, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  gridBtn: { backgroundColor: '#1e1e1e', width: '48%', padding: 24, borderRadius: 16, alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: '#2a2a2a' },
  btnText: { color: '#fff', fontSize: 14, fontWeight: '600', marginTop: 12 },
  taskCard: { backgroundColor: '#1e1e1e', padding: 16, borderRadius: 12, flexDirection: 'row', alignItems: 'center', borderLeftWidth: 4, borderLeftColor: '#ffbe0b', marginBottom: 12 },
  taskTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  taskDesc: { color: '#a0a0a0', fontSize: 14, marginTop: 4 },
});
