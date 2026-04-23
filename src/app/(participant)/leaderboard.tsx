import { Ionicons } from '@expo/vector-icons';
import { collection, onSnapshot } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { COLORS, FONTS, RADIUS, SPACING } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase/config';

interface LeaderboardEntry {
    teamId: string;
    teamName: string;
    total: number;
    round: number;
}

const MEDAL = ['🥇', '🥈', '🥉'];
const PODIUM_COLORS = [COLORS.yellow, COLORS.textSecondary, COLORS.orange];

export default function Leaderboard() {
    const { userData } = useAuth();
    const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Listen to scores collection and aggregate by team
        const unsub = onSnapshot(
            collection(db, 'scores'),
            (snap) => {
                const scoreMap: Record<string, { total: number; count: number; teamName: string; round: number }> = {};
                snap.docs.forEach((d) => {
                    const s = d.data();
                    if (!scoreMap[s.teamId]) {
                        scoreMap[s.teamId] = {
                            total: 0,
                            count: 0,
                            teamName: s.teamName,
                            round: s.round,
                        };
                    }
                    scoreMap[s.teamId].total += s.total;
                    scoreMap[s.teamId].count += 1;
                    scoreMap[s.teamId].round = Math.max(
                        scoreMap[s.teamId].round,
                        s.round
                    );
                });

                const ranked = Object.entries(scoreMap)
                    .map(([teamId, v]) => ({
                        teamId,
                        teamName: v.teamName,
                        total: Math.round((v.total / v.count) * 10) / 10,
                        round: v.round,
                    }))
                    .sort((a, b) => b.total - a.total);

                setEntries(ranked);
                setLoading(false);
            }
        );
        return unsub;
    }, []);

    const getInitial = (name: string) => name.charAt(0).toUpperCase();

    const getAvatarColor = (index: number) => {
        const colors = [
            COLORS.purple,
            COLORS.primary,
            COLORS.orange,
            COLORS.green,
            COLORS.red,
        ];
        return colors[index % colors.length];
    };

    if (loading) {
        return (
            <View style={styles.loader}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    const top3 = entries.slice(0, 3);
    const rest = entries.slice(3);

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Ranking</Text>
            </View>

            <FlatList
                data={rest}
                keyExtractor={(item) => item.teamId}
                contentContainerStyle={styles.content}
                ListHeaderComponent={
                    <>
                        {/* Title */}
                        <View style={styles.titleBlock}>
                            <Text style={styles.title}>LEADERBOARD</Text>
                            <Text style={styles.subtitle}>
                                Weighted average of all judging criteria
                            </Text>
                        </View>

                        {/* Podium */}
                        {top3.length > 0 && (
                            <View style={styles.podium}>
                                {/* 2nd place */}
                                {top3[1] && (
                                    <View style={[styles.podiumItem, styles.podiumSecond]}>
                                        <Text style={styles.podiumName}>
                                            {top3[1].teamName}
                                        </Text>
                                        <Text
                                            style={[
                                                styles.podiumScore,
                                                { color: PODIUM_COLORS[1] },
                                            ]}
                                        >
                                            {top3[1].total}
                                        </Text>
                                        <View
                                            style={[
                                                styles.podiumBlock,
                                                {
                                                    height: 80,
                                                    backgroundColor: COLORS.textSecondary + '33',
                                                    borderColor: COLORS.textSecondary + '66',
                                                },
                                            ]}
                                        >
                                            <Text style={styles.podiumRank}>2ND</Text>
                                        </View>
                                    </View>
                                )}

                                {/* 1st place */}
                                {top3[0] && (
                                    <View style={[styles.podiumItem, styles.podiumFirst]}>
                                        <Text style={styles.podiumName}>
                                            {top3[0].teamName}
                                        </Text>
                                        <Text
                                            style={[
                                                styles.podiumScore,
                                                { color: PODIUM_COLORS[0] },
                                            ]}
                                        >
                                            {top3[0].total}
                                        </Text>
                                        <View
                                            style={[
                                                styles.podiumBlock,
                                                {
                                                    height: 110,
                                                    backgroundColor: COLORS.yellow + '22',
                                                    borderColor: COLORS.yellow + '66',
                                                },
                                            ]}
                                        >
                                            <Text
                                                style={[
                                                    styles.podiumRank,
                                                    { color: COLORS.yellow },
                                                ]}
                                            >
                                                1ST
                                            </Text>
                                        </View>
                                    </View>
                                )}

                                {/* 3rd place */}
                                {top3[2] && (
                                    <View style={[styles.podiumItem, styles.podiumThird]}>
                                        <Text style={styles.podiumName}>
                                            {top3[2].teamName}
                                        </Text>
                                        <Text
                                            style={[
                                                styles.podiumScore,
                                                { color: PODIUM_COLORS[2] },
                                            ]}
                                        >
                                            {top3[2].total}
                                        </Text>
                                        <View
                                            style={[
                                                styles.podiumBlock,
                                                {
                                                    height: 65,
                                                    backgroundColor: COLORS.orange + '22',
                                                    borderColor: COLORS.orange + '44',
                                                },
                                            ]}
                                        >
                                            <Text
                                                style={[
                                                    styles.podiumRank,
                                                    { color: COLORS.orange },
                                                ]}
                                            >
                                                3RD
                                            </Text>
                                        </View>
                                    </View>
                                )}
                            </View>
                        )}

                        {/* Full rankings label */}
                        {rest.length > 0 && (
                            <Text style={styles.fullRankingsLabel}>FULL RANKINGS</Text>
                        )}
                    </>
                }
                renderItem={({ item, index }) => {
                    const rank = index + 4;
                    const isMyTeam = item.teamId === userData?.teamId;
                    return (
                        <View
                            style={[
                                styles.rankRow,
                                isMyTeam && styles.rankRowHighlight,
                            ]}
                        >
                            <Text style={styles.rankNum}>{rank}</Text>
                            <View
                                style={[
                                    styles.avatar,
                                    { backgroundColor: getAvatarColor(index) },
                                ]}
                            >
                                <Text style={styles.avatarText}>
                                    {getInitial(item.teamName)}
                                </Text>
                            </View>
                            <Text style={styles.rankName} numberOfLines={1}>
                                {item.teamName}
                                {isMyTeam ? ' (You)' : ''}
                            </Text>
                            <Text style={styles.rankScore}>{item.total}</Text>
                        </View>
                    );
                }}
                ListEmptyComponent={
                    entries.length === 0 ? (
                        <View style={styles.empty}>
                            <Ionicons
                                name="trophy-outline"
                                size={48}
                                color={COLORS.textDim}
                            />
                            <Text style={styles.emptyText}>
                                No scores yet. Stay tuned!
                            </Text>
                        </View>
                    ) : null
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
    },
    headerTitle: {
        color: COLORS.textPrimary,
        fontSize: FONTS.size.xl,
        fontWeight: '800',
    },
    content: { paddingBottom: 100 },
    titleBlock: {
        paddingHorizontal: SPACING.md,
        paddingTop: SPACING.lg,
        marginBottom: SPACING.lg,
    },
    title: {
        color: COLORS.textPrimary,
        fontSize: FONTS.size.xxl,
        fontWeight: '900',
        letterSpacing: 3,
    },
    subtitle: {
        color: COLORS.textSecondary,
        fontSize: FONTS.size.sm,
        marginTop: 4,
    },
    podium: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'flex-end',
        paddingHorizontal: SPACING.md,
        marginBottom: SPACING.xl,
        gap: SPACING.sm,
    },
    podiumItem: { alignItems: 'center', flex: 1 },
    podiumFirst: { marginBottom: 0 },
    podiumSecond: { marginBottom: 0 },
    podiumThird: { marginBottom: 0 },
    podiumName: {
        color: COLORS.textPrimary,
        fontSize: FONTS.size.xs,
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: 4,
    },
    podiumScore: {
        fontSize: FONTS.size.lg,
        fontWeight: '900',
        marginBottom: SPACING.xs,
    },
    podiumBlock: {
        width: '100%',
        borderRadius: RADIUS.md,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    podiumRank: {
        color: COLORS.textSecondary,
        fontSize: FONTS.size.sm,
        fontWeight: '800',
        letterSpacing: 1,
    },
    fullRankingsLabel: {
        color: COLORS.textSecondary,
        fontSize: FONTS.size.xs,
        letterSpacing: 3,
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: SPACING.md,
    },
    rankRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.bgCard,
        marginHorizontal: SPACING.md,
        marginBottom: SPACING.sm,
        borderRadius: RADIUS.md,
        padding: SPACING.md,
        borderWidth: 1,
        borderColor: COLORS.border,
        gap: SPACING.sm,
    },
    rankRowHighlight: {
        borderColor: COLORS.primary + '66',
        backgroundColor: COLORS.primary + '11',
    },
    rankNum: {
        color: COLORS.textSecondary,
        fontSize: FONTS.size.md,
        fontWeight: '700',
        width: 24,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: RADIUS.sm,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        color: COLORS.white,
        fontSize: FONTS.size.md,
        fontWeight: '800',
    },
    rankName: {
        flex: 1,
        color: COLORS.textPrimary,
        fontSize: FONTS.size.md,
        fontWeight: '600',
    },
    rankScore: {
        color: COLORS.primary,
        fontSize: FONTS.size.lg,
        fontWeight: '900',
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