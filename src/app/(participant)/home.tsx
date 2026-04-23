import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
    collection,
    doc,
    onSnapshot,
    query,
    where,
} from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { COLORS, FONTS, RADIUS, SPACING } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { logoutUser } from '../../firebase/auth';
import { db } from '../../firebase/config';

export default function ParticipantHome() {
  const { user, userData } = useAuth();
  const router = useRouter();
  const [teamData, setTeamData] = useState<any>(null);
  const [activePasses, setActivePasses] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [hackTime, setHackTime] = useState<{ end: string } | null>(null);
  const [timeLeft, setTimeLeft] = useState('00:00:00');
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  // Load team data
  useEffect(() => {
    if (!userData?.teamId) {
      setLoading(false);
      return;
    }
    const unsub = onSnapshot(doc(db, 'teams', userData.teamId), (snap) => {
      if (snap.exists()) setTeamData({ id: snap.id, ...snap.data() });
      setLoading(false);
    });
    return unsub;
  }, [userData?.teamId]);

  // Load active passes
  useEffect(() => {
    if (!userData?.teamId) return;
    const q = query(
      collection(db, 'passes'),
      where('teamId', '==', userData.teamId),
      where('status', '==', 'Active')
    );
    const unsub = onSnapshot(q, (snap) => {
      setActivePasses(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [userData?.teamId]);

  // Load announcements
  useEffect(() => {
    const q = query(collection(db, 'announcements'));
    const unsub = onSnapshot(q, (snap) => {
      const sorted = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a: any, b: any) => b.createdAt - a.createdAt);
      setAnnouncements(sorted.slice(0, 3));
      setLoading(false);
    });
    return unsub;
  }, []);

  // Load hackathon timer
  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, 'settings', 'hackathon_times'),
      (snap) => {
        if (snap.exists()) setHackTime(snap.data() as { end: string });
      }
    );
    return unsub;
  }, []);

  // Countdown ticker
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

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            setSigningOut(true);
            try {
              await logoutUser();
              router.replace('/(auth)/login');
            } catch {
              Alert.alert('Error', 'Failed to sign out. Try again.');
              setSigningOut(false);
            }
          },
        },
      ]
    );
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
          onPress: () => {
            Alert.alert(
              'SOS Sent ✅',
              'Medical team has been alerted to your location!'
            );
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={COLORS.primary} />
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
        <View>
          <Text style={styles.tagline}>HACKATHON</Text>
          <Text style={styles.greeting}>
            Hey, {userData?.name?.split(' ')[0] ?? 'Hacker'} 👋
          </Text>
        </View>
        <TouchableOpacity
          onPress={handleSignOut}
          style={styles.logoutBtn}
          disabled={signingOut}
        >
          {signingOut ? (
            <ActivityIndicator size="small" color={COLORS.textSecondary} />
          ) : (
            <MaterialCommunityIcons
              name="logout"
              size={20}
              color={COLORS.textSecondary}
            />
          )}
        </TouchableOpacity>
      </View>

      {/* ── Countdown Timer ── */}
      <View style={styles.timerCard}>
        <Text style={styles.timerLabel}>TIME REMAINING</Text>
        <View style={styles.timerRow}>
          <View style={styles.timerBlock}>
            <Text style={styles.timerValue}>{timerH}</Text>
            <Text style={styles.timerUnit}>HRS</Text>
          </View>
          <Text style={styles.timerColon}>:</Text>
          <View style={styles.timerBlock}>
            <Text style={styles.timerValue}>{timerM}</Text>
            <Text style={styles.timerUnit}>MIN</Text>
          </View>
          <Text style={styles.timerColon}>:</Text>
          <View style={styles.timerBlock}>
            <Text style={styles.timerValue}>{timerS}</Text>
            <Text style={styles.timerUnit}>SEC</Text>
          </View>
        </View>
        <View style={styles.timerBar} />
      </View>

      {/* ── Team Card ── */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>YOUR TEAM</Text>
        <Text style={styles.teamName}>
          {teamData?.teamName ?? userData?.teamName ?? 'Not Assigned'}
        </Text>
        <View style={styles.teamRow}>
          <View style={styles.teamStat}>
            <Text style={styles.statNum}>
              {teamData?.membersArrived ?? '--'}
            </Text>
            <Text style={styles.statLabel}>Present</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.teamStat}>
            <Text style={styles.statNum}>
              {teamData?.membersExpected ?? '--'}
            </Text>
            <Text style={styles.statLabel}>Expected</Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor:
                  teamData?.checkInStatus === 'Checked In'
                    ? COLORS.green + '22'
                    : COLORS.red + '22',
              },
            ]}
          >
            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor:
                    teamData?.checkInStatus === 'Checked In'
                      ? COLORS.green
                      : COLORS.orange,
                },
              ]}
            />
            <Text
              style={[
                styles.statusText,
                {
                  color:
                    teamData?.checkInStatus === 'Checked In'
                      ? COLORS.green
                      : COLORS.orange,
                },
              ]}
            >
              {teamData?.checkInStatus ?? 'Pending'}
            </Text>
          </View>
        </View>

        {/* Mentor row */}
        {userData?.mentorName ? (
          <View style={styles.mentorRow}>
            <Ionicons
              name="person-circle"
              size={16}
              color={COLORS.primary}
            />
            <Text style={styles.mentorText}>
              Mentor: {userData.mentorName}
            </Text>
          </View>
        ) : null}
      </View>

      {/* ── Active Passes ── */}
      {activePasses.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>ACTIVE PASSES</Text>
          {activePasses.map((p) => (
            <View key={p.id} style={styles.passRow}>
              <View style={styles.passIcon}>
                <Ionicons
                  name="ticket"
                  size={16}
                  color={COLORS.orange}
                />
              </View>
              <Text style={styles.passText}>
                {p.participantName} — {p.type}
              </Text>
              <View style={styles.activeDot} />
            </View>
          ))}
        </View>
      )}

      {/* ── Latest Announcements ── */}
      {announcements.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📢 LATEST UPDATES</Text>
          {announcements.map((a, i) => (
            <View
              key={a.id}
              style={[
                styles.annoRow,
                i === announcements.length - 1 && {
                  borderBottomWidth: 0,
                  marginBottom: 0,
                  paddingBottom: 0,
                },
              ]}
            >
              <View
                style={[
                  styles.annoTypeBadge,
                  {
                    backgroundColor:
                      a.type === 'broadcast'
                        ? COLORS.purple + '22'
                        : COLORS.primary + '22',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.annoTypeText,
                    {
                      color:
                        a.type === 'broadcast'
                          ? COLORS.purple
                          : COLORS.primary,
                    },
                  ]}
                >
                  {a.type === 'broadcast' ? 'BROADCAST' : 'NOTICE'}
                </Text>
              </View>
              <Text style={styles.annoTitle}>{a.title}</Text>
              <Text style={styles.annoBody}>{a.body}</Text>
            </View>
          ))}
        </View>
      )}

      {/* ── SOS Button ── */}
      <TouchableOpacity
        style={styles.sosBtn}
        onPress={handleSOS}
        activeOpacity={0.8}
      >
        <Ionicons name="warning" size={22} color={COLORS.white} />
        <Text style={styles.sosBtnText}>Medical Emergency SOS</Text>
      </TouchableOpacity>

      {/* ── Sign Out Button (bottom) ── */}
      <TouchableOpacity
        onPress={handleSignOut}
        style={styles.signOutBtn}
        activeOpacity={0.7}
        disabled={signingOut}
      >
        <Text style={styles.signOutText}>
          {signingOut ? 'Signing out...' : '> SIGN OUT'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    backgroundColor: COLORS.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: SPACING.md, paddingBottom: 100 },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    paddingTop: SPACING.lg,
  },
  tagline: {
    color: COLORS.primary,
    fontSize: FONTS.size.xs,
    letterSpacing: 4,
    fontWeight: '700',
  },
  greeting: {
    color: COLORS.textPrimary,
    fontSize: FONTS.size.xl,
    fontWeight: '800',
    marginTop: 2,
  },
  logoutBtn: {
    padding: SPACING.sm,
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Timer
  timerCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    alignItems: 'center',
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.purple + '40',
  },
  timerLabel: {
    color: COLORS.primary,
    fontSize: FONTS.size.xs,
    letterSpacing: 4,
    fontWeight: '700',
    marginBottom: SPACING.md,
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  timerBlock: { alignItems: 'center', minWidth: 70 },
  timerValue: {
    color: COLORS.textPrimary,
    fontSize: 52,
    fontWeight: '900',
    letterSpacing: 2,
  },
  timerUnit: {
    color: COLORS.textSecondary,
    fontSize: FONTS.size.xs,
    letterSpacing: 2,
    marginTop: 2,
  },
  timerColon: {
    color: COLORS.textSecondary,
    fontSize: 40,
    fontWeight: '900',
    marginBottom: 16,
  },
  timerBar: {
    height: 2,
    backgroundColor: COLORS.primary,
    width: '100%',
    borderRadius: 1,
    marginTop: SPACING.md,
    opacity: 0.3,
  },

  // Cards
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardTitle: {
    color: COLORS.textSecondary,
    fontSize: FONTS.size.xs,
    letterSpacing: 2,
    fontWeight: '700',
    marginBottom: SPACING.md,
  },

  // Team
  teamName: {
    color: COLORS.textPrimary,
    fontSize: FONTS.size.xl,
    fontWeight: '800',
    marginBottom: SPACING.md,
  },
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  teamStat: { alignItems: 'center' },
  statNum: {
    color: COLORS.textPrimary,
    fontSize: FONTS.size.xxl,
    fontWeight: '800',
  },
  statLabel: {
    color: COLORS.textSecondary,
    fontSize: FONTS.size.xs,
  },
  divider: {
    width: 1,
    height: 32,
    backgroundColor: COLORS.border,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
    marginLeft: 'auto',
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusText: {
    fontWeight: '700',
    fontSize: FONTS.size.xs,
  },
  mentorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  mentorText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.size.sm,
  },

  // Passes
  passRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: SPACING.sm,
  },
  passIcon: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.orange + '22',
    alignItems: 'center',
    justifyContent: 'center',
  },
  passText: {
    color: COLORS.textPrimary,
    fontSize: FONTS.size.sm,
    flex: 1,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.green,
  },

  // Announcements
  annoRow: {
    paddingBottom: SPACING.sm,
    marginBottom: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  annoTypeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
    marginBottom: SPACING.xs,
  },
  annoTypeText: {
    fontSize: FONTS.size.xs,
    fontWeight: '700',
    letterSpacing: 1,
  },
  annoTitle: {
    color: COLORS.textPrimary,
    fontWeight: '700',
    fontSize: FONTS.size.md,
    marginBottom: 4,
  },
  annoBody: {
    color: COLORS.textSecondary,
    fontSize: FONTS.size.sm,
    lineHeight: 20,
  },

  // SOS
  sosBtn: {
    backgroundColor: COLORS.red,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  sosBtnText: {
    color: COLORS.white,
    fontWeight: '800',
    fontSize: FONTS.size.md,
    letterSpacing: 0.5,
  },

  // Sign out
  signOutBtn: {
    alignItems: 'center',
    paddingVertical: SPACING.md,
    marginBottom: SPACING.sm,
  },
  signOutText: {
    color: COLORS.textDim,
    fontSize: FONTS.size.sm,
    letterSpacing: 2,
    fontWeight: '600',
  },
});