import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { collection, deleteDoc, doc, onSnapshot, query, updateDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONTS, RADIUS, SPACING } from '../../constants/theme';
import { db } from '../../firebase/config';

interface HelpRequest {
  id: string;
  type: string;
  status: string;
  teamName: string;
  userName: string;
  message?: string;
  volunteerName?: string;
  createdAt: number;
}

export default function AdminRequests() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState<'sos' | 'passes' | 'tech'>('sos');
  const [requests, setRequests] = useState<HelpRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Listen to ALL requests without any filters to be 100% sure we see data
    const q = collection(db, 'help_requests');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as HelpRequest[];
      
      // 2. Manual sort by newest first
      fetched.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      
      setRequests(fetched);
      setLoading(false);
    }, (err) => {
      console.error("Firestore Error:", err);
    });
    return () => unsubscribe();
  }, []);

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'help_requests', id), { 
        status: newStatus,
        volunteerName: 'Admin',
        volunteerId: 'admin'
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to update status.');
    }
  };

  const deleteRequest = async (id: string) => {
    Alert.alert("Delete", "Permanently remove this request?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        await deleteDoc(doc(db, 'help_requests', id));
      }}
    ]);
  };

  const getFilteredRequests = () => {
    return requests.filter(req => {
      const type = (req.type || '').toLowerCase();
      if (activeTab === 'sos') return type === 'sos';
      if (activeTab === 'passes') return type.includes('pass');
      if (activeTab === 'tech') return type === 'tech';
      return true;
    });
  };

  const counts = {
    sos: requests.filter(r => (r.type || '').toLowerCase() === 'sos' && (r.status || '').toLowerCase() === 'pending').length,
    passes: requests.filter(r => (r.type || '').toLowerCase().includes('pass') && (r.status || '').toLowerCase() === 'pending').length,
    tech: requests.filter(r => (r.type || '').toLowerCase() === 'tech' && (r.status || '').toLowerCase() === 'pending').length,
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + SPACING.md }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Help Desk</Text>
          <Text style={styles.headerSubtitle}>{requests.length} Requests Found</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TabItem label="SOS" count={counts.sos} active={activeTab === 'sos'} onPress={() => setActiveTab('sos')} color="#ef4444" />
        <TabItem label="PASSES" count={counts.passes} active={activeTab === 'passes'} onPress={() => setActiveTab('passes')} color={COLORS.primary} />
        <TabItem label="TECH" count={counts.tech} active={activeTab === 'tech'} onPress={() => setActiveTab('tech')} color="#eab308" />
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>
      ) : (
        <FlatList
          data={getFilteredRequests()}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="notifications-off-outline" size={48} color={COLORS.border} />
              <Text style={styles.emptyText}>No {activeTab} requests pending.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <RequestCard 
              item={item} 
              onApprove={() => updateStatus(item.id, 'active')}
              onResolve={() => updateStatus(item.id, 'resolved')}
              onDelete={() => deleteRequest(item.id)}
            />
          )}
        />
      )}
    </View>
  );
}

const TabItem = ({ label, count, active, onPress, color }: any) => (
  <TouchableOpacity onPress={onPress} style={[styles.tab, active && { borderColor: color, backgroundColor: color + '15' }]}>
    <Text style={[styles.tabLabel, active && { color }]}>{label}</Text>
    {count > 0 && <View style={[styles.badge, { backgroundColor: color }]}><Text style={styles.badgeText}>{count}</Text></View>}
  </TouchableOpacity>
);

const RequestCard = ({ item, onApprove, onResolve, onDelete }: any) => {
  const status = (item.status || '').toLowerCase();
  const type = (item.type || '').toLowerCase();
  
  const isPending = status === 'pending';
  const isActive = status === 'active';
  const isResolved = status === 'resolved';
  const isPass = type.includes('pass');

  const typeConfig = {
    sos: { label: 'SOS', icon: 'medical', color: '#ef4444' },
    pass_game: { label: 'GAME ROOM', icon: 'game-controller', color: '#0ea5e9' },
    pass_restroom: { label: 'RESTROOM', icon: 'water', color: '#ec4899' },
    tech: { label: 'TECH SUPPORT', icon: 'build', color: '#eab308' },
  }[type as 'sos' | 'pass_game' | 'pass_restroom' | 'tech'] || { label: 'REQUEST', icon: 'help', color: '#94a3b8' };

  return (
    <View style={[styles.card, type === 'sos' && isPending && styles.cardSOS, isResolved && { opacity: 0.5 }]}>
      <View style={styles.cardHeader}>
        <View style={styles.tag}><Ionicons name={typeConfig.icon as any} size={10} color={typeConfig.color} /><Text style={[styles.tagText, { color: typeConfig.color }]}>{typeConfig.label}</Text></View>
        <View style={styles.cardHeaderRight}>
          <Text style={styles.time}>{item.createdAt ? new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now'}</Text>
          {isResolved && <TouchableOpacity onPress={onDelete}><Ionicons name="trash-outline" size={16} color="#ef4444" /></TouchableOpacity>}
        </View>
      </View>
      <Text style={styles.team}>{item.teamName || 'Unknown Team'}</Text>
      <Text style={styles.user}>{item.userName || 'Unknown Hacker'}</Text>

      {item.volunteerName ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 }}>
          <Ionicons name="person-outline" size={12} color={COLORS.textSecondary} />
          <Text style={{ fontSize: 12, color: COLORS.textSecondary, fontWeight: 'bold' }}>
            {isActive ? 'Claimed by ' : 'Resolved by '}{item.volunteerName}
          </Text>
        </View>
      ) : null}
      
      {item.message ? (
        <View style={styles.messageBox}>
          <Text style={styles.messageText}>{item.message}</Text>
        </View>
      ) : null}

      <View style={styles.actions}>
        {isPending && <TouchableOpacity style={[styles.btn, { backgroundColor: COLORS.primary }]} onPress={onApprove}><Text style={styles.btnText}>APPROVE</Text></TouchableOpacity>}
        {isActive && <TouchableOpacity style={[styles.btn, { backgroundColor: '#10b981' }]} onPress={onResolve}><Text style={styles.btnText}>{isPass ? 'RETURN PASS' : 'RESOLVE'}</Text></TouchableOpacity>}
        {isResolved && <View style={styles.done}><Ionicons name="checkmark-circle" size={16} color="#10b981" /><Text style={styles.doneText}>{isPass ? 'RETURNED' : 'COMPLETED'}</Text></View>}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.lg, paddingBottom: SPACING.lg, backgroundColor: COLORS.bgCard, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.textPrimary },
  headerSubtitle: { fontSize: 10, color: COLORS.textDim, textTransform: 'uppercase' },
  tabContainer: { flexDirection: 'row', padding: SPACING.md, gap: SPACING.sm },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, backgroundColor: COLORS.bgCard, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border },
  tabLabel: { fontSize: 10, fontWeight: 'bold', color: COLORS.textSecondary },
  badge: { paddingHorizontal: 6, borderRadius: 10, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center' },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  list: { padding: SPACING.lg, gap: SPACING.md },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { alignItems: 'center', marginTop: 100, opacity: 0.5 },
  emptyText: { color: COLORS.textSecondary, marginTop: 12 },
  card: { backgroundColor: COLORS.bgCard, borderRadius: 16, padding: SPACING.lg, borderWidth: 1, borderColor: COLORS.border },
  cardSOS: { borderColor: '#ef4444', backgroundColor: '#ef444408' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  cardHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.bg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: COLORS.border },
  tagText: { fontSize: 9, fontWeight: '900' },
  time: { fontSize: 10, color: COLORS.textDim },
  team: { fontSize: 18, fontWeight: 'bold', color: COLORS.textPrimary },
  user: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 12 },
  messageBox: { backgroundColor: COLORS.bg, padding: 12, borderRadius: 8, marginBottom: 12, borderLeftWidth: 3, borderLeftColor: COLORS.primary },
  messageText: { fontSize: 13, color: COLORS.textPrimary, fontStyle: 'italic' },
  actions: { marginTop: 4 },
  btn: { paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  done: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  doneText: { color: '#10b981', fontSize: 11, fontWeight: 'bold' },
});