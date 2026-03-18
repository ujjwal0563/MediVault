import React, { useRef, useState, useEffect, useCallback } from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet, Animated, Alert, RefreshControl } from 'react-native';
import { useRouter, Href } from 'expo-router';
import DrawerLayout from '../../components/DrawerLayout';
import { StatCard, Card, CardHeader, Badge, Button, ProgressBar } from '../../components/UI';
import { useTheme } from '../../context/ThemeContext';
import { patientAPI, medicineAPI } from '../../services/api';

interface DashboardData {
  activeMedicines: number;
  scheduledDosesToday: number;
  takenToday: number;
  missedToday: number;
  pendingToday: number;
  adherencePercent: number;
  unreadNotifications: number;
  recentRecordsCount: number;
}

interface DueDose {
  medicineId: string;
  medicineName: string;
  dosage: string;
  slot: string;
  scheduledTime: string;
  status: 'taken' | 'missed' | 'pending';
  isOverdue: boolean;
}

interface WeeklyTrend {
  date: string;
  total: number;
  taken: number;
  missed: number;
  adherencePercent: number;
}

interface Report {
  _id: string;
  reportType: string;
  originalName: string;
  fileUrl: string;
  createdAt: string;
}

function MedRow({ med, onMarkTaken }: { med: DueDose; onMarkTaken: (med: DueDose) => void }) {
  const { colors } = useTheme();
  const scale = useRef(new Animated.Value(1)).current;
  const isDue = med.status === 'pending' || med.status === 'missed';
  const isOverdue = med.isOverdue && med.status === 'pending';

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity activeOpacity={1}
        onPressIn={() => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, tension: 200 }).start()}
        onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 200 }).start()}
        style={[s.medRow, { backgroundColor: colors.bgCardHover, borderColor: colors.border }]}>
        <View style={[s.medDotBig, {
          backgroundColor: isOverdue ? colors.dangerSoft + '22' : colors.successSoft + '22',
          borderColor: isOverdue ? colors.danger + '55' : colors.success + '55'
        }]}>
          <View style={[s.medDotInner, {
            backgroundColor: isOverdue ? colors.danger : colors.success
          }]} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: '700', fontSize: 13, color: colors.textPrimary }}>{med.medicineName}</Text>
          <Text style={{ fontSize: 11, color: colors.textFaint, marginTop: 1 }}>
            ⏰ {med.slot} · {med.dosage}
          </Text>
        </View>
        {isDue ? (
          <Button
            label={med.status === 'missed' ? 'Retake ✓' : 'Mark Taken ✓'}
            onPress={() => onMarkTaken(med)}
            size="sm"
          />
        ) : (
          <Badge label="Taken" type="success" />
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

function QuickActionItem({ icon, label, route, bg, fg }: {
  icon: string; label: string; route: Href; bg: string; fg: string;
}) {
  const router = useRouter();
  const scale = useRef(new Animated.Value(1)).current;
  return (
    <Animated.View style={[s.qaItem, { transform: [{ scale }] }]}>
      <TouchableOpacity
        onPressIn={() => Animated.spring(scale, { toValue: 0.91, useNativeDriver: true, tension: 200 }).start()}
        onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 200 }).start()}
        onPress={() => router.push(route)}
        style={[s.qaBtn, { backgroundColor: bg, borderColor: fg + '30' }]}
        activeOpacity={1}>
        <Text style={{ fontSize: 28 }}>{icon}</Text>
        <Text style={[s.qaLabel, { color: fg }]}>{label}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function PatientDashboard() {
  const router = useRouter();
  const { colors, isDark, userName } = useTheme();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [dueDoses, setDueDoses] = useState<DueDose[]>([]);
  const [weeklyTrend, setWeeklyTrend] = useState<WeeklyTrend[]>([]);
  const [recentReports, setRecentReports] = useState<Report[]>([]);

  const fetchDashboard = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const [dashboardRes, dueDosesRes, weeklyRes, reportsRes] = await Promise.all([
        patientAPI.getDashboard(),
        medicineAPI.getDueDoses(),
        medicineAPI.getWeeklyAdherence(),
        patientAPI.getReports(),
      ]);

      setDashboard({
        activeMedicines: dashboardRes.summary.activeMedicines,
        scheduledDosesToday: dashboardRes.summary.scheduledDosesToday,
        takenToday: dashboardRes.summary.takenToday,
        missedToday: dashboardRes.summary.missedToday,
        pendingToday: dashboardRes.summary.pendingToday,
        adherencePercent: dashboardRes.summary.adherencePercent,
        unreadNotifications: dashboardRes.summary.unreadNotifications,
        recentRecordsCount: dashboardRes.summary.recentRecordsCount,
      });

      setDueDoses(dueDosesRes.dueDoses.slice(0, 5));
      setWeeklyTrend(weeklyRes.trend);
      setRecentReports(reportsRes.slice(0, 3));
    } catch (error) {
      console.error('Failed to fetch dashboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const onRefresh = useCallback(() => {
    fetchDashboard(true);
  }, [fetchDashboard]);

  const handleMarkTaken = async (dose: DueDose) => {
    try {
      await medicineAPI.markDoseStatus(dose.medicineId, 'taken', dose.scheduledTime);
      setDueDoses(prev =>
        prev.map(d =>
          d.medicineId === dose.medicineId && d.slot === dose.slot
            ? { ...d, status: 'taken' as const }
            : d
        )
      );
      fetchDashboard();
    } catch (error) {
      Alert.alert('Error', 'Failed to mark dose. Please try again.');
    }
  };

  const quickActions: Array<{ icon: string; label: string; route: Href; bg: string; fg: string }> = [
    { icon: '🩺', label: 'Symptoms', route: '/screens/Symptoms', bg: colors.primarySoft, fg: colors.primary },
    { icon: '📋', label: 'Reports', route: '/screens/Reports', bg: colors.tealSoft, fg: colors.teal },
    { icon: '💊', label: 'Medicines', route: '/screens/Medicines', bg: colors.successSoft, fg: colors.success },
    { icon: '🔲', label: 'QR Profile', route: '/screens/QRProfile', bg: colors.accentSoft, fg: colors.accent },
  ];

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getDayName = (dateStr: string) => {
    const date = new Date(dateStr);
    return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()];
  };

  const formatReportDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getReportIcon = (type: string) => {
    const lower = type.toLowerCase();
    if (lower.includes('blood')) return '🩸';
    if (lower.includes('x-ray') || lower.includes('xray')) return '📷';
    if (lower.includes('ultrasound')) return '🔊';
    if (lower.includes('ecg') || lower.includes('ekg')) return '❤️';
    if (lower.includes('ct')) return '🧠';
    if (lower.includes('mri')) return '🔬';
    return '📄';
  };

  return (
    <DrawerLayout title="My Health Dashboard" subtitle={`${getGreeting()}, ${userName || 'User'}! 👋`}
      role="patient" userName={userName}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        style={{ backgroundColor: colors.bgPage }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {/* Welcome Banner */}
        <View style={[s.banner, { backgroundColor: isDark ? '#062d2d' : '#0B4F6F' }]}>
          <View style={{ flex: 1 }}>
            <Text style={s.bannerTitle}>{getGreeting()}, {userName || 'User'}! 🌟</Text>
            <Text style={s.bannerSub}>
              {dashboard ? `${dashboard.scheduledDosesToday} medications scheduled today` : 'Loading...'}
            </Text>
            <View style={s.bannerBtns}>
              <TouchableOpacity onPress={() => router.push('/screens/Medicines')}
                style={[s.bannerBtn, { backgroundColor: 'rgba(255,255,255,0.9)' }]}>
                <Text style={[s.bannerBtnText, { color: '#0B4F6F' }]}>View Schedule</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.push('/screens/Symptoms')}
                style={[s.bannerBtn, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
                <Text style={[s.bannerBtnText, { color: 'white' }]}>Report Symptom</Text>
              </TouchableOpacity>
            </View>
          </View>
          <Text style={{ fontSize: 44 }}>🩺</Text>
          <View style={s.circle1} />
          <View style={s.circle2} />
        </View>

        {/* Stats */}
        <View style={s.statsGrid}>
          <View style={s.statHalf}>
            <StatCard icon="💊" value={String(dashboard?.activeMedicines ?? 0)} label="Medicines" iconBg={colors.primarySoft} />
          </View>
          <View style={s.statHalf}>
            <StatCard icon="✅" value={`${dashboard?.adherencePercent ?? 0}%`} label="Adherence" iconBg={colors.successSoft} valueColor={colors.success} />
          </View>
          <View style={s.statHalf}>
            <StatCard icon="📋" value={String(dashboard?.recentRecordsCount ?? 0)} label="Records (7d)" iconBg={colors.tealSoft} valueColor={colors.teal} />
          </View>
          <View style={s.statHalf}>
            <StatCard icon="🔔" value={String(dashboard?.unreadNotifications ?? 0)} label="Alerts" iconBg={colors.accentSoft} valueColor={colors.accent} />
          </View>
        </View>

        {/* Today's Medications */}
        <Card>
          <CardHeader title="💊 Today's Medications" right={
            <TouchableOpacity onPress={() => router.push('/screens/Medicines')}>
              <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700' }}>View All</Text>
            </TouchableOpacity>
          }/>
          <View style={{ padding: 16, gap: 2 }}>
            {loading ? (
              <Text style={{ color: colors.textMuted, textAlign: 'center', paddingVertical: 20 }}>Loading...</Text>
            ) : dueDoses.length === 0 ? (
              <Text style={{ color: colors.textMuted, textAlign: 'center', paddingVertical: 20 }}>
                No medications scheduled for today
              </Text>
            ) : (
              dueDoses.map((med, idx) => <MedRow key={`${med.medicineId}-${med.slot}-${idx}`} med={med} onMarkTaken={handleMarkTaken} />)
            )}
          </View>
        </Card>

        {/* Quick Actions */}
        <View style={s.qaGrid}>
          {quickActions.map(a => <QuickActionItem key={String(a.route)} {...a} />)}
        </View>

        {/* Score + Streak */}
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
          <View style={[s.scoreCard, { backgroundColor: isDark ? '#0a2c2c' : '#0D9488', flex: 1 }]}>
            <Text style={s.scoreCaption}>Health Score</Text>
            <Text style={s.scoreVal}>
              {dashboard?.adherencePercent ?? 0}<Text style={s.scoreMax}>/100</Text>
            </Text>
            <ProgressBar value={dashboard?.adherencePercent ?? 0} color="rgba(255,255,255,0.85)" height={6} style={{ marginVertical: 8 }} />
            <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>
              {dashboard && dashboard.adherencePercent >= 80 ? 'Excellent 🎉' : dashboard && dashboard.adherencePercent >= 50 ? 'Good 👍' : 'Needs improvement 📈'}
            </Text>
          </View>
          <View style={[s.scoreCard, { backgroundColor: isDark ? '#2d1200' : '#EA580C', flex: 1 }]}>
            <Text style={{ fontSize: 34 }}>🔥</Text>
            <Text style={s.scoreVal}>{dashboard?.takenToday ?? 0}</Text>
            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 2 }}>Doses Taken</Text>
            <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11, marginTop: 2 }}>{dashboard?.pendingToday ?? 0} pending 💪</Text>
          </View>
        </View>

        {/* Weekly Adherence */}
        <Card>
          <CardHeader title="📈 Weekly Adherence" right={
            <Badge
              label={dashboard?.adherencePercent && dashboard.adherencePercent >= 80 ? 'On track' : 'Keep going'}
              type={dashboard?.adherencePercent && dashboard.adherencePercent >= 80 ? 'success' : 'warning'}
            />
          }/>
          <View style={{ padding: 16 }}>
            <View style={s.barChart}>
              {weeklyTrend.map((day, i) => (
                <View key={i} style={{ flex: 1, alignItems: 'center', gap: 5 }}>
                  <View style={[s.bar, {
                    height: Math.max(4, day.adherencePercent * 0.6),
                    backgroundColor: i === weeklyTrend.length - 1 ? colors.primary : colors.primarySoft,
                    borderTopLeftRadius: 4, borderTopRightRadius: 4,
                  }]} />
                  <Text style={{ fontSize: 10, color: colors.textFaint }}>{getDayName(day.date)}</Text>
                </View>
              ))}
            </View>
          </View>
        </Card>

        {/* Recent Reports */}
        <Card>
          <CardHeader title="📁 Recent Reports" right={
            <TouchableOpacity onPress={() => router.push('/screens/Reports')}>
              <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700' }}>View All →</Text>
            </TouchableOpacity>
          }/>
          <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
            {recentReports.length === 0 ? (
              <Text style={{ color: colors.textMuted, textAlign: 'center', paddingVertical: 20 }}>
                No reports uploaded yet
              </Text>
            ) : (
              recentReports.map((r, i) => (
                <View key={r._id} style={[s.reportRow, i < recentReports.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.borderSoft }]}>
                  <View style={[s.reportIcon, { backgroundColor: colors.bgCardHover }]}>
                    <Text style={{ fontSize: 20 }}>{getReportIcon(r.reportType)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textPrimary }}>{r.reportType}</Text>
                    <Text style={{ fontSize: 11, color: colors.textFaint }}>{formatReportDate(r.createdAt)}</Text>
                  </View>
                  <Badge label="View" type="primary" />
                </View>
              ))
            )}
          </View>
        </Card>
      </ScrollView>
    </DrawerLayout>
  );
}

const s = StyleSheet.create({
  banner: {
    borderRadius: 20, padding: 22, marginBottom: 16,
    flexDirection: 'row', alignItems: 'center', overflow: 'hidden', position: 'relative',
  },
  bannerTitle: { fontSize: 19, fontWeight: '900', color: 'white', marginBottom: 4, letterSpacing: -0.4 },
  bannerSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 14 },
  bannerBtns: { flexDirection: 'row', gap: 8 },
  bannerBtn: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10 },
  bannerBtnText: { fontWeight: '700', fontSize: 12 },
  circle1: { position: 'absolute', width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.05)', right: -20, top: -30 },
  circle2: { position: 'absolute', width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.04)', right: 40, bottom: -30 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  statHalf: { width: '48%' },
  medRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 14, marginBottom: 8, borderWidth: 1, gap: 12 },
  medDotBig: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  medDotInner: { width: 12, height: 12, borderRadius: 6 },
  qaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  qaItem: { width: '48%' },
  qaBtn: { padding: 18, borderRadius: 16, alignItems: 'center', gap: 8, borderWidth: 1 },
  qaLabel: { fontSize: 13, fontWeight: '700' },
  scoreCard: { borderRadius: 20, padding: 18, alignItems: 'center' },
  scoreCaption: { fontSize: 11, color: 'rgba(255,255,255,0.65)', marginBottom: 6 },
  scoreVal: { fontSize: 40, fontWeight: '900', color: 'white', lineHeight: 44 },
  scoreMax: { fontSize: 16, fontWeight: '400', color: 'rgba(255,255,255,0.45)' },
  barChart: { flexDirection: 'row', alignItems: 'flex-end', height: 70, gap: 5 },
  bar: { flex: 1, minHeight: 4 },
  reportRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  reportIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
