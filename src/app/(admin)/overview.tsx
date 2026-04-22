import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { collection, query, where, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../_layout';

export default function AdminOverview() {
  const auth = useAuth();
  const [checkedIn, setCheckedIn] = useState(0);
  const [totalTeams, setTotalTeams] = useState(0);
  const [overtimePasses, setOvertimePasses] = useState(0);
  const [cablesOut, setCablesOut] = useState(0);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Teams stats
    const teamsUnsub = onSnapshot(collection(db, 'teams'), (snap) => {
      setTotalTeams(snap.size);
      setCheckedIn(snap.docs.filter(d => d.data().checkInStatus === 'Checked In').length);
    });

    // Overtime passes
    const passesUnsub = onSnapshot(
      query(collection(db, 'passes'), where('status', 'in', ['Active', 'Overtime'])),
      (snap) => setOvertimePasses(snap.docs.filter(d => {
        const issued = new Date(d.data().issuedAt).getTime();
        return Date.now() - issued > 30 * 60 * 1000;
      }).length)
    );

    // Cables out
    const resourcesUnsub = onSnapshot(
      query(collection(db, 'resources'), where('status', '==', 'Out')),
      (snap) => setCablesOut(snap.size)
    );

    // Active SOS alerts
    const alertsUnsub = onSnapshot(
      query(collection(db, 'alerts'), where('resolved', '==', false)),
      (snap) => setAlerts(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );

    setLoading(false);
    return () => { teamsUnsub(); passesUnsub(); resourcesUnsub(); alertsUnsub(); };
  }, []);

  const resolveAlert = async (alertId: string) => {
    await updateDoc(doc(db, 'alerts', alertId), { resolved: true, resolvedAt: new Date().toISOString() });
  };

  if (loading) return (
    <View style={{ flex: 1, backgroundColor: '#121212', justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color="#3a86ff" />
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* SOS Alerts */}
      {alerts.map(alert => (
        <TouchableOpacity
          key={alert.id}
          style={styles.sosBanner}
          onPress={() => Alert.alert('Resolve Alert?', '', [
            { text: 'Cancel' },
            { text: 'Mark Resolved', onPress: () => resolveAlert(alert.id) }
          ])}
        >
          <MaterialCommunityIcons name="alert-decagram" size={28} color="#fff" />
          <View style={{ marginLeft: 16 }}>
            <Text style={styles.sosTitle}>ACTIVE {alert.type || 'SOS'}</Text>
            <Text style={styles.sosSub}>{alert.teamId} • {alert.zone || 'Unknown Zone'}</Text>
          </View>
          <MaterialCommunityIcons name="close-circle" size={24} color="#fff" style={{ marginLeft: 'auto' }} />
        </TouchableOpacity>
      ))}

      {/* Logout */}
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>Event Health Operations</Text>
        <TouchableOpacity onPress={auth?.signOut}>
          <MaterialCommunityIcons name="logout" size={24} color="#888" />
        </TouchableOpacity>
      </View>

      {/* Stats Grid */}
      <View style={styles.grid}>
        <View style={styles.statCard}>
          <Text style={styles.statVal}>{checkedIn}</Text>
          <Text style={styles.statLabel}>Teams In</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statVal, { color: '#ffbe0b' }]}>{totalTeams - checkedIn}</Text>
          <Text style={styles.statLabel}>Missing</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statVal, { color: overtimePasses > 0 ? '#ff006e' : '#fff' }]}>{overtimePasses}</Text>
          <Text style={styles.statLabel}>Overtime Passes</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statVal, { color: '#fb5607' }]}>{cablesOut}</Text>
          <Text style={styles.statLabel}>Equipment Out</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  content: { padding: 16, paddingBottom: 100 },
  sosBanner: { backgroundColor: '#ff006e', flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, marginBottom: 16 },
  sosTitle: { color: '#fff', fontSize: 16, fontWeight: '900', letterSpacing: 1 },
  sosSub: { color: '#fff', fontSize: 14, marginTop: 4 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { color: '#a0a0a0', textTransform: 'uppercase', fontSize: 13, letterSpacing: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  statCard: { backgroundColor: '#1e1e1e', width: '48%', padding: 20, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: '#333' },
  statVal: { color: '#fff', fontSize: 32, fontWeight: 'bold' },
  statLabel: { color: '#a0a0a0', fontSize: 14, marginTop: 4 },
});
