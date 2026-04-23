import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import {
    collection,
    doc,
    onSnapshot,
    query,
    updateDoc,
    where,
} from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { COLORS, FONTS, RADIUS, SPACING } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase/config';

interface Advice {
    id: string;
    teamId: string;
    mentorName: string;
    type: 'suggestion' | 'praise' | 'warning';
    content: string;
    round: number;
    implemented: boolean;
    createdAt: number;
}

const TYPE_CONFIG = {
    suggestion: { color: COLORS.yellow, icon: 'bulb', label: 'SUGGESTION' },
    praise: { color: COLORS.green, icon: 'checkmark-circle', label: 'PRAISE' },
    warning: { color: COLORS.red, icon: 'warning', label: 'WARNING' },
};

export default function AdviceScreen() {
    const { userData } = useAuth();
    const [advices, setAdvices] = useState<Advice[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!userData?.teamId) {
            setLoading(false);
            return;
        }
        const q = query(
            collection(db, 'advice'),
            where('teamId', '==', userData.teamId)
        );
        const unsub = onSnapshot(q, (snap) => {
            const data = snap.docs
                .map((d) => ({ id: d.id, ...d.data() } as Advice))
                .sort((a, b) => b.createdAt - a.createdAt);
            setAdvices(data);
            setLoading(false);
        });
        return unsub;
    }, [userData?.teamId]);

    const toggleImplemented = async (item: Advice) => {
        try {
            await updateDoc(doc(db, 'advice', item.id), {
                implemented: !item.implemented,
            });
        } catch {
            Alert.alert('Error', 'Could not update status');
        }
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
                <Text style={styles.headerTitle}>Advice</Text>
            </View>

            <FlatList
                data={advices}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.content}
                ListHeaderComponent={
                    <View style={styles.titleBlock}>
                        <Text style={styles.title}>MENTOR ADVICE</Text>
                        <Text style={styles.subtitle}>
                            {'> respond to keep your mentor updated'}
                        </Text>
                    </View>
                }
                renderItem={({ item }) => {
                    const config = TYPE_CONFIG[item.type] || TYPE_CONFIG.suggestion;
                    return (
                        <View
                            style={[
                                styles.card,
                                { borderLeftColor: config.color },
                            ]}
                        >
                            {/* Card Header */}
                            <View style={styles.cardHeader}>
                                <View style={styles.cardHeaderLeft}>
                                    <Ionicons
                                        name={config.icon as any}
                                        size={16}
                                        color={config.color}
                                    />
                                    <Text
                                        style={[styles.typeLabel, { color: config.color }]}
                                    >
                                        {config.label}
                                    </Text>
                                </View>
                                <Text style={styles.roundText}>
                                    ROUND {item.round}
                                </Text>
                            </View>

                            {/* Mentor */}
                            <Text style={styles.mentorName}>{item.mentorName}</Text>

                            {/* Content */}
                            <Text style={styles.content2}>{item.content}</Text>

                            {/* Footer */}
                            <View style={styles.cardFooter}>
                                <TouchableOpacity
                                    onPress={() => toggleImplemented(item)}
                                    style={[
                                        styles.implementedBtn,
                                        item.implemented && styles.implementedBtnActive,
                                    ]}
                                    activeOpacity={0.8}
                                >
                                    {item.implemented && (
                                        <Ionicons
                                            name="checkmark"
                                            size={14}
                                            color={COLORS.green}
                                        />
                                    )}
                                    <Text
                                        style={[
                                            styles.implementedText,
                                            item.implemented && { color: COLORS.green },
                                        ]}
                                    >
                                        {item.implemented ? 'Implemented' : 'Mark as Implemented'}
                                    </Text>
                                </TouchableOpacity>
                                <Text style={styles.timeText}>
                                    {dayjs(item.createdAt).format('D MMM, HH:mm')}
                                </Text>
                            </View>
                        </View>
                    );
                }}
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <Ionicons
                            name="bulb-outline"
                            size={48}
                            color={COLORS.textDim}
                        />
                        <Text style={styles.emptyText}>
                            No advice from mentor yet
                        </Text>
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
    },
    headerTitle: {
        color: COLORS.textPrimary,
        fontSize: FONTS.size.xl,
        fontWeight: '800',
    },
    content: { padding: SPACING.md, paddingBottom: 100 },
    titleBlock: { marginBottom: SPACING.lg },
    title: {
        color: COLORS.textPrimary,
        fontSize: FONTS.size.xl,
        fontWeight: '900',
        letterSpacing: 2,
    },
    subtitle: {
        color: COLORS.textSecondary,
        fontSize: FONTS.size.sm,
        marginTop: 4,
    },
    card: {
        backgroundColor: COLORS.bgCard,
        borderRadius: RADIUS.md,
        padding: SPACING.md,
        marginBottom: SPACING.md,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderLeftWidth: 3,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.xs,
    },
    cardHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xs,
    },
    typeLabel: {
        fontSize: FONTS.size.xs,
        fontWeight: '700',
        letterSpacing: 1,
    },
    roundText: {
        color: COLORS.textSecondary,
        fontSize: FONTS.size.xs,
        fontWeight: '700',
        letterSpacing: 1,
    },
    mentorName: {
        color: COLORS.primary,
        fontSize: FONTS.size.md,
        fontWeight: '700',
        marginBottom: SPACING.sm,
    },
    content2: {
        color: COLORS.textPrimary,
        fontSize: FONTS.size.md,
        lineHeight: 24,
        marginBottom: SPACING.md,
    },
    cardFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    implementedBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: COLORS.bgCardAlt,
        paddingHorizontal: SPACING.sm,
        paddingVertical: SPACING.xs,
        borderRadius: RADIUS.sm,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    implementedBtnActive: {
        backgroundColor: COLORS.green + '22',
        borderColor: COLORS.green + '44',
    },
    implementedText: {
        color: COLORS.textSecondary,
        fontSize: FONTS.size.xs,
        fontWeight: '600',
    },
    timeText: {
        color: COLORS.textDim,
        fontSize: FONTS.size.xs,
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