import { Ionicons } from '@expo/vector-icons';
import {
    collection,
    onSnapshot
} from 'firebase/firestore';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Platform,
    RefreshControl,
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

interface StatCard {
    label: string;
    value: string | number;
    icon: string;
    color: string;
}

export default function VolunteerDashboard() {
    const { userData } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [stats, setStats] = useState({
        teamsArrived: 0,
        totalTeams: 0,
        mealsServed: 0,
        pendingTasks: 0,
        completedTasks: 0,
        lunchServed: 0,
        dinnerServed: 0,
        snackServed: 0,
    });
    const [recentMeals, setRecentMeals] = useState<any[]>([]);
    const [recentActivity, setRecentActivity] = useState<any[]>([]);

    useEffect(() => {
        const unsubs: (() => void)[] = [];

        console.log("VolunteerDashboard: Starting listeners...");

        // Teams arrived
        const teamsUnsub = onSnapshot(
            collection(db, 'teams'),
            (snap) => {
                console.log(`VolunteerDashboard: Received ${snap.docs.length} teams`);
                const total = snap.docs.length;
                const arrived = snap.docs.filter(
                    (d) => d.data().checkInStatus === 'Checked In' || d.data().checkedIn === true
                ).length;
                setStats((prev) => ({
                    ...prev,
                    teamsArrived: arrived,
                    totalTeams: total,
                }));
                setLoading(false);
            },
            (err) => {
                console.error("VolunteerDashboard: Teams listener error:", err);
                setLoading(false);
            }
        );
        unsubs.push(teamsUnsub);

        // Meals served
        const mealsUnsub = onSnapshot(
            collection(db, 'meals'),
            (snap) => {
                console.log(`VolunteerDashboard: Received ${snap.docs.length} meals`);
                const meals = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
                const lunch = meals.filter((m: any) => m.mealType === 'lunch').length;
                const dinner = meals.filter((m: any) => m.mealType === 'dinner').length;
                const snack = meals.filter((m: any) => m.mealType === 'snack').length;
                setStats((prev) => ({
                    ...prev,
                    mealsServed: meals.length,
                    lunchServed: lunch,
                    dinnerServed: dinner,
                    snackServed: snack,
                }));
                const sorted = [...meals].sort(
                    (a: any, b: any) => b.timestamp - a.timestamp
                );
                setRecentMeals(sorted.slice(0, 5));
            },
            (err) => {
                console.error("VolunteerDashboard: Meals listener error:", err);
            }
        );
        unsubs.push(mealsUnsub);

        // Tasks (Help Requests)
        const tasksUnsub = onSnapshot(
            collection(db, 'help_requests'),
            (snap) => {
                console.log(`VolunteerDashboard: Received ${snap.docs.length} help requests`);
                const tasks = snap.docs.map((d) => d.data());
                const pending = tasks.filter((t) => t.status === 'pending').length;
                const completed = tasks.filter(
                    (t) => t.status === 'resolved'
                ).length;
                setStats((prev) => ({
                    ...prev,
                    pendingTasks: pending,
                    completedTasks: completed,
                }));
            },
            (err) => {
                console.error("VolunteerDashboard: Tasks listener error:", err);
            }
        );
        unsubs.push(tasksUnsub);

        return () => unsubs.forEach((u) => u());
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        setTimeout(() => setRefreshing(false), 1000);
    };

    const handleSignOut = () => {
        const performLogout = async () => {
            try {
                await logoutUser();
                router.replace('/(auth)/login');
            } catch (error) {
                console.error("Logout Error:", error);
                if (Platform.OS === 'web') {
                    window.alert('Failed to sign out. Please try again.');
                } else {
                    Alert.alert('Error', 'Failed to sign out. Try again.');
                }
            }
        };

        if (Platform.OS === 'web') {
            if (window.confirm('Are you sure you want to sign out?')) {
                performLogout();
            }
        } else {
            Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Sign Out',
                    style: 'destructive',
                    onPress: performLogout,
                },
            ]);
        }
    };

    const statCards: StatCard[] = [
        {
            label: 'Teams Arrived',
            value: `${stats.teamsArrived}/${stats.totalTeams}`,
            icon: 'people-outline',
            color: COLORS.primary,
        },
        {
            label: 'Meals Served',
            value: stats.mealsServed,
            icon: 'restaurant-outline',
            color: COLORS.green,
        },
        {
            label: 'Pending Tasks',
            value: stats.pendingTasks,
            icon: 'time-outline',
            color: COLORS.orange,
        },
        {
            label: 'Tasks Done',
            value: stats.completedTasks,
            icon: 'checkmark-circle-outline',
            color: COLORS.purple,
        },
    ];

    if (loading) {
        return (
            <View style={styles.loader}>
                <ActivityIndicator size="large" color={COLORS.purple} />
            </View>
        );
    }

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.content}
            refreshControl={
                <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    tintColor={COLORS.purple}
                />
            }
        >
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.collegeName}>JIT BORAWAN</Text>
                    <Text style={styles.tagline}>VOLUNTEER PANEL</Text>
                    <Text style={styles.greeting}>
                        Hey, {userData?.name?.split(' ')[0] ?? 'Volunteer'} 👋
                    </Text>
                </View>
                <View style={styles.roleBadgeContainer}>
                    <View style={styles.roleBadge}>
                        <Ionicons name="shield-checkmark" size={14} color={COLORS.purple} />
                        <Text style={styles.roleText}>VOLUNTEER</Text>
                    </View>
                    <TouchableOpacity 
                        onPress={() => router.push('/(volunteer)/notices')} 
                        style={styles.headerIconBtn}
                    >
                        <Ionicons name="notifications-outline" size={22} color={COLORS.textPrimary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleSignOut} style={styles.signOutBtn}>
                        <Ionicons name="log-out-outline" size={20} color={COLORS.textSecondary} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Stat Cards */}
            <View style={styles.statsGrid}>
                {statCards.map((card) => (
                    <View
                        key={card.label}
                        style={[
                            styles.statCard,
                            { borderTopColor: card.color, borderTopWidth: 2 },
                        ]}
                    >
                        <View
                            style={[
                                styles.statIcon,
                                { backgroundColor: card.color + '22' },
                            ]}
                        >
                            <Ionicons
                                name={card.icon as any}
                                size={20}
                                color={card.color}
                            />
                        </View>
                        <Text style={styles.statValue}>{card.value}</Text>
                        <Text style={styles.statLabel}>{card.label}</Text>
                    </View>
                ))}
            </View>

            {/* Meal Breakdown */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>MEAL BREAKDOWN</Text>
                {[
                    { label: 'Lunch', value: stats.lunchServed, color: COLORS.orange },
                    { label: 'Dinner', value: stats.dinnerServed, color: COLORS.purple },
                    { label: 'Snacks', value: stats.snackServed, color: COLORS.green },
                ].map((meal) => (
                    <View key={meal.label} style={styles.mealRow}>
                        <View style={styles.mealLeft}>
                            <View
                                style={[
                                    styles.mealDot,
                                    { backgroundColor: meal.color },
                                ]}
                            />
                            <Text style={styles.mealLabel}>{meal.label}</Text>
                        </View>
                        <Text style={[styles.mealCount, { color: meal.color }]}>
                            {meal.value} served
                        </Text>
                    </View>
                ))}
            </View>

            {/* Recent Meal Activity */}
            {recentMeals.length > 0 && (
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>RECENT ACTIVITY</Text>
                    {recentMeals.map((meal: any) => (
                        <View key={meal.id} style={styles.activityRow}>
                            <View style={styles.activityIcon}>
                                <Ionicons
                                    name="restaurant-outline"
                                    size={16}
                                    color={COLORS.green}
                                />
                            </View>
                            <View style={styles.activityInfo}>
                                <Text style={styles.activityText}>
                                    {meal.teamName} — {meal.mealType}
                                </Text>
                                <Text style={styles.activityTime}>
                                    {new Date(meal.timestamp).toLocaleTimeString('en-US', {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                    })}
                                </Text>
                            </View>
                            <View
                                style={[
                                    styles.mealBadge,
                                    {
                                        backgroundColor:
                                            meal.mealType === 'lunch'
                                                ? COLORS.orange + '22'
                                                : meal.mealType === 'dinner'
                                                    ? COLORS.purple + '22'
                                                    : COLORS.green + '22',
                                    },
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.mealBadgeText,
                                        {
                                            color:
                                                meal.mealType === 'lunch'
                                                    ? COLORS.orange
                                                    : meal.mealType === 'dinner'
                                                        ? COLORS.purple
                                                        : COLORS.green,
                                        },
                                    ]}
                                >
                                    {meal.mealType.toUpperCase()}
                                </Text>
                            </View>
                        </View>
                    ))}
                </View>
            )}

            {/* Task Progress */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>TASK PROGRESS</Text>
                <View style={styles.progressRow}>
                    <Text style={styles.progressText}>
                        {stats.completedTasks} of{' '}
                        {stats.completedTasks + stats.pendingTasks} tasks completed
                    </Text>
                    <Text style={styles.progressPct}>
                        {stats.completedTasks + stats.pendingTasks > 0
                            ? Math.round(
                                (stats.completedTasks /
                                    (stats.completedTasks + stats.pendingTasks)) *
                                100
                            )
                            : 0}
                        %
                    </Text>
                </View>
                <View style={styles.progressBarBg}>
                    <View
                        style={[
                            styles.progressBarFill,
                            {
                                width:
                                    stats.completedTasks + stats.pendingTasks > 0
                                        ? `${Math.round(
                                            (stats.completedTasks /
                                                (stats.completedTasks + stats.pendingTasks)) *
                                            100
                                        )}%`
                                        : '0%',
                            },
                        ]}
                    />
                </View>
            </View>
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
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.lg,
        paddingTop: SPACING.lg,
    },
    collegeName: {
        color: COLORS.purple,
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 2,
        marginBottom: 2,
    },
    tagline: {
        color: COLORS.purple,
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
    roleBadgeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    roleBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: COLORS.purple + '22',
        paddingHorizontal: SPACING.sm,
        paddingVertical: SPACING.xs,
        borderRadius: RADIUS.sm,
        borderWidth: 1,
        borderColor: COLORS.purple + '44',
    },
    signOutBtn: {
        padding: 6,
        backgroundColor: COLORS.bgCard,
        borderRadius: RADIUS.sm,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    headerIconBtn: {
        padding: 6,
        backgroundColor: COLORS.bgCard,
        borderRadius: RADIUS.sm,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    roleText: {
        color: COLORS.purple,
        fontSize: FONTS.size.xs,
        fontWeight: '700',
        letterSpacing: 1,
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SPACING.sm,
        marginBottom: SPACING.md,
    },
    statCard: {
        width: '47.5%',
        backgroundColor: COLORS.bgCard,
        borderRadius: RADIUS.md,
        padding: SPACING.md,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    statIcon: {
        width: 36,
        height: 36,
        borderRadius: RADIUS.sm,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.sm,
    },
    statValue: {
        color: COLORS.textPrimary,
        fontSize: FONTS.size.xl,
        fontWeight: '900',
    },
    statLabel: {
        color: COLORS.textSecondary,
        fontSize: FONTS.size.xs,
        marginTop: 2,
    },
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
    mealRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: SPACING.sm,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    mealLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
    },
    mealDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    mealLabel: {
        color: COLORS.textPrimary,
        fontSize: FONTS.size.md,
        fontWeight: '600',
    },
    mealCount: {
        fontSize: FONTS.size.md,
        fontWeight: '800',
    },
    activityRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
        paddingVertical: SPACING.sm,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    activityIcon: {
        width: 32,
        height: 32,
        borderRadius: RADIUS.sm,
        backgroundColor: COLORS.green + '22',
        alignItems: 'center',
        justifyContent: 'center',
    },
    activityInfo: { flex: 1 },
    activityText: {
        color: COLORS.textPrimary,
        fontSize: FONTS.size.sm,
        fontWeight: '600',
        textTransform: 'capitalize',
    },
    activityTime: {
        color: COLORS.textSecondary,
        fontSize: FONTS.size.xs,
        marginTop: 2,
    },
    mealBadge: {
        paddingHorizontal: SPACING.sm,
        paddingVertical: 3,
        borderRadius: RADIUS.sm,
    },
    mealBadgeText: {
        fontSize: FONTS.size.xs,
        fontWeight: '700',
        letterSpacing: 1,
    },
    progressRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: SPACING.sm,
    },
    progressText: {
        color: COLORS.textSecondary,
        fontSize: FONTS.size.sm,
    },
    progressPct: {
        color: COLORS.purple,
        fontSize: FONTS.size.sm,
        fontWeight: '800',
    },
    progressBarBg: {
        height: 8,
        backgroundColor: COLORS.border,
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: COLORS.purple,
        borderRadius: 4,
    },
});