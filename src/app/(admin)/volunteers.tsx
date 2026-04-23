import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { COLORS, FONTS, RADIUS, SPACING } from '../../constants/theme';
import { db } from '../../firebase/config';

interface Volunteer {
  id: string;
  name: string;
  zone: string;
  loginCode: string;
  createdAt: number;
}

const ZONES = [
  { label: 'Registration Desk', value: 'Registration', icon: 'id-card' },
  { label: 'Food & Catering', value: 'Food', icon: 'fast-food' },
  { label: 'Tech & WiFi Support', value: 'Tech Support', icon: 'hardware-chip' },
  { label: 'Crowd Control', value: 'Security', icon: 'shield-checkmark' },
  { label: 'General / Floater', value: 'General', icon: 'walk' },
];

export default function AdminVolunteers() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Add Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [selectedZone, setSelectedZone] = useState(ZONES[0].value);
  const [isAdding, setIsAdding] = useState(false);

  // Fetch volunteers in real-time
  useEffect(() => {
    const q = query(collection(db, 'volunteers'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Volunteer[];
      setVolunteers(fetched);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Generate a random 6-digit code (e.g. 482910)
  const generateLoginCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const handleAddVolunteer = async () => {
    if (!newName.trim()) {
      Alert.alert('Error', 'Please enter the volunteer\'s name.');
      return;
    }

    setIsAdding(true);
    const code = generateLoginCode();

    try {
      await addDoc(collection(db, 'volunteers'), {
        name: newName.trim(),
        zone: selectedZone,
        loginCode: code,
        createdAt: Date.now(),
      });
      
      setNewName('');
      setSelectedZone(ZONES[0].value);
      setShowAddModal(false);
      Alert.alert('Success', `Volunteer added! Their login code is ${code}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to add volunteer.');
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert(
      'Remove Volunteer',
      `Are you sure you want to remove ${name}? Their login code will immediately stop working.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'volunteers', id));
            } catch (error) {
              Alert.alert('Error', 'Failed to remove volunteer.');
            }
          }
        }
      ]
    );
  };

  const getZoneIcon = (zoneValue: string) => {
    const zone = ZONES.find(z => z.value === zoneValue);
    return zone ? zone.icon : 'person';
  };

  const filteredVolunteers = volunteers.filter((vol) =>
    vol.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    vol.zone.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + SPACING.sm }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
          <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Volunteers</Text>
        <TouchableOpacity onPress={() => setShowAddModal(true)} style={styles.iconButton}>
          <Ionicons name="person-add" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={COLORS.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or zone..."
          placeholderTextColor={COLORS.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Volunteer List */}
      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: SPACING.xl }} />
      ) : (
        <FlatList
          data={filteredVolunteers}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={48} color={COLORS.border} />
              <Text style={styles.emptyText}>No volunteers found.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardInfo}>
                <Text style={styles.volName}>{item.name}</Text>
                <View style={styles.zoneBadge}>
                  <Ionicons name={getZoneIcon(item.zone) as any} size={14} color={COLORS.primary} />
                  <Text style={styles.zoneText}>{item.zone}</Text>
                </View>
              </View>

              <View style={styles.codeContainer}>
                <Text style={styles.codeLabel}>LOGIN CODE</Text>
                <Text style={styles.codeValue} selectable={true}>{item.loginCode}</Text>
              </View>

              <TouchableOpacity onPress={() => handleDelete(item.id, item.name)} style={styles.deleteBtn}>
                <Ionicons name="trash-outline" size={20} color="#E74C3C" />
              </TouchableOpacity>
            </View>
          )}
        />
      )}

      {/* Add Volunteer Modal */}
      <Modal visible={showAddModal} transparent animationType="fade">
        <KeyboardAvoidingView 
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Add Volunteer</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <Input
              label="Volunteer Name"
              value={newName}
              onChangeText={setNewName}
              placeholder="e.g. Alex Johnson"
            />

            <Text style={styles.label}>Assign Zone</Text>
            <View style={styles.zoneGrid}>
              {ZONES.map((zone) => (
                <TouchableOpacity
                  key={zone.value}
                  onPress={() => setSelectedZone(zone.value)}
                  style={[
                    styles.zoneOptionBtn,
                    selectedZone === zone.value && styles.zoneOptionBtnActive
                  ]}
                >
                  <Ionicons 
                    name={zone.icon as any} 
                    size={16} 
                    color={selectedZone === zone.value ? '#FFF' : COLORS.textSecondary} 
                  />
                  <Text style={[
                    styles.zoneOptionText,
                    selectedZone === zone.value && styles.zoneOptionTextActive
                  ]}>
                    {zone.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.infoBox}>
              <Ionicons name="information-circle" size={20} color={COLORS.primary} />
              <Text style={styles.infoText}>
                A unique 6-digit login code will be automatically generated when you click Add.
              </Text>
            </View>

            <Button
              title="ADD & GENERATE CODE"
              onPress={handleAddVolunteer}
              loading={isAdding}
              style={{ marginTop: SPACING.md }}
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  
  searchContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.bgCard,
    margin: SPACING.lg, paddingHorizontal: SPACING.md, height: 50,
    borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border,
  },
  searchIcon: { marginRight: SPACING.sm },
  searchInput: { flex: 1, color: COLORS.textPrimary, fontSize: FONTS.size.md, height: '100%' },
  
  listContent: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xl },
  
  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.bgCard,
    padding: SPACING.lg, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border,
    marginBottom: SPACING.md,
  },
  cardInfo: { flex: 1 },
  volName: { fontSize: FONTS.size.lg, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 4 },
  zoneBadge: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primary + '1A',
    alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.sm, gap: 4,
  },
  zoneText: { fontSize: FONTS.size.xs, fontWeight: '600', color: COLORS.primary },
  
  codeContainer: {
    backgroundColor: 'transparent', padding: SPACING.sm, borderRadius: RADIUS.sm,
    alignItems: 'center', justifyContent: 'center', marginRight: SPACING.md,
    borderWidth: 1, borderColor: '#E0E0E0', minWidth: 80,
  },
  codeLabel: { fontSize: 8, fontWeight: 'bold', color: COLORS.textSecondary, letterSpacing: 1, marginBottom: 2 },
  codeValue: { fontSize: FONTS.size.lg, fontWeight: '900', color: COLORS.textPrimary, letterSpacing: 2 },
  
  deleteBtn: { padding: SPACING.xs },
  
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingTop: SPACING.xl },
  emptyText: { marginTop: SPACING.md, color: COLORS.textSecondary, fontSize: FONTS.size.md },

  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: SPACING.lg },
  modalContent: {
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg, padding: SPACING.lg,
    borderWidth: 1, borderColor: COLORS.border,
  },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.lg },
  modalTitle: { fontSize: FONTS.size.lg, fontWeight: 'bold', color: COLORS.textPrimary },
  
  label: { fontSize: FONTS.size.sm, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 8, marginTop: SPACING.sm },
  zoneGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.lg },
  zoneOptionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.bg,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: RADIUS.sm,
    borderWidth: 1, borderColor: COLORS.border,
  },
  zoneOptionBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  zoneOptionText: { fontSize: FONTS.size.xs, fontWeight: '600', color: COLORS.textSecondary },
  zoneOptionTextActive: { color: '#FFF' },

  infoBox: {
    flexDirection: 'row', backgroundColor: COLORS.primary + '1A', padding: SPACING.md,
    borderRadius: RADIUS.sm, gap: SPACING.sm, marginBottom: SPACING.md,
  },
  infoText: { flex: 1, fontSize: FONTS.size.xs, color: COLORS.primary, lineHeight: 18 },
});