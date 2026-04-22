import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ActivityIndicator, Modal, Alert, FlatList,
} from 'react-native';
import { ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useRouter } from 'expo-router';

const TRACKS = ['Web', 'Mobile', 'AI/ML', 'Hardware', 'Open'];
const FILTERS = ['All', 'Checked In', 'Pending', 'Absent'];

function statusColor(status: string) {
  if (status === 'Checked In') return '#21c45d';
  if (status === 'Absent') return '#ff006e';
  return '#ffbe0b';
}

export default function AdminTeams() {
  const [teams, setTeams] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newTeam, setNewTeam] = useState({
    teamName: '', membersExpected: '', tableNumber: '', track: 'Open',
  });
  const router = useRouter();

  useEffect(() => {
    const q = query(collection(db, 'teams'), orderBy('teamName'));
    const unsub = onSnapshot(q, (snap) => {
      setTeams(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, []);

  const filtered = teams.filter(t => {
    const matchSearch = t.teamName?.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'All' || t.checkInStatus === filter;
    return matchSearch && matchFilter;
  });

  const addTeam = async () => {
    if (!newTeam.teamName.trim()) return Alert.alert('Required', 'Team name is required.');
    setSaving(true);
    try {
      await addDoc(collection(db, 'teams'), {
        teamName: newTeam.teamName.trim(),
        membersExpected: parseInt(newTeam.membersExpected) || 0,
        membersArrived: 0,
        tableNumber: newTeam.tableNumber.trim(),
        track: newTeam.track,
        checkInStatus: 'Pending',
        projectTitle: '',
        createdAt: serverTimestamp(),
      });
      setNewTeam({ teamName: '', membersExpected: '', tableNumber: '', track: 'Open' });
      setModalVisible(false);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <View style={{ flex: 1, backgroundColor: '#121212', justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color="#3a86ff" />
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Search */}
      <View style={styles.searchBar}>
        <MaterialCommunityIcons name="magnify" size={22} color="#a0a0a0" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search team..."
          placeholderTextColor="#666"
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <MaterialCommunityIcons name="close-circle" size={18} color="#666" />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter chips */}
      <ScrollView
        horizontal showsHorizontalScrollIndicator={false}
        style={styles.filterRow}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 8 }}
      >
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.chip, filter === f && styles.chipActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.chipText, filter === f && { color: '#fff' }]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Count */}
      <Text style={styles.countLabel}>{filtered.length} team{filtered.length !== 1 ? 's' : ''}</Text>

      {/* Table header */}
      <View style={styles.tableHeader}>
        <Text style={[styles.th, { flex: 2 }]}>TEAM</Text>
        <Text style={[styles.th, { flex: 1.5 }]}>STATUS</Text>
        <Text style={[styles.th, { flex: 0.8, textAlign: 'center' }]}>SIZE</Text>
        <Text style={[styles.th, { width: 32 }]} />
      </View>

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingBottom: 120 }}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', marginTop: 60 }}>
            <MaterialCommunityIcons name="account-group-outline" size={48} color="#333" />
            <Text style={{ color: '#555', fontSize: 16, marginTop: 12 }}>
              {teams.length === 0 ? 'No teams yet — tap + to add' : 'No results found'}
            </Text>
          </View>
        }
        renderItem={({ item: team }) => (
          <TouchableOpacity
            style={styles.row}
            onPress={() => router.push(`/(admin)/team-detail/${team.id}` as any)}
            activeOpacity={0.7}
          >
            <View style={{ flex: 2 }}>
              <Text style={styles.teamName} numberOfLines={1}>{team.teamName}</Text>
              {team.tableNumber ? (
                <Text style={styles.tableBadge}>Table {team.tableNumber}</Text>
              ) : null}
            </View>
            <View style={{ flex: 1.5 }}>
              <View style={[styles.statusBadge, { backgroundColor: statusColor(team.checkInStatus) + '22' }]}>
                <Text style={[styles.statusText, { color: statusColor(team.checkInStatus) }]}>
                  {team.checkInStatus || 'Pending'}
                </Text>
              </View>
            </View>
            <Text style={[styles.td, { flex: 0.8, textAlign: 'center' }]}>
              {team.membersArrived ?? 0}/{team.membersExpected ?? 0}
            </Text>
            <MaterialCommunityIcons name="chevron-right" size={22} color="#555" style={{ width: 32 }} />
          </TouchableOpacity>
        )}
      />

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
        <MaterialCommunityIcons name="plus" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Add Team Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={styles.overlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Team</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#a0a0a0" />
              </TouchableOpacity>
            </View>

            <TextInput style={styles.input} placeholder="Team Name *" placeholderTextColor="#555"
              value={newTeam.teamName} onChangeText={v => setNewTeam(s => ({ ...s, teamName: v }))} />
            <TextInput style={styles.input} placeholder="Members Expected" placeholderTextColor="#555"
              keyboardType="numeric" value={newTeam.membersExpected}
              onChangeText={v => setNewTeam(s => ({ ...s, membersExpected: v }))} />
            <TextInput style={styles.input} placeholder="Table Number" placeholderTextColor="#555"
              value={newTeam.tableNumber} onChangeText={v => setNewTeam(s => ({ ...s, tableNumber: v }))} />

            <Text style={styles.fieldLabel}>Track</Text>
            <View style={styles.trackRow}>
              {TRACKS.map(track => (
                <TouchableOpacity
                  key={track}
                  style={[styles.trackChip, newTeam.track === track && styles.trackChipActive]}
                  onPress={() => setNewTeam(s => ({ ...s, track }))}
                >
                  <Text style={[styles.trackText, newTeam.track === track && { color: '#fff' }]}>{track}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.saveBtn} onPress={addTeam} disabled={saving}>
              {saving
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.saveBtnText}>Add Team</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e1e1e',
    paddingHorizontal: 14, marginHorizontal: 16, marginTop: 14,
    borderRadius: 12, borderWidth: 1, borderColor: '#333',
  },
  searchInput: { flex: 1, paddingVertical: 13, color: '#fff', marginLeft: 10, fontSize: 15 },
  filterRow: { marginTop: 10 },
  chip: {
    paddingVertical: 7, paddingHorizontal: 16, borderRadius: 20,
    backgroundColor: '#1e1e1e', marginRight: 8, borderWidth: 1, borderColor: '#333',
  },
  chipActive: { backgroundColor: '#3a86ff', borderColor: '#3a86ff' },
  chipText: { color: '#888', fontSize: 13, fontWeight: '600' },
  countLabel: { color: '#555', fontSize: 12, paddingHorizontal: 20, marginBottom: 4 },
  tableHeader: {
    flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#2a2a2a',
  },
  th: { color: '#555', fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.5 },
  row: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20,
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#1a1a1a',
  },
  teamName: { color: '#fff', fontSize: 14, fontWeight: '600' },
  tableBadge: { color: '#555', fontSize: 11, marginTop: 2 },
  statusBadge: { paddingVertical: 3, paddingHorizontal: 8, borderRadius: 6, alignSelf: 'flex-start' },
  statusText: { fontSize: 11, fontWeight: 'bold' },
  td: { color: '#888', fontSize: 14 },
  fab: {
    position: 'absolute', bottom: 90, right: 20,
    width: 56, height: 56, borderRadius: 28, backgroundColor: '#3a86ff',
    justifyContent: 'center', alignItems: 'center',
    elevation: 8, shadowColor: '#3a86ff', shadowOpacity: 0.5,
    shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
  },
  overlay: { flex: 1, backgroundColor: '#000000bb', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: '#1a1a1a', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 44,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  input: {
    backgroundColor: '#121212', borderWidth: 1, borderColor: '#333',
    borderRadius: 10, color: '#fff', padding: 14, fontSize: 15, marginBottom: 12,
  },
  fieldLabel: { color: '#888', fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 8 },
  trackRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  trackChip: {
    paddingVertical: 7, paddingHorizontal: 14, borderRadius: 8,
    backgroundColor: '#2a2a2a', borderWidth: 1, borderColor: '#333',
  },
  trackChipActive: { backgroundColor: '#3a86ff', borderColor: '#3a86ff' },
  trackText: { color: '#888', fontWeight: '600', fontSize: 13 },
  saveBtn: { backgroundColor: '#3a86ff', padding: 16, borderRadius: 12, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});
