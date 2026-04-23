import {
    ActivityIndicator,
    StyleSheet,
    Text,
    TouchableOpacity,
    ViewStyle,
} from 'react-native';
import { COLORS, FONTS, RADIUS, SPACING } from '../../constants/theme';

interface Props {
  title: string;
  onPress: () => void;
  loading?: boolean;
  variant?: 'primary' | 'outline' | 'ghost' | 'danger';
  style?: ViewStyle;
  disabled?: boolean;
}

export default function Button({
  title,
  onPress,
  loading = false,
  variant = 'primary',
  style,
  disabled = false,
}: Props) {
  const bgColor = {
    primary: COLORS.primary,
    outline: 'transparent',
    ghost: 'transparent',
    danger: COLORS.red,
  }[variant];

  const textColor = {
    primary: COLORS.bg,
    outline: COLORS.primary,
    ghost: COLORS.textSecondary,
    danger: COLORS.white,
  }[variant];

  const borderColor = {
    primary: 'transparent',
    outline: COLORS.primary,
    ghost: 'transparent',
    danger: 'transparent',
  }[variant];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.btn,
        {
          backgroundColor: bgColor,
          borderColor,
          borderWidth: variant === 'outline' ? 1.5 : 0,
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' ? COLORS.bg : COLORS.primary}
          size="small"
        />
      ) : (
        <Text style={[styles.text, { color: textColor }]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    height: 52,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
  },
  text: {
    fontSize: FONTS.size.md,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});