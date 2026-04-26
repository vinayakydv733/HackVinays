import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
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

export default function VolunteerProfile() {
    const { userData } = useAuth();
    const router = useRouter();
    const [signingOut, setSigningOut] = useState(false);

    const handleSignOut = () => {
        Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
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
                        Alert.alert('Error', 'Failed to sign out');
                        setSigningOut(false);
                    }
                },
            },
        ]);
    };

    const infoRows = [
        { label: 'Full Name', value: userData?.name ?? '--', icon: 'person-outline' },
        { label: 'Email', value: userData?.email ?? '--', icon: 'mail-outline' },
        { label: 'Role', value: 'Volunteer', icon: 'shield-outline' },
    ];

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.content}
        >
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Profile</Text>
            </View>

            {/* Avatar */}
            <View style={styles.avatarSection}>
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                        {userData?.name?.charAt(0).toUpperCase() ?? 'V'}
                    </Text>
                </View>
                <Text style={styles.name}>{userData?.name ?? 'Volunteer'}</Text>
                <View style={styles.roleBadge}>
                    <Ionicons name="shield-checkmark" size={14} color={COLORS.purple} />
                    <Text style={styles.roleText}>VOLUNTEER</Text>
                </View>
            </View>

            {/* Info Card */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>PERSONAL INFO</Text>
                {infoRows.map((row, i) => (
                    <View
                        key={row.label}
                        style={[
                            styles.infoRow,
                            i === infoRows.length - 1 && { borderBottomWidth: 0 },
                        ]}
                    >
                        <View style={styles.infoIcon}>
                            <Ionicons
                                name={row.icon as any}
                                size={18}
                                color={COLORS.purple}
                            />
                        </View>
                        <View style={styles.infoContent}>
                            <Text style={styles.infoLabel}>{row.label}</Text>
                            <Text style={styles.infoValue}>{row.value}</Text>
                        </View>
                    </View>
                ))}
            </View>

            {/* Sign Out */}
            <TouchableOpacity
                style={styles.signOutBtn}
                onPress={handleSignOut}
                disabled={signingOut}
                activeOpacity={0.8}
            >
                {signingOut ? (
                    <ActivityIndicator color={COLORS.white} size="small" />
                ) : (
                    <>
                        <Ionicons name="log-out-outline" size={20} color={COLORS.white} />
                        <Text style={styles.signOutText}>SIGN OUT</Text>
                    </>
                )}
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },
    content: { paddingBottom: 100 },
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
    avatarSection: {
        alignItems: 'center',
        paddingVertical: SPACING.xl,
        gap: SPACING.sm,
    },
    avatar: {
        width: 88,
        height: 88,
        borderRadius: 44,
        backgroundColor: COLORS.purple + '33',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 3,
        borderColor: COLORS.purple + '66',
    },
    avatarText: {
        color: COLORS.purple,
        fontSize: FONTS.size.xxxl,
        fontWeight: '900',
    },
    name: {
        color: COLORS.textPrimary,
        fontSize: FONTS.size.xl,
        fontWeight: '800',
    },
    roleBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: COLORS.purple + '22',
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.xs,
        borderRadius: RADIUS.xl,
        borderWidth: 1,
        borderColor: COLORS.purple + '44',
    },
    roleText: {
        color: COLORS.purple,
        fontSize: FONTS.size.xs,
        fontWeight: '700',
        letterSpacing: 2,
    },
    card: {
        backgroundColor: COLORS.bgCard,
        borderRadius: RADIUS.lg,
        marginHorizontal: SPACING.md,
        marginBottom: SPACING.md,
        borderWidth: 1,
        borderColor: COLORS.border,
        overflow: 'hidden',
    },
    cardTitle: {
        color: COLORS.textSecondary,
        fontSize: FONTS.size.xs,
        letterSpacing: 2,
        fontWeight: '700',
        padding: SPACING.md,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: SPACING.md,
        gap: SPACING.sm,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    infoIcon: {
        width: 36,
        height: 36,
        borderRadius: RADIUS.sm,
        backgroundColor: COLORS.purple + '22',
        alignItems: 'center',
        justifyContent: 'center',
    },
    infoContent: { flex: 1 },
    infoLabel: {
        color: COLORS.textSecondary,
        fontSize: FONTS.size.xs,
        letterSpacing: 1,
    },
    infoValue: {
        color: COLORS.textPrimary,
        fontSize: FONTS.size.md,
        fontWeight: '600',
        marginTop: 2,
        textTransform: 'capitalize',
    },
    signOutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.sm,
        backgroundColor: COLORS.red,
        marginHorizontal: SPACING.md,
        height: 52,
        borderRadius: RADIUS.md,
        marginTop: SPACING.sm,
    },
    signOutText: {
        color: COLORS.white,
        fontSize: FONTS.size.md,
        fontWeight: '800',
        letterSpacing: 1,
    },
});