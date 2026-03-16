/**
 * ScreenHeader — thin wrapper used by screens that DON'T use AppLayout
 * (i.e. PatientDashboard, DoctorDashboard, Medicines, etc. that render their
 * own custom coloured header bar).
 *
 * Screens using AppLayout already get a Navbar automatically.
 *
 * Usage:
 *   <ScreenHeader title="Medicine Tracker" subtitle="Track your medications" onBack={() => router.back()} />
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import Colors from '../constants/colors';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: React.ReactNode;
  /** Override background colour — defaults to primaryDark */
  bg?: string;
}

export default function ScreenHeader({ title, subtitle, onBack, right, bg = Colors.primaryDark }: ScreenHeaderProps) {
  return (
    <SafeAreaView style={{ backgroundColor: bg }}>
      <View style={[styles.header, { backgroundColor: bg }]}>
        {onBack ? (
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
        ) : null}
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {right ? <View style={{ marginLeft: 10 }}>{right}</View> : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  backBtn: { marginRight: 12 },
  backIcon: { color: 'white', fontSize: 20, fontWeight: '700' },
  title: { fontSize: 18, fontWeight: '800', color: 'white', letterSpacing: -0.4 },
  subtitle: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 1 },
});
