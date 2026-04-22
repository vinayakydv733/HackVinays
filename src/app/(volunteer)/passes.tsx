import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../_layout';

type Pass = {
  id: string;
  participantName: string;
  type: string;
  issuedAt: string;
  status: string;
  teamId: string;
};

export default function VolunteerPasses() {
  const auth = useAuth();
  const [activeTab, setActiveTab] = useState('Active');
  const [passes, setPasses] = useState<Pass[]>([]);
  const [loading, setLoading] = useState(true);

  // Compute overtime dynamically
  const isOvertime = (issuedAt: string) => {
    const diff = Date.now() - new Date(issuedAt).getTime();
    return diff > 30 * 60 * 1000; // 30 minutes
  };

  useEffect(() => {
    const q = query(collection(db, 'passes'), where('status', 'in', ['Active', 'Overtime']));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Pass[];
      setPasses(data);
      setLoading(false);
    });
    return unsub;
  }, []);

  const issuePass = async (type: string) => {
    // In production this would open a QR scan to get participantName
    Alert.prompt(
      `Issue ${type} Pass`,
      'Enter participant name:',
      async (name) => {
        if (!name) return;
        await addDoc(collection(db, 'passes'), {
          participantName: name,
          type,
          issuedAt: new Date().toISOString(),
          issuedBy: auth?.user?.uid,
          teamId: 'manual',
          status: 'Active',
        });
        Alert.alert('Pass Issued!', `${name} has a ${type} pass.`);
      }
    );
  };

  const markReturned = async (passId: string) => {
    await updateDoc(doc(db, 'passes', passId), {
      status: 'Returned',
      returnedAt: new Date().toISOString(),
    });
  };

  if (loading) return (
    <View style={{ flex: 1, backgroundColor: '#121212', justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color="#ff006e" />
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.tabRow}>
        <TouchableOpacity style={[styles.tab, activeTab === 'Issue' && styles.tabActive]} onPress={() => setActiveTab('Issue')}>
          <Text style={[styles.tabText, activeTab === 'Issue' && styles.tabTextActive]}>Issue New</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'Active' && styles.tabActive]} onPress={() => setActiveTab('Active')}>
          <Text style={[styles.tabText, activeTab === 'Active' && styles.tabTextActive]}>
            Active ({passes.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {activeTab === 'Issue' ? (
          <View style={styles.panel}>
            <Text style={styles.instruction}>Select a pass type to issue:</Text>
            <TouchableOpacity style={styles.passTypeBtn} onPress={() => issuePass('Game Room')}>
              <MaterialCommunityIcons name="gamepad-variant" size={24} color="#9d4edd" />
              <Text style={styles.passTypeName}>Game Room Pass</Text>
              <MaterialCommunityIcons name="chevron-right" size={20} color="#555" style={{ marginLeft: 'auto' }} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.passTypeBtn} onPress={() => issuePass('Rest Area')}>
              <MaterialCommunityIcons name="bed" size={24} color="#3a86ff" />
              <Text style={styles.passTypeName}>Rest Area Pass</Text>
              <MaterialCommunityIcons name="chevron-right" size={20} color="#555" style={{ marginLeft: 'auto' }} />
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            {passes.length === 0 ? (
              <View style={styles.empty}>
                <MaterialCommunityIcons name="ticket-confirmation-outline" size={48} color="#333" />
                <Text style={styles.emptyText}>No active passes right now</Text>
              </View>
            ) : passes.map(p => {
              const overtime = isOvertime(p.issuedAt);
              return (
                <View key={p.id} style={[styles.activeCard, overtime && { borderColor: '#ff006e', borderWidth: 1.5 }]}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.studentName}>{p.participantName}</Text>
                    <View style={[overtime ? styles.statusBadgeAlert : styles.statusBadgeNormal]}>
                      <Text style={[overtime ? styles.statusAlertText : styles.statusNormalText]}>
                        {overtime ? 'OVERTIME' : 'OKAY'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.cardDetail}>{p.type} • Issued at {new Date(p.issuedAt).toLocaleTimeString()}</Text>
                  <TouchableOpacity style={styles.returnBtn} onPress={() => markReturned(p.id)}>
                    <Text style={styles.returnBtnText}>✓ Mark Returned</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  content: { padding: 16, paddingBottom: 100 },
  tabRow: { flexDirection: 'row', padding: 16, backgroundColor: '#1e1e1e', borderBottomWidth: 1, borderBottomColor: '#333' },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#ff006e' },
  tabText: { color: '#a0a0a0', fontWeight: 'bold' },
  tabTextActive: { color: '#ff006e' },
  panel: { backgroundColor: '#1e1e1e', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#333' },
  instruction: { color: '#fff', fontSize: 16, marginBottom: 20 },
  passTypeBtn: { backgroundColor: '#121212', padding: 16, borderRadius: 12, flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  passTypeName: { color: '#fff', fontSize: 16, fontWeight: '600', marginLeft: 16 },
  empty: { alignItems: 'center', marginTop: 80 },
  emptyText: { color: '#555', marginTop: 12 },
  activeCard: { backgroundColor: '#1e1e1e', padding: 16, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: '#2a2a2a' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  studentName: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  statusBadgeAlert: { backgroundColor: 'rgba(255,0,110,0.2)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  statusAlertText: { color: '#ff006e', fontSize: 12, fontWeight: 'bold' },
  statusBadgeNormal: { backgroundColor: 'rgba(58,134,255,0.2)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  statusNormalText: { color: '#3a86ff', fontSize: 12, fontWeight: 'bold' },
  cardDetail: { color: '#a0a0a0', marginTop: 8, fontSize: 14 },
  returnBtn: { backgroundColor: '#333', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 16 },
  returnBtnText: { color: '#fff', fontWeight: 'bold' }
});
