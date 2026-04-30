import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
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
  
  // Timer States
  const [startTime, setStartTime] = useState<Date>(new Date());
  const [endTime, setEndTime] = useState<Date>(new Date(Date.now() + 24 * 3600000));
  const [timeLeft, setTimeLeft] = useState('00:00:00');
  const [timerStatus, setTimerStatus] = useState<'pending' | 'active' | 'ended'>('pending');

  // Picker States
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [startPickerMode, setStartPickerMode] = useState<'date' | 'time'>('date');
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [endPickerMode, setEndPickerMode] = useState<'date' | 'time'>('date');

  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      const start = startTime.getTime();
      const end = endTime.getTime();

      if (now < start) {
        setTimerStatus('pending');
        const diff = start - now;
        setTimeLeft(formatDiff(diff));
      } else if (now < end) {
        setTimerStatus('active');
        const diff = end - now;
        setTimeLeft(formatDiff(diff));
      } else {
        setTimerStatus('ended');
        setTimeLeft('00:00:00');
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [startTime, endTime]);

  const formatDiff = (diff: number) => {
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'hackathon_times'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.start) setStartTime(new Date(data.start));
        if (data.end) setEndTime(new Date(data.end));
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const saveTimes = async () => {
    if (endTime <= startTime) {
      Alert.alert('Invalid Range', 'End time must be after start time.');
      return;
    }
    try {
      await setDoc(doc(db, 'settings', 'hackathon_times'), {
        start: startTime.toISOString(),
        end: endTime.toISOString(),
        updatedAt: Date.now()
      }, { merge: true });
      Alert.alert('Success', 'Hackathon schedule updated!');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const onStartChange = (event: any, selectedDate?: Date) => {
    setShowStartPicker(Platform.OS === 'ios');
    if (selectedDate) {
      setStartTime(selectedDate);
    }
  };

  const onEndChange = (event: any, selectedDate?: Date) => {
    setShowEndPicker(Platform.OS === 'ios');
    if (selectedDate) {
      setEndTime(selectedDate);
    }
  };

  const handleQuickAdd = (minutes: number) => {
    setEndTime(new Date(endTime.getTime() + minutes * 60000));
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Schedule Hackathon</Text>
          <Text style={styles.subtitle}>Set start and end periods</Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 50 }} />
      ) : (
        <>
          {/* Status Banner */}
          <View style={[styles.statusBanner, 
            timerStatus === 'active' ? styles.statusActive : 
            timerStatus === 'pending' ? styles.statusPending : styles.statusEnded
          ]}>
            <Ionicons 
              name={timerStatus === 'active' ? 'play-circle' : timerStatus === 'pending' ? 'time' : 'stop-circle'} 
              size={20} 
              color="#FFF" 
            />
            <Text style={styles.statusText}>
              {timerStatus === 'active' ? 'HACKATHON LIVE' : 
               timerStatus === 'pending' ? 'COUNTDOWN TO START' : 'HACKATHON ENDED'}
            </Text>
          </View>

          {/* Countdown Display */}
          <View style={styles.countdownCard}>
            <Text style={styles.cardTitle}>TIME REMAINING</Text>
            <Text style={styles.timerDisplay}>{timeLeft}</Text>
          </View>

          {/* Start Time Selector */}
          <Text style={styles.sectionTitle}>START DATE & TIME</Text>
          <View style={styles.pickerCard}>
            {Platform.OS === 'web' ? (
              <View style={styles.webPickerContainer}>
                <TextInput
                  style={styles.webInput}
                  // @ts-ignore - 'type' is supported on web
                  type="datetime-local"
                  value={startTime.toISOString().slice(0, 16)}
                  onChangeText={(val) => {
                    if (!val) return;
                    const d = new Date(val);
                    if (!isNaN(d.getTime())) setStartTime(d);
                  }}
                />
              </View>
            ) : (
              <View style={styles.pickerRow}>
                <TouchableOpacity 
                  style={styles.pickerBtn} 
                  onPress={() => { setStartPickerMode('date'); setShowStartPicker(true); }}
                >
                  <Ionicons name="calendar-outline" size={20} color={COLORS.primary} />
                  <Text style={styles.pickerBtnText}>{startTime.toLocaleDateString()}</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.pickerBtn} 
                  onPress={() => { setStartPickerMode('time'); setShowStartPicker(true); }}
                >
                  <Ionicons name="time-outline" size={20} color={COLORS.primary} />
                  <Text style={styles.pickerBtnText}>
                    {startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* End Time Selector */}
          <Text style={styles.sectionTitle}>END DATE & TIME</Text>
          <View style={styles.pickerCard}>
            {Platform.OS === 'web' ? (
              <View style={styles.webPickerContainer}>
                <TextInput
                  style={styles.webInput}
                  // @ts-ignore - 'type' is supported on web
                  type="datetime-local"
                  value={endTime.toISOString().slice(0, 16)}
                  onChangeText={(val) => {
                    if (!val) return;
                    const d = new Date(val);
                    if (!isNaN(d.getTime())) setEndTime(d);
                  }}
                />
              </View>
            ) : (
              <View style={styles.pickerRow}>
                <TouchableOpacity 
                  style={styles.pickerBtn} 
                  onPress={() => { setEndPickerMode('date'); setShowEndPicker(true); }}
                >
                  <Ionicons name="calendar-outline" size={20} color={COLORS.primary} />
                  <Text style={styles.pickerBtnText}>{endTime.toLocaleDateString()}</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.pickerBtn} 
                  onPress={() => { setEndPickerMode('time'); setShowEndPicker(true); }}
                >
                  <Ionicons name="time-outline" size={20} color={COLORS.primary} />
                  <Text style={styles.pickerBtnText}>
                    {endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Quick Actions */}
          <View style={styles.quickActions}>
            <TouchableOpacity style={styles.quickActionBtn} onPress={() => handleQuickAdd(60)}>
              <Text style={styles.quickActionText}>+1h End</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickActionBtn} onPress={() => handleQuickAdd(360)}>
              <Text style={styles.quickActionText}>+6h End</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.quickActionBtn, { backgroundColor: COLORS.red + '22', borderColor: COLORS.red }]} 
              onPress={() => setEndTime(new Date())}>
              <Text style={[styles.quickActionText, { color: COLORS.red }]}>End Now</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.saveMainBtn} onPress={saveTimes}>
            <Ionicons name="save" size={20} color="#FFF" />
            <Text style={styles.saveMainBtnText}>UPDATE SCHEDULE</Text>
          </TouchableOpacity>

          {/* Hidden Pickers */}
          {showStartPicker && (
            <DateTimePicker
              value={startTime}
              mode={startPickerMode}
              is24Hour={true}
              onChange={onStartChange}
            />
          )}
          {showEndPicker && (
            <DateTimePicker
              value={endTime}
              mode={endPickerMode}
              is24Hour={true}
              onChange={onEndChange}
            />
          )}
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

  statusBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 10, borderRadius: RADIUS.md, marginBottom: SPACING.lg,
  },
  statusActive: { backgroundColor: COLORS.green },
  statusPending: { backgroundColor: COLORS.orange },
  statusEnded: { backgroundColor: COLORS.red },
  statusText: { color: '#FFF', fontWeight: 'bold', fontSize: 12, letterSpacing: 1 },

  countdownCard: {
    backgroundColor: COLORS.bgCard, padding: SPACING.lg, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', marginBottom: SPACING.xl,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3,
  },
  cardTitle: { fontSize: 10, fontWeight: '800', color: COLORS.textSecondary, letterSpacing: 2, marginBottom: 8 },
  timerDisplay: { fontSize: 48, fontWeight: '900', color: COLORS.primary, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },

  sectionTitle: { fontSize: 12, fontWeight: 'bold', color: COLORS.textSecondary, marginBottom: SPACING.sm, letterSpacing: 1, textTransform: 'uppercase' },
  pickerCard: {
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.md, padding: SPACING.md,
    borderWidth: 1, borderColor: COLORS.border, marginBottom: SPACING.lg,
  },
  pickerRow: { flexDirection: 'row', gap: SPACING.md },
  pickerBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.bg, borderWidth: 1, borderColor: COLORS.border,
    paddingVertical: 12, borderRadius: RADIUS.sm,
  },
  pickerBtnText: { color: COLORS.textPrimary, fontWeight: '600', fontSize: 14 },

  webPickerContainer: {
    width: '100%',
  },
  webInput: {
    width: '100%',
    backgroundColor: COLORS.bg,
    color: COLORS.textPrimary,
    padding: 12,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    fontSize: 14,
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      }
    })
  } as any,

  quickActions: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.xl },
  quickActionBtn: {
    flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: RADIUS.sm,
    borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.bgCard,
  },
  quickActionText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },

  saveMainBtn: {
    backgroundColor: COLORS.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, paddingVertical: 16, borderRadius: RADIUS.md, marginTop: SPACING.md,
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5,
  },
  saveMainBtnText: { color: '#FFF', fontWeight: '800', fontSize: 16, letterSpacing: 1 },
});
