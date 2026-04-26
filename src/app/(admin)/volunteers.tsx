import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
} from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
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
import { registerUser } from '../../firebase/auth';
import { db } from '../../firebase/config';

interface Volunteer {
  id: string;
  name: string;
  email: string;
  zone: string;
  loginCode: string;
  createdAt: number;
  uid?: string;
}

const ZONES = [
  { label: 'Registration Desk', value: 'Registration', icon: 'id-card-outline' },
  { label: 'Food & Catering', value: 'Food', icon: 'fast-food-outline' },
  { label: 'Tech & WiFi', value: 'Tech Support', icon: 'hardware-chip-outline' },
  { label: 'Crowd Control', value: 'Security', icon: 'shield-checkmark-outline' },
  { label: 'General / Floater', value: 'General', icon: 'walk-outline' },
];

const ZONE_COLORS: Record<string, string> = {
  Registration: COLORS.primary,
  Food: COLORS.green,
  'Tech Support': COLORS.purple,
  Security: COLORS.orange,
  General: COLORS.textSecondary,
};

export default function AdminVolunteers() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newVolunteerName, setNewVolunteerName] = useState('');

  // Form states
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [selectedZone, setSelectedZone] = useState(ZONES[0].value);
  const [isAdding, setIsAdding] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const q = query(
      collection(db, 'volunteers'),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setVolunteers(
        snap.docs.map((d) => ({ id: d.id, ...d.data() } as Volunteer))
      );
      setLoading(false);
    });
    return unsub;
  }, []);

  const generateLoginCode = () =>
    Math.floor(100000 + Math.random() * 900000).toString();

  const validate = () => {
    const e: Record<string, string> = {};
    if (!newName.trim()) e.name = 'Name is required';
    if (!newEmail.trim()) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(newEmail))
      e.email = 'Enter a valid email';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleAddVolunteer = async () => {
    if (!validate()) return;
    setIsAdding(true);

    const code = generateLoginCode();
    // Password = loginCode so volunteer uses code to login
    const password = code;

    try {
      // 1. Create Firebase Auth account
      const { user } = await registerUser(
        newName.trim(),
        newEmail.trim().toLowerCase(),
        password,
        'volunteer'
      );

      // 2. Save to volunteers collection with the code
      const { addDoc } = await import('firebase/firestore');
      await addDoc(collection(db, 'volunteers'), {
        uid: user.uid,
        name: newName.trim(),
        email: newEmail.trim().toLowerCase(),
        zone: selectedZone,
        loginCode: code,
        createdAt: Date.now(),
      });

      // 3. Show code to admin
      setNewCode(code);
      setNewVolunteerName(newName.trim());
      setShowAddModal(false);
      setShowCodeModal(true);

      // Reset form
      setNewName('');
      setNewEmail('');
      setSelectedZone(ZONES[0].value);
      setErrors({});
    } catch (err: any) {
      const msg =
        err.code === 'auth/email-already-in-use'
          ? 'This email is already registered'
          : err.message || 'Failed to create volunteer account';
      Alert.alert('Error', msg);
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert(
      'Remove Volunteer',
      `Remove ${name}? Their account will be deactivated.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'volunteers', id));
              // Also update users collection
              const vol = volunteers.find((v) => v.id === id);
              if (vol?.uid) {
                await updateDoc(doc(db, 'users', vol.uid), {
                  disabled: true,
                });
              }
            } catch {
              Alert.alert('Error', 'Failed to remove volunteer.');
            }
          },
        },
      ]
    );
  };

  const getZoneColor = (zone: string) =>
    ZONE_COLORS[zone] ?? COLORS.textSecondary;

  const getZoneIcon = (zone: string) =>
    ZONES.find((z) => z.value === zone)?.icon ?? 'person-outline';

  const filtered = volunteers.filter(
    (v) =>
      v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.zone.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + SPACING.sm }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.iconBtn}
        >
          <Ionicons
            name="chevron-back"
            size={24}
            color={COLORS.textPrimary}
          />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Volunteers</Text>
          <Text style={styles.headerSub}>
            {volunteers.length} registered
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => setShowAddModal(true)}
          style={styles.addBtn}
        >
          <Ionicons name="person-add-outline" size={18} color={COLORS.white} />
          <Text style={styles.addBtnText}>ADD</Text>
        </TouchableOpacity>
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        {Object.entries(ZONE_COLORS).map(([zone, color]) => {
          const count = volunteers.filter((v) => v.zone === zone).length;
          if (count === 0) return null;
          return (
            <View
              key={zone}
              style={[styles.statChip, { borderColor: color + '44' }]}
            >
              <View
                style={[styles.statDot, { backgroundColor: color }]}
              />
              <Text style={[styles.statChipText, { color }]}>
                {count}
              </Text>
              <Text style={styles.statChipLabel}>
                {zone.split(' ')[0]}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <Ionicons
          name="search-outline"
          size={18}
          color={COLORS.textSecondary}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Search name, zone or email..."
          placeholderTextColor={COLORS.textDim}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons
              name="close-circle"
              size={18}
              color={COLORS.textSecondary}
            />
          </TouchableOpacity>
        )}
      </View>

      {/* List */}
      {loading ? (
        <ActivityIndicator
          size="large"
          color={COLORS.primary}
          style={{ marginTop: SPACING.xl }}
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const zoneColor = getZoneColor(item.zone);
            const zoneIcon = getZoneIcon(item.zone);
            return (
              <View
                style={[
                  styles.card,
                  { borderLeftColor: zoneColor, borderLeftWidth: 3 },
                ]}
              >
                {/* Left: Info */}
                <View style={styles.cardInfo}>
                  <Text style={styles.volName}>{item.name}</Text>
                  <Text style={styles.volEmail}>{item.email}</Text>
                  <View style={styles.zoneBadge}>
                    <Ionicons
                      name={zoneIcon as any}
                      size={12}
                      color={zoneColor}
                    />
                    <Text style={[styles.zoneText, { color: zoneColor }]}>
                      {item.zone}
                    </Text>
                  </View>
                </View>

                {/* Middle: Code */}
                <View style={styles.codeBox}>
                  <Text style={styles.codeLabel}>LOGIN CODE</Text>
                  <Text style={styles.codeValue} selectable>
                    {item.loginCode}
                  </Text>
                  <Text style={styles.codeHint}>= password</Text>
                </View>

                {/* Right: Delete */}
                <TouchableOpacity
                  onPress={() => handleDelete(item.id, item.name)}
                  style={styles.deleteBtn}
                >
                  <Ionicons
                    name="trash-outline"
                    size={20}
                    color={COLORS.red}
                  />
                </TouchableOpacity>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons
                name="people-outline"
                size={48}
                color={COLORS.textDim}
              />
              <Text style={styles.emptyText}>
                {searchQuery
                  ? 'No volunteers match your search'
                  : 'No volunteers yet. Add your first one!'}
              </Text>
            </View>
          }
        />
      )}

      {/* ── Add Volunteer Modal ── */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Add Volunteer</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons
                  name="close"
                  size={24}
                  color={COLORS.textSecondary}
                />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Input
                label="Full Name"
                value={newName}
                onChangeText={setNewName}
                placeholder="e.g. Priya Sharma"
                error={errors.name}
              />
              <Input
                label="Email Address"
                value={newEmail}
                onChangeText={setNewEmail}
                placeholder="volunteer@college.edu"
                keyboardType="email-address"
                autoCapitalize="none"
                error={errors.email}
              />

              {/* Zone Selector */}
              <Text style={styles.zoneLabel}>ASSIGN ZONE</Text>
              <View style={styles.zoneGrid}>
                {ZONES.map((zone) => {
                  const isActive = selectedZone === zone.value;
                  const color = ZONE_COLORS[zone.value] ?? COLORS.primary;
                  return (
                    <TouchableOpacity
                      key={zone.value}
                      onPress={() => setSelectedZone(zone.value)}
                      style={[
                        styles.zoneBtn,
                        isActive && {
                          borderColor: color,
                          backgroundColor: color + '22',
                        },
                      ]}
                    >
                      <Ionicons
                        name={zone.icon as any}
                        size={16}
                        color={isActive ? color : COLORS.textSecondary}
                      />
                      <Text
                        style={[
                          styles.zoneBtnText,
                          isActive && { color },
                        ]}
                      >
                        {zone.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Info Box */}
              <View style={styles.infoBox}>
                <Ionicons
                  name="information-circle-outline"
                  size={18}
                  color={COLORS.primary}
                />
                <Text style={styles.infoText}>
                  A Firebase Auth account will be created. The volunteer
                  logs in with their email and the generated 6-digit code
                  as their password.
                </Text>
              </View>

              <Button
                title="CREATE VOLUNTEER ACCOUNT"
                onPress={handleAddVolunteer}
                loading={isAdding}
                style={{ marginTop: SPACING.sm }}
              />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Code Display Modal (shown after creation) ── */}
      <Modal
        visible={showCodeModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCodeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.codeModalContent}>
            <View style={styles.codeModalIcon}>
              <Ionicons
                name="checkmark-circle"
                size={48}
                color={COLORS.green}
              />
            </View>
            <Text style={styles.codeModalTitle}>Account Created!</Text>
            <Text style={styles.codeModalSub}>
              Share these credentials with{' '}
              <Text style={{ color: COLORS.primary, fontWeight: '700' }}>
                {newVolunteerName}
              </Text>
            </Text>

            <View style={styles.credBox}>
              <Text style={styles.credLabel}>LOGIN CODE / PASSWORD</Text>
              <Text style={styles.credCode} selectable>
                {newCode}
              </Text>
              <Text style={styles.credHint}>
                Volunteer uses their email + this code to sign in
              </Text>
            </View>

            <View style={styles.warningBox}>
              <Ionicons
                name="warning-outline"
                size={16}
                color={COLORS.orange}
              />
              <Text style={styles.warningText}>
                Save this code now — it won't be shown again in plain text
              </Text>
            </View>

            <Button
              title="DONE"
              onPress={() => setShowCodeModal(false)}
              style={{ marginTop: SPACING.md }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  iconBtn: { padding: SPACING.xs },
  headerTitle: {
    color: COLORS.textPrimary,
    fontSize: FONTS.size.lg,
    fontWeight: '800',
  },
  headerSub: {
    color: COLORS.textSecondary,
    fontSize: FONTS.size.xs,
    marginTop: 2,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
  },
  addBtnText: {
    color: COLORS.white,
    fontSize: FONTS.size.sm,
    fontWeight: '800',
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    backgroundColor: COLORS.bgCard,
  },
  statDot: { width: 6, height: 6, borderRadius: 3 },
  statChipText: { fontSize: FONTS.size.sm, fontWeight: '800' },
  statChipLabel: {
    color: COLORS.textSecondary,
    fontSize: FONTS.size.xs,
  },

  // Search
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    margin: SPACING.md,
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    height: 48,
  },
  searchInput: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: FONTS.size.sm,
  },

  // List
  list: { padding: SPACING.md, paddingBottom: 100 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  cardInfo: { flex: 1 },
  volName: {
    color: COLORS.textPrimary,
    fontSize: FONTS.size.md,
    fontWeight: '700',
  },
  volEmail: {
    color: COLORS.textSecondary,
    fontSize: FONTS.size.xs,
    marginTop: 2,
    marginBottom: SPACING.xs,
  },
  zoneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: COLORS.bgCardAlt,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
  },
  zoneText: { fontSize: FONTS.size.xs, fontWeight: '700' },
  codeBox: {
    alignItems: 'center',
    backgroundColor: COLORS.bgCardAlt,
    borderRadius: RADIUS.sm,
    padding: SPACING.sm,
    minWidth: 90,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  codeLabel: {
    color: COLORS.textSecondary,
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 2,
  },
  codeValue: {
    color: COLORS.textPrimary,
    fontSize: FONTS.size.lg,
    fontWeight: '900',
    letterSpacing: 3,
  },
  codeHint: {
    color: COLORS.textDim,
    fontSize: 8,
    marginTop: 2,
  },
  deleteBtn: {
    padding: SPACING.xs,
    backgroundColor: COLORS.red + '22',
    borderRadius: RADIUS.sm,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 80,
    gap: SPACING.md,
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.size.md,
    textAlign: 'center',
    paddingHorizontal: SPACING.xl,
  },

  // Add Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.bgCard,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.lg,
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  modalTitle: {
    color: COLORS.textPrimary,
    fontSize: FONTS.size.lg,
    fontWeight: '800',
  },
  zoneLabel: {
    color: COLORS.textSecondary,
    fontSize: FONTS.size.xs,
    letterSpacing: 2,
    fontWeight: '700',
    marginBottom: SPACING.sm,
    marginTop: SPACING.xs,
  },
  zoneGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  zoneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.bg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  zoneBtnText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.size.xs,
    fontWeight: '600',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary + '11',
    padding: SPACING.md,
    borderRadius: RADIUS.sm,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.primary + '33',
  },
  infoText: {
    flex: 1,
    color: COLORS.primary,
    fontSize: FONTS.size.xs,
    lineHeight: 18,
  },

  // Code Display Modal
  codeModalContent: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    margin: SPACING.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  codeModalIcon: {
    marginBottom: SPACING.md,
  },
  codeModalTitle: {
    color: COLORS.textPrimary,
    fontSize: FONTS.size.xl,
    fontWeight: '900',
    marginBottom: SPACING.xs,
  },
  codeModalSub: {
    color: COLORS.textSecondary,
    fontSize: FONTS.size.sm,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  credBox: {
    width: '100%',
    backgroundColor: COLORS.bg,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.green + '44',
    marginBottom: SPACING.md,
  },
  credLabel: {
    color: COLORS.textSecondary,
    fontSize: FONTS.size.xs,
    letterSpacing: 2,
    fontWeight: '700',
    marginBottom: SPACING.sm,
  },
  credCode: {
    color: COLORS.green,
    fontSize: 42,
    fontWeight: '900',
    letterSpacing: 8,
    marginBottom: SPACING.sm,
  },
  credHint: {
    color: COLORS.textSecondary,
    fontSize: FONTS.size.xs,
    textAlign: 'center',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.orange + '11',
    padding: SPACING.md,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.orange + '33',
    width: '100%',
  },
  warningText: {
    flex: 1,
    color: COLORS.orange,
    fontSize: FONTS.size.xs,
    lineHeight: 18,
  },
});