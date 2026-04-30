import { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    ScrollView,
    Vibration,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
    doc,
    getDoc,
    collection,
    query,
    where,
    getDocs,
    addDoc,
    updateDoc,
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';
import { COLORS, FONTS, SPACING, RADIUS } from '../../constants/theme';

type MealType = 'lunch' | 'dinner' | 'snack' | 'breakfast';

interface TeamData {
    id: string;
    teamName: string;
    membersExpected: number;
    membersArrived: number;
    checkInStatus: string;
    tableNumber?: string;
    mentorName?: string;
}

interface MealStatus {
    lunch: boolean;
    dinner: boolean;
    snack: boolean;
    breakfast: boolean;
}

const MEAL_CONFIG: Record<
    MealType,
    { label: string; color: string; icon: string }
> = {
    lunch: { label: 'Lunch', color: COLORS.orange, icon: 'sunny-outline' },
    dinner: { label: 'Dinner', color: COLORS.purple, icon: 'moon-outline' },
    snack: { label: 'Snacks', color: COLORS.green, icon: 'cafe-outline' },
    breakfast: { label: 'Breakfast', color: COLORS.yellow, icon: 'partly-sunny-outline' },
};

export default function Scanner() {
    const { user, userData } = useAuth();
    const [permission, requestPermission] = useCameraPermissions();
    const [scanning, setScanning] = useState(true);
    const [loading, setLoading] = useState(false);
    const [scannedTeam, setScannedTeam] = useState<TeamData | null>(null);
    const [mealStatus, setMealStatus] = useState<MealStatus>({
        lunch: false,
        dinner: false,
        snack: false,
        breakfast: false,
    });
    const [teamRequests, setTeamRequests] = useState<any[]>([]);
    const [torch, setTorch] = useState(false);
    const lastScanned = useRef<string>('');
    const cooldown = useRef(false);

    const handleBarCodeScanned = async ({ data }: { data: string }) => {
        if (cooldown.current || !scanning) return;
        if (data === lastScanned.current) return;

        cooldown.current = true;
        lastScanned.current = data;
        setScanning(false);
        setLoading(true);

        // Haptic feedback
        await Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Success
        );

        try {
            // data should be teamId
            const teamSnap = await getDoc(doc(db, 'teams', data));

            if (!teamSnap.exists()) {
                Alert.alert(
                    '❌ Invalid QR',
                    'This QR code does not match any team.',
                    [{ text: 'Scan Again', onPress: resetScanner }]
                );
                setLoading(false);
                return;
            }

            const team = { id: teamSnap.id, ...teamSnap.data() } as TeamData;
            setScannedTeam(team);

            // Check meal & pass status
            await checkTeamData(data);
        } catch (e) {
            Alert.alert('Error', 'Failed to fetch team data. Check connection.', [
                { text: 'Retry', onPress: resetScanner },
            ]);
        } finally {
            setLoading(false);
            setTimeout(() => {
                cooldown.current = false;
            }, 2000);
        }
    };

    const checkTeamData = async (teamId: string) => {
        try {
            // Meals
            const qMeals = query(collection(db, 'meals'), where('teamId', '==', teamId));
            const snapMeals = await getDocs(qMeals);
            const served: MealStatus = { lunch: false, dinner: false, snack: false, breakfast: false };
            snapMeals.docs.forEach((d) => {
                const mealType = d.data().mealType as MealType;
                if (mealType in served) served[mealType] = true;
            });
            setMealStatus(served);

            // Passes
            const qReq = query(collection(db, 'help_requests'), where('teamId', '==', teamId), where('status', 'in', ['pending', 'active']));
            const snapReq = await getDocs(qReq);
            setTeamRequests(snapReq.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (e) {
            console.error('Data check failed:', e);
        }
    };

    const updateRequestStatus = async (reqId: string, newStatus: string) => {
        try {
            const updateData: any = { status: newStatus };
            if (newStatus === 'active') {
                updateData.volunteerId = user?.uid;
                updateData.volunteerName = userData?.name || 'Volunteer';
                updateData.activatedAt = Date.now();
            }
            if (newStatus === 'resolved') {
                updateData.resolvedAt = Date.now();
            }
            await updateDoc(doc(db, 'help_requests', reqId), updateData);
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setTeamRequests(prev => prev.map(r => r.id === reqId ? { ...r, status: newStatus } : r).filter(r => r.status !== 'resolved'));
            Alert.alert('✅ Success', `Pass marked as ${newStatus}`);
        } catch {
            Alert.alert('Error', 'Failed to update pass status.');
        }
    };

    const grantMeal = async (mealType: MealType) => {
        if (!scannedTeam) return;

        if (mealStatus[mealType]) {
            Alert.alert(
                '⚠️ Already Served',
                `${scannedTeam.teamName} has already received ${mealType}.`,
                [{ text: 'OK' }]
            );
            return;
        }

        try {
            await addDoc(collection(db, 'meals'), {
                teamId: scannedTeam.id,
                teamName: scannedTeam.teamName,
                mealType,
                servedBy: user?.uid,
                servedByName: userData?.name || 'Volunteer',
                timestamp: Date.now(),
            });

            await Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success
            );

            setMealStatus((prev) => ({ ...prev, [mealType]: true }));
            Alert.alert(
                '✅ Meal Granted',
                `${MEAL_CONFIG[mealType].label} marked for ${scannedTeam.teamName}`
            );
        } catch {
            Alert.alert('Error', 'Failed to record meal. Try again.');
        }
    };

    const markArrived = async () => {
        if (!scannedTeam) return;
        try {
            await updateDoc(doc(db, 'teams', scannedTeam.id), {
                checkInStatus: 'Checked In',
                membersArrived: scannedTeam.membersExpected || 1,
            });
            await Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success
            );
            setScannedTeam((prev) =>
                prev ? { ...prev, checkInStatus: 'Checked In' } : prev
            );
            Alert.alert('✅ Checked In', `${scannedTeam.teamName} marked as arrived!`);
        } catch {
            Alert.alert('Error', 'Failed to update check-in status.');
        }
    };

    const resetScanner = () => {
        setScannedTeam(null);
        setMealStatus({ lunch: false, dinner: false, snack: false, breakfast: false });
        setTeamRequests([]);
        lastScanned.current = '';
        setScanning(true);
    };

    if (!permission) {
        return (
            <View style={styles.loader}>
                <ActivityIndicator color={COLORS.purple} size="large" />
            </View>
        );
    }

    if (!permission.granted) {
        return (
            <View style={styles.permissionScreen}>
                <Ionicons name="camera-outline" size={64} color={COLORS.textSecondary} />
                <Text style={styles.permissionTitle}>Camera Access Needed</Text>
                <Text style={styles.permissionSub}>
                    We need camera access to scan participant QR codes
                </Text>
                <TouchableOpacity
                    style={styles.permissionBtn}
                    onPress={requestPermission}
                >
                    <Text style={styles.permissionBtnText}>Grant Permission</Text>
                </TouchableOpacity>
            </View>
        );
    }

    // ── Team Details View ──
    if (scannedTeam) {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Team Details</Text>
                    <TouchableOpacity onPress={resetScanner} style={styles.rescanBtn}>
                        <Ionicons name="scan-outline" size={18} color={COLORS.purple} />
                        <Text style={styles.rescanText}>Rescan</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={styles.content}>
                    {/* Team Card */}
                    <View style={styles.teamCard}>
                        <View style={styles.teamCardTop}>
                            <View style={styles.teamAvatar}>
                                <Text style={styles.teamAvatarText}>
                                    {(scannedTeam.teamName || '?').charAt(0).toUpperCase()}
                                </Text>
                            </View>
                            <View style={styles.teamInfo}>
                                <Text style={styles.teamName}>{scannedTeam.teamName}</Text>
                                {scannedTeam.tableNumber && (
                                    <Text style={styles.teamMeta}>
                                        Table {scannedTeam.tableNumber}
                                    </Text>
                                )}
                                {scannedTeam.mentorName && (
                                    <Text style={styles.teamMeta}>
                                        Mentor: {scannedTeam.mentorName}
                                    </Text>
                                )}
                            </View>
                            <View
                                style={[
                                    styles.statusBadge,
                                    {
                                        backgroundColor:
                                            scannedTeam.checkInStatus === 'Checked In'
                                                ? COLORS.green + '22'
                                                : COLORS.orange + '22',
                                    },
                                ]}
                            >
                                <View
                                    style={[
                                        styles.statusDot,
                                        {
                                            backgroundColor:
                                                scannedTeam.checkInStatus === 'Checked In'
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
                                                scannedTeam.checkInStatus === 'Checked In'
                                                    ? COLORS.green
                                                    : COLORS.orange,
                                        },
                                    ]}
                                >
                                    {scannedTeam.checkInStatus === 'Checked In'
                                        ? 'CHECKED IN'
                                        : 'NOT CHECKED IN'}
                                </Text>
                            </View>
                        </View>

                        {/* Members */}
                        <View style={styles.membersRow}>
                            <View style={styles.memberStat}>
                                <Text style={styles.memberNum}>
                                    {scannedTeam.membersArrived ?? 0}
                                </Text>
                                <Text style={styles.memberLabel}>Arrived</Text>
                            </View>
                            <View style={styles.memberDivider} />
                            <View style={styles.memberStat}>
                                <Text style={styles.memberNum}>
                                    {scannedTeam.membersExpected ?? 0}
                                </Text>
                                <Text style={styles.memberLabel}>Expected</Text>
                            </View>
                        </View>
                    </View>

                    {/* Check In Button */}
                    {scannedTeam.checkInStatus !== 'Checked In' && (
                        <TouchableOpacity
                            style={styles.checkInBtn}
                            onPress={markArrived}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="checkmark-circle" size={22} color={COLORS.white} />
                            <Text style={styles.checkInBtnText}>MARK AS ARRIVED</Text>
                        </TouchableOpacity>
                    )}

                    {/* Meal Management */}
                    <Text style={styles.sectionTitle}>MEAL MANAGEMENT</Text>
                    <View style={styles.mealsGrid}>
                        {(Object.keys(MEAL_CONFIG) as MealType[]).map((mealType) => {
                            const config = MEAL_CONFIG[mealType];
                            const isServed = mealStatus[mealType];
                            return (
                                <TouchableOpacity
                                    key={mealType}
                                    style={[
                                        styles.mealCard,
                                        isServed && styles.mealCardServed,
                                        { borderColor: isServed ? config.color + '66' : COLORS.border },
                                    ]}
                                    onPress={() => grantMeal(mealType)}
                                    activeOpacity={0.8}
                                >
                                    <View
                                        style={[
                                            styles.mealIcon,
                                            {
                                                backgroundColor: isServed
                                                    ? config.color + '33'
                                                    : COLORS.bgCardAlt,
                                            },
                                        ]}
                                    >
                                        <Ionicons
                                            name={config.icon as any}
                                            size={22}
                                            color={isServed ? config.color : COLORS.textSecondary}
                                        />
                                    </View>
                                    <Text
                                        style={[
                                            styles.mealLabel,
                                            { color: isServed ? config.color : COLORS.textPrimary },
                                        ]}
                                    >
                                        {config.label}
                                    </Text>
                                    <View
                                        style={[
                                            styles.mealStatus,
                                            {
                                                backgroundColor: isServed
                                                    ? config.color + '22'
                                                    : COLORS.bgCardAlt,
                                            },
                                        ]}
                                    >
                                        <Text
                                            style={[
                                                styles.mealStatusText,
                                                {
                                                    color: isServed
                                                        ? config.color
                                                        : COLORS.textSecondary,
                                                },
                                            ]}
                                        >
                                            {isServed ? '✓ SERVED' : 'GRANT'}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    {/* Pass Management */}
                    {teamRequests.filter(r => r.type === 'pass_game' || r.type === 'pass_restroom').length > 0 && (
                        <>
                            <Text style={[styles.sectionTitle, { marginTop: SPACING.lg }]}>ACTIVE PASSES</Text>
                            <View style={styles.mealsGrid}>
                                {teamRequests.filter(r => r.type === 'pass_game' || r.type === 'pass_restroom').map(req => {
                                    const isGame = req.type === 'pass_game';
                                    const isActive = req.status === 'active';
                                    const color = isGame ? COLORS.orange : COLORS.purple;
                                    const icon = isGame ? 'game-controller' : 'bed';
                                    
                                    return (
                                        <TouchableOpacity
                                            key={req.id}
                                            style={[
                                                styles.mealCard,
                                                { borderColor: color + '66' }
                                            ]}
                                            onPress={() => updateRequestStatus(req.id, isActive ? 'resolved' : 'active')}
                                            activeOpacity={0.8}
                                        >
                                            <View style={[styles.mealIcon, { backgroundColor: color + '33' }]}>
                                                <Ionicons name={icon as any} size={22} color={color} />
                                            </View>
                                            <View style={{ flex: 1, marginLeft: SPACING.sm }}>
                                                <Text style={[styles.mealLabel, { color: COLORS.textPrimary }]} numberOfLines={1}>
                                                    {isGame ? 'Game Room' : 'Rest Area'}
                                                </Text>
                                                <Text style={{ fontSize: 10, color: COLORS.textSecondary }}>{req.userName}</Text>
                                            </View>
                                            <View style={[styles.mealStatus, { backgroundColor: color + '22' }]}>
                                                <Text style={[styles.mealStatusText, { color }]}>
                                                    {isActive ? 'RETURN' : 'GRANT'}
                                                </Text>
                                            </View>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </>
                    )}

                    {/* Scan Again */}
                    <TouchableOpacity
                        style={styles.scanAgainBtn}
                        onPress={resetScanner}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="scan-outline" size={20} color={COLORS.purple} />
                        <Text style={styles.scanAgainText}>SCAN ANOTHER TEAM</Text>
                    </TouchableOpacity>
                </ScrollView>
            </View>
        );
    }

    // ── Camera View ──
    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>QR Scanner</Text>
                <TouchableOpacity
                    onPress={() => setTorch(!torch)}
                    style={styles.torchBtn}
                >
                    <Ionicons
                        name={torch ? 'flashlight' : 'flashlight-outline'}
                        size={22}
                        color={torch ? COLORS.yellow : COLORS.textSecondary}
                    />
                </TouchableOpacity>
            </View>

            <View style={styles.cameraContainer}>
                <CameraView
                    style={styles.camera}
                    facing="back"
                    enableTorch={torch}
                    onBarcodeScanned={scanning ? handleBarCodeScanned : undefined}
                    barcodeScannerSettings={{
                        barcodeTypes: ['qr'],
                    }}
                />
                {/* Overlay moved outside CameraView for compatibility */}
                <View style={[styles.overlay, StyleSheet.absoluteFillObject]} pointerEvents="none">
                    {/* Top mask */}
                    <View style={styles.overlayTop} />
                    <View style={styles.overlayMiddle}>
                        <View style={styles.overlaySide} />
                        {/* Scan frame */}
                        <View style={styles.scanFrame}>
                            {/* Corners */}
                            <View style={[styles.corner, styles.cornerTL]} />
                            <View style={[styles.corner, styles.cornerTR]} />
                            <View style={[styles.corner, styles.cornerBL]} />
                            <View style={[styles.corner, styles.cornerBR]} />
                            {loading && (
                                <ActivityIndicator
                                    color={COLORS.purple}
                                    size="large"
                                    style={styles.scanLoader}
                                />
                            )}
                        </View>
                        <View style={styles.overlaySide} />
                    </View>
                    {/* Bottom mask */}
                    <View style={styles.overlayBottom}>
                        <Text style={styles.scanHint}>
                            Point camera at participant QR code
                        </Text>
                    </View>
                </View>
            </View>
        </View>
    );
}

const FRAME_SIZE = 260;
const CORNER_SIZE = 28;
const CORNER_WIDTH = 4;

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
    torchBtn: {
        padding: SPACING.sm,
        backgroundColor: COLORS.bgCard,
        borderRadius: RADIUS.sm,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    rescanBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: SPACING.sm,
        paddingVertical: SPACING.xs,
        backgroundColor: COLORS.purple + '22',
        borderRadius: RADIUS.sm,
        borderWidth: 1,
        borderColor: COLORS.purple + '44',
    },
    rescanText: {
        color: COLORS.purple,
        fontSize: FONTS.size.sm,
        fontWeight: '700',
    },

    // Camera
    cameraContainer: { flex: 1 },
    camera: { flex: 1 },
    overlay: { flex: 1 },
    overlayTop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    overlayMiddle: { flexDirection: 'row' },
    overlaySide: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    overlayBottom: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        alignItems: 'center',
        justifyContent: 'flex-start',
        paddingTop: SPACING.lg,
    },
    scanFrame: {
        width: FRAME_SIZE,
        height: FRAME_SIZE,
        position: 'relative',
    },
    corner: {
        position: 'absolute',
        width: CORNER_SIZE,
        height: CORNER_SIZE,
        borderColor: COLORS.purple,
    },
    cornerTL: {
        top: 0,
        left: 0,
        borderTopWidth: CORNER_WIDTH,
        borderLeftWidth: CORNER_WIDTH,
        borderTopLeftRadius: 4,
    },
    cornerTR: {
        top: 0,
        right: 0,
        borderTopWidth: CORNER_WIDTH,
        borderRightWidth: CORNER_WIDTH,
        borderTopRightRadius: 4,
    },
    cornerBL: {
        bottom: 0,
        left: 0,
        borderBottomWidth: CORNER_WIDTH,
        borderLeftWidth: CORNER_WIDTH,
        borderBottomLeftRadius: 4,
    },
    cornerBR: {
        bottom: 0,
        right: 0,
        borderBottomWidth: CORNER_WIDTH,
        borderRightWidth: CORNER_WIDTH,
        borderBottomRightRadius: 4,
    },
    scanLoader: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        marginTop: -18,
        marginLeft: -18,
    },
    scanHint: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: FONTS.size.sm,
        textAlign: 'center',
    },

    // Team details
    content: { padding: SPACING.md, paddingBottom: 100 },
    teamCard: {
        backgroundColor: COLORS.bgCard,
        borderRadius: RADIUS.lg,
        padding: SPACING.md,
        borderWidth: 1,
        borderColor: COLORS.border,
        marginBottom: SPACING.md,
    },
    teamCardTop: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: SPACING.sm,
        marginBottom: SPACING.md,
    },
    teamAvatar: {
        width: 52,
        height: 52,
        borderRadius: RADIUS.md,
        backgroundColor: COLORS.purple + '33',
        alignItems: 'center',
        justifyContent: 'center',
    },
    teamAvatarText: {
        color: COLORS.purple,
        fontSize: FONTS.size.xl,
        fontWeight: '900',
    },
    teamInfo: { flex: 1 },
    teamName: {
        color: COLORS.textPrimary,
        fontSize: FONTS.size.lg,
        fontWeight: '800',
    },
    teamMeta: {
        color: COLORS.textSecondary,
        fontSize: FONTS.size.sm,
        marginTop: 2,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: SPACING.sm,
        paddingVertical: SPACING.xs,
        borderRadius: RADIUS.sm,
    },
    statusDot: { width: 7, height: 7, borderRadius: 4 },
    statusText: { fontSize: FONTS.size.xs, fontWeight: '800' },
    membersRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        paddingTop: SPACING.md,
        gap: SPACING.lg,
    },
    memberStat: { alignItems: 'center', flex: 1 },
    memberNum: {
        color: COLORS.textPrimary,
        fontSize: FONTS.size.xxl,
        fontWeight: '900',
    },
    memberLabel: {
        color: COLORS.textSecondary,
        fontSize: FONTS.size.xs,
        marginTop: 2,
    },
    memberDivider: {
        width: 1,
        height: 40,
        backgroundColor: COLORS.border,
    },

    // Check in
    checkInBtn: {
        backgroundColor: COLORS.green,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 52,
        borderRadius: RADIUS.md,
        gap: SPACING.sm,
        marginBottom: SPACING.md,
    },
    checkInBtnText: {
        color: COLORS.white,
        fontSize: FONTS.size.md,
        fontWeight: '800',
        letterSpacing: 1,
    },

    // Meals
    sectionTitle: {
        color: COLORS.textSecondary,
        fontSize: FONTS.size.xs,
        letterSpacing: 2,
        fontWeight: '700',
        marginBottom: SPACING.md,
    },
    mealsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SPACING.sm,
        marginBottom: SPACING.md,
    },
    mealCard: {
        width: '47.5%',
        backgroundColor: COLORS.bgCard,
        borderRadius: RADIUS.md,
        padding: SPACING.md,
        borderWidth: 1,
        alignItems: 'center',
        gap: SPACING.xs,
    },
    mealCardServed: { backgroundColor: COLORS.bgCardAlt },
    mealIcon: {
        width: 48,
        height: 48,
        borderRadius: RADIUS.md,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.xs,
    },
    mealLabel: {
        fontSize: FONTS.size.md,
        fontWeight: '700',
    },
    mealStatus: {
        paddingHorizontal: SPACING.sm,
        paddingVertical: 4,
        borderRadius: RADIUS.sm,
        marginTop: SPACING.xs,
    },
    mealStatusText: {
        fontSize: FONTS.size.xs,
        fontWeight: '800',
        letterSpacing: 1,
    },

    // Scan again
    scanAgainBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.sm,
        borderWidth: 1.5,
        borderColor: COLORS.purple,
        borderRadius: RADIUS.md,
        height: 52,
        marginBottom: SPACING.md,
    },
    scanAgainText: {
        color: COLORS.purple,
        fontSize: FONTS.size.md,
        fontWeight: '800',
        letterSpacing: 1,
    },

    // Permissions
    permissionScreen: {
        flex: 1,
        backgroundColor: COLORS.bg,
        justifyContent: 'center',
        alignItems: 'center',
        padding: SPACING.xl,
        gap: SPACING.md,
    },
    permissionTitle: {
        color: COLORS.textPrimary,
        fontSize: FONTS.size.xl,
        fontWeight: '800',
        textAlign: 'center',
    },
    permissionSub: {
        color: COLORS.textSecondary,
        fontSize: FONTS.size.md,
        textAlign: 'center',
        lineHeight: 24,
    },
    permissionBtn: {
        backgroundColor: COLORS.purple,
        paddingHorizontal: SPACING.xl,
        paddingVertical: SPACING.md,
        borderRadius: RADIUS.md,
        marginTop: SPACING.sm,
    },
    permissionBtnText: {
        color: COLORS.white,
        fontSize: FONTS.size.md,
        fontWeight: '800',
    },
});