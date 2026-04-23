import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { COLORS, FONTS, RADIUS, SPACING } from '../../constants/theme';
import { logoutUser } from '../../firebase/auth';
import { db } from '../../firebase/config';

interface DashboardStats {
  totalTeams: number;
  checkedInTeams: number;
  projectsSubmitted: number;
  outstandingResources: number;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalTeams: 0,
    checkedInTeams: 0,
    projectsSubmitted: 0,
    outstandingResources: 0,
  });

  // Real-time Firebase Listeners for Live Stats
  useEffect(() => {
    // 1. Listen to total teams
    const unsubscribeTeams = onSnapshot(collection(db, 'teams'), (snapshot) => {
      setStats((prev) => ({ ...prev, totalTeams: snapshot.size }));
      setLoading(false); // Stop loading as soon as the main teams collection is reached
    });

    // 2. Listen to checked-in TEAMS (Matches the toggle in teams.tsx)
    const qCheckedIn = query(collection(db, 'teams'), where('checkedIn', '==', true));
    const unsubscribeCheckedIn = onSnapshot(qCheckedIn, (snapshot) => {
      setStats((prev) => ({ ...prev, checkedInTeams: snapshot.size }));
    });

    // 3. Listen to submitted projects (Matches the toggle in teams.tsx)
    const qSubmissions = query(collection(db, 'teams'), where('projectSubmitted', '==', true));
    const unsubscribeSubmissions = onSnapshot(qSubmissions, (snapshot) => {
      setStats((prev) => ({ ...prev, projectsSubmitted: snapshot.size }));
    });

    // 4. Listen to outstanding resources (For later when you build the resources feature)
    const qResources = query(collection(db, 'resources'), where('status', '==', 'issued'));
    const unsubscribeResources = onSnapshot(qResources, (snapshot) => {
      setStats((prev) => ({ ...prev, outstandingResources: snapshot.size }));
    });

    // Cleanup listeners on unmount
    return () => {
      unsubscribeTeams();
      unsubscribeCheckedIn();
      unsubscribeSubmissions();
      unsubscribeResources();
    };
  }, []);

  const handleLogout = async () => {
    await logoutUser();
    router.replace('/sign-in'); 
  };

  const adminModules = [
    { title: 'Teams', icon: 'account-group', route: '/(admin)/teams', color: COLORS.primary },
    { title: 'Judging', icon: 'gavel', route: '/(admin)/judging', color: '#E67E22' },
    { title: 'Mentors', icon: 'account-tie', route: '/(admin)/mentors', color: '#9B59B6' },
    { title: 'Help Desk', icon: 'ticket-confirmation', route: '/(admin)/requests', color: '#3498DB' },
    { title: 'Broadcast', icon: 'bullhorn', route: '/(admin)/broadcast', color: '#E74C3C' },
    { title: 'Resources', icon: 'usb-cable', route: '/(admin)/resources', color: '#F1C40F' },
    { title: 'Volunteers', icon: 'hand-heart', route: '/(admin)/volunteers', color: '#1ABC9C' },
    { title: 'Analytics', icon: 'chart-bar', route: '/(admin)/analytics', color: '#34495E' },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Command Center</Text>
          <Text style={styles.subtitle}>Admin Dashboard</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <Ionicons name="log-out-outline" size={24} color={COLORS.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Live Stats Section */}
        <Text style={styles.sectionTitle}>Live Overview</Text>
        {loading ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={{ marginVertical: SPACING.xl }} />
        ) : (
          <View style={styles.statsGrid}>
            <StatCard title="Total Teams" value={stats.totalTeams} icon="cube-outline" color={COLORS.primary} />
            <StatCard title="Teams Checked In" value={stats.checkedInTeams} icon="checkmark-circle-outline" color="#2ECC71" />
            <StatCard title="Submitted" value={stats.projectsSubmitted} icon="cloud-upload-outline" color="#9B59B6" />
            <StatCard title="Out. Items" value={stats.outstandingResources} icon="warning-outline" color="#E74C3C" />
          </View>
        )}

        {/* Management Modules Grid */}
        <Text style={[styles.sectionTitle, { marginTop: SPACING.xl }]}>Management</Text>
        <View style={styles.modulesGrid}>
          {adminModules.map((mod, index) => (
            <TouchableOpacity 
              key={index} 
              style={styles.moduleCard}
              onPress={() => router.push(mod.route as any)}
            >
              <View style={[styles.iconContainer, { backgroundColor: mod.color + '1A' }]}>
                <MaterialCommunityIcons name={mod.icon as any} size={32} color={mod.color} />
              </View>
              <Text style={styles.moduleTitle}>{mod.title}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

// Reusable Stat Card Component
const StatCard = ({ title, value, icon, color }: { title: string, value: number, icon: any, color: string }) => (
  <View style={styles.statCard}>
    <View style={[styles.statIconBox, { backgroundColor: color + '1A' }]}>
      <Ionicons name={icon} size={24} color={color} />
    </View>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statTitle}>{title}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl + 10,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  greeting: {
    fontSize: FONTS.size.xl,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: FONTS.size.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  logoutBtn: {
    padding: SPACING.sm,
    backgroundColor: COLORS.bg,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  sectionTitle: {
    fontSize: FONTS.size.md,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: SPACING.md,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  statCard: {
    width: '47%', 
    backgroundColor: COLORS.bgCard,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statIconBox: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  statValue: {
    fontSize: FONTS.size.xl,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  statTitle: {
    fontSize: FONTS.size.xs,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  modulesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
    justifyContent: 'space-between',
  },
  moduleCard: {
    width: '47%',
    backgroundColor: COLORS.bgCard,
    padding: SPACING.lg,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  moduleTitle: {
    fontSize: FONTS.size.sm,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
});