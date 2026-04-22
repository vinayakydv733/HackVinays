import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../_layout';

type Resource = { id: string; type: string; issuedToTeam: string; status: string; timestamp: string; issuedBy: string; };

export default function VolunteerResources() {
  const auth = useAuth();
  const [outResources, setOutResources] = useState<Resource[]>([]);
  const [ethernetOut, setEthernetOut] = useState(0);
  const [extOut, setExtOut] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'resources'), where('status', '==', 'Out'));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Resource[];
      setOutResources(data);
      setEthernetOut(data.filter(r => r.type === 'Ethernet').length);
      setExtOut(data.filter(r => r.type === 'Extension Board').length);
      setLoading(false);
    });
    return unsub;
  }, []);

  const issueResource = async (type: string) => {
    Alert.prompt(`Issue ${type}`, 'Enter team name:', async (team) => {
      if (!team) return;
      await addDoc(collection(db, 'resources'), {
        type,
        issuedToTeam: team,
        issuedBy: auth?.user?.uid,
        status: 'Out',
        timestamp: new Date().toISOString(),
      });
    });
  };

  const returnResource = async (id: string) => {
    await updateDoc(doc(db, 'resources', id), { status: 'Returned', returnedAt: new Date().toISOString() });
  };

  if (loading) return (
    <View style={{ flex: 1, backgroundColor: '#121212', justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color="#fb5607" />
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Equipment Tracking</Text>

      {/* Ethernet */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.iconBox}><MaterialCommunityIcons name="cable-data" size={24} color="#fb5607" /></View>
          <View style={{ marginLeft: 16, flex: 1 }}>
            <Text style={styles.resourceName}>Ethernet Cables</Text>
            <Text style={styles.resourceCount}>Out: {ethernetOut}</Text>
          </View>
        </View>
        <View style={styles.actions}>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#fb5607' }]} onPress={() => issueResource('Ethernet')}>
            <Text style={styles.btnText}>+ Issue</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Extension Boards */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.iconBox}><MaterialCommunityIcons name="power-plug" size={24} color="#ffbe0b" /></View>
          <View style={{ marginLeft: 16, flex: 1 }}>
            <Text style={styles.resourceName}>Extension Boards</Text>
            <Text style={styles.resourceCount}>Out: {extOut}</Text>
          </View>
        </View>
        <View style={styles.actions}>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#ffbe0b' }]} onPress={() => issueResource('Extension Board')}>
            <Text style={[styles.btnText, { color: '#000' }]}>+ Issue</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Live Log */}
      <Text style={styles.logTitle}>Currently Checked Out ({outResources.length})</Text>
      {outResources.length === 0 ? (
        <Text style={styles.emptyText}>All equipment returned ✓</Text>
      ) : outResources.map(r => (
        <View key={r.id} style={styles.logRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.logType}>{r.type}</Text>
            <Text style={styles.logTeam}>→ {r.issuedToTeam} • {new Date(r.timestamp).toLocaleTimeString()}</Text>
          </View>
          <TouchableOpacity style={styles.returnBtn} onPress={() => returnResource(r.id)}>
            <Text style={styles.returnText}>Return</Text>
          </TouchableOpacity>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  content: { padding: 16, paddingBottom: 100 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 24 },
  card: { backgroundColor: '#1e1e1e', borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#333' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  iconBox: { backgroundColor: '#2a2a2a', padding: 12, borderRadius: 12 },
  resourceName: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  resourceCount: { color: '#a0a0a0', fontSize: 14, marginTop: 4 },
  actions: { flexDirection: 'row' },
  actionBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  logTitle: { color: '#a0a0a0', fontSize: 14, marginTop: 16, marginBottom: 12, textTransform: 'uppercase' },
  emptyText: { color: '#21c45d', textAlign: 'center', marginTop: 20 },
  logRow: { backgroundColor: '#1e1e1e', padding: 16, borderRadius: 12, flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  logType: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  logTeam: { color: '#888', fontSize: 13, marginTop: 2 },
  returnBtn: { backgroundColor: '#333', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  returnText: { color: '#fff', fontWeight: 'bold' },
});
