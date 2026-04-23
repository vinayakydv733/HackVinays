import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { collection, doc, onSnapshot, orderBy, query, updateDoc } from 'firebase/firestore';
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
import Button from '../../components/ui/Button';
import { COLORS, FONTS, RADIUS, SPACING } from '../../constants/theme';
import { db } from '../../firebase/config';

// The data structure that participants will send to Firebase
interface HelpRequest {
  id: string;
  type: 'sos' | 'pass_restroom' | 'pass_game' | 'tech';
  status: 'pending' | 'active' | 'resolved';
  teamName: string;
  userName: string;
  message?: string;
  createdAt: number;
}

export default function AdminRequests() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState<'sos' | 'passes' | 'tech'>('passes');
  const [requests, setRequests] = useState<HelpRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch all requests in real-time
  useEffect(() => {
    const q = query(collection(db, 'help_requests'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as HelpRequest[];
      
      // Keep SOS requests at the very top if they are pending, regardless of time
      fetched.sort((a, b) => {
        if (a.type === 'sos' && a.status === 'pending' && b.type !== 'sos') return -1;
        if (b.type === 'sos' && b.status === 'pending' && a.type !== 'sos') return 1;
        return 0;
      });

      setRequests(fetched);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const updateStatus = async (id: string, newStatus: 'active' | 'resolved') => {
    try {
      await updateDoc(doc(db, 'help_requests', id), { status: newStatus });
    } catch (error) {
      Alert.alert('Error', 'Failed to update request status.');
    }
  };

  // Filter logic based on the active tab
  const getFilteredRequests = () => {
    return requests.filter(req => {
      if (activeTab === 'sos') return req.type === 'sos';
      if (activeTab === 'passes') return req.type === 'pass_restroom' || req.type === 'pass_game';
      if (activeTab === 'tech') return req.type === 'tech';
      return true;
    });
  };

  const getCardStyle = (type: string, status: string) => {
    if (status === 'resolved') return styles.cardResolved;
    if (type === 'sos') return styles.cardSOS;
    if (type === 'pass_game' || type === 'pass_restroom') return styles.cardPass;
    return styles.cardTech; // Tech
  };

  const getTypeLabel = (type: string) => {
    switch(type) {
      case 'sos': return { label: 'EMERGENCY / SOS', icon: 'warning', color: '#E74C3C' };
      case 'pass_restroom': return { label: 'RESTROOM PASS', icon: 'water', color: '#3498DB' };
      case 'pass_game': return { label: 'GAME ROOM PASS', icon: 'game-controller', color: '#9B59B6' };
      case 'tech': return { label: 'TECH SUPPORT', icon: 'hardware-chip', color: '#F39C12' };
      default: return { label: 'REQUEST', icon: 'help-circle', color: COLORS.textSecondary };
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const pendingSOSCount = requests.filter(r => r.type === 'sos' && r.status === 'pending').length;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + SPACING.sm }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
          <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help Desk & Passes</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Segmented Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tabBtn, activeTab === 'sos' && styles.tabBtnSOS]}
          onPress={() => setActiveTab('sos')}
        >
          <Text style={[styles.tabText, activeTab === 'sos' && { color: '#FFF' }]}>
            SOS {pendingSOSCount > 0 ? `(${pendingSOSCount})` : ''}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tabBtn, activeTab === 'passes' && styles.tabBtnActive]}
          onPress={() => setActiveTab('passes')}
        >
          <Text style={[styles.tabText, activeTab === 'passes' && { color: '#FFF' }]}>Passes</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tabBtn, activeTab === 'tech' && styles.tabBtnActive]}
          onPress={() => setActiveTab('tech')}
        >
          <Text style={[styles.tabText, activeTab === 'tech' && { color: '#FFF' }]}>Tech</Text>
        </TouchableOpacity>
      </View>

      {/* Requests List */}
      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: SPACING.xl }} />
      ) : (
        <FlatList
          data={getFilteredRequests()}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="checkmark-done-circle-outline" size={48} color={COLORS.border} />
              <Text style={styles.emptyText}>No active requests in this category.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const config = getTypeLabel(item.type);
            
            return (
              <View style={[styles.card, getCardStyle(item.type, item.status)]}>
                {/* Card Header */}
                <View style={styles.cardHeaderRow}>
                  <View style={styles.typeBadge}>
                    <Ionicons name={config.icon as any} size={14} color={config.color} />
                    <Text style={[styles.typeBadgeText, { color: config.color }]}>{config.label}</Text>
                  </View>
                  <Text style={styles.timeText}>{formatTime(item.createdAt)}</Text>
                </View>

                {/* Participant Info */}
                <Text style={styles.teamName}>{item.teamName}</Text>
                <Text style={styles.userName}>Participant: {item.userName}</Text>
                
                {/* Optional Message */}
                {item.message && (
                  <View style={styles.messageBox}>
                    <Text style={styles.messageText}>{item.message}</Text>
                  </View>
                )}

                {/* Actions Based on Status */}
                <View style={styles.actionContainer}>
                  {item.status === 'pending' && (
                    <Button 
                      title={item.type.includes('pass') ? "ISSUE PASS" : "ACCEPT TICKET"} 
                      onPress={() => updateStatus(item.id, 'active')}
                      style={styles.acceptBtn}
                    />
                  )}

                  {item.status === 'active' && (
                    <Button 
                      title={item.type.includes('pass') ? "MARK RETURNED" : "MARK RESOLVED"} 
                      onPress={() => updateStatus(item.id, 'resolved')}
                      style={styles.resolveBtn}
                    />
                  )}

                  {item.status === 'resolved' && (
                    <View style={styles.resolvedBadge}>
                      <Ionicons name="checkmark-circle" size={16} color="#2ECC71" />
                      <Text style={styles.resolvedText}>COMPLETED</Text>
                    </View>
                  )}
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, paddingBottom: SPACING.md,
    backgroundColor: COLORS.bgCard, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  iconButton: { padding: SPACING.xs },
  headerTitle: { fontSize: FONTS.size.lg, fontWeight: 'bold', color: COLORS.textPrimary },
  
  tabContainer: { flexDirection: 'row', padding: SPACING.md, gap: SPACING.sm },
  tabBtn: { flex: 1, paddingVertical: SPACING.sm, alignItems: 'center', borderRadius: RADIUS.sm, backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.border },
  tabBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  tabBtnSOS: { backgroundColor: '#E74C3C', borderColor: '#E74C3C' },
  tabText: { fontSize: FONTS.size.sm, fontWeight: 'bold', color: COLORS.textSecondary },
  
  listContent: { padding: SPACING.lg, paddingBottom: SPACING.xl, gap: SPACING.md },
  
  card: { backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg, padding: SPACING.lg, borderWidth: 1 },
  cardSOS: { borderColor: '#E74C3C', backgroundColor: '#E74C3C0A' },
  cardPass: { borderColor: COLORS.border }, // Default look
  cardTech: { borderColor: '#F39C1288', backgroundColor: '#F39C1205' },
  cardResolved: { borderColor: COLORS.border, opacity: 0.6, backgroundColor: '#F9F9F9' }, // Faded when done

  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  typeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.bg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.border },
  typeBadgeText: { fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },
  timeText: { fontSize: FONTS.size.xs, color: COLORS.textSecondary, fontWeight: '500' },

  teamName: { fontSize: FONTS.size.xl, fontWeight: '800', color: COLORS.textPrimary },
  userName: { fontSize: FONTS.size.sm, color: COLORS.textSecondary, marginBottom: SPACING.sm },
  
  messageBox: { backgroundColor: COLORS.bg, padding: SPACING.sm, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.border, marginBottom: SPACING.md },
  messageText: { fontSize: FONTS.size.sm, color: COLORS.textPrimary, fontStyle: 'italic' },

  actionContainer: { marginTop: SPACING.xs },
  acceptBtn: { backgroundColor: COLORS.primary },
  resolveBtn: { backgroundColor: '#2ECC71', borderColor: '#2ECC71' },
  
  resolvedBadge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: SPACING.sm },
  resolvedText: { fontSize: FONTS.size.sm, fontWeight: 'bold', color: '#2ECC71' },

  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingTop: SPACING.xl },
  emptyText: { marginTop: SPACING.md, color: COLORS.textSecondary, fontSize: FONTS.size.md },
});