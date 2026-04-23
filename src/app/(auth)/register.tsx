import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
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

// IMPORTANT: Ensure these paths point to your actual component and config files
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { COLORS, FONTS, RADIUS, SPACING } from '../../constants/theme';
import { registerUser } from '../../firebase/auth';
import { db } from '../../firebase/config';

// Replace these URIs with your actual image paths, e.g., source: require('../../assets/college.png')
const PARTNER_LOGOS = [
  { id: 'college', source: { uri: 'https://via.placeholder.com/100?text=College' } },
  { id: 'club', source: { uri: 'https://via.placeholder.com/100?text=Club' } },
  { id: 'microsoft', source: { uri: 'https://via.placeholder.com/100?text=MSFT' } },
  { id: 'sponsor', source: { uri: 'https://via.placeholder.com/100?text=Sponsor' } },
];

export default function Register() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [teamName, setTeamName] = useState('');
  
  // States for fetching and filtering teams
  const [teams, setTeams] = useState<string[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch teams from Firebase in real-time
  useEffect(() => {
    const teamsRef = collection(db, 'teams');
    // Order alphabetically so the dropdown is organized
    const q = query(teamsRef, orderBy('name', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      // Extract just the team names into an array of strings
      const fetchedTeams = snapshot.docs.map(doc => doc.data().name);
      
      setTeams(fetchedTeams);
      setLoadingTeams(false);
    }, (error) => {
      console.error("Error fetching teams for register dropdown: ", error);
      Alert.alert('Error', 'Failed to load teams. Please check your connection.');
      setLoadingTeams(false);
    });

    // Cleanup the listener when the user leaves the register page
    return () => unsubscribe();
  }, []);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Name is required';
    if (!email) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Invalid email';
    if (!password) e.password = 'Password is required';
    else if (password.length < 6) e.password = 'Minimum 6 characters';
    if (password !== confirmPassword) e.confirmPassword = 'Passwords do not match';
    if (!teamName) e.teamName = 'Please select a team';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      // Hardcoded 'participant' and empty mentor string
      const { role: assignedRole } = await registerUser(
        name.trim(),
        email.trim(),
        password,
        'participant',
        teamName,
        '' 
      );
      
      router.replace('/(participant)/home');
      
    } catch (err: any) {
      const msg =
        err.code === 'auth/email-already-in-use'
          ? 'This email is already registered'
          : 'Registration failed. Please try again.';
      Alert.alert('Registration Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  // Filter teams based on search query
  const filteredTeams = teams.filter(team => 
    team.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCloseModal = () => {
    setShowTeamModal(false);
    setSearchQuery(''); // Reset search when closing
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: COLORS.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.tagline}>HACKATHON</Text>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join the hackathon</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Input
            label="Full Name"
            value={name}
            onChangeText={setName}
            placeholder="Your full name"
            error={errors.name}
          />
          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@college.edu"
            keyboardType="email-address"
            autoCapitalize="none"
            error={errors.email}
          />
          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            secureTextEntry
            error={errors.password}
          />
          <Input
            label="Confirm Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="••••••••"
            secureTextEntry
            error={errors.confirmPassword}
          />

          {/* Custom Team Dropdown Selector */}
          <View style={styles.dropdownContainer}>
            <Text style={styles.dropdownLabel}>Select Team</Text>
            <TouchableOpacity 
              style={[styles.dropdownButton, errors.teamName && styles.dropdownError]}
              onPress={() => setShowTeamModal(true)}
              disabled={loadingTeams}
            >
              {loadingTeams ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : (
                <Text style={[styles.dropdownButtonText, !teamName && { color: '#999' }]}>
                  {teamName || "Choose your team"}
                </Text>
              )}
            </TouchableOpacity>
            {errors.teamName && <Text style={styles.errorText}>{errors.teamName}</Text>}
          </View>

          <Button
            title="CREATE ACCOUNT"
            onPress={handleRegister}
            loading={loading}
            style={{ marginTop: SPACING.sm }}
          />

          {/* Sponsor/Partner Logos Section */}
          <View style={styles.socialContainer}>
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>Supported by</Text>
              <View style={styles.dividerLine} />
            </View>
            
            <View style={styles.logosRow}>
              {PARTNER_LOGOS.map((logo) => (
                <View key={logo.id} style={styles.logoBox}>
                  <Image 
                    source={logo.source} 
                    style={styles.logoImage}
                    resizeMode="contain"
                  />
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.footerLink}>Sign In</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.accentLine} />
      </ScrollView>

      {/* Team Selection Modal */}
      <Modal visible={showTeamModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select your Team</Text>
            
            {/* Search Bar with Icon */}
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search team..."
                placeholderTextColor="#999"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCorrect={false}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={20} color="#999" />
                </TouchableOpacity>
              )}
            </View>

            <FlatList
              data={filteredTeams}
              keyExtractor={(item) => item}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={styles.teamOption}
                  onPress={() => {
                    setTeamName(item);
                    handleCloseModal();
                  }}
                >
                  <Text style={styles.teamOptionText}>{item}</Text>
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              ListEmptyComponent={
                <Text style={styles.emptyText}>
                  {searchQuery ? "No teams match your search." : "No teams available."}
                </Text>
              }
            />
            
            <TouchableOpacity 
              style={styles.closeModalButton}
              onPress={handleCloseModal}
            >
              <Text style={styles.closeModalText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: SPACING.lg,
    paddingTop: SPACING.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  tagline: {
    color: COLORS.primary,
    fontSize: FONTS.size.sm,
    letterSpacing: 6,
    fontWeight: '700',
    marginBottom: SPACING.sm,
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: FONTS.size.xl,
    fontWeight: '800',
    marginBottom: SPACING.xs,
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: FONTS.size.md,
  },
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dropdownContainer: {
    marginBottom: SPACING.md,
  },
  dropdownLabel: {
    color: COLORS.textSecondary,
    fontSize: FONTS.size.sm,
    marginBottom: 6,
    fontWeight: '500',
  },
  dropdownButton: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.md,
    height: 50,
    justifyContent: 'center',
    backgroundColor: 'transparent', 
  },
  dropdownError: {
    borderColor: 'red',
  },
  dropdownButtonText: {
    color: COLORS.textPrimary,
    fontSize: FONTS.size.md,
  },
  errorText: {
    color: 'red',
    fontSize: FONTS.size.xs,
    marginTop: 4,
  },
  
  // Logos Styles
  socialContainer: {
    marginTop: SPACING.lg,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dividerText: {
    color: COLORS.textSecondary,
    paddingHorizontal: SPACING.md,
    fontSize: FONTS.size.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  logosRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.xs,
  },
  logoBox: {
    width: 60,
    height: 60,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.bgCard,
    padding: SPACING.xs,
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },

  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: SPACING.lg,
  },
  footerText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.size.sm,
  },
  footerLink: {
    color: COLORS.primary,
    fontSize: FONTS.size.sm,
    fontWeight: '700',
  },
  accentLine: {
    height: 2,
    backgroundColor: COLORS.primary,
    borderRadius: 1,
    marginTop: SPACING.xl,
    opacity: 0.3,
    marginHorizontal: SPACING.xl,
  },

  // Modal Styles - Locked to High Contrast Light Mode
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: '#FFFFFF', 
    borderTopLeftRadius: RADIUS.lg,
    borderTopRightRadius: RADIUS.lg,
    padding: SPACING.lg,
    maxHeight: '75%', 
  },
  modalTitle: {
    fontSize: FONTS.size.lg,
    fontWeight: 'bold',
    color: '#333333', 
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    height: 45,
  },
  searchIcon: {
    marginRight: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    color: '#333333',
    height: '100%',
  },
  teamOption: {
    paddingVertical: SPACING.md,
  },
  teamOptionText: {
    fontSize: FONTS.size.md,
    color: '#333333', 
  },
  separator: {
    height: 1,
    backgroundColor: '#E0E0E0',
  },
  emptyText: {
    textAlign: 'center',
    color: '#666666',
    padding: SPACING.lg,
  },
  closeModalButton: {
    marginTop: SPACING.md,
    padding: SPACING.md,
    backgroundColor: '#F0F0F0',
    borderRadius: RADIUS.sm,
    alignItems: 'center',
  },
  closeModalText: {
    color: '#333333', 
    fontWeight: 'bold',
  },
});