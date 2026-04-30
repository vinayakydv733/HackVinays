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

export default function VolunteerAnnouncements() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const q = query(
            collection(db, 'announcements'),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetched = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Announcement[];

            // Filter for volunteers or everyone
            const filtered = fetched.filter(
                (item) => item.target === 'all' || item.target === 'volunteers'
            );

            setAnnouncements(filtered);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching announcements: ", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const formatDate = (timestamp: number) => {
        const date = new Date(timestamp);
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
                    <ActivityIndicator size="large" color={COLORS.purple} />
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
                            <Text style={styles.emptyText}>No announcements yet.</Text>
                            <Text style={styles.emptySubText}>Check back later for updates from organizers.</Text>
                        </View>
                    }
                    renderItem={({ item }) => (
                        <View style={[styles.card, item.isUrgent && styles.urgentCard]}>
                            <View style={styles.cardHeader}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.xs }}>
                                    {item.isUrgent ? (
                                        <Ionicons name="alert-circle" size={18} color="#E74C3C" />
                                    ) : (
                                        <Ionicons name="megaphone" size={18} color={COLORS.purple} />
                                    )}
                                    <Text style={[styles.title, item.isUrgent && { color: '#E74C3C' }]}>
                                        {item.title}
                                    </Text>
                                </View>
                                {item.isUrgent && (
                                    <View style={styles.urgentBadge}>
                                        <Text style={styles.urgentBadgeText}>URGENT</Text>
                                    </View>
                                )}
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
        borderLeftWidth: 4,
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
    title: { fontSize: FONTS.size.lg, fontWeight: 'bold', color: COLORS.textPrimary, flex: 1 },
    message: { fontSize: FONTS.size.md, color: COLORS.textSecondary, lineHeight: 22, marginBottom: SPACING.md },
    footer: { borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: SPACING.sm, alignItems: 'flex-end' },
    time: { fontSize: FONTS.size.xs, color: COLORS.textSecondary, fontWeight: '500' },

    urgentBadge: {
        backgroundColor: '#E74C3C',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    urgentBadgeText: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: '900',
    },

    emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingTop: SPACING.xl * 2 },
    emptyText: { fontSize: FONTS.size.md, fontWeight: 'bold', color: COLORS.textPrimary, marginTop: SPACING.md },
    emptySubText: { fontSize: FONTS.size.sm, color: COLORS.textSecondary, marginTop: SPACING.xs, textAlign: 'center' },
});
