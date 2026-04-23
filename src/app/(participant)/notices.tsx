import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONTS, RADIUS, SPACING } from '../../constants/theme';
import { db } from '../../firebase/config';

interface Announcement {
  id: string;
  title: string;
  message: string;
  target: string;
  isUrgent: boolean;
  createdAt: number;
}

export default function ParticipantAnnouncements() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Fetch all announcements ordered by newest first 
    // (No 'where' clause here to avoid Firebase Composite Index errors)
    const q = query(
      collection(db, 'announcements'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Announcement[];
      
      // 2. Filter them locally in JavaScript
      const participantAnnouncements = fetched.filter(
        (announcement) => announcement.target === 'all' || announcement.target === 'participants'
      );

      setAnnouncements(participantAnnouncements);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching announcements: ", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    // e.g., "Today at 2:30 PM" or fallback to date
    const today = new Date();
    const isToday = date.getDate() === today.getDate() && date.getMonth() === today.getMonth();
    
    const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return isToday ? `Today at ${timeString}` : `${date.toLocaleDateString()} at ${timeString}`;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + SPACING.sm }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
          <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Announcements</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={announcements}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="notifications-off-outline" size={48} color={COLORS.border} />
              <Text style={styles.emptyText}>No announcements right now.</Text>
              <Text style={styles.emptySubText}>When admins send updates, they will appear here.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={[styles.card, item.isUrgent && styles.urgentCard]}>
              <View style={styles.cardHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.xs }}>
                  {item.isUrgent ? (
                    <Ionicons name="alert-circle" size={18} color="#E74C3C" />
                  ) : (
                    <Ionicons name="megaphone" size={18} color={COLORS.primary} />
                  )}
                  <Text style={[styles.title, item.isUrgent && { color: '#E74C3C' }]}>
                    {item.title}
                  </Text>
                </View>
              </View>
              
              <Text style={styles.message}>{item.message}</Text>
              
              <View style={styles.footer}>
                <Text style={styles.time}>{formatDate(item.createdAt)}</Text>
              </View>
            </View>
          )}
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: SPACING.lg, paddingBottom: SPACING.xl },
  
  card: {
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg, padding: SPACING.lg,
    borderWidth: 1, borderColor: COLORS.border, marginBottom: SPACING.md,
  },
  urgentCard: {
    borderColor: '#E74C3C', backgroundColor: '#E74C3C0A',
    borderLeftWidth: 4, // Add a thick red edge for immediate attention
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  title: { fontSize: FONTS.size.lg, fontWeight: 'bold', color: COLORS.textPrimary },
  message: { fontSize: FONTS.size.md, color: COLORS.textSecondary, lineHeight: 22, marginBottom: SPACING.md },
  footer: { borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: SPACING.sm, alignItems: 'flex-end' },
  time: { fontSize: FONTS.size.xs, color: COLORS.textSecondary, fontWeight: '500' },
  
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingTop: SPACING.xl * 2 },
  emptyText: { fontSize: FONTS.size.md, fontWeight: 'bold', color: COLORS.textPrimary, marginTop: SPACING.md },
  emptySubText: { fontSize: FONTS.size.sm, color: COLORS.textSecondary, marginTop: SPACING.xs, textAlign: 'center' },
});