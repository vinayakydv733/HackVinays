import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { collection, getDocs } from 'firebase/firestore';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { COLORS, FONTS, RADIUS, SPACING } from '../../constants/theme';
import { db } from '../../firebase/config';

export default function AnalyticsScreen() {
  const [exporting, setExporting] = useState(false);

  const handleExportData = async () => {
    setExporting(true);
    try {
      // 1. Fetch all collections
      const teamsSnap = await getDocs(collection(db, 'teams'));
      const usersSnap = await getDocs(collection(db, 'users'));
      const adviceSnap = await getDocs(collection(db, 'advice'));
      const helpRequestsSnap = await getDocs(collection(db, 'help_requests'));

      const teams = teamsSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
      const users = usersSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
      const advices = adviceSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
      const helpRequests = helpRequestsSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];

      // 2. Process data into CSV rows
      const headers = [
        'Team Name',
        'Team ID',
        'Checked In',
        'Project Submitted',
        'Score',
        'Submission Link',
        'Mentor Name',
        'Team Members (Count)',
        'Team Members (Names)',
        'Total Advice Received',
        'Total Passes Requested',
        'Total Tech/SOS Requests'
      ];

      const csvRows = [headers.join(',')];

      teams.forEach((team) => {
        // Find users for this team
        const teamUsers = users.filter((u) => u.teamId === team.id || u.teamName === (team.name || team.teamName));
        const memberNames = teamUsers.map(u => u.name || u.email).join('; ');
        
        // Mentor Fallback
        const mentor = team.mentorName || teamUsers.find(u => u.mentorName)?.mentorName || 'Unassigned';

        // Filter help requests
        const teamHelp = helpRequests.filter((r) => r.teamId === team.id);
        const teamPasses = teamHelp.filter(r => r.type === 'pass_game' || r.type === 'pass_restroom');
        const teamSOS = teamHelp.filter(r => r.type === 'sos' || r.type === 'tech');

        // Filter advice
        const teamAdviceCount = advices.filter((a) => a.teamId === team.id).length;

        const row = [
          `"${team.name || team.teamName || 'Unknown Team'}"`,
          `"${team.id}"`,
          team.checkedIn ? 'Yes' : 'No',
          team.projectSubmitted ? 'Yes' : 'No',
          team.score || 0,
          `"${team.submissionLink || ''}"`,
          `"${mentor}"`,
          teamUsers.length,
          `"${memberNames}"`,
          teamAdviceCount,
          teamPasses.length,
          teamSOS.length
        ];

        csvRows.push(row.join(','));
      });

      const csvString = csvRows.join('\n');

      // 3. Save & Share/Download the file
      if (Platform.OS === 'web') {
        const blob = new Blob([csvString], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Hackathon_Complete_Data_${new Date().getTime()}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
        Alert.alert('Success', 'Data exported successfully to your downloads.');
      } else {
        const fileName = `Hackathon_Complete_Data_${new Date().getTime()}.csv`;
        const fileUri = `${FileSystem.documentDirectory}${fileName}`;
        
        await FileSystem.writeAsStringAsync(fileUri, csvString);

        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(fileUri, {
            mimeType: 'text/csv',
            dialogTitle: 'Export Hackathon Data',
          });
        } else {
          Alert.alert('Saved', `File saved to ${fileUri}`);
        }
      }
    } catch (error: any) {
      console.error(error);
      Alert.alert('Error', `Failed to export data: ${error.message}`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Analytics & Export</Text>
        <Text style={styles.subtitle}>Comprehensive data access</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.card}>
          <View style={styles.iconBox}>
            <Ionicons name="document-text" size={32} color={COLORS.primary} />
          </View>
          <Text style={styles.cardTitle}>Complete Database Export</Text>
          <Text style={styles.cardDesc}>
            Download a full CSV (Excel-compatible) spreadsheet containing all teams, members, mentors, scores, submissions, and aggregated request counts.
          </Text>

          <TouchableOpacity
            style={styles.exportBtn}
            onPress={handleExportData}
            disabled={exporting}
          >
            {exporting ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <>
                <Ionicons name="download" size={20} color={COLORS.white} />
                <Text style={styles.exportBtnText}>Generate Excel / CSV File</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.comingSoon}>
          <Ionicons name="bar-chart" size={48} color={COLORS.border} />
          <Text style={styles.comingSoonText}>More visual analytics coming soon.</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl + 10,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: FONTS.size.xl,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: FONTS.size.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  content: {
    padding: SPACING.lg,
  },
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.xl,
  },
  iconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  cardTitle: {
    fontSize: FONTS.size.lg,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  cardDesc: {
    fontSize: FONTS.size.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: SPACING.xl,
  },
  exportBtn: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: RADIUS.md,
    gap: SPACING.sm,
    width: '100%',
  },
  exportBtnText: {
    color: COLORS.white,
    fontSize: FONTS.size.md,
    fontWeight: 'bold',
  },
  comingSoon: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
    marginTop: SPACING.xl,
  },
  comingSoonText: {
    marginTop: SPACING.md,
    color: COLORS.textDim,
    fontSize: FONTS.size.md,
  },
});
