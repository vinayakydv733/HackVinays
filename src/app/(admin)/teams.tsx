import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    onSnapshot,
    orderBy,
    query,
    updateDoc,
    where
} from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { COLORS, FONTS, RADIUS, SPACING } from '../../constants/theme';
import { db } from '../../firebase/config';

export interface Team {
  id: string;
  name: string;
  mentorName?: string;
  projectSubmitted?: boolean;
  checkedIn?: boolean;
  score?: number;
  membersArrived?: number;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
}

export default function AdminTeams() {
  const router = useRouter();
  
  // Data States
  const [teams, setTeams] = useState<Team[]>([]);
  const [memberCounts, setMemberCounts] = useState<Record<string, number>>({});
  const [activePassCounts, setActivePassCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Add Team States
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  // Team Details States
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // Get live data for the currently selected team directly from the teams array
  const selectedTeam = teams.find(t => t.id === selectedTeamId) || null;

  // 1. Fetch ALL Teams in real-time
  useEffect(() => {
    const teamsRef = collection(db, 'teams');
    const q = query(teamsRef, orderBy('name', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedTeams = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Team[];
      setTeams(fetchedTeams);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching teams: ", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 2. Fetch all users to calculate member counts per team for the main screen
  useEffect(() => {
    const usersRef = collection(db, 'users');
    const unsubscribeUsers = onSnapshot(usersRef, (snapshot) => {
      const counts: Record<string, number> = {};
      
      snapshot.docs.forEach((doc) => {
        const teamName = doc.data().teamName;
        if (teamName) {
          counts[teamName] = (counts[teamName] || 0) + 1;
        }
      });
      
      setMemberCounts(counts);
    });

    return () => unsubscribeUsers();
  }, []);

  // 3. Fetch active passes to calculate how many members are currently away
  useEffect(() => {
    const q = query(collection(db, 'passes'), where('status', '==', 'Active'));
    const unsubscribePasses = onSnapshot(q, (snapshot) => {
      const counts: Record<string, number> = {};
      snapshot.docs.forEach((doc) => {
        const tId = doc.data().teamId;
        if (tId) {
          counts[tId] = (counts[tId] || 0) + 1;
        }
      });
      setActivePassCounts(counts);
    });
    return () => unsubscribePasses();
  }, []);

  // 3. Fetch specific Members when a team is selected (for the modal)
  useEffect(() => {
    if (!selectedTeam?.name) return;
    setLoadingMembers(true);

    const q = query(collection(db, 'users'), where('teamName', '==', selectedTeam.name));
    const unsubscribeMembers = onSnapshot(q, (snapshot) => {
      const fetchedMembers = snapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name,
        email: doc.data().email,
      }));
      setTeamMembers(fetchedMembers);
      setLoadingMembers(false);
    });

    return () => unsubscribeMembers();
  }, [selectedTeam?.name]);

  // --- Actions ---

  const handleAddTeam = async () => {
    if (!newTeamName.trim()) {
      Alert.alert('Error', 'Please enter a team name');
      return;
    }
    setIsAdding(true);
    try {
      await addDoc(collection(db, 'teams'), {
        name: newTeamName.trim(),
        checkedIn: false,
        projectSubmitted: false,
        score: 0,
        membersArrived: 0,
        mentorName: '',
        createdAt: Date.now(),
      });
      setNewTeamName('');
      setShowAddModal(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to create team.');
    } finally {
      setIsAdding(false);
    }
  };

  const toggleCheckIn = async (value: boolean) => {
    if (!selectedTeam) return;
    try {
      await updateDoc(doc(db, 'teams', selectedTeam.id), { checkedIn: value });
    } catch (error) {
      Alert.alert('Error', 'Failed to update check-in status');
    }
  };

  const toggleSubmission = async (value: boolean) => {
    if (!selectedTeam) return;
    try {
      await updateDoc(doc(db, 'teams', selectedTeam.id), { projectSubmitted: value });
    } catch (error) {
      Alert.alert('Error', 'Failed to update submission status');
    }
  };

  const updateScore = async (increment: number) => {
    if (!selectedTeam) return;
    const newScore = Math.max(0, (selectedTeam.score || 0) + increment);
    try {
      await updateDoc(doc(db, 'teams', selectedTeam.id), { score: newScore });
    } catch (error) {
      Alert.alert('Error', 'Failed to update score');
    }
  };

  const updateMembersArrived = async (increment: number) => {
    if (!selectedTeam) return;
    const newCount = Math.max(0, (selectedTeam.membersArrived || 0) + increment);
    try {
      await updateDoc(doc(db, 'teams', selectedTeam.id), { membersArrived: newCount });
    } catch (error) {
      Alert.alert('Error', 'Failed to update member count');
    }
  };

  const handleDeleteTeam = () => {
    if (!selectedTeam) return;
    Alert.alert(
      'Delete Team',
      `Delete ${selectedTeam.name}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'teams', selectedTeam.id));
              setSelectedTeamId(null);
            } catch (error) {
              Alert.alert('Error', 'Failed to delete team');
            }
          }
        }
      ]
    );
  };

  const filteredTeams = teams.filter((team) =>
    team.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={styles.container}>
      {/* --- Main Screen Header --- */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
          <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Teams</Text>
        <TouchableOpacity onPress={() => setShowAddModal(true)} style={styles.iconButton}>
          <Ionicons name="add-circle" size={28} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={COLORS.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search teams by name..."
          placeholderTextColor={COLORS.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* --- Main Teams List --- */}
      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: SPACING.xl }} />
      ) : (
        <FlatList
          data={filteredTeams}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="cube-outline" size={48} color={COLORS.border} />
              <Text style={styles.emptyText}>No teams found.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.teamCard}
              onPress={() => setSelectedTeamId(item.id)} // Open details modal
            >
              <View style={styles.cardHeader}>
                {/* Team Name and Member Count */}
                <View style={styles.teamInfoCol}>
                  <Text style={styles.teamName} numberOfLines={1}>{item.name}</Text>
                  <View style={styles.memberCountRow}>
                    <Ionicons name="people" size={14} color={COLORS.textSecondary} />
                    <Text style={styles.memberCountText}>
                      {Math.max(0, (item.membersArrived || 0) - (activePassCounts[item.id] || 0))} / {memberCounts[item.name] || 0} Present
                    </Text>
                  </View>
                </View>

                {/* Score */}
                <View style={styles.scoreBadge}>
                  <Ionicons name="star" size={12} color="#F1C40F" />
                  <Text style={styles.scoreText}>{item.score || 0}</Text>
                </View>
              </View>
              
              <View style={styles.statusRow}>
                <View style={[styles.statusBadge, item.checkedIn ? styles.badgeSuccess : styles.badgeWarning]}>
                  <Text style={[styles.statusText, { color: item.checkedIn ? "#2ECC71" : "#F39C12" }]}>
                    {item.checkedIn ? "Checked In" : "Pending"}
                  </Text>
                </View>
                <View style={[styles.statusBadge, item.projectSubmitted ? styles.badgePrimary : styles.badgeNeutral]}>
                  <Text style={[styles.statusText, { color: item.projectSubmitted ? COLORS.primary : COLORS.textSecondary }]}>
                    {item.projectSubmitted ? "Submitted" : "Working"}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      {/* --- 1. Add New Team Modal --- */}
      <Modal visible={showAddModal} transparent animationType="fade">
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.addModalContent}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Create New Team</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
            <Input
              label="Team Name"
              value={newTeamName}
              onChangeText={setNewTeamName}
              placeholder="e.g. Cyber Ninjas"
            />
            <Button title="ADD TEAM" onPress={handleAddTeam} loading={isAdding} style={{ marginTop: SPACING.md }} />
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* --- 2. Team Details & Members Modal (Bottom Sheet Style) --- */}
      <Modal 
        visible={selectedTeamId !== null} 
        transparent 
        animationType="slide"
        onRequestClose={() => setSelectedTeamId(null)}
      >
        <View style={styles.bottomSheetOverlay}>
          {/* Tapping outside closes the modal */}
          <TouchableOpacity style={styles.dismissArea} onPress={() => setSelectedTeamId(null)} />
          
          <View style={styles.bottomSheetContent}>
            {selectedTeam && (
              <>
                <View style={styles.modalDragHandle} />
                <View style={styles.modalHeaderRow}>
                  <Text style={styles.detailsTeamName}>{selectedTeam.name}</Text>
                  <TouchableOpacity onPress={() => setSelectedTeamId(null)}>
                    <Ionicons name="close-circle" size={28} color={COLORS.textSecondary} />
                  </TouchableOpacity>
                </View>

                {/* We use ScrollView inside the fixed-height modal safely */}
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: SPACING.xl }}>
                  
                  {/* Admin Controls */}
                  <Text style={styles.sectionTitle}>Admin Controls</Text>
                  <View style={styles.controlsCard}>
                    <View style={styles.controlRow}>
                      <Text style={styles.controlLabel}>Checked In</Text>
                      <Switch
                        value={selectedTeam.checkedIn || false}
                        onValueChange={toggleCheckIn}
                        trackColor={{ false: COLORS.border, true: '#2ECC71' }}
                      />
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.controlRow}>
                      <Text style={styles.controlLabel}>Project Submitted</Text>
                      <Switch
                        value={selectedTeam.projectSubmitted || false}
                        onValueChange={toggleSubmission}
                        trackColor={{ false: COLORS.border, true: COLORS.primary }}
                      />
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.controlRow}>
                      <Text style={styles.controlLabel}>Team Score</Text>
                      <View style={styles.scoreControls}>
                        <TouchableOpacity style={styles.scoreBtn} onPress={() => updateScore(-1)}>
                          <Ionicons name="remove" size={20} color={COLORS.textPrimary} />
                        </TouchableOpacity>
                        <Text style={styles.scoreValue}>{selectedTeam.score || 0}</Text>
                        <TouchableOpacity style={styles.scoreBtn} onPress={() => updateScore(1)}>
                          <Ionicons name="add" size={20} color={COLORS.textPrimary} />
                        </TouchableOpacity>
                      </View>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.controlRow}>
                      <Text style={styles.controlLabel}>Members Arrived</Text>
                      <View style={styles.scoreControls}>
                        <TouchableOpacity style={styles.scoreBtn} onPress={() => updateMembersArrived(-1)}>
                          <Ionicons name="remove" size={20} color={COLORS.textPrimary} />
                        </TouchableOpacity>
                        <Text style={styles.scoreValue}>{selectedTeam.membersArrived || 0}</Text>
                        <TouchableOpacity style={styles.scoreBtn} onPress={() => updateMembersArrived(1)}>
                          <Ionicons name="add" size={20} color={COLORS.textPrimary} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>

                  {/* Registered Members List */}
                  <Text style={[styles.sectionTitle, { marginTop: SPACING.lg }]}>
                    Registered Members ({teamMembers.length})
                  </Text>
                  {loadingMembers ? (
                    <ActivityIndicator size="small" color={COLORS.primary} style={{ margin: SPACING.lg }} />
                  ) : teamMembers.length === 0 ? (
                    <View style={styles.emptyCard}>
                      <Text style={styles.emptyText}>No participants have registered yet.</Text>
                    </View>
                  ) : (
                    teamMembers.map((member) => (
                      <View key={member.id} style={styles.memberCard}>
                        <View style={styles.memberAvatar}>
                          <Text style={styles.avatarText}>{member.name.charAt(0).toUpperCase()}</Text>
                        </View>
                        <View>
                          <Text style={styles.memberName}>{member.name}</Text>
                          <Text style={styles.memberEmail}>{member.email}</Text>
                        </View>
                      </View>
                    ))
                  )}

                  <Button 
                    title="DELETE TEAM" 
                    onPress={handleDeleteTeam}
                    style={styles.deleteBtn}
                  />
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, paddingTop: SPACING.xl + 10, paddingBottom: SPACING.md,
    backgroundColor: COLORS.bgCard, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  iconButton: { padding: SPACING.xs },
  headerTitle: { fontSize: FONTS.size.lg, fontWeight: 'bold', color: COLORS.textPrimary },
  searchContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.bgCard,
    margin: SPACING.lg, paddingHorizontal: SPACING.md, height: 50,
    borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border,
  },
  searchIcon: { marginRight: SPACING.sm },
  searchInput: { flex: 1, color: COLORS.textPrimary, fontSize: FONTS.size.md, height: '100%' },
  listContent: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xl, gap: SPACING.md },
  
  // --- Team Card Styles ---
  teamCard: {
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg, padding: SPACING.lg,
    borderWidth: 1, borderColor: COLORS.border,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: SPACING.md },
  teamInfoCol: { flex: 1, paddingRight: SPACING.md },
  teamName: { fontSize: FONTS.size.lg, fontWeight: 'bold', color: COLORS.textPrimary },
  memberCountRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4 },
  memberCountText: { fontSize: FONTS.size.xs, color: COLORS.textSecondary, fontWeight: '500' },
  
  scoreBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1C40F1A', paddingHorizontal: SPACING.sm, paddingVertical: 4, borderRadius: RADIUS.sm, gap: 4 },
  scoreText: { fontSize: FONTS.size.sm, fontWeight: 'bold', color: '#F1C40F' },
  statusRow: { flexDirection: 'row', gap: SPACING.sm },
  statusBadge: { paddingHorizontal: SPACING.sm, paddingVertical: 6, borderRadius: RADIUS.sm, borderWidth: 1 },
  badgeSuccess: { backgroundColor: '#2ECC711A', borderColor: '#2ECC714D' },
  badgeWarning: { backgroundColor: '#F39C121A', borderColor: '#F39C124D' },
  badgePrimary: { backgroundColor: COLORS.primary + '1A', borderColor: COLORS.primary + '4D' },
  badgeNeutral: { backgroundColor: COLORS.border + '4D', borderColor: COLORS.border },
  statusText: { fontSize: FONTS.size.xs, fontWeight: '600' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingTop: SPACING.xl },
  emptyText: { marginTop: SPACING.md, color: COLORS.textSecondary, fontSize: FONTS.size.md },

  // --- Modal Styles ---
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: SPACING.lg },
  addModalContent: { backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg, padding: SPACING.lg, borderWidth: 1, borderColor: COLORS.border },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  modalTitle: { fontSize: FONTS.size.lg, fontWeight: 'bold', color: COLORS.textPrimary },
  
  // --- Bottom Sheet Styles (Details) ---
  bottomSheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  dismissArea: { flex: 1 },
  bottomSheetContent: {
    backgroundColor: COLORS.bg,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    maxHeight: '85%', 
  },
  modalDragHandle: { width: 40, height: 4, backgroundColor: COLORS.border, borderRadius: 2, alignSelf: 'center', marginBottom: SPACING.md },
  detailsTeamName: { fontSize: FONTS.size.xl, fontWeight: '800', color: COLORS.textPrimary },
  sectionTitle: { fontSize: FONTS.size.sm, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', marginBottom: SPACING.sm },
  controlsCard: { backgroundColor: COLORS.bgCard, borderRadius: RADIUS.md, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border },
  controlRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: SPACING.xs },
  controlLabel: { fontSize: FONTS.size.md, fontWeight: '600', color: COLORS.textPrimary },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: SPACING.sm },
  scoreControls: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  scoreBtn: { width: 36, height: 36, borderRadius: RADIUS.sm, backgroundColor: COLORS.bg, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  scoreValue: { fontSize: FONTS.size.lg, fontWeight: 'bold', color: COLORS.textPrimary, minWidth: 24, textAlign: 'center' },
  emptyCard: { backgroundColor: COLORS.bgCard, padding: SPACING.lg, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, borderStyle: 'dashed', alignItems: 'center' },
  memberCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.bgCard, padding: SPACING.md, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, marginBottom: SPACING.sm, gap: SPACING.md },
  memberAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary + '22', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: FONTS.size.md, fontWeight: 'bold', color: COLORS.primary },
  memberName: { fontSize: FONTS.size.md, fontWeight: '600', color: COLORS.textPrimary },
  memberEmail: { fontSize: FONTS.size.sm, color: COLORS.textSecondary },
  deleteBtn: { marginTop: SPACING.xl, backgroundColor: 'transparent', borderWidth: 1, borderColor: '#E74C3C' },
});