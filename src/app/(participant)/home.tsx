import { FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  or,
  query,
  where
} from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { COLORS, FONTS, RADIUS, SPACING } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { logoutUser } from '../../firebase/auth';
import { db } from '../../firebase/config';

// ── Types ──────────────────────────────────────────────────────────
type PassType = 'pass_game' | 'pass_restroom';
type RequestType = PassType | 'sos' | 'tech';

interface HelpRequest {
  id: string;
  type: RequestType;
  status: 'pending' | 'active' | 'resolved';
  teamId: string;
  teamName: string;
  userId: string;
  userName: string;
  message?: string;
  createdAt: number;
}

// ── Helper Components ──────────────────────────────────────────────
const SectionTitle = ({ title }: { title: string }) => (
  <View style={styles.sectionTitleContainer}>
    <View style={styles.sectionLine} />
    <Text style={styles.sectionTitleText}>{title}</Text>
    <View style={styles.sectionLine} />
  </View>
);

// ── Main Screen ────────────────────────────────────────────────────
export default function ParticipantHome() {
  const { user, userData } = useAuth();
  const router = useRouter();

  const [teamData, setTeamData] = useState<any>(null);
  const [helpRequests, setHelpRequests] = useState<HelpRequest[]>([]);
  const [hackTime, setHackTime] = useState<{ end: string } | null>(null);
  const [timeLeft, setTimeLeft] = useState('00:00:00');
  const [loading, setLoading] = useState(true);
  const [totalMembers, setTotalMembers] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showQR, setShowQR] = useState(false);
  const [showTechModal, setShowTechModal] = useState(false);
  const [techMsg, setTechMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Derived
  const activePasses = helpRequests.filter(
    (r) =>
      (r.type === 'pass_game' || r.type === 'pass_restroom') &&
      (r.status === 'active' || r.status === 'pending')
  );

  // Calculate available table seats
  const membersOnPasses = activePasses.length;
  const availableTableSeats = totalMembers - membersOnPasses;

  const teamName =
    teamData?.teamName ||
    teamData?.name ||
    userData?.teamName ||
    'No Team';
  const membersArrived = teamData?.membersArrived ?? 0;

  // ── Load team ──
  useEffect(() => {
    if (!userData?.teamId) {
      setLoading(false);
      return;
    }
    const unsub = onSnapshot(
      doc(db, 'teams', userData.teamId),
      (snap) => {
        if (snap.exists()) setTeamData({ id: snap.id, ...snap.data() });
        setLoading(false);
      }
    );
    return unsub;
  }, [userData?.teamId]);

  // ── Load team member count ──
  useEffect(() => {
    if (!userData?.teamId) return;
    const q = query(
      collection(db, 'users'),
      where('teamId', '==', userData.teamId)
    );
    const unsub = onSnapshot(q, (snap) => setTotalMembers(snap.size));
    return unsub;
  }, [userData?.teamId]);

  // ── Load unread announcements ──
  useEffect(() => {
    if (!user?.uid) return;

    // Listen to broadcast first, then handle specific targeting client-side if indexes are missing
    const q = query(
      collection(db, 'announcements'),
      where('type', '==', 'broadcast')
    );

    const unsub = onSnapshot(q, (snap) => {
      const allAnnouncements = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const relevant = allAnnouncements.filter((a: any) => 
        a.type === 'broadcast' || 
        a.targetUid === user.uid || 
        a.targetTeamId === userData?.teamId
      );
      const unread = relevant.filter((a: any) => !a.read).length;
      setUnreadCount(unread);
    }, (error) => {
      console.warn("Announcements listener error (check index):", error);
    });
    return unsub;
  }, [user?.uid, userData?.teamId]);

  // ── Load help requests ──
  useEffect(() => {
    if (!userData?.teamId) return;
    const q = query(
      collection(db, 'help_requests'),
      where('teamId', '==', userData.teamId),
      where('status', 'in', ['pending', 'active'])
    );
    const unsub = onSnapshot(q, (snap) => {
      setHelpRequests(
        snap.docs.map((d) => ({ id: d.id, ...d.data() } as HelpRequest))
      );
    });
    return unsub;
  }, [userData?.teamId]);

  // ── Load hackathon timer ──
  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, 'settings', 'hackathon_times'),
      (snap) => {
        if (snap.exists()) setHackTime(snap.data() as { end: string });
      }
    );
    return unsub;
  }, []);

  // ── Countdown ticker ──
  useEffect(() => {
    if (!hackTime?.end) return;
    const tick = () => {
      const diff = new Date(hackTime.end).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft('00:00:00');
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(
        `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
      );
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [hackTime]);

  // ── Handlers ──────────────────────────────────────────────────────

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          try {
            await logoutUser();
            router.replace('/(auth)/login');
          } catch {
            Alert.alert('Error', 'Failed to sign out. Try again.');
          }
        },
      },
    ]);
  };

  const handleSOS = () => {
    Alert.alert(
      '🚨 Medical SOS',
      'This will immediately alert the medical team. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'SEND SOS',
          style: 'destructive',
          onPress: async () => {
            try {
              await addDoc(collection(db, 'help_requests'), {
                teamId: userData?.teamId ?? '',
                teamName,
                userId: user?.uid ?? '',
                userName: userData?.name ?? user?.email ?? 'Unknown',
                type: 'sos',
                status: 'pending',
                createdAt: Date.now(),
              });
              Alert.alert('SOS Sent ✅', 'Medical team has been alerted!');
            } catch {
              Alert.alert('Error', 'Failed to send SOS.');
            }
          },
        },
      ]
    );
  };

  const handleTechRequest = async () => {
    if (!techMsg.trim()) {
      Alert.alert('Empty Message', 'Please describe your technical issue.');
      return;
    }
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'help_requests'), {
        teamId: userData?.teamId ?? '',
        teamName,
        userId: user?.uid ?? '',
        userName: userData?.name ?? user?.email ?? 'Unknown',
        type: 'tech',
        status: 'pending',
        message: techMsg.trim(),
        createdAt: Date.now(),
      });
      setShowTechModal(false);
      setTechMsg('');
      Alert.alert('✅ Sent', 'Tech support request submitted!');
    } catch {
      Alert.alert('Error', 'Failed to send request.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestPass = (type: PassType) => {
    if (!userData?.teamId) {
      Alert.alert('Error', 'You need to be in a team to request passes.');
      return;
    }

    const hasExisting = activePasses.some(
      (p) => p.type === 'pass_game' || p.type === 'pass_restroom'
    );
    if (hasExisting) {
      Alert.alert(
        'Pass Limit',
        'You already have an active pass. Return your current pass before requesting a new one.'
      );
      return;
    }

    const label = type === 'pass_game' ? 'Game Room' : 'Rest Area';

    Alert.alert(
      'Confirm Request',
      `Request a ${label} pass?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Request',
          onPress: async () => {
            try {
              await addDoc(collection(db, 'help_requests'), {
                teamId: userData.teamId,
                teamName,
                userId: user?.uid ?? '',
                userName: userData?.name ?? '',
                type,
                status: 'pending',
                createdAt: Date.now(),
              });
              Alert.alert(
                '✅ Requested',
                'Wait for a volunteer to approve your pass.'
              );
            } catch {
              Alert.alert('Error', 'Failed to request pass.');
            }
          },
        },
      ]
    );
  };

  const getPassLabel = (type: RequestType) => {
    switch (type) {
      case 'pass_game': return 'GAME ROOM';
      case 'pass_restroom': return 'REST AREA';
      case 'sos': return 'MEDICAL SOS';
      case 'tech': return 'TECH SUPPORT';
      default: return String(type).toUpperCase();
    }
  };

  const getPassIcon = (type: RequestType) => {
    switch (type) {
      case 'pass_game': return 'game-controller-outline';
      case 'pass_restroom': return 'bed-outline';
      case 'sos': return 'medkit-outline';
      case 'tech': return 'construct-outline';
      default: return 'help-outline';
    }
  };

  // ── Render ─────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#a855f7" />
      </View>
    );
  }

  const [timerH, timerM, timerS] = timeLeft.split(':');

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Home</Text>
        <TouchableOpacity
          style={styles.bellIconBtn}
          onPress={() => router.push('/(participant)/notices')}
        >
          <Ionicons
            name="notifications-outline"
            size={26}
            color="#e2e8f0"
          />
          {unreadCount > 0 && (
            <View style={styles.notificationDot}>
              <Text style={styles.notificationText}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* ── Countdown Timer ── */}
      <View style={styles.timerSection}>
        <Text style={styles.timerTagline}>[ HACKATHON — ENDS IN ]</Text>
        <View style={styles.timerRow}>
          <Text style={styles.timerValue}>{timerH}</Text>
          <Text style={styles.timerColon}>:</Text>
          <Text style={styles.timerValue}>{timerM}</Text>
          <Text style={styles.timerColon}>:</Text>
          <Text style={styles.timerValue}>{timerS}</Text>
        </View>
        <View style={styles.timerLabelsRow}>
          <Text style={styles.timerLabel}>HRS</Text>
          <Text style={styles.timerLabel}>MIN</Text>
          <Text style={styles.timerLabel}>SEC</Text>
        </View>
        <View style={styles.timerLine} />
      </View>

      {/* ── Team Pills ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.pillsScroll}
        contentContainerStyle={styles.pillsContainer}
      >
        <View style={[styles.pill, { borderColor: '#4c1d95', backgroundColor: '#2e106540' }]}>
          <Ionicons name="people" size={16} color="#c084fc" />
          <Text style={styles.pillText}>{teamName}</Text>
        </View>
        <View style={[styles.pill, { borderColor: '#064e3b', backgroundColor: '#022c2240' }]}>
          <View style={styles.greenDot} />
          <Text style={[styles.pillText, { color: '#34d399' }]}>
            {membersArrived}/{totalMembers} at table
          </Text>
        </View>
        <View style={[styles.pill, { borderColor: '#b45309', backgroundColor: '#78350f40' }]}>
          <MaterialCommunityIcons name="table-chair" size={16} color="#fbbf24" />
          <Text style={[styles.pillText, { color: '#fcd34d' }]}>
            {availableTableSeats}/{totalMembers} seats free
          </Text>
        </View>
        {userData?.mentorName ? (
          <View style={[styles.pill, { borderColor: '#1e3a8a', backgroundColor: '#17255440' }]}>
            <FontAwesome5 name="user-graduate" size={14} color="#60a5fa" />
            <Text style={[styles.pillText, { color: '#93c5fd' }]}>
              {userData.mentorName}
            </Text>
          </View>
        ) : null}
      </ScrollView>

      {/* ── QR Code Button ── */}
      <TouchableOpacity
        style={styles.qrButton}
        onPress={() => setShowQR(true)}
      >
        <MaterialCommunityIcons
          name="qrcode-scan"
          size={20}
          color="#e2e8f0"
        />
        <Text style={styles.qrButtonText}>SHOW TEAM QR CODE</Text>
      </TouchableOpacity>

      {/* ── Table Status Card ── */}
      <View style={[
        styles.tableStatusCard,
        availableTableSeats <= 2 && { borderColor: '#dc2626', backgroundColor: '#7f1d1d40' }
      ]}>
        <View style={styles.tableStatusHeader}>
          <MaterialCommunityIcons
            name="table-chair"
            size={28}
            color={availableTableSeats <= 2 ? '#fca5a5' : '#fbbf24'}
          />
          <View style={styles.tableStatusText}>
            <Text style={styles.tableStatusLabel}>TABLE SEATS AVAILABLE</Text>
            <Text style={[
              styles.tableStatusValue,
              availableTableSeats <= 2 && { color: '#fca5a5' }
            ]}>
              {availableTableSeats} / {totalMembers}
            </Text>
          </View>
        </View>
        <View style={styles.tableStatusBar}>
          <View
            style={[
              styles.tableStatusBarFill,
              {
                width: `${(availableTableSeats / Math.max(totalMembers, 1)) * 100}%`,
                backgroundColor: availableTableSeats <= 2 ? '#dc2626' : availableTableSeats <= Math.ceil(totalMembers / 3) ? '#f59e0b' : '#22c55e'
              }
            ]}
          />
        </View>
        <View style={styles.tableStatusFooter}>
          <Text style={styles.tableStatusFooterText}>
            {membersOnPasses} {membersOnPasses === 1 ? 'person' : 'people'} on pass
          </Text>
        </View>
      </View>

      {/* ── Passes ── */}
      <SectionTitle title="PASSES" />
      <View style={styles.grid}>
        <TouchableOpacity
          style={styles.gridCard}
          onPress={() => handleRequestPass('pass_game')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="game-controller-outline"
            size={32}
            color="#06b6d4"
            style={styles.cardIcon}
          />
          <Text style={styles.cardTitle}>GAME ROOM</Text>
          <Text style={styles.cardSubtitleActive}>AVAILABLE</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.gridCard}
          onPress={() => handleRequestPass('pass_restroom')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="bed-outline"
            size={32}
            color="#c084fc"
            style={styles.cardIcon}
          />
          <Text style={styles.cardTitle}>REST AREA</Text>
          <Text style={styles.cardSubtitleActive}>AVAILABLE</Text>
        </TouchableOpacity>
      </View>

      {/* ── Requests ── */}
      <SectionTitle title="REQUESTS" />
      <View style={styles.grid}>
        <TouchableOpacity
          style={styles.gridCard}
          onPress={() => setShowTechModal(true)}
          activeOpacity={0.8}
        >
          <Ionicons
            name="construct-outline"
            size={32}
            color="#a855f7"
            style={styles.cardIcon}
          />
          <Text style={styles.cardTitle}>TECH SUPPORT</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.gridCard, styles.sosCard]}
          onPress={handleSOS}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons
            name="medical-bag"
            size={32}
            color="#ffffff"
            style={styles.cardIcon}
          />
          <Text style={[styles.cardTitle, { color: '#ffffff' }]}>
            MEDICAL SOS
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Active Passes ── */}
      {activePasses.length > 0 && (
        <>
          <SectionTitle title="ACTIVE PASSES" />
          {activePasses.map((p) => (
            <View key={p.id} style={styles.activePassCard}>
              <View style={styles.activePassHeader}>
                <View style={styles.activePassType}>
                  <Ionicons
                    name={getPassIcon(p.type) as any}
                    size={14}
                    color="#fca5a5"
                  />
                  <Text style={styles.activePassTypeText}>
                    {getPassLabel(p.type)}
                  </Text>
                </View>
                <View style={styles.activeStatusPill}>
                  <View style={styles.activeDot} />
                  <Text style={styles.activeStatusText}>
                    {p.status.toUpperCase()}
                  </Text>
                </View>
              </View>
              <Text style={styles.activePassName}>{p.userName}</Text>
              <View style={styles.activePassFooter}>
                <Text style={styles.activePassTimer}>
                  {new Date(p.createdAt).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
                {p.status === 'active' && (
                  <Text style={styles.overtimeText}>● ACTIVE</Text>
                )}
                {p.status === 'pending' && (
                  <Text style={[styles.overtimeText, { color: '#f59e0b' }]}>
                    ⏳ PENDING
                  </Text>
                )}
              </View>
            </View>
          ))}
        </>
      )}

      {/* ── Sign Out ── */}
      <TouchableOpacity
        onPress={handleSignOut}
        style={styles.signOutBtn}
        activeOpacity={0.7}
      >
        <Text style={styles.signOutText}>&gt; SIGN OUT</Text>
      </TouchableOpacity>

      {/* ── QR Modal ── */}
      <Modal
        visible={showQR}
        animationType="fade"
        transparent
        onRequestClose={() => setShowQR(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <MaterialCommunityIcons
                name="qrcode-scan"
                size={28}
                color={COLORS.primary}
              />
              <Text style={styles.modalTitle}>Team QR Code</Text>
            </View>
            <Text style={styles.modalSubtitle}>
              Show this to volunteers for meal check-ins and passes.
            </Text>
            <View style={styles.qrContainer}>
              {userData?.teamId ? (
                <QRCode
                  value={userData.teamId}
                  size={200}
                  color="#1e1e2d"
                  backgroundColor="#ffffff"
                />
              ) : (
                <Text style={{ color: COLORS.textSecondary }}>
                  No team ID found. Ask admin to assign your team.
                </Text>
              )}
            </View>
            <Text style={styles.qrTeamIdText}>
              {teamName} · ID: {userData?.teamId ?? 'N/A'}
            </Text>
            <TouchableOpacity
              style={styles.closeModalBtn}
              onPress={() => setShowQR(false)}
            >
              <Text style={styles.closeModalText}>DONE</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Tech Support Modal ── */}
      <Modal
        visible={showTechModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowTechModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Ionicons name="construct-outline" size={28} color={COLORS.primary} />
              <Text style={styles.modalTitle}>Technical Issue</Text>
            </View>
            <Text style={styles.modalSubtitle}>
              Describe your problem (e.g. WiFi, broken link, power issues).
            </Text>
            <TextInput
              style={styles.techInput}
              placeholder="Explain what's wrong..."
              placeholderTextColor="#94a3b8"
              multiline
              numberOfLines={4}
              value={techMsg}
              onChangeText={setTechMsg}
              textAlignVertical="top"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => {
                  setShowTechModal(false);
                  setTechMsg('');
                }}
              >
                <Text style={styles.cancelBtnText}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.submitModalBtn,
                  submitting && { opacity: 0.6 },
                ]}
                onPress={handleTechRequest}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.submitBtnText}>SEND REQUEST</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    backgroundColor: '#09090b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: { flex: 1, backgroundColor: '#09090b' },
  content: {
    paddingTop: 50,
    paddingHorizontal: SPACING.md,
    paddingBottom: 120,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: FONTS.size.xl + 4,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  bellIconBtn: { position: 'relative', padding: 4 },
  notificationDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#06b6d4',
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#09090b',
  },
  notificationText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: 'bold',
  },

  // Timer
  timerSection: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  timerTagline: {
    color: '#94a3b8',
    fontSize: FONTS.size.xs,
    letterSpacing: 4,
    fontWeight: '600',
    marginBottom: SPACING.sm,
    textTransform: 'uppercase',
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerValue: {
    color: '#c4b5fd',
    fontSize: 56,
    fontWeight: '400',
    letterSpacing: -1,
  },
  timerColon: {
    color: '#8b5cf6',
    fontSize: 48,
    fontWeight: '300',
    marginHorizontal: 8,
    paddingBottom: 6,
  },
  timerLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 220,
    marginTop: 4,
    marginBottom: SPACING.md,
  },
  timerLabel: {
    color: '#475569',
    fontSize: 10,
    letterSpacing: 2,
    fontWeight: '700',
  },
  timerLine: {
    height: 3,
    backgroundColor: '#8b5cf6',
    width: '100%',
    borderRadius: 2,
  },

  // Pills
  pillsScroll: { flexGrow: 0, marginBottom: SPACING.md },
  pillsContainer: { gap: SPACING.sm, paddingVertical: SPACING.xs },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  pillText: {
    color: '#e2e8f0',
    fontSize: FONTS.size.xs,
    fontWeight: '600',
  },
  greenDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
  },

  // QR Button
  qrButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#181825',
    borderWidth: 1,
    borderColor: '#2e325a',
    borderRadius: 16,
    paddingVertical: SPACING.md,
    marginBottom: SPACING.xl,
    gap: SPACING.sm,
  },
  qrButtonText: {
    color: '#e2e8f0',
    fontSize: FONTS.size.xs,
    fontWeight: '700',
    letterSpacing: 1.5,
  },

  // Table Status Card
  tableStatusCard: {
    backgroundColor: '#1f2937',
    borderWidth: 2,
    borderColor: '#4b5563',
    borderRadius: 16,
    padding: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  tableStatusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
    gap: SPACING.md,
  },
  tableStatusText: {
    flex: 1,
  },
  tableStatusLabel: {
    color: '#9ca3af',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  tableStatusValue: {
    color: '#fbbf24',
    fontSize: 28,
    fontWeight: '900',
    marginTop: 4,
  },
  tableStatusBar: {
    height: 8,
    backgroundColor: '#374151',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: SPACING.md,
  },
  tableStatusBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  tableStatusFooter: {
    alignItems: 'center',
  },
  tableStatusFooterText: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: '500',
    fontStyle: 'italic',
  },

  // Section Title
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
    gap: SPACING.md,
  },
  sectionLine: { flex: 1, height: 1, backgroundColor: '#1e293b' },
  sectionTitleText: {
    color: '#475569',
    fontSize: 10,
    letterSpacing: 4,
    fontWeight: '800',
  },

  // Grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: SPACING.sm,
    marginBottom: SPACING.xl,
  },
  gridCard: {
    width: '48%',
    backgroundColor: '#181825',
    borderWidth: 1,
    borderColor: '#2e325a',
    borderRadius: 16,
    padding: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 110,
  },
  sosCard: {
    backgroundColor: '#dc2626',
    borderColor: '#ef4444',
  },
  cardIcon: { marginBottom: SPACING.sm },
  cardTitle: {
    color: '#e2e8f0',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    textAlign: 'center',
  },
  cardSubtitleActive: {
    color: '#10b981',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: 4,
  },

  // Active Passes
  activePassCard: {
    backgroundColor: '#2a0e14',
    borderWidth: 1,
    borderColor: '#991b1b',
    borderRadius: 16,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  activePassHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  activePassType: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  activePassTypeText: {
    color: '#fca5a5',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
  },
  activeStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7f1d1d40',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#991b1b',
    gap: 4,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ef4444',
  },
  activeStatusText: {
    color: '#ef4444',
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  activePassName: {
    color: '#ffffff',
    fontSize: FONTS.size.lg,
    fontWeight: 'bold',
    marginBottom: SPACING.sm,
  },
  activePassFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  activePassTimer: {
    color: '#f87171',
    fontSize: FONTS.size.sm,
    fontWeight: '600',
  },
  overtimeText: {
    color: '#ef4444',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },

  // Sign Out
  signOutBtn: {
    alignItems: 'center',
    paddingVertical: SPACING.md,
    marginTop: SPACING.xl,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: '#2e325a',
    backgroundColor: '#181825',
    borderRadius: 16,
  },
  signOutText: {
    color: '#94a3b8',
    fontSize: FONTS.size.xs,
    letterSpacing: 2,
    fontWeight: '700',
  },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  modalContent: {
    width: '100%',
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  modalTitle: {
    color: COLORS.textPrimary,
    fontSize: FONTS.size.xl,
    fontWeight: 'bold',
  },
  modalSubtitle: {
    color: COLORS.textSecondary,
    fontSize: FONTS.size.sm,
    textAlign: 'center',
    marginBottom: SPACING.xl,
    paddingHorizontal: SPACING.md,
    lineHeight: 22,
  },
  qrContainer: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
  },
  qrTeamIdText: {
    color: COLORS.textDim,
    fontSize: FONTS.size.xs,
    marginBottom: SPACING.xl,
    letterSpacing: 1,
  },
  closeModalBtn: {
    width: '100%',
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  closeModalText: {
    color: COLORS.white,
    fontSize: FONTS.size.sm,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  techInput: {
    width: '100%',
    backgroundColor: '#181825',
    color: '#fff',
    borderRadius: 12,
    padding: 16,
    height: 120,
    textAlignVertical: 'top',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#2e325a',
    fontSize: FONTS.size.sm,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#181825',
    borderWidth: 1,
    borderColor: '#2e325a',
  },
  cancelBtnText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  submitModalBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: COLORS.primary,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});