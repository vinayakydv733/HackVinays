import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';

type EventItem = {
  id: string;
  time: string;
  title: string;
  type: 'Main' | 'Food' | 'Speaker' | 'Judging';
  isNow?: boolean;
};

export default function ParticipantSchedule() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'schedule'), orderBy('time', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() })) as EventItem[];
      setEvents(data);
      setLoading(false);
    });
    return unsub;
  }, []);

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Food': return '#ff006e';
      case 'Speaker': return '#3a86ff';
      case 'Judging': return '#fb5607';
      default: return '#9d4edd';
    }
  };

  if (loading) return (
    <View style={{ flex: 1, backgroundColor: '#121212', justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color="#9d4edd" />
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Event Schedule</Text>
        <MaterialCommunityIcons name="bell-ring-outline" size={24} color="#a0a0a0" />
      </View>

      {events.length === 0 ? (
        <View style={styles.empty}>
          <MaterialCommunityIcons name="calendar-blank" size={48} color="#333" />
          <Text style={styles.emptyText}>Schedule will appear here</Text>
        </View>
      ) : events.map((event, index) => (
        <View key={event.id} style={styles.timelineRow}>
          <View style={styles.timeCol}>
            <Text style={[styles.timeText, event.isNow && styles.timeNow]}>{event.time}</Text>
          </View>
          <View style={styles.lineCol}>
            <View style={[styles.dot, { borderColor: getTypeColor(event.type) }, event.isNow && styles.dotNow]} />
            {index !== events.length - 1 && <View style={styles.line} />}
          </View>
          <View style={[styles.card, event.isNow && styles.cardNow]}>
            {event.isNow && <Text style={styles.nowBadge}>HAPPENING NOW</Text>}
            <Text style={styles.cardTitle}>{event.title}</Text>
            <View style={[styles.tag, { backgroundColor: getTypeColor(event.type) + '30' }]}>
              <Text style={[styles.tagText, { color: getTypeColor(event.type) }]}>{event.type}</Text>
            </View>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  content: { padding: 16, paddingBottom: 100 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  empty: { alignItems: 'center', marginTop: 80 },
  emptyText: { color: '#555', marginTop: 12, fontSize: 16 },
  timelineRow: { flexDirection: 'row' },
  timeCol: { width: 60, paddingTop: 16 },
  timeText: { color: '#a0a0a0', fontSize: 12, fontWeight: '600' },
  timeNow: { color: '#9d4edd' },
  lineCol: { width: 30, alignItems: 'center' },
  dot: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, backgroundColor: '#121212', marginTop: 18, zIndex: 10 },
  dotNow: { backgroundColor: '#9d4edd', borderColor: '#9d4edd' },
  line: { width: 2, flex: 1, backgroundColor: '#333', marginTop: -4, marginBottom: -18 },
  card: { flex: 1, backgroundColor: '#1e1e1e', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#333' },
  cardNow: { borderColor: '#9d4edd', borderWidth: 1.5, backgroundColor: '#2a1b38' },
  nowBadge: { color: '#9d4edd', fontSize: 10, fontWeight: 'bold', letterSpacing: 1, marginBottom: 4 },
  cardTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
  tag: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  tagText: { fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase' }
});
