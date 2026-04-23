import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { collection, doc, onSnapshot, orderBy, query, updateDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Button from '../../components/ui/Button';
import { COLORS, FONTS, RADIUS, SPACING } from '../../constants/theme';
import { db } from '../../firebase/config';

interface Team {
  id: string;
  name: string;
  score: number;
  judgingLocked?: boolean;
  criteriaScores?: {
    technical: number;
    innovation: number;
    design: number;
    presentation: number;
    scalability: number;
  };
}

export default function JudgingPanel() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);

  // Scoring States (1-10 scale for each of the 5 criteria)
  const [scores, setScores] = useState({
    technical: 0,
    innovation: 0,
    design: 0,
    presentation: 0,
    scalability: 0,
  });
  const [isSaving, setIsSaving] = useState(false);

  // Fetch teams ordered by score (Highest first = Live Leaderboard)
  useEffect(() => {
    const q = query(collection(db, 'teams'), orderBy('score', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Team[];
      setTeams(fetched);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Calculate Average out of 10
  const calculateTotal = () => {
    const sum = 
      scores.technical + 
      scores.innovation + 
      scores.design + 
      scores.presentation + 
      scores.scalability;
    
    return sum / 5; // Average of 5 categories
  };

  const openJudgingModal = (team: Team) => {
    if (team.judgingLocked) {
      Alert.alert('Locked', 'This team\'s score has been locked and cannot be edited.');
      return;
    }
    setSelectedTeam(team);
    // Pre-fill existing scores if they were saved previously, otherwise 0
    setScores(team.criteriaScores || { technical: 0, innovation: 0, design: 0, presentation: 0, scalability: 0 });
  };

  const adjustScore = (criterion: keyof typeof scores, increment: number) => {
    setScores(prev => {
      const newVal = prev[criterion] + increment;
      // Clamp between 0 and 10
      if (newVal < 0 || newVal > 10) return prev;
      return { ...prev, [criterion]: newVal };
    });
  };

  const saveScores = async (lock: boolean = false) => {
    if (!selectedTeam) return;
    setIsSaving(true);
    
    // Using Number() and toFixed(1) to avoid crazy long decimals in Firebase (e.g., 8.3333333 -> 8.3)
    const finalScore = Number(calculateTotal().toFixed(1));

    try {
      await updateDoc(doc(db, 'teams', selectedTeam.id), {
        score: finalScore,
        criteriaScores: scores,
        judgingLocked: lock,
      });
      
      setSelectedTeam(null);
    } catch (error) {
      Alert.alert('Error', 'Failed to save scores.');
    } finally {
      setIsSaving(false);
    }
  };

  const ScoreStepper = ({ label, weight, criterion }: { label: string, weight: string, criterion: keyof typeof scores }) => (
    <View style={styles.criteriaRow}>
      <View style={styles.criteriaInfo}>
        <Text style={styles.criteriaLabel}>{label}</Text>
        <Text style={styles.criteriaWeight}>{weight}</Text>
      </View>
      <View style={styles.stepperContainer}>
        <TouchableOpacity style={styles.stepBtn} onPress={() => adjustScore(criterion, -1)}>
          <Ionicons name="remove" size={20} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={styles.scoreValueBox}>
          <Text style={styles.scoreValue}>{scores[criterion]}/10</Text>
        </View>
        <TouchableOpacity style={styles.stepBtn} onPress={() => adjustScore(criterion, 1)}>
          <Ionicons name="add" size={20} color={COLORS.textPrimary} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + SPACING.sm }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
          <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Judging Panel</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Leaderboard & Teams List */}
      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: SPACING.xl }} />
      ) : (
        <FlatList
          data={teams}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item, index }) => (
            <TouchableOpacity 
              style={[styles.teamCard, item.judgingLocked && styles.lockedCard]}
              onPress={() => openJudgingModal(item)}
            >
              <View style={styles.rankBadge}>
                <Text style={styles.rankText}>#{index + 1}</Text>
              </View>
              
              <View style={styles.teamInfo}>
                <Text style={styles.teamName}>{item.name}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                  {item.judgingLocked ? (
                    <><Ionicons name="lock-closed" size={12} color="#E74C3C" /><Text style={[styles.statusText, { color: '#E74C3C' }]}>Locked</Text></>
                  ) : (
                    <><Ionicons name="pencil" size={12} color={COLORS.primary} /><Text style={[styles.statusText, { color: COLORS.primary }]}>Pending</Text></>
                  )}
                </View>
              </View>

              <View style={styles.totalScoreBox}>
                {/* Formats display score to show decimals like 8.4 */}
                <Text style={styles.totalScoreText}>{(item.score || 0).toFixed(1)}</Text>
                <Text style={styles.totalScoreLabel}>/ 10</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Judging Matrix Bottom Sheet */}
      <Modal 
        visible={selectedTeam !== null} 
        transparent 
        animationType="slide"
        onRequestClose={() => setSelectedTeam(null)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setSelectedTeam(null)} />
          
          <View style={styles.modalContent}>
            <View style={styles.modalDragHandle} />
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.evaluatingText}>Evaluating</Text>
                <Text style={styles.modalTeamName}>{selectedTeam?.name}</Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedTeam(null)}>
                <Ionicons name="close-circle" size={28} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.criteriaCard}>
                <ScoreStepper label="Tech Complexity" weight="Max 10 Points" criterion="technical" />
                <View style={styles.divider} />
                <ScoreStepper label="Innovation / Idea" weight="Max 10 Points" criterion="innovation" />
                <View style={styles.divider} />
                <ScoreStepper label="UI/UX Design" weight="Max 10 Points" criterion="design" />
                <View style={styles.divider} />
                <ScoreStepper label="Presentation" weight="Max 10 Points" criterion="presentation" />
                <View style={styles.divider} />
                <ScoreStepper label="Scalability" weight="Max 10 Points" criterion="scalability" />
              </View>

              {/* Live Calculator */}
              <View style={styles.calculatorBox}>
                <Text style={styles.calcLabel}>Calculated Average</Text>
                <Text style={styles.calcValue}>{calculateTotal().toFixed(1)} / 10</Text>
              </View>

              <View style={styles.actionRow}>
                <Button 
                  title="SAVE DRAFT" 
                  onPress={() => saveScores(false)} 
                  loading={isSaving}
                  style={styles.draftBtn}
                  textStyle={{ color: COLORS.primary }}
                />
                <Button 
                  title="LOCK SCORE" 
                  onPress={() => Alert.alert(
                    "Lock Score?", 
                    "Once locked, this score cannot be edited. Are you sure?", 
                    [{ text: "Cancel", style: "cancel" }, { text: "Lock It", style: "destructive", onPress: () => saveScores(true) }]
                  )} 
                  loading={isSaving}
                  style={styles.lockBtn}
                />
              </View>
            </ScrollView>
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
    paddingHorizontal: SPACING.lg, paddingBottom: SPACING.md,
    backgroundColor: COLORS.bgCard, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  iconButton: { padding: SPACING.xs },
  headerTitle: { fontSize: FONTS.size.lg, fontWeight: 'bold', color: COLORS.textPrimary },
  listContent: { padding: SPACING.lg, paddingBottom: SPACING.xl },

  teamCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.bgCard,
    padding: SPACING.md, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border,
    marginBottom: SPACING.sm,
  },
  lockedCard: { backgroundColor: '#F9F9F9', borderColor: '#E0E0E0' },
  rankBadge: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.bg,
    alignItems: 'center', justifyContent: 'center', marginRight: SPACING.md,
    borderWidth: 1, borderColor: COLORS.border,
  },
  rankText: { fontSize: FONTS.size.sm, fontWeight: 'bold', color: COLORS.textSecondary },
  teamInfo: { flex: 1 },
  teamName: { fontSize: FONTS.size.md, fontWeight: 'bold', color: COLORS.textPrimary },
  statusText: { fontSize: FONTS.size.xs, fontWeight: '600' },
  totalScoreBox: {
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#F1C40F1A',
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: RADIUS.sm,
  },
  totalScoreText: { fontSize: FONTS.size.lg, fontWeight: 'bold', color: '#F1C40F' },
  totalScoreLabel: { fontSize: 10, fontWeight: 'bold', color: '#F1C40F', marginTop: -2 },

  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: COLORS.bg, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl,
    paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm, paddingBottom: SPACING.xl, maxHeight: '95%',
  },
  modalDragHandle: { width: 40, height: 4, backgroundColor: COLORS.border, borderRadius: 2, alignSelf: 'center', marginBottom: SPACING.md },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.lg },
  evaluatingText: { fontSize: FONTS.size.xs, color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 1 },
  modalTeamName: { fontSize: FONTS.size.xl, fontWeight: '800', color: COLORS.textPrimary },
  
  criteriaCard: { backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border },
  criteriaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: SPACING.xs },
  criteriaInfo: { flex: 1 },
  criteriaLabel: { fontSize: FONTS.size.md, fontWeight: 'bold', color: COLORS.textPrimary },
  criteriaWeight: { fontSize: FONTS.size.xs, color: COLORS.textSecondary, marginTop: 2 },
  stepperContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepBtn: {
    width: 36, height: 36, borderRadius: RADIUS.sm, backgroundColor: COLORS.bg,
    borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center',
  },
  scoreValueBox: { width: 44, alignItems: 'center' },
  scoreValue: { fontSize: FONTS.size.md, fontWeight: 'bold', color: COLORS.textPrimary },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: SPACING.sm },

  calculatorBox: {
    backgroundColor: '#F1C40F1A', borderRadius: RADIUS.md, padding: SPACING.lg,
    alignItems: 'center', marginTop: SPACING.lg, borderWidth: 1, borderColor: '#F1C40F4D',
  },
  calcLabel: { fontSize: FONTS.size.sm, color: '#B7950B', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  calcValue: { fontSize: FONTS.size.xl, fontWeight: '900', color: '#F1C40F' },

  actionRow: { flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.xl },
  draftBtn: { flex: 1, backgroundColor: '#E74C3C', borderWidth: 2, borderColor: COLORS.primary },
  lockBtn: { flex: 1, backgroundColor: '#E74C3C', borderColor: '#E74C3C' },
});