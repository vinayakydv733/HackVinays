import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import {
    collection,
    doc,
    onSnapshot,
    orderBy,
    query,
    updateDoc,
    writeBatch
} from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { COLORS, FONTS, RADIUS, SPACING } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase/config';

dayjs.extend(relativeTime);

interface Notice {
    id: string;
    title: string;
    body: string;
    type: 'broadcast' | 'notice';
    read: boolean;
    createdAt: number;
    postedBy: string;
}

const TYPE_CONFIG = {
    broadcast: { color: COLORS.purple, icon: 'megaphone', label: 'BROADCAST' },
    notice: { color: COLORS.primary, icon: 'notifications', label: 'NOTICE' },
};

export default function Notices() {
    const { user, userData } = useAuth();
    const [notices, setNotices] = useState<Notice[]>([]);
    const [loading, setLoading] = useState(true);
    const unreadCount = notices.filter((n) => !n.read).length;

    useEffect(() => {
        if (!user) return;
        const q = query(
            collection(db, 'announcements'),
            orderBy('createdAt', 'desc')
        );
        const unsub = onSnapshot(q, (snap) => {
            const all = snap.docs.map(
                (d) => ({ id: d.id, ...d.data() } as Notice)
            );
            // Show broadcasts + notices targeted to this user/team
            const filtered = all.filter(
                (n) =>
                    n.type === 'broadcast' ||
                    (n as any).targetUid === user.uid ||
                    (n as any).targetTeamId === userData?.teamId
            );
            setNotices(filtered);
            setLoading(false);
        });
        return unsub;
    }, [user, userData]);

    const markRead = async (id: string) => {
        await updateDoc(doc(db, 'announcements', id), { read: true });
    };

    const markAllRead = async () => {
        const batch = writeBatch(db);
        notices
            .filter((n) => !n.read)
            .forEach((n) => {
                batch.update(doc(db, 'announcements', n.id), { read: true });
            });
        await batch.commit();
    };

    if (loading) {
        return (
            <View style={styles.loader}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>Notices</Text>
                    {unreadCount > 0 && (
                        <View style={styles.unreadBadge}>
                            <Text style={styles.unreadText}>
                                {unreadCount} unread
                            </Text>
                        </View>
                    )}
                </View>
                {unreadCount > 0 && (
                    <TouchableOpacity onPress={markAllRead}>
                        <Text style={styles.markAllText}>MARK ALL READ</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Title */}
            <View style={styles.inboxHeader}>
                <Text style={styles.inboxTitle}>INBOX</Text>
                {unreadCount > 0 && (
                    <View style={styles.countBadge}>
                        <Text style={styles.countText}>{unreadCount} unread</Text>
                    </View>
                )}
            </View>

            <FlatList
                data={notices}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.list}
                renderItem={({ item }) => {
                    const config = TYPE_CONFIG[item.type] || TYPE_CONFIG.notice;
                    return (
                        <TouchableOpacity
                            onPress={() => markRead(item.id)}
                            style={[
                                styles.noticeCard,
                                {
                                    borderLeftColor: config.color,
                                    opacity: item.read ? 0.6 : 1,
                                },
                            ]}
                            activeOpacity={0.8}
                        >
                            {/* Top row */}
                            <View style={styles.noticeTop}>
                                <View
                                    style={[
                                        styles.typeBadge,
                                        { backgroundColor: config.color + '22' },
                                    ]}
                                >
                                    <Ionicons
                                        name={config.icon as any}
                                        size={11}
                                        color={config.color}
                                    />
                                    <Text
                                        style={[styles.typeText, { color: config.color }]}
                                    >
                                        {config.label}
                                    </Text>
                                </View>
                                <View style={styles.noticeTopRight}>
                                    <Text style={styles.timeText}>
                                        {dayjs(item.createdAt).format('D MMM, HH:mm')}
                                    </Text>
                                    {!item.read && <View style={styles.unreadDot} />}
                                </View>
                            </View>

                            {/* Body */}
                            <Text style={styles.noticeBody}>{item.body}</Text>
                        </TouchableOpacity>
                    );
                }}
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <Ionicons
                            name="notifications-off-outline"
                            size={48}
                            color={COLORS.textDim}
                        />
                        <Text style={styles.emptyText}>No notices yet</Text>
                    </View>
                }
            />
        </View>
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
    header: {
        paddingTop: 56,
        paddingHorizontal: SPACING.md,
        paddingBottom: SPACING.md,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerTitle: {
        color: COLORS.textPrimary,
        fontSize: FONTS.size.xl,
        fontWeight: '800',
    },
    unreadBadge: {
        backgroundColor: COLORS.primary + '22',
        borderRadius: RADIUS.sm,
        paddingHorizontal: SPACING.sm,
        paddingVertical: 2,
        alignSelf: 'flex-start',
        marginTop: 4,
    },
    unreadText: {
        color: COLORS.primary,
        fontSize: FONTS.size.xs,
        fontWeight: '700',
    },
    markAllText: {
        color: COLORS.primary,
        fontSize: FONTS.size.xs,
        fontWeight: '700',
        letterSpacing: 1,
    },
    inboxHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.md,
    },
    inboxTitle: {
        color: COLORS.textPrimary,
        fontSize: FONTS.size.xxl,
        fontWeight: '900',
        letterSpacing: 2,
    },
    countBadge: {
        backgroundColor: COLORS.primary + '22',
        borderRadius: RADIUS.sm,
        paddingHorizontal: SPACING.sm,
        paddingVertical: 3,
    },
    countText: {
        color: COLORS.primary,
        fontSize: FONTS.size.xs,
        fontWeight: '700',
    },
    list: { padding: SPACING.md, paddingBottom: 100 },
    noticeCard: {
        backgroundColor: COLORS.bgCard,
        borderRadius: RADIUS.md,
        padding: SPACING.md,
        marginBottom: SPACING.sm,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderLeftWidth: 3,
    },
    noticeTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.sm,
    },
    typeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: SPACING.sm,
        paddingVertical: 3,
        borderRadius: RADIUS.sm,
    },
    typeText: {
        fontSize: FONTS.size.xs,
        fontWeight: '700',
        letterSpacing: 1,
    },
    noticeTopRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xs,
    },
    timeText: {
        color: COLORS.textSecondary,
        fontSize: FONTS.size.xs,
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: COLORS.primary,
    },
    noticeBody: {
        color: COLORS.textPrimary,
        fontSize: FONTS.size.md,
        lineHeight: 22,
    },
    empty: {
        alignItems: 'center',
        paddingTop: 80,
        gap: SPACING.md,
    },
    emptyText: {
        color: COLORS.textSecondary,
        fontSize: FONTS.size.md,
    },
});