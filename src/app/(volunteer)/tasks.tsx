import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { collection, onSnapshot, doc, runTransaction, updateDoc, query } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { COLORS, FONTS, SPACING, RADIUS } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';

type TaskStatus = 'pending' | 'active' | 'resolved';
interface HelpRequest {
    id: string;
    type: string;
    status: TaskStatus;
    teamId: string;
    teamName: string;
    userId: string;
    userName: string;
    message?: string;
    volunteerId?: string;
    createdAt: number;
}

export default function Tasks() {
    const { user, userData } = useAuth();
    const [tasks, setTasks] = useState<HelpRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'pending' | 'mine' | 'resolved'>('pending');

    useEffect(() => {
        const unsub = onSnapshot(query(collection(db, 'help_requests')), (snap) => {
            const fetched = snap.docs.map(d => ({ id: d.id, ...d.data() } as HelpRequest));
            fetched.sort((a, b) => b.createdAt - a.createdAt);
            setTasks(fetched);
            setLoading(false);
        });
        return unsub;
    }, []);

    const claimTask = async (task: HelpRequest) => {
        try {
            await runTransaction(db, async (t) => {
                const ref = doc(db, 'help_requests', task.id);
                const snap = await t.get(ref);
                if (snap.data()?.status !== 'pending') throw new Error('Someone else beat you to it!');
                t.update(ref, { status: 'active', volunteerId: user?.uid, volunteerName: userData?.name || 'Volunteer' });
            });
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (e: any) {
            Alert.alert('Too slow!', e.message);
        }
    };

    const updateStatus = async (id: string, status: TaskStatus, volunteerId: string | null = null) => {
        try {
            const data: any = { status };
            if (volunteerId !== null) {
                data.volunteerId = volunteerId;
                data.volunteerName = userData?.name || 'Volunteer';
            }
            await updateDoc(doc(db, 'help_requests', id), data);
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        } catch {
            Alert.alert('Error', 'Failed to update task.');
        }
    };

    const filtered = tasks.filter((t) => {
        if (filter === 'pending') return t.status === 'pending';
        if (filter === 'mine') {
            // Show Tech/SOS claimed by ME
            const isMyTask = (t.type === 'tech' || t.type === 'sos') && t.status === 'active' && t.volunteerId === user?.uid;
            // Show ALL active passes so anyone can return them
            const isActivePass = (t.type === 'pass_game' || t.type === 'pass_restroom') && t.status === 'active';
            return isMyTask || isActivePass;
        }
        if (filter === 'resolved') return t.status === 'resolved';
        return false;
    });

    if (loading) return <View style={styles.loader}><ActivityIndicator size="large" color={COLORS.purple} /></View>;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Dispatch Board</Text>
                <Text style={styles.headerSub}>{tasks.filter(t => t.status === 'pending').length} pending requests</Text>
            </View>
            <View style={styles.filterRow}>
                {(['pending', 'mine', 'resolved'] as const).map(f => (
                    <TouchableOpacity key={f} onPress={() => setFilter(f)} style={[styles.filterBtn, filter === f && styles.filterBtnActive]}>
                        <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                            {f === 'mine' ? 'ACTIVE / MINE' : f.toUpperCase()}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
            <FlatList
                data={filtered}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.list}
                renderItem={({ item }) => {
                    const isPass = item.type === 'pass_game' || item.type === 'pass_restroom';

                    if (isPass) {
                        return (
                            <View style={[styles.taskCard, { borderColor: '#0ea5e9', backgroundColor: '#0ea5e911' }]}>
                                <View style={styles.taskTop}>
                                    <Text style={styles.taskTitle}>{item.type === 'pass_game' ? '🎮 GAME ROOM PASS' : '🚻 RESTROOM PASS'}</Text>
                                    <Text style={[styles.teamBadge, { color: '#0ea5e9' }]}>{item.teamName}</Text>
                                </View>
                                <Text style={[styles.userText, { color: '#0ea5e9' }]}>Requested by {item.userName}</Text>
                                
                                <View style={styles.actionRow}>
                                    {item.status === 'pending' && (
                                        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#0ea5e9' }]} onPress={() => updateStatus(item.id, 'active', user?.uid)}>
                                            <Text style={styles.actionText}>APPROVE PASS</Text>
                                        </TouchableOpacity>
                                    )}
                                    {item.status === 'active' && (
                                        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.green }]} onPress={() => updateStatus(item.id, 'resolved', user?.uid)}>
                                            <Text style={styles.actionText}>RETURN PASS</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </View>
                        );
                    }

                    return (
                        <View style={styles.taskCard}>
                            <View style={styles.taskTop}>
                                <Text style={styles.taskTitle}>{item.type.toUpperCase().replace('_', ' ')}</Text>
                                <Text style={styles.teamBadge}>{item.teamName}</Text>
                            </View>
                            {item.message && <Text style={styles.taskDesc}>{item.message}</Text>}
                            <Text style={styles.userText}>Requested by {item.userName}</Text>
                            
                            <View style={styles.actionRow}>
                                {item.status === 'pending' && (
                                    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.purple }]} onPress={() => claimTask(item)}>
                                        <Text style={styles.actionText}>CLAIM TASK</Text>
                                    </TouchableOpacity>
                                )}
                                {item.status === 'active' && item.volunteerId === user?.uid && (
                                    <>
                                        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.red }]} onPress={() => updateStatus(item.id, 'pending', null)}>
                                            <Text style={styles.actionText}>UNCLAIM</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.green }]} onPress={() => updateStatus(item.id, 'resolved')}>
                                            <Text style={styles.actionText}>MARK RESOLVED</Text>
                                        </TouchableOpacity>
                                    </>
                                )}
                            </View>
                        </View>
                    );
                }}
                ListEmptyComponent={<Text style={{textAlign: 'center', marginTop: 20, color: COLORS.textDim}}>No tasks here!</Text>}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    loader: { flex: 1, backgroundColor: COLORS.bg, justifyContent: 'center', alignItems: 'center' },
    container: { flex: 1, backgroundColor: COLORS.bg },
    header: { paddingTop: 56, padding: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
    headerTitle: { color: COLORS.textPrimary, fontSize: FONTS.size.xl, fontWeight: '800' },
    headerSub: { color: COLORS.textSecondary, fontSize: FONTS.size.xs, marginTop: 2 },
    filterRow: { flexDirection: 'row', padding: SPACING.md, gap: SPACING.sm, borderBottomWidth: 1, borderBottomColor: COLORS.border },
    filterBtn: { flex: 1, paddingVertical: SPACING.sm, borderRadius: RADIUS.sm, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
    filterBtnActive: { backgroundColor: COLORS.purple + '22', borderColor: COLORS.purple },
    filterText: { color: COLORS.textSecondary, fontSize: FONTS.size.xs, fontWeight: '700' },
    filterTextActive: { color: COLORS.purple },
    list: { padding: SPACING.md, paddingBottom: 100 },
    taskCard: { backgroundColor: COLORS.bgCard, borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm, borderWidth: 1, borderColor: COLORS.border },
    taskTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.xs },
    taskTitle: { color: COLORS.textPrimary, fontSize: FONTS.size.md, fontWeight: '700' },
    teamBadge: { color: COLORS.purple, fontSize: FONTS.size.xs, fontWeight: '700' },
    taskDesc: { color: COLORS.textSecondary, fontSize: FONTS.size.sm, marginBottom: SPACING.sm },
    userText: { color: COLORS.textDim, fontSize: FONTS.size.xs, marginBottom: SPACING.md },
    actionRow: { flexDirection: 'row', gap: SPACING.sm },
    actionBtn: { flex: 1, padding: SPACING.sm, borderRadius: RADIUS.sm, alignItems: 'center' },
    actionText: { color: COLORS.white, fontWeight: '700', fontSize: FONTS.size.xs }
});