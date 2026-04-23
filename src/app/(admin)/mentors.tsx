import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, updateDoc } from 'firebase/firestore';
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
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { COLORS, FONTS, RADIUS, SPACING } from '../../constants/theme';
import { db } from '../../firebase/config';

interface Mentor {
  id: string;
  name: string;
  expertise: string;
  createdAt: number;
}

interface Team {
  id: string;
  name: string;
  mentorName?: string;
}

export default function AdminMentors() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Add Mentor Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMentorName, setNewMentorName] = useState('');
  const [newExpertise, setNewExpertise] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  // Assign Team Modal
  const [assigningMentor, setAssigningMentor] = useState<Mentor | null>(null);

  // Post Advice Modal
  const [advisingMentor, setAdvisingMentor] = useState<Mentor | null>(null);
  const [adviceMessage, setAdviceMessage] = useState('');
  const [adviceTeamName, setAdviceTeamName] = useState('');
  const [isSendingAdvice, setIsSendingAdvice] = useState(false);

  // 1. Fetch Mentors
  useEffect(() => {
    const q = query(collection(db, 'mentors'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMentors(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Mentor[]);
    });
    return () => unsubscribe();
  }, []);

  // 2. Fetch Teams (to show assignments)
  useEffect(() => {
    const q = query(collection(db, 'teams'), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTeams(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Team[]);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Actions
  const handleAddMentor = async () => {
    if (!newMentorName.trim() || !newExpertise.trim()) {
      Alert.alert('Error', 'Please enter both name and expertise.');
      return;
    }
    setIsAdding(true);
    try {
      await addDoc(collection(db, 'mentors'), {
        name: newMentorName.trim(),
        expertise: newExpertise.trim(),
        createdAt: Date.now(),
      });
      setNewMentorName('');
      setNewExpertise('');
      setShowAddModal(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to add mentor.');
    } finally {
      setIsAdding(false);
    }
  };

  const handleAssignTeam = async (teamId: string, mentorName: string) => {
    try {
      await updateDoc(doc(db, 'teams', teamId), { mentorName });
      Alert.alert('Success', `Assigned to ${mentorName}`);
      setAssigningMentor(null);
    } catch (error) {
      Alert.alert('Error', 'Failed to assign team.');
    }
  };

  const handleSendAdvice = async () => {
    if (!adviceMessage.trim() || !adviceTeamName) {
      Alert.alert('Error', 'Please select a team and enter a message.');
      return;
    }
    setIsSendingAdvice(true);
    try {
      // Save to a new 'advice' collection that the Participant app will read
      await addDoc(collection(db, 'advice'), {
        mentorName: advisingMentor?.name,
        teamName: adviceTeamName,
        message: adviceMessage.trim(),
        createdAt: Date.now(),
      });
      setAdviceMessage('');
      setAdviceTeamName('');
      setAdvisingMentor(null);
      Alert.alert('Sent!', 'Advice sent to the team.');
    } catch (error) {
      Alert.alert('Error', 'Failed to send advice.');
    } finally {
      setIsSendingAdvice(false);
    }
  };

  const handleDeleteMentor = (id: string, name: string) => {
    Alert.alert('Delete Mentor', `Are you sure you want to remove ${name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
          await deleteDoc(doc(db, 'mentors', id));
        }
      }
    ]);
  };

  const filteredMentors = mentors.filter((m) =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.expertise.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + SPACING.sm }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
          <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mentors</Text>
        <TouchableOpacity onPress={() => setShowAddModal(true)} style={styles.iconButton}>
          <Ionicons name="person-add" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={COLORS.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search mentors..."
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

      {/* Mentors List */}
      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: SPACING.xl }} />
      ) : (
        <FlatList
          data={filteredMentors}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="school-outline" size={48} color={COLORS.border} />
              <Text style={styles.emptyText}>No mentors added yet.</Text>
            </View>
          }
          renderItem={({ item }) => {
            // Find teams currently assigned to this mentor
            const assignedTeams = teams.filter(t => t.mentorName === item.name);

            return (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.mentorName}>{item.name}</Text>
                    <Text style={styles.expertiseText}>{item.expertise}</Text>
                  </View>
                  <TouchableOpacity onPress={() => handleDeleteMentor(item.id, item.name)}>
                    <Ionicons name="trash-outline" size={20} color="#E74C3C" />
                  </TouchableOpacity>
                </View>

                <View style={styles.assignedSection}>
                  <Text style={styles.sectionLabel}>Assigned Teams ({assignedTeams.length})</Text>
                  {assignedTeams.length > 0 ? (
                    <View style={styles.tagsContainer}>
                      {assignedTeams.map(t => (
                        <View key={t.id} style={styles.teamTag}>
                          <Text style={styles.teamTagText}>{t.name}</Text>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <Text style={styles.noTeamsText}>None assigned</Text>
                  )}
                </View>

                <View style={styles.actionButtonsRow}>
                  <TouchableOpacity 
                    style={styles.actionBtnOutline} 
                    onPress={() => setAssigningMentor(item)}
                  >
                    <Ionicons name="link" size={16} color={COLORS.primary} />
                    <Text style={styles.actionBtnOutlineText}>Assign Team</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.actionBtnSolid} 
                    onPress={() => setAdvisingMentor(item)}
                  >
                    <Ionicons name="chatbubbles" size={16} color="#FFF" />
                    <Text style={styles.actionBtnSolidText}>Post Advice</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
      )}

      {/* Add Mentor Modal */}
      <Modal visible={showAddModal} transparent animationType="fade">
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Add Mentor</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
            <Input label="Full Name" value={newMentorName} onChangeText={setNewMentorName} placeholder="e.g. Sarah Smith" />
            <Input label="Domain / Expertise" value={newExpertise} onChangeText={setNewExpertise} placeholder="e.g. AI & Backend, Pitching" />
            <Button title="ADD MENTOR" onPress={handleAddMentor} loading={isAdding} style={{ marginTop: SPACING.md }} />
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Assign Team Modal (Bottom Sheet) */}
      <Modal visible={assigningMentor !== null} transparent animationType="slide" onRequestClose={() => setAssigningMentor(null)}>
        <View style={styles.bottomSheetOverlay}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setAssigningMentor(null)} />
          <View style={styles.bottomSheetContent}>
            <View style={styles.modalDragHandle} />
            <Text style={styles.sheetTitle}>Assign {assigningMentor?.name} to:</Text>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: SPACING.xl }}>
              {teams.map(team => (
                <TouchableOpacity 
                  key={team.id} 
                  style={styles.teamSelectBtn}
                  onPress={() => handleAssignTeam(team.id, assigningMentor!.name)}
                >
                  <Text style={styles.teamSelectText}>{team.name}</Text>
                  {team.mentorName === assigningMentor?.name && (
                    <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Post Advice Modal (Bottom Sheet) */}
      <Modal visible={advisingMentor !== null} transparent animationType="slide" onRequestClose={() => setAdvisingMentor(null)}>
        <KeyboardAvoidingView style={styles.bottomSheetOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setAdvisingMentor(null)} />
          <View style={styles.bottomSheetContent}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.sheetTitle}>Post Advice</Text>
              <TouchableOpacity onPress={() => setAdvisingMentor(null)}>
                <Ionicons name="close-circle" size={28} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.adviceSubtitle}>Posting on behalf of {advisingMentor?.name}</Text>

            <Text style={styles.label}>Select Target Team</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: SPACING.md, maxHeight: 40 }}>
              {teams.filter(t => t.mentorName === advisingMentor?.name).map(team => (
                <TouchableOpacity
                  key={team.id}
                  style={[styles.teamPill, adviceTeamName === team.name && styles.teamPillActive]}
                  onPress={() => setAdviceTeamName(team.name)}
                >
                  <Text style={[styles.teamPillText, adviceTeamName === team.name && { color: '#FFF' }]}>{team.name}</Text>
                </TouchableOpacity>
              ))}
              {teams.filter(t => t.mentorName === advisingMentor?.name).length === 0 && (
                <Text style={styles.noTeamsText}>Assign a team to this mentor first.</Text>
              )}
            </ScrollView>

            <Text style={styles.label}>Message</Text>
            <TextInput
              style={styles.textArea}
              value={adviceMessage}
              onChangeText={setAdviceMessage}
              placeholder="Type feedback, suggestions, or resources..."
              placeholderTextColor={COLORS.textSecondary}
              multiline
              textAlignVertical="top"
            />
            
            <Button 
              title="SEND ADVICE" 
              onPress={handleSendAdvice} 
              loading={isSendingAdvice} 
              style={{ marginTop: SPACING.md, marginBottom: SPACING.xl }} 
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  searchContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.bgCard,
    margin: SPACING.lg, paddingHorizontal: SPACING.md, height: 50,
    borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border,
  },
  searchIcon: { marginRight: SPACING.sm },
  searchInput: { flex: 1, color: COLORS.textPrimary, fontSize: FONTS.size.md, height: '100%' },
  listContent: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xl },

  card: {
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg, padding: SPACING.lg,
    borderWidth: 1, borderColor: COLORS.border, marginBottom: SPACING.md,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  mentorName: { fontSize: FONTS.size.lg, fontWeight: 'bold', color: COLORS.textPrimary },
  expertiseText: { fontSize: FONTS.size.sm, color: COLORS.textSecondary, marginTop: 2 },
  
  assignedSection: { marginTop: SPACING.md, paddingTop: SPACING.md, borderTopWidth: 1, borderTopColor: COLORS.border },
  sectionLabel: { fontSize: 10, fontWeight: 'bold', color: COLORS.textSecondary, textTransform: 'uppercase', marginBottom: SPACING.xs },
  tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
  teamTag: { backgroundColor: COLORS.bg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.border },
  teamTagText: { fontSize: FONTS.size.xs, fontWeight: '600', color: COLORS.textPrimary },
  noTeamsText: { fontSize: FONTS.size.sm, color: COLORS.textSecondary, fontStyle: 'italic' },

  actionButtonsRow: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.md },
  actionBtnOutline: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: SPACING.sm, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.primary,
  },
  actionBtnOutlineText: { fontSize: FONTS.size.xs, fontWeight: 'bold', color: COLORS.primary },
  actionBtnSolid: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: SPACING.sm, borderRadius: RADIUS.sm, backgroundColor: COLORS.primary,
  },
  actionBtnSolidText: { fontSize: FONTS.size.xs, fontWeight: 'bold', color: '#FFF' },

  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingTop: SPACING.xl },
  emptyText: { marginTop: SPACING.md, color: COLORS.textSecondary, fontSize: FONTS.size.md },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: SPACING.lg },
  modalContent: { backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg, padding: SPACING.lg, borderWidth: 1, borderColor: COLORS.border },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  modalTitle: { fontSize: FONTS.size.lg, fontWeight: 'bold', color: COLORS.textPrimary },

  bottomSheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  bottomSheetContent: {
    backgroundColor: COLORS.bg, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl,
    paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm, maxHeight: '80%',
  },
  modalDragHandle: { width: 40, height: 4, backgroundColor: COLORS.border, borderRadius: 2, alignSelf: 'center', marginBottom: SPACING.md },
  sheetTitle: { fontSize: FONTS.size.lg, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: SPACING.md },
  adviceSubtitle: { fontSize: FONTS.size.sm, color: COLORS.textSecondary, marginTop: -SPACING.sm, marginBottom: SPACING.md },
  
  teamSelectBtn: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: COLORS.bgCard, padding: SPACING.md, borderRadius: RADIUS.sm,
    borderWidth: 1, borderColor: COLORS.border, marginBottom: SPACING.sm,
  },
  teamSelectText: { fontSize: FONTS.size.md, fontWeight: '600', color: COLORS.textPrimary },

  label: { fontSize: FONTS.size.sm, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 8 },
  teamPill: {
    backgroundColor: COLORS.bgCard, paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs,
    borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, marginRight: SPACING.sm, height: 32, justifyContent: 'center'
  },
  teamPillActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  teamPillText: { fontSize: FONTS.size.xs, fontWeight: '600', color: COLORS.textPrimary },
  
  textArea: {
    backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: RADIUS.sm, padding: SPACING.md, fontSize: FONTS.size.md,
    color: COLORS.textPrimary, minHeight: 120,
  },
});