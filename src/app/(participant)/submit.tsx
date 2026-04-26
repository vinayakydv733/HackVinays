import { Ionicons } from '@expo/vector-icons';
import {
    collection,
    doc,
    onSnapshot,
    query,
    setDoc,
    where
} from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Linking,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { COLORS, FONTS, RADIUS, SPACING } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase/config';

interface Submission {
  id: string;
  teamId: string;
  teamName: string;
  githubUrl: string;
  demoUrl: string;
  devpostUrl: string;
  description: string;
  submittedAt: number;
  submittedBy: string;
}

export default function Submit() {
  const { user, userData } = useAuth();
  const [github, setGithub] = useState('');
  const [demo, setDemo] = useState('');
  const [devpost, setDevpost] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [existingId, setExistingId] = useState<string | null>(null);
  const [submittedAt, setSubmittedAt] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Load existing submission
  useEffect(() => {
    if (!userData?.teamId) {
      setFetching(false);
      return;
    }

    const q = query(
      collection(db, 'projects'),
      where('teamId', '==', userData.teamId)
    );

    const unsub = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        const d = snap.docs[0];
        const data = d.data() as Submission;
        setExistingId(d.id);
        setGithub(data.githubUrl || '');
        setDemo(data.demoUrl || '');
        setDevpost(data.devpostUrl || '');
        setDescription(data.description || '');
        setSubmittedAt(data.submittedAt || null);
        setSubmitted(true);
        setIsEditing(false);
      } else {
        setSubmitted(false);
      }
      setFetching(false);
    });

    return unsub;
  }, [userData?.teamId]);

  const validate = () => {
    if (!github.trim()) {
      Alert.alert('Required', 'GitHub repository URL is required');
      return false;
    }
    if (!github.startsWith('http')) {
      Alert.alert('Invalid URL', 'Please enter a valid GitHub URL starting with http');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    if (!userData?.teamId) {
      Alert.alert('Error', 'You are not assigned to a team yet');
      return;
    }

    setLoading(true);
    try {
      const id = existingId || doc(collection(db, 'projects')).id;
      await setDoc(doc(db, 'projects', id), {
        id,
        teamId: userData.teamId,
        teamName: userData.teamName || '',
        githubUrl: github.trim(),
        demoUrl: demo.trim(),
        devpostUrl: devpost.trim(),
        description: description.trim(),
        submittedAt: Date.now(),
        submittedBy: user?.uid,
      });
      setExistingId(id);
      setSubmitted(true);
      setIsEditing(false);
      Alert.alert(
        '🚀 Deployed!',
        existingId
          ? 'Your project has been updated successfully!'
          : 'Your project has been submitted successfully!'
      );
    } catch {
      Alert.alert('Error', 'Submission failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const openUrl = async (url: string) => {
    if (!url) return;
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      Alert.alert('Error', 'Cannot open this URL');
    }
  };

  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleString('en-US', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (fetching) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  // ── Submitted View (read-only) ──
  if (submitted && !isEditing) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Project Submission</Text>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {/* Status Banner */}
          <View style={styles.successBanner}>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark-circle" size={32} color={COLORS.green} />
            </View>
            <View style={styles.successText}>
              <Text style={styles.successTitle}>Project Submitted!</Text>
              {submittedAt && (
                <Text style={styles.successSub}>
                  Last updated: {formatDate(submittedAt)}
                </Text>
              )}
            </View>
            <View style={[styles.statusBadge, { backgroundColor: COLORS.green + '22' }]}>
              <View style={[styles.statusDot, { backgroundColor: COLORS.green }]} />
              <Text style={[styles.statusText, { color: COLORS.green }]}>
                LIVE
              </Text>
            </View>
          </View>

          {/* Submitted Links */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>PROJECT DETAILS</Text>
            <Text style={styles.teamNameText}>
              {userData?.teamName || 'Your Team'}
            </Text>

            {/* GitHub */}
            {github ? (
              <TouchableOpacity
                style={styles.linkRow}
                onPress={() => openUrl(github)}
                activeOpacity={0.7}
              >
                <View style={styles.linkIcon}>
                  <Ionicons name="logo-github" size={20} color={COLORS.textPrimary} />
                </View>
                <View style={styles.linkInfo}>
                  <Text style={styles.linkLabel}>GITHUB</Text>
                  <Text style={styles.linkUrl} numberOfLines={1}>
                    {github}
                  </Text>
                </View>
                <Ionicons name="open-outline" size={16} color={COLORS.primary} />
              </TouchableOpacity>
            ) : null}

            {/* Live Demo */}
            {demo ? (
              <TouchableOpacity
                style={styles.linkRow}
                onPress={() => openUrl(demo)}
                activeOpacity={0.7}
              >
                <View style={[styles.linkIcon, { backgroundColor: COLORS.primary + '22' }]}>
                  <Ionicons name="globe" size={20} color={COLORS.primary} />
                </View>
                <View style={styles.linkInfo}>
                  <Text style={styles.linkLabel}>LIVE DEMO</Text>
                  <Text style={styles.linkUrl} numberOfLines={1}>
                    {demo}
                  </Text>
                </View>
                <Ionicons name="open-outline" size={16} color={COLORS.primary} />
              </TouchableOpacity>
            ) : null}

            {/* DevPost */}
            {devpost ? (
              <TouchableOpacity
                style={styles.linkRow}
                onPress={() => openUrl(devpost)}
                activeOpacity={0.7}
              >
                <View style={[styles.linkIcon, { backgroundColor: COLORS.purple + '22' }]}>
                  <Ionicons name="link" size={20} color={COLORS.purple} />
                </View>
                <View style={styles.linkInfo}>
                  <Text style={styles.linkLabel}>DEVPOST</Text>
                  <Text style={styles.linkUrl} numberOfLines={1}>
                    {devpost}
                  </Text>
                </View>
                <Ionicons name="open-outline" size={16} color={COLORS.primary} />
              </TouchableOpacity>
            ) : null}

            {/* Description */}
            {description ? (
              <View style={styles.descBlock}>
                <Text style={styles.linkLabel}>DESCRIPTION</Text>
                <Text style={styles.descText}>{description}</Text>
              </View>
            ) : null}
          </View>

          {/* Edit Button */}
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => setIsEditing(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="pencil" size={18} color={COLORS.white} />
            <Text style={styles.editBtnText}>EDIT SUBMISSION</Text>
          </TouchableOpacity>

          <Text style={styles.editNote}>
            You can update your submission at any time before judging closes
          </Text>
        </ScrollView>
      </View>
    );
  }

  // ── Form View (submit / edit) ──
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: COLORS.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Project Submission</Text>
        {isEditing && (
          <TouchableOpacity
            onPress={() => setIsEditing(false)}
            style={styles.cancelBtn}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Title + Status */}
        <View style={styles.titleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>PROJECT SUBMISSION</Text>
            <Text style={styles.subtitle}>
              Share your project links with the jury.{'\n'}
              You can update at any time before judging closes.
            </Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: submitted
                  ? COLORS.green + '22'
                  : COLORS.orange + '22',
              },
            ]}
          >
            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor: submitted
                    ? COLORS.green
                    : COLORS.orange,
                },
              ]}
            />
            <Text
              style={[
                styles.statusText,
                { color: submitted ? COLORS.green : COLORS.orange },
              ]}
            >
              {submitted ? 'SUBMITTED' : 'NOT SUBMITTED'}
            </Text>
          </View>
        </View>

        {/* Form Card */}
        <View style={styles.formCard}>
          {/* GitHub */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>
              GITHUB <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.inputRow}>
              <Ionicons
                name="logo-github"
                size={18}
                color={COLORS.textSecondary}
              />
              <TextInput
                style={styles.input}
                value={github}
                onChangeText={setGithub}
                placeholder="https://github.com/your/repo"
                placeholderTextColor={COLORS.textDim}
                autoCapitalize="none"
                keyboardType="url"
              />
              {github.length > 0 && (
                <TouchableOpacity onPress={() => setGithub('')}>
                  <Ionicons
                    name="close-circle"
                    size={18}
                    color={COLORS.textDim}
                  />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Live Demo */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>LIVE DEMO</Text>
            <View style={styles.inputRow}>
              <Ionicons
                name="globe"
                size={18}
                color={COLORS.textSecondary}
              />
              <TextInput
                style={styles.input}
                value={demo}
                onChangeText={setDemo}
                placeholder="https://your-demo.com"
                placeholderTextColor={COLORS.textDim}
                autoCapitalize="none"
                keyboardType="url"
              />
              {demo.length > 0 && (
                <TouchableOpacity onPress={() => setDemo('')}>
                  <Ionicons
                    name="close-circle"
                    size={18}
                    color={COLORS.textDim}
                  />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* DevPost */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>DEVPOST</Text>
            <View style={styles.inputRow}>
              <Ionicons
                name="link"
                size={18}
                color={COLORS.textSecondary}
              />
              <TextInput
                style={styles.input}
                value={devpost}
                onChangeText={setDevpost}
                placeholder="https://devpost.com/software/..."
                placeholderTextColor={COLORS.textDim}
                autoCapitalize="none"
                keyboardType="url"
              />
              {devpost.length > 0 && (
                <TouchableOpacity onPress={() => setDevpost('')}>
                  <Ionicons
                    name="close-circle"
                    size={18}
                    color={COLORS.textDim}
                  />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Description */}
          <View style={styles.fieldGroup}>
            <View style={styles.fieldLabelRow}>
              <Text style={styles.fieldLabel}>DESCRIPTION</Text>
              <Text style={styles.optional}>(OPTIONAL)</Text>
            </View>
            <View style={[styles.inputRow, styles.textAreaRow]}>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={(t) =>
                  t.length <= 280 && setDescription(t)
                }
                placeholder="What does your project do? What problem does it solve?"
                placeholderTextColor={COLORS.textDim}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
              />
            </View>
            <Text style={styles.charCount}>
              {description.length}/280
            </Text>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitBtn, loading && { opacity: 0.7 }]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <>
                <Ionicons
                  name="cloud-upload"
                  size={20}
                  color={COLORS.white}
                />
                <Text style={styles.submitBtnText}>
                  {existingId ? 'UPDATE PROJECT' : 'DEPLOY PROJECT'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Required note */}
        <Text style={styles.requiredNote}>
          * GitHub URL is required. Other fields are optional.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
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
  cancelBtn: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  cancelText: {
    color: COLORS.primary,
    fontSize: FONTS.size.sm,
    fontWeight: '600',
  },
  content: { padding: SPACING.md, paddingBottom: 100 },

  // Success banner
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.green + '11',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.green + '33',
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  successIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.green + '22',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successText: { flex: 1 },
  successTitle: {
    color: COLORS.textPrimary,
    fontSize: FONTS.size.md,
    fontWeight: '800',
  },
  successSub: {
    color: COLORS.textSecondary,
    fontSize: FONTS.size.xs,
    marginTop: 2,
  },

  // Card
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.md,
  },
  cardTitle: {
    color: COLORS.textSecondary,
    fontSize: FONTS.size.xs,
    letterSpacing: 2,
    fontWeight: '700',
    marginBottom: SPACING.sm,
  },
  teamNameText: {
    color: COLORS.textPrimary,
    fontSize: FONTS.size.xl,
    fontWeight: '800',
    marginBottom: SPACING.md,
  },

  // Link rows (read-only)
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  linkIcon: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.bgCardAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkInfo: { flex: 1 },
  linkLabel: {
    color: COLORS.textSecondary,
    fontSize: FONTS.size.xs,
    letterSpacing: 1,
    fontWeight: '700',
    marginBottom: 2,
  },
  linkUrl: {
    color: COLORS.primary,
    fontSize: FONTS.size.sm,
  },
  descBlock: {
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginTop: SPACING.xs,
  },
  descText: {
    color: COLORS.textPrimary,
    fontSize: FONTS.size.sm,
    lineHeight: 22,
    marginTop: SPACING.xs,
  },

  // Edit button
  editBtn: {
    backgroundColor: COLORS.purple,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: RADIUS.md,
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  editBtnText: {
    color: COLORS.white,
    fontSize: FONTS.size.md,
    fontWeight: '800',
    letterSpacing: 1,
  },
  editNote: {
    color: COLORS.textDim,
    fontSize: FONTS.size.xs,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },

  // Form
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.lg,
    gap: SPACING.sm,
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: FONTS.size.lg,
    fontWeight: '900',
    letterSpacing: 1,
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: FONTS.size.sm,
    marginTop: 6,
    lineHeight: 20,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.md,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusText: {
    fontSize: FONTS.size.xs,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  formCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.sm,
  },
  fieldGroup: { marginBottom: SPACING.md },
  fieldLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  fieldLabel: {
    color: COLORS.textSecondary,
    fontSize: FONTS.size.xs,
    letterSpacing: 2,
    fontWeight: '700',
    marginBottom: SPACING.xs,
  },
  required: {
    color: COLORS.red,
    fontSize: FONTS.size.sm,
  },
  optional: {
    color: COLORS.textDim,
    fontSize: FONTS.size.xs,
    letterSpacing: 1,
    marginBottom: SPACING.xs,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgCardAlt,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.sm,
    height: 52,
    gap: SPACING.sm,
  },
  textAreaRow: {
    height: 120,
    alignItems: 'flex-start',
    paddingTop: SPACING.sm,
  },
  input: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: FONTS.size.sm,
  },
  textArea: { height: 100 },
  charCount: {
    color: COLORS.textDim,
    fontSize: FONTS.size.xs,
    textAlign: 'right',
    marginTop: 4,
  },
  submitBtn: {
    backgroundColor: COLORS.purple,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    borderRadius: RADIUS.md,
    marginTop: SPACING.sm,
    gap: SPACING.sm,
  },
  submitBtnText: {
    color: COLORS.white,
    fontSize: FONTS.size.md,
    fontWeight: '800',
    letterSpacing: 1,
  },
  requiredNote: {
    color: COLORS.textDim,
    fontSize: FONTS.size.xs,
    textAlign: 'center',
    marginTop: SPACING.xs,
  },
});