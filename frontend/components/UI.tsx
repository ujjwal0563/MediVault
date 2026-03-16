import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Colors from '../constants/colors';

// ─── StatCard ───────────────────────────────────────────
interface StatCardProps {
  icon: string;
  value: string | number;
  label: string;
  iconBg?: string;
  valueColor?: string;
}
export function StatCard({ icon, value, label, iconBg = Colors.primarySoft, valueColor }: StatCardProps) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: iconBg }]}>
        <Text style={{ fontSize: 20 }}>{icon}</Text>
      </View>
      <View style={styles.statInfo}>
        <Text style={[styles.statValue, valueColor ? { color: valueColor } : {}]}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
    </View>
  );
}

// ─── Card ───────────────────────────────────────────────
interface CardProps {
  children: React.ReactNode;
  style?: object;
}
export function Card({ children, style }: CardProps) {
  return <View style={[styles.card, style]}>{children}</View>;
}

// ─── CardHeader ─────────────────────────────────────────
interface CardHeaderProps {
  title: string;
  right?: React.ReactNode;
}
export function CardHeader({ title, right }: CardHeaderProps) {
  return (
    <View style={styles.cardHeader}>
      <Text style={styles.cardTitle}>{title}</Text>
      {right}
    </View>
  );
}

// ─── Badge ──────────────────────────────────────────────
interface BadgeProps {
  label: string;
  type?: 'primary' | 'success' | 'danger' | 'warning' | 'teal' | 'default';
  style?: object;
  textStyle?: object;
}
const badgeColors: Record<string, { bg: string; color: string }> = {
  primary: { bg: Colors.primarySoft, color: Colors.primary },
  success: { bg: Colors.successSoft, color: Colors.success },
  danger:  { bg: Colors.dangerSoft,  color: Colors.danger  },
  warning: { bg: Colors.warningSoft, color: Colors.warning },
  teal:    { bg: Colors.tealSoft,    color: Colors.teal    },
  default: { bg: Colors.gray100,     color: Colors.gray600 },
};
export function Badge({ label, type = 'primary', style, textStyle }: BadgeProps) {
  const bc = badgeColors[type] || badgeColors.default;
  return (
    <View style={[styles.badge, { backgroundColor: bc.bg }, style]}>
      <Text style={[styles.badgeText, { color: bc.color }, textStyle]}>{label}</Text>
    </View>
  );
}

// ─── PrimaryButton ──────────────────────────────────────
interface ButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'outline' | 'success' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  style?: object;
}
export function Button({ label, onPress, disabled, variant = 'primary', size = 'md', style }: ButtonProps) {
  const bg = variant === 'primary' ? Colors.primary
    : variant === 'success' ? Colors.success
    : variant === 'danger'  ? Colors.danger
    : 'transparent';
  const textColor = variant === 'outline' ? Colors.primary : Colors.white;
  const borderColor = variant === 'outline' ? Colors.primary : 'transparent';
  const pad = size === 'sm' ? { paddingVertical: 6, paddingHorizontal: 12 }
    : size === 'lg' ? { paddingVertical: 14, paddingHorizontal: 24 }
    : { paddingVertical: 10, paddingHorizontal: 18 };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.button,
        pad,
        { backgroundColor: bg, borderColor, borderWidth: variant === 'outline' ? 1.5 : 0, opacity: disabled ? 0.5 : 1 },
        style,
      ]}
      activeOpacity={0.75}
    >
      <Text style={[styles.buttonText, { color: textColor, fontSize: size === 'sm' ? 12 : size === 'lg' ? 15 : 13 }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ─── ProgressBar ────────────────────────────────────────
interface ProgressBarProps {
  value: number; // 0–100
  color?: string;
  height?: number;
  style?: object;
}
export function ProgressBar({ value, color = Colors.primary, height = 6, style }: ProgressBarProps) {
  return (
    <View style={[{ height, borderRadius: height / 2, backgroundColor: Colors.gray100, overflow: 'hidden' }, style]}>
      <View style={{ width: `${Math.min(100, value)}%`, height: '100%', backgroundColor: color, borderRadius: height / 2 }} />
    </View>
  );
}

// ─── Avatar ─────────────────────────────────────────────
export function Avatar({ initials, size = 40 }: { initials: string; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: Colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: size * 0.35, fontWeight: '800', color: Colors.primary }}>{initials}</Text>
    </View>
  );
}

// ─── SectionTitle ───────────────────────────────────────
export function SectionTitle({ children }: { children: string }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

// ─── Divider ────────────────────────────────────────────
export function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  statCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 4,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  statIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  statInfo: { flex: 1 },
  statValue: { fontSize: 22, fontWeight: '800', color: Colors.gray900 },
  statLabel: { fontSize: 11, color: Colors.gray500, marginTop: 1 },

  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  cardTitle: { fontSize: 14, fontWeight: '700', color: Colors.gray800 },

  badge: { borderRadius: 20, paddingVertical: 3, paddingHorizontal: 9 },
  badgeText: { fontSize: 11, fontWeight: '700' },

  button: { borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
  buttonText: { fontWeight: '700' },

  sectionTitle: { fontSize: 11, fontWeight: '700', color: Colors.gray500, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  divider: { height: 1, backgroundColor: Colors.gray100, marginVertical: 12 },
});
