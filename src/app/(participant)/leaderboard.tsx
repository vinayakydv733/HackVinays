import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';

type TeamScore = {
  id: string;
  teamName: string;
  total: number;
  rounds: number[];
};

export default function LeaderboardScreen() {
  const [teams, setTeams] = useState<TeamScore[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen to judging_scores and aggregate per team
    const unsub = onSnapshot(collection(db, 'judging_scores'), (snap) => {
      const scoreMap: Record<string, TeamScore> = {};

      snap.docs.forEach(d => {
        const data = d.data();
        const teamId = data.teamId;
        const roundTotal = ((data.scores?.ux_design || 0) * 0.3)
          + ((data.scores?.technical || 0) * 0.4)
          + ((data.scores?.business || 0) * 0.3);

        if (!scoreMap[teamId]) {
          scoreMap[teamId] = { id: teamId, teamName: data.teamName || teamId, total: 0, rounds: [] };
        }
        scoreMap[teamId].total += roundTotal;
        scoreMap[teamId].rounds.push(parseFloat(roundTotal.toFixed(1)));
      });

      const sorted = Object.values(scoreMap).sort((a, b) => b.total - a.total);
      setTeams(sorted);
      setLoading(false);
    });
    return unsub;
  }, []);

  if (loading) return (
    <View style={{ flex: 1, backgroundColor: '#121212', justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color="#9d4edd" />
    </View>
  );

  const top3 = teams.slice(0, 3);
  const rest = teams.slice(3);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Live Leaderboard</Text>

      {teams.length === 0 ? (
        <View style={styles.empty}>
          <MaterialCommunityIcons name="trophy-outline" size={48} color="#333" />
          <Text style={styles.emptyText}>Scores appear here after judging starts</Text>
        </View>
      ) : (
        <>
          {/* Podium */}
          <View style={styles.podiumContainer}>
            {top3[1] && (
              <View style={[styles.podiumCol, { height: 140 }]}>
                <Text style={styles.podiumScore}>{top3[1].total.toFixed(1)}</Text>
                <View style={[styles.podiumBlock, { backgroundColor: '#333' }]}>
                  <Text style={styles.podiumRank}>2</Text>
                  <Text style={styles.podiumName} numberOfLines={1}>{top3[1].teamName}</Text>
                </View>
              </View>
            )}
            {top3[0] && (
              <View style={[styles.podiumCol, { height: 180 }]}>
                <MaterialCommunityIcons name="crown" size={32} color="#ffb703" style={{ marginBottom: 4 }} />
                <Text style={[styles.podiumScore, { color: '#ffb703' }]}>{top3[0].total.toFixed(1)}</Text>
                <View style={[styles.podiumBlock, { backgroundColor: '#9d4edd' }]}>
                  <Text style={[styles.podiumRank, { color: '#fff' }]}>1</Text>
                  <Text style={[styles.podiumName, { color: '#fff' }]} numberOfLines={1}>{top3[0].teamName}</Text>
                </View>
              </View>
            )}
            {top3[2] && (
              <View style={[styles.podiumCol, { height: 120 }]}>
                <Text style={styles.podiumScore}>{top3[2].total.toFixed(1)}</Text>
                <View style={[styles.podiumBlock, { backgroundColor: '#2a2a2a' }]}>
                  <Text style={styles.podiumRank}>3</Text>
                  <Text style={styles.podiumName} numberOfLines={1}>{top3[2].teamName}</Text>
                </View>
              </View>
            )}
          </View>

          {/* Full list */}
          <View style={styles.listContainer}>
            {teams.map((t, i) => (
              <View key={t.id} style={styles.row}>
                <View style={styles.rankBadge}>
                  <Text style={styles.rankText}>{i + 1}</Text>
                </View>
                <View style={styles.rowInfo}>
                  <Text style={styles.rowName}>{t.teamName}</Text>
                  <Text style={styles.sparklineText}>Rounds: {t.rounds.join(' · ')}</Text>
                </View>
                <Text style={styles.rowScore}>{t.total.toFixed(1)}</Text>
              </View>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  content: { padding: 16, paddingBottom: 100 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 32, textAlign: 'center' },
  empty: { alignItems: 'center', marginTop: 80 },
  emptyText: { color: '#555', marginTop: 12, fontSize: 15, textAlign: 'center' },
  podiumContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', marginBottom: 32 },
  podiumCol: { flex: 1, alignItems: 'center', marginHorizontal: 4 },
  podiumScore: { color: '#fff', fontWeight: 'bold', fontSize: 16, marginBottom: 8 },
  podiumBlock: { width: '100%', flex: 1, alignItems: 'center', paddingTop: 12, borderTopLeftRadius: 8, borderTopRightRadius: 8 },
  podiumRank: { color: '#a0a0a0', fontSize: 28, fontWeight: '900' },
  podiumName: { color: '#a0a0a0', fontSize: 12, marginTop: 8, textAlign: 'center', paddingHorizontal: 4 },
  listContainer: { backgroundColor: '#1e1e1e', borderRadius: 16, padding: 8 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: '#2a2a2a' },
  rankBadge: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#333', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  rankText: { color: '#a0a0a0', fontWeight: 'bold' },
  rowInfo: { flex: 1 },
  rowName: { color: '#fff', fontSize: 16, fontWeight: '600' },
  sparklineText: { color: '#666', fontSize: 11, marginTop: 2 },
  rowScore: { color: '#9d4edd', fontSize: 18, fontWeight: 'bold' }
});
