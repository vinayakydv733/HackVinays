import { Text, View } from 'react-native';
import { COLORS, SPACING } from '../../constants/theme';

export default function ResourcesScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: 18, fontWeight: 'bold', color: COLORS.textPrimary }}>Resources Management</Text>
      <Text style={{ marginTop: SPACING.md, color: COLORS.textSecondary }}>Coming soon</Text>
    </View>
  );
}
