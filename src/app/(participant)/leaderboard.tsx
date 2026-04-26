import { Ionicons } from '@expo/vector-icons';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
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

const MEDALS = ['🥇', '🥈', '🥉'];
const MEDAL_COLORS = ['#eab308', '#9ca3af', '#d97706']; // Gold, Silver, Bronze

export default function Leaderboard() {
    const { userData } = useAuth();
    const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Listen to teams collection which holds the live judging scores
        const q = query(collection(db, 'teams'), orderBy('score', 'desc'));
        const unsub = onSnapshot(q, (snapshot) => {
            const fetched = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    teamId: doc.id,
                    teamName: data.name || 'Unnamed Team',
                    total: data.score || 0,
                    round: 1
                };
            });

            setEntries(fetched);
            setLoading(false);
        });
        return unsub;
    }, []);

    const getInitial = (name: string) => name.charAt(0).toUpperCase();

    if (loading) {
        return (
            <View style={styles.loader}>
                <ActivityIndicator size="large" color={'#06b6d4'} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Leaderboard</Text>
                <Text style={styles.headerSubtitle}>Live team rankings based on judging criteria</Text>
            </View>

            <FlatList
                data={entries}
                keyExtractor={(item) => item.teamId}
                contentContainerStyle={styles.content}
                renderItem={({ item, index }) => {
                    const rank = index + 1;
                    const isMyTeam = item.teamId === userData?.teamId;
                    const isTop3 = index < 3;
                    
                    return (
                        <View
                            style={[
                                styles.rankRow,
                                isTop3 && { borderColor: MEDAL_COLORS[index], borderWidth: 1, backgroundColor: MEDAL_COLORS[index] + '15' },
                                !isTop3 && isMyTeam && styles.rankRowHighlight,
                            ]}
                        >
                            <View style={[styles.rankNumContainer, isTop3 && { borderColor: MEDAL_COLORS[index] }]}>
                                {isTop3 ? (
                                    <Text style={styles.medalIcon}>{MEDALS[index]}</Text>
                                ) : (
                                    <Text style={styles.rankNum}>{rank}</Text>
                                )}
                            </View>
                            <View style={styles.avatar}>
                                <Text style={styles.avatarText}>
                                    {getInitial(item.teamName)}
                                </Text>
                            </View>
                            <View style={styles.rankInfo}>
                                <Text style={[styles.rankName, isTop3 && { color: MEDAL_COLORS[index] }]} numberOfLines={1}>
                                    {item.teamName}
                                </Text>
                                {isMyTeam && <Text style={styles.myTeamBadge}>Your Team</Text>}
                            </View>
                            <View style={styles.scoreContainer}>
                                <Text style={[styles.rankScore, isTop3 && { color: MEDAL_COLORS[index] }]}>
                                    {item.total.toFixed(1)}
                                </Text>
                            </View>
                        </View>
                    );
                }}
                ListEmptyComponent={
                    entries.length === 0 ? (
                        <View style={styles.empty}>
                            <View style={styles.emptyIconContainer}>
                                <Ionicons
                                    name="trophy-outline"
                                    size={48}
                                    color={'#06b6d4'}
                                />
                            </View>
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
        backgroundColor: '#0f172a',
        justifyContent: 'center',
        alignItems: 'center',
    },
    container: { 
        flex: 1, 
        backgroundColor: '#0f172a' 
    },
    header: {
        paddingTop: 56,
        paddingHorizontal: SPACING.md,
        paddingBottom: SPACING.lg,
        borderBottomWidth: 1,
        borderBottomColor: '#334155',
        backgroundColor: '#0f172a',
    },
    headerTitle: {
        color: '#ffffff',
        fontSize: FONTS.size.xl + 4,
        fontWeight: '900',
        letterSpacing: 1,
    },
    headerSubtitle: {
        color: '#64748b',
        fontSize: FONTS.size.sm,
        marginTop: SPACING.xs,
        fontWeight: '500',
    },
    content: { 
        paddingBottom: 100,
        paddingTop: SPACING.lg, 
    },
    rankRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1e293b',
        marginHorizontal: SPACING.md,
        marginBottom: SPACING.sm,
        borderRadius: RADIUS.lg,
        paddingVertical: 12,
        paddingHorizontal: SPACING.md,
        borderWidth: 1,
        borderColor: '#334155',
    },
    rankRowHighlight: {
        borderColor: '#06b6d4',
        backgroundColor: '#164e63',
    },
    rankNumContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#334155',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: SPACING.md,
    },
    rankNum: {
        color: '#94a3b8',
        fontSize: FONTS.size.sm,
        fontWeight: '700',
    },
    medalIcon: {
        fontSize: 14,
    },
    avatar: {
        width: 42,
        height: 42,
        borderRadius: 10,
        backgroundColor: '#38bdf8',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: SPACING.md,
    },
    avatarText: {
        color: COLORS.white,
        fontSize: FONTS.size.md,
        fontWeight: 'bold',
    },
    rankInfo: {
        flex: 1,
        justifyContent: 'center',
    },
    rankName: {
        color: '#f8fafc',
        fontSize: FONTS.size.md,
        fontWeight: '700',
    },
    myTeamBadge: {
        color: '#06b6d4',
        fontSize: FONTS.size.xs,
        fontWeight: '800',
        marginTop: 2,
        textTransform: 'uppercase',
    },
    scoreContainer: {
        alignItems: 'flex-end',
        justifyContent: 'center',
    },
    rankScore: {
        color: '#06b6d4',
        fontSize: FONTS.size.lg,
        fontWeight: '900',
    },
    empty: {
        alignItems: 'center',
        paddingTop: 80,
        gap: SPACING.md,
    },
    emptyIconContainer: {
        width: 96,
        height: 96,
        borderRadius: 48,
        backgroundColor: '#164e63',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.sm,
    },
    emptyText: {
        color: '#94a3b8',
        fontSize: FONTS.size.md,
        fontWeight: '600',
    },
});