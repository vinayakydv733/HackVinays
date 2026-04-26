import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { COLORS, FONTS, RADIUS, SPACING } from '../../constants/theme';
import { db } from '../../firebase/config';

export default function AdminTimerControl() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [endTime, setEndTime] = useState<string | null>(null);
  const [customDate, setCustomDate] = useState('');
  const [timeLeft, setTimeLeft] = useState('00:00:00');

  useEffect(() => {
    if (!endTime) {
      setTimeLeft('00:00:00');
      return;
    }
    const tick = () => {
      const diff = new Date(endTime).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft('00:00:00');
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [endTime]);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'hackathon_times'), (snap) => {
      if (snap.exists() && snap.data().end) {
        setEndTime(snap.data().end);
        setCustomDate(new Date(snap.data().end).toISOString());
      } else {
        setEndTime(null);
        setCustomDate(new Date().toISOString());
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const updateTimer = async (newEndStr: string) => {
    try {
      await setDoc(doc(db, 'settings', 'hackathon_times'), { end: newEndStr }, { merge: true });
      Alert.alert('Success', 'Timer updated successfully.');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const handleAddMinutes = (minutes: number) => {
    let baseTime = endTime ? new Date(endTime).getTime() : Date.now();
    const newTime = new Date(baseTime + minutes * 60000).toISOString();
    updateTimer(newTime);
  };

  const handleSetCustom = () => {
    try {
      const d = new Date(customDate);
      if (isNaN(d.getTime())) throw new Error("Invalid date format");
      updateTimer(d.toISOString());
    } catch {
      Alert.alert('Error', 'Invalid date format. Use ISO format (e.g. 2026-05-03T11:00:00Z)');
    }
  };

  const handleStopTimer = () => {
    Alert.alert('Stop Timer', 'This will set the timer to 0. Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Stop Now', 
        style: 'destructive', 
        onPress: () => updateTimer(new Date().toISOString()) 
      }
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Timer Control</Text>
          <Text style={styles.subtitle}>Global hackathon countdown</Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 50 }} />
      ) : (
        <>
          {/* Current Status */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>TIME REMAINING</Text>
            <Text style={{ fontSize: 48, fontWeight: 'bold', color: COLORS.primary, marginBottom: SPACING.md }}>
              {timeLeft}
            </Text>
            
            <Text style={styles.cardTitle}>CURRENT END TIME</Text>
            {endTime ? (
              <Text style={styles.timeText}>{new Date(endTime).toLocaleString()}</Text>
            ) : (
              <Text style={styles.timeText}>Not Set</Text>
            )}
          </View>

          {/* Quick Actions */}
          <Text style={styles.sectionTitle}>QUICK ACTIONS</Text>
          <View style={styles.quickGrid}>
            <TouchableOpacity style={styles.quickBtn} onPress={() => handleAddMinutes(60)}>
              <Ionicons name="add-circle-outline" size={24} color={COLORS.green} />
              <Text style={styles.quickBtnText}>+ 1 Hour</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickBtn} onPress={() => handleAddMinutes(30)}>
              <Ionicons name="add-circle-outline" size={24} color={COLORS.green} />
              <Text style={styles.quickBtnText}>+ 30 Mins</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickBtn} onPress={() => handleAddMinutes(-30)}>
              <Ionicons name="remove-circle-outline" size={24} color={COLORS.orange} />
              <Text style={styles.quickBtnText}>- 30 Mins</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.quickBtn, { borderColor: COLORS.red }]} onPress={handleStopTimer}>
              <Ionicons name="stop-circle-outline" size={24} color={COLORS.red} />
              <Text style={[styles.quickBtnText, { color: COLORS.red }]}>End Now</Text>
            </TouchableOpacity>
          </View>

          {/* Custom Date Time */}
          <Text style={styles.sectionTitle}>CUSTOM DATE/TIME (ISO 8601)</Text>
          <View style={styles.card}>
            <TextInput
              style={styles.input}
              value={customDate}
              onChangeText={setCustomDate}
              placeholder="2026-05-03T11:00:00Z"
              placeholderTextColor={COLORS.textDim}
            />
            <TouchableOpacity style={styles.saveBtn} onPress={handleSetCustom}>
              <Text style={styles.saveBtnText}>Update Timer</Text>
            </TouchableOpacity>
            <Text style={styles.helpText}>
              Example format: 2026-05-03T11:00:00Z.
              'T' separates date and time, 'Z' means UTC.
            </Text>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: SPACING.lg, paddingBottom: 100, paddingTop: 60 },
  header: {
    flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.xl, gap: SPACING.md,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: FONTS.size.xl, fontWeight: 'bold', color: COLORS.textPrimary },
  subtitle: { fontSize: FONTS.size.sm, color: COLORS.textSecondary },
  
  card: {
    backgroundColor: COLORS.bgCard, padding: SPACING.lg, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border, marginBottom: SPACING.xl,
  },
  cardTitle: { fontSize: FONTS.size.xs, fontWeight: '700', color: COLORS.textSecondary, letterSpacing: 2, marginBottom: SPACING.sm },
  timeText: { fontSize: FONTS.size.lg, fontWeight: 'bold', color: COLORS.primary },
  
  sectionTitle: { fontSize: FONTS.size.sm, fontWeight: 'bold', color: COLORS.textSecondary, marginBottom: SPACING.md, letterSpacing: 1 },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.md, marginBottom: SPACING.xl },
  quickBtn: {
    width: '47%', backgroundColor: COLORS.bgCard, padding: SPACING.md, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', gap: SPACING.sm,
  },
  quickBtnText: { color: COLORS.textPrimary, fontWeight: '600' },
  
  input: {
    backgroundColor: COLORS.bg, borderWidth: 1, borderColor: COLORS.border,
    color: COLORS.textPrimary, padding: SPACING.md, borderRadius: RADIUS.sm,
    fontSize: FONTS.size.sm, marginBottom: SPACING.md,
  },
  saveBtn: {
    backgroundColor: COLORS.primary, padding: SPACING.md, borderRadius: RADIUS.sm, alignItems: 'center',
  },
  saveBtnText: { color: COLORS.white, fontWeight: 'bold' },
  helpText: { color: COLORS.textDim, fontSize: FONTS.size.xs, marginTop: SPACING.md, lineHeight: 18 },
});
