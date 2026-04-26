import { Ionicons } from '@expo/vector-icons';
import {
    collection,
    deleteDoc,
    doc,
    onSnapshot,
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
import { db } from '../../firebase/config';

interface ScoreEntry {
  id: string;
  teamId: string;
  teamName: string;
  judgeId: string;
  judgeName: string;
  innovation: number;
  technical: number;
  presentation: number;
  impact: number;
  total: number;
  round: number;
  notes?: string;
  createdAt: number;
}

interface AggregatedTeam {
  teamId: string;
  teamName: string;
  avgTotal: number;
  rounds: number[];
  scores: ScoreEntry[];
  innovation: number;
  technical: number;
  presentation: number;
  impact: number;
}

const PODIUM_COLORS = [COLORS.yellow, COLORS.textSecondary, COLORS.orange];

export default function AdminLeaderboard() {
  const [scores, setScores] = useState<ScoreEntry[]>([]);
  const [aggregated, setAggregated] = useState<AggregatedTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);
  const [selectedRound, setSelectedRound] = useState<number | 'all'>('all');
  const [availableRounds, setAvailableRounds] = useState<number[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'scores'), (snap) => {
      const data = snap.docs.map(
        (d) => ({ id: d.id, ...d.data() } as ScoreEntry)
      );
      setScores(data);

      // Get available rounds
      const rounds = [...new Set(data.map((s) => s.round))].sort();
      setAvailableRounds(rounds);

      // Aggregate by team
      aggregateScores(data, selectedRound);
      setLoading(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    aggregateScores(scores, selectedRound);
  }, [selectedRound, scores]);

  const aggregateScores = (
    data: ScoreEntry[],
    round: number | 'all'
  ) => {
    const filtered =
      round === 'all' ? data : data.filter((s) => s.round === round);

    const teamMap: Record<string, AggregatedTeam> = {};

    filtered.forEach((s) => {
      if (!teamMap[s.teamId]) {
        teamMap[s.teamId] = {
          teamId: s.teamId,
          teamName: s.teamName,
          avgTotal: 0,
          rounds: [],
          scores: [],
          innovation: 0,
          technical: 0,
          presentation: 0,
          impact: 0,
        };
      }
      teamMap[s.teamId].scores.push(s);
      if (!teamMap[s.teamId].rounds.includes(s.round)) {
        teamMap[s.teamId].rounds.push(s.round);
      }
    });

    // Calculate averages
    const result = Object.values(teamMap).map((team) => {
      const count = team.scores.length;
      return {
        ...team,
        avgTotal:
          Math.round(
            (team.scores.reduce((sum, s) => sum + s.total, 0) / count) * 10
          ) / 10,
        innovation:
          Math.round(
            (team.scores.reduce((sum, s) => sum + (s.innovation || 0), 0) /
              count) *
              10
          ) / 10,
        technical:
          Math.round(
            (team.scores.reduce((sum, s) => sum + (s.technical || 0), 0) /
              count) *
              10
          ) / 10,
        presentation:
          Math.round(
            (team.scores.reduce(
              (sum, s) => sum + (s.presentation || 0),
              0
            ) /
              count) *
              10
          ) / 10,
        impact:
          Math.round(
            (team.scores.reduce((sum, s) => sum + (s.impact || 0), 0) /
              count) *
              10
          ) / 10,
      };
    });

    result.sort((a, b) => b.avgTotal - a.avgTotal);
    setAggregated(result);
  };

  const handleDeleteScore = (scoreId: string, teamName: string) => {
    Alert.alert(
      'Delete Score',
      `Delete this score entry for ${teamName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'scores', scoreId));
            } catch {
              Alert.alert('Error', 'Failed to delete score');
            }
          },
        },
      ]
    );
  };

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

  const top3 = aggregated.slice(0, 3);
  const rest = aggregated.slice(3);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Leaderboard</Text>
          <Text style={styles.headerSub}>
            {aggregated.length} teams · {scores.length} score entries
          </Text>
        </View>
        <View style={styles.headerBadge}>
          <Ionicons name="trophy" size={16} color={COLORS.orange} />
          <Text style={styles.headerBadgeText}>ADMIN</Text>
        </View>
      </View>

      <FlatList
        data={rest}
        keyExtractor={(item) => item.teamId}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <>
            {/* Title */}
            <Text style={styles.title}>LEADERBOARD</Text>
            <Text style={styles.subtitle}>
              Weighted average of all judging criteria
            </Text>

            {/* Round Filter */}
            <View style={styles.roundFilter}>
              <TouchableOpacity
                onPress={() => setSelectedRound('all')}
                style={[
                  styles.roundBtn,
                  selectedRound === 'all' && styles.roundBtnActive,
                ]}
              >
                <Text
                  style={[
                    styles.roundBtnText,
                    selectedRound === 'all' && styles.roundBtnTextActive,
                  ]}
                >
                  ALL
                </Text>
              </TouchableOpacity>
              {availableRounds.map((r) => (
                <TouchableOpacity
                  key={r}
                  onPress={() => setSelectedRound(r)}
                  style={[
                    styles.roundBtn,
                    selectedRound === r && styles.roundBtnActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.roundBtnText,
                      selectedRound === r && styles.roundBtnTextActive,
                    ]}
                  >
                    R{r}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Podium */}
            {top3.length > 0 && (
              <View style={styles.podium}>
                {/* 2nd */}
                {top3[1] && (
                  <View style={styles.podiumItem}>
                    <Text style={styles.podiumName} numberOfLines={1}>
                      {top3[1].teamName}
                    </Text>
                    <Text
                      style={[
                        styles.podiumScore,
                        { color: PODIUM_COLORS[1] },
                      ]}
                    >
                      {top3[1].avgTotal}
                    </Text>
                    <View
                      style={[
                        styles.podiumBlock,
                        {
                          height: 80,
                          backgroundColor:
                            COLORS.textSecondary + '22',
                          borderColor: COLORS.textSecondary + '44',
                        },
                      ]}
                    >
                      <Text style={styles.podiumRank}>2ND</Text>
                    </View>
                  </View>
                )}

                {/* 1st */}
                {top3[0] && (
                  <View style={styles.podiumItem}>
                    <Text style={styles.podiumName} numberOfLines={1}>
                      {top3[0].teamName}
                    </Text>
                    <Text
                      style={[
                        styles.podiumScore,
                        { color: PODIUM_COLORS[0] },
                      ]}
                    >
                      {top3[0].avgTotal}
                    </Text>
                    <View
                      style={[
                        styles.podiumBlock,
                        {
                          height: 110,
                          backgroundColor: COLORS.yellow + '22',
                          borderColor: COLORS.yellow + '44',
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

                {/* 3rd */}
                {top3[2] && (
                  <View style={styles.podiumItem}>
                    <Text style={styles.podiumName} numberOfLines={1}>
                      {top3[2].teamName}
                    </Text>
                    <Text
                      style={[
                        styles.podiumScore,
                        { color: PODIUM_COLORS[2] },
                      ]}
                    >
                      {top3[2].avgTotal}
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

            {/* Stats Summary */}
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={styles.statNum}>{aggregated.length}</Text>
                <Text style={styles.statLabel}>Teams</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNum}>{scores.length}</Text>
                <Text style={styles.statLabel}>Scores</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNum}>
                  {availableRounds.length}
                </Text>
                <Text style={styles.statLabel}>Rounds</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNum}>
                  {aggregated[0]?.avgTotal ?? '--'}
                </Text>
                <Text style={styles.statLabel}>Top Score</Text>
              </View>
            </View>

            {rest.length > 0 && (
              <Text style={styles.fullRankLabel}>FULL RANKINGS</Text>
            )}
          </>
        }
        renderItem={({ item, index }) => {
          const rank = index + 4;
          const isExpanded = expandedTeam === item.teamId;

          return (
            <View style={styles.rankCard}>
              {/* Main Row */}
              <TouchableOpacity
                onPress={() =>
                  setExpandedTeam(isExpanded ? null : item.teamId)
                }
                style={styles.rankRow}
                activeOpacity={0.8}
              >
                <Text style={styles.rankNum}>{rank}</Text>
                <View
                  style={[
                    styles.avatar,
                    { backgroundColor: getAvatarColor(index) },
                  ]}
                >
                  <Text style={styles.avatarText}>
                    {item.teamName.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.rankInfo}>
                  <Text style={styles.rankName} numberOfLines={1}>
                    {item.teamName}
                  </Text>
                  <Text style={styles.rankMeta}>
                    {item.scores.length} judge
                    {item.scores.length !== 1 ? 's' : ''} ·{' '}
                    {item.rounds
                      .sort()
                      .map((r) => `R${r}`)
                      .join(', ')}
                  </Text>
                </View>
                <Text style={styles.rankScore}>{item.avgTotal}</Text>
                <Ionicons
                  name={isExpanded ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={COLORS.textSecondary}
                />
              </TouchableOpacity>

              {/* Expanded Details */}
              {isExpanded && (
                <View style={styles.expanded}>
                  {/* Criteria Breakdown */}
                  <Text style={styles.expandedTitle}>
                    CRITERIA BREAKDOWN
                  </Text>
                  <View style={styles.criteriaGrid}>
                    {[
                      { label: 'Innovation', value: item.innovation, color: COLORS.purple },
                      { label: 'Technical',  value: item.technical,  color: COLORS.primary },
                      { label: 'Presentation', value: item.presentation, color: COLORS.orange },
                      { label: 'Impact',     value: item.impact,     color: COLORS.green },
                    ].map((c) => (
                      <View key={c.label} style={styles.criteriaItem}>
                        <Text
                          style={[
                            styles.criteriaValue,
                            { color: c.color },
                          ]}
                        >
                          {c.value}
                        </Text>
                        <Text style={styles.criteriaLabel}>
                          {c.label}
                        </Text>
                        {/* Bar */}
                        <View style={styles.barBg}>
                          <View
                            style={[
                              styles.barFill,
                              {
                                width: `${(c.value / 10) * 100}%`,
                                backgroundColor: c.color,
                              },
                            ]}
                          />
                        </View>
                      </View>
                    ))}
                  </View>

                  {/* Individual Score Entries */}
                  <Text style={styles.expandedTitle}>
                    JUDGE SCORES
                  </Text>
                  {item.scores
                    .sort((a, b) => b.round - a.round)
                    .map((s) => (
                      <View key={s.id} style={styles.judgeRow}>
                        <View style={styles.judgeInfo}>
                          <Text style={styles.judgeName}>
                            {s.judgeName}
                          </Text>
                          <Text style={styles.judgeMeta}>
                            Round {s.round}
                            {s.notes ? ` · ${s.notes}` : ''}
                          </Text>
                        </View>
                        <Text style={styles.judgeScore}>
                          {s.total}
                        </Text>
                        <TouchableOpacity
                          onPress={() =>
                            handleDeleteScore(s.id, item.teamName)
                          }
                          style={styles.deleteBtn}
                        >
                          <Ionicons
                            name="trash-outline"
                            size={16}
                            color={COLORS.red}
                          />
                        </TouchableOpacity>
                      </View>
                    ))}
                </View>
              )}
            </View>
          );
        }}
        ListEmptyComponent={
          aggregated.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons
                name="trophy-outline"
                size={48}
                color={COLORS.textDim}
              />
              <Text style={styles.emptyText}>No scores submitted yet</Text>
              <Text style={styles.emptySubText}>
                Scores will appear here once judges start rating projects
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    color: COLORS.textPrimary,
    fontSize: FONTS.size.xl,
    fontWeight: '800',
  },
  headerSub: {
    color: COLORS.textSecondary,
    fontSize: FONTS.size.xs,
    marginTop: 2,
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.orange + '22',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.orange + '44',
  },
  headerBadgeText: {
    color: COLORS.orange,
    fontSize: FONTS.size.xs,
    fontWeight: '700',
  },
  content: { padding: SPACING.md, paddingBottom: 100 },
  title: {
    color: COLORS.textPrimary,
    fontSize: FONTS.size.xxxl,
    fontWeight: '900',
    letterSpacing: 3,
    marginTop: SPACING.sm,
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: FONTS.size.sm,
    marginTop: 4,
    marginBottom: SPACING.md,
  },

  // Round filter
  roundFilter: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
    flexWrap: 'wrap',
  },
  roundBtn: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bgCard,
  },
  roundBtnActive: {
    borderColor: COLORS.orange,
    backgroundColor: COLORS.orange + '22',
  },
  roundBtnText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.size.sm,
    fontWeight: '700',
  },
  roundBtnTextActive: { color: COLORS.orange },

  // Podium
  podium: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    marginBottom: SPACING.lg,
    gap: SPACING.sm,
  },
  podiumItem: { alignItems: 'center', flex: 1 },
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
    minHeight: 65,
  },
  podiumRank: {
    color: COLORS.textSecondary,
    fontSize: FONTS.size.sm,
    fontWeight: '800',
    letterSpacing: 1,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statNum: {
    color: COLORS.orange,
    fontSize: FONTS.size.lg,
    fontWeight: '900',
  },
  statLabel: {
    color: COLORS.textSecondary,
    fontSize: FONTS.size.xs,
    marginTop: 2,
  },

  fullRankLabel: {
    color: COLORS.textSecondary,
    fontSize: FONTS.size.xs,
    letterSpacing: 3,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: SPACING.md,
  },

  // Rank cards
  rankCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    gap: SPACING.sm,
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
  rankInfo: { flex: 1 },
  rankName: {
    color: COLORS.textPrimary,
    fontSize: FONTS.size.md,
    fontWeight: '700',
  },
  rankMeta: {
    color: COLORS.textSecondary,
    fontSize: FONTS.size.xs,
    marginTop: 2,
  },
  rankScore: {
    color: COLORS.orange,
    fontSize: FONTS.size.lg,
    fontWeight: '900',
  },

  // Expanded
  expanded: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    padding: SPACING.md,
    backgroundColor: COLORS.bgCardAlt,
  },
  expandedTitle: {
    color: COLORS.textSecondary,
    fontSize: FONTS.size.xs,
    letterSpacing: 2,
    fontWeight: '700',
    marginBottom: SPACING.sm,
    marginTop: SPACING.xs,
  },
  criteriaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  criteriaItem: { width: '47%' },
  criteriaValue: {
    fontSize: FONTS.size.xl,
    fontWeight: '900',
  },
  criteriaLabel: {
    color: COLORS.textSecondary,
    fontSize: FONTS.size.xs,
    marginBottom: 4,
  },
  barBg: {
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 2,
  },
  judgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: SPACING.sm,
  },
  judgeInfo: { flex: 1 },
  judgeName: {
    color: COLORS.textPrimary,
    fontSize: FONTS.size.sm,
    fontWeight: '600',
  },
  judgeMeta: {
    color: COLORS.textSecondary,
    fontSize: FONTS.size.xs,
    marginTop: 2,
  },
  judgeScore: {
    color: COLORS.orange,
    fontSize: FONTS.size.lg,
    fontWeight: '900',
  },
  deleteBtn: {
    padding: SPACING.xs,
    backgroundColor: COLORS.red + '22',
    borderRadius: RADIUS.sm,
  },

  // Empty
  empty: {
    alignItems: 'center',
    paddingTop: 60,
    gap: SPACING.sm,
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.size.md,
    fontWeight: '700',
  },
  emptySubText: {
    color: COLORS.textDim,
    fontSize: FONTS.size.sm,
    textAlign: 'center',
    paddingHorizontal: SPACING.xl,
  },
});