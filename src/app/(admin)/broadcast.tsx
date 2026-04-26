import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { addDoc, collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Switch,
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

interface announcement {
  id: string;
  title: string;
  message: string;
  target: 'all' | 'participants' | 'volunteers';
  isUrgent: boolean;
  createdAt: number;
}

const TARGETS = [
  { label: 'All', value: 'all' },
  { label: 'Participants', value: 'participants' },
  { label: 'Volunteers', value: 'volunteers' },
];

export default function Adminannounce() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Form States
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [target, setTarget] = useState<'all' | 'participants' | 'volunteers'>('all');
  const [isUrgent, setIsUrgent] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // History State
  const [announcements, setannouncements] = useState<announcement[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch past announcements
  useEffect(() => {
    const q = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as announcement[];
      setannouncements(fetched);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      Alert.alert('Error', 'Please enter both a title and a message.');
      return;
    }

    setIsSending(true);
    try {
      await addDoc(collection(db, 'announcements'), {
        title: title.trim(),
        message: message.trim(),
        target,
        isUrgent,
        createdAt: Date.now(),
        author: 'Admin', // Hardcoded for now, could be pulled from auth
      });

      // Reset form
      setTitle('');
      setMessage('');
      setTarget('all');
      setIsUrgent(false);
      Alert.alert('Success', 'announce sent successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to send announce.');
    } finally {
      setIsSending(false);
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' - ' + date.toLocaleDateString();
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + SPACING.sm }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
          <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>announce Center</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={announcements}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.composeCard}>
            <Text style={styles.sectionTitle}>New announcement</Text>
            
            <Input 
              label="Title" 
              value={title} 
              onChangeText={setTitle} 
              placeholder="e.g. Lunch is served!" 
            />
            
            <Text style={styles.label}>Message</Text>
            <TextInput
              style={styles.textArea}
              value={message}
              onChangeText={setMessage}
              placeholder="Type your announce message here..."
              placeholderTextColor={COLORS.textSecondary}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <Text style={styles.label}>Send To</Text>
            <View style={styles.targetRow}>
              {TARGETS.map((t) => (
                <TouchableOpacity
                  key={t.value}
                  onPress={() => setTarget(t.value as any)}
                  style={[
                    styles.targetBtn,
                    target === t.value && { backgroundColor: COLORS.primary, borderColor: COLORS.primary }
                  ]}
                >
                  <Text style={[
                    styles.targetBtnText,
                    target === t.value && { color: '#FFF' }
                  ]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.urgentRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm }}>
                <Ionicons name="alert-circle" size={20} color={isUrgent ? '#E74C3C' : COLORS.textSecondary} />
                <Text style={styles.label}>Mark as Urgent</Text>
              </View>
              <Switch
                value={isUrgent}
                onValueChange={setIsUrgent}
                trackColor={{ false: COLORS.border, true: '#E74C3C' }}
              />
            </View>

            <Button 
              title="SEND announce" 
              onPress={handleSend} 
              loading={isSending} 
              style={{ marginTop: SPACING.md }} 
            />
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: SPACING.xl }} />
          ) : (
            <Text style={styles.emptyText}>No announces sent yet.</Text>
          )
        }
        renderItem={({ item }) => (
          <View style={[styles.historyCard, item.isUrgent && styles.urgentCard]}>
            <View style={styles.historyHeader}>
              <View style={styles.historyTarget}>
                <Ionicons 
                  name={item.target === 'all' ? 'globe-outline' : 'people-outline'} 
                  size={14} 
                  color={item.isUrgent ? '#E74C3C' : COLORS.primary} 
                />
                <Text style={[styles.historyTargetText, item.isUrgent && { color: '#E74C3C' }]}>
                  To: {item.target.charAt(0).toUpperCase() + item.target.slice(1)}
                </Text>
              </View>
              <Text style={styles.historyTime}>{formatDate(item.createdAt)}</Text>
            </View>
            <Text style={styles.historyTitle}>
              {item.isUrgent && "🚨 "}{item.title}
            </Text>
            <Text style={styles.historyMessage}>{item.message}</Text>
          </View>
        )}
      />
    </KeyboardAvoidingView>
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
  
  composeCard: {
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg, padding: SPACING.lg,
    borderWidth: 1, borderColor: COLORS.border, marginBottom: SPACING.xl,
  },
  sectionTitle: { fontSize: FONTS.size.md, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: SPACING.lg },
  label: { fontSize: FONTS.size.sm, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 6 },
  textArea: {
    backgroundColor: COLORS.bg, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: RADIUS.sm, padding: SPACING.md, fontSize: FONTS.size.md,
    color: COLORS.textPrimary, minHeight: 100, marginBottom: SPACING.md,
  },
  targetRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md },
  targetBtn: {
    flex: 1, paddingVertical: SPACING.sm, alignItems: 'center',
    borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.bg,
  },
  targetBtnText: { fontSize: FONTS.size.xs, fontWeight: '600', color: COLORS.textSecondary },
  urgentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: SPACING.sm, marginBottom: SPACING.md },
  
  historyCard: {
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.md, padding: SPACING.md,
    borderWidth: 1, borderColor: COLORS.border, marginBottom: SPACING.md,
  },
  urgentCard: { borderColor: '#E74C3C', backgroundColor: '#E74C3C0A' },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.xs },
  historyTarget: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.primary + '1A', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  historyTargetText: { fontSize: 10, fontWeight: 'bold', color: COLORS.primary, textTransform: 'uppercase' },
  historyTime: { fontSize: FONTS.size.xs, color: COLORS.textSecondary },
  historyTitle: { fontSize: FONTS.size.md, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 4 },
  historyMessage: { fontSize: FONTS.size.sm, color: COLORS.textSecondary, lineHeight: 20 },
  emptyText: { textAlign: 'center', color: COLORS.textSecondary, marginTop: SPACING.lg },
});