import React from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import Colors from '../../constants/colors';
import DrawerLayout from '../../components/DrawerLayout';
import { StatCard, Card, CardHeader, Badge, Button, ProgressBar } from '../../components/UI';

const medications = [
  { id: 1, time: '8:00 AM', name: 'Paracetamol 500mg', color: '#DC2626', status: 'due' },
  { id: 2, time: '2:00 PM', name: 'Vitamin C',         color: '#D97706', status: 'upcoming' },
  { id: 3, time: '8:00 PM', name: 'Antibiotic',        color: '#16A34A', status: 'upcoming' },
];
const weekBars = [75, 82, 78, 90, 85, 92, 88];
const weekDays = ['M','T','W','T','F','S','S'];
const recentReports = [
  { icon: '🔬', name: 'Blood Test',  date: 'Apr 5, 2024',  tag: 'Normal'   },
  { icon: '🫁', name: 'Chest X-Ray', date: 'Apr 12, 2024', tag: 'Reviewed' },
  { icon: '🔊', name: 'Ultrasound',  date: 'Mar 20, 2024', tag: 'Pending'  },
];
const tagType: Record<string, 'success'|'primary'|'warning'> = {
  Normal: 'success', Reviewed: 'primary', Pending: 'warning',
};

export default function PatientDashboard() {
  const router = useRouter();

  return (
    <DrawerLayout
      title="My Health Dashboard"
      subtitle="Good Morning, Rahul! 👋"
      role="patient"
      userName="Rahul Singh"
      userInitial="RS"
    >
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Welcome Banner */}
        <View style={styles.banner}>
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>Good Morning, Rahul! 🌟</Text>
            <Text style={styles.bannerSub}>You have 3 medications scheduled today</Text>
            <View style={styles.bannerBtns}>
              <TouchableOpacity onPress={() => router.push('/screens/Medicines' as any)} style={styles.bannerBtn}>
                <Text style={styles.bannerBtnText}>View Schedule</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.push('/screens/Symptoms' as any)} style={styles.bannerBtnGhost}>
                <Text style={styles.bannerBtnGhostText}>Report Symptom</Text>
              </TouchableOpacity>
            </View>
          </View>
          <Text style={{ fontSize: 40 }}>🩺</Text>
        </View>

        {/* Stats */}
        <View style={styles.statsGrid}>
          <View style={styles.statHalf}><StatCard icon="🔥" value="7"      label="Day Streak"    iconBg={Colors.accentSoft}  valueColor={Colors.accent}   /></View>
          <View style={styles.statHalf}><StatCard icon="✅" value="92%"    label="Adherence"     iconBg={Colors.successSoft} valueColor={Colors.success}  /></View>
          <View style={styles.statHalf}><StatCard icon="❤️" value="85/100" label="Health Score"  iconBg={Colors.primarySoft}                               /></View>
          <View style={styles.statHalf}><StatCard icon="📋" value="3"      label="Reports"       iconBg={Colors.tealSoft}                                  /></View>
        </View>

        {/* Today's Medications */}
        <Card>
          <CardHeader title="💊 Today's Medications" right={
            <TouchableOpacity onPress={() => router.push('/screens/Medicines' as any)}>
              <Text style={{ color: Colors.primary, fontSize: 12, fontWeight: '600' }}>+ Add</Text>
            </TouchableOpacity>
          }/>
          <View style={{ padding: 16 }}>
            {medications.map(med => (
              <View key={med.id} style={styles.medRow}>
                <Text style={styles.medTime}>{med.time}</Text>
                <View style={[styles.medDot, { backgroundColor: med.color }]} />
                <Text style={styles.medName}>{med.name}</Text>
                {med.status === 'due'
                  ? <Button label="Mark Taken ✓" onPress={() => {}} size="sm" />
                  : <Badge label="Upcoming" type="primary" />
                }
              </View>
            ))}
          </View>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader title="⚡ Quick Actions" />
          <View style={styles.qaGrid}>
            {[
              { icon: '🩺', label: 'Report Symptoms', route: '/screens/Symptoms',  bg: Colors.primarySoft  },
              { icon: '📋', label: 'View Reports',    route: '/screens/Reports',   bg: Colors.tealSoft    },
              { icon: '💊', label: 'Med Tracker',     route: '/screens/Medicines', bg: Colors.successSoft },
              { icon: '🔲', label: 'QR Profile',      route: '/screens/QRProfile', bg: Colors.accentSoft  },
            ].map(a => (
              <TouchableOpacity key={a.route} onPress={() => router.push(a.route as any)}
                style={[styles.qaItem, { backgroundColor: a.bg }]}>
                <Text style={{ fontSize: 22 }}>{a.icon}</Text>
                <Text style={styles.qaLabel}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* Weekly Adherence */}
        <Card>
          <CardHeader title="📈 Weekly Adherence" right={<Badge label="+5% vs last week" type="success" />} />
          <View style={{ padding: 16 }}>
            <View style={styles.barChart}>
              {weekBars.map((v, i) => (
                <View key={i} style={{ flex: 1, alignItems: 'center' }}>
                  <View style={[styles.bar, { height: v * 0.6, backgroundColor: i === 5 ? Colors.primary : Colors.primarySoft }]} />
                </View>
              ))}
            </View>
            <View style={{ flexDirection: 'row', marginTop: 6 }}>
              {weekDays.map((d, i) => <Text key={i} style={styles.barLabel}>{d}</Text>)}
            </View>
          </View>
        </Card>

        {/* Score Cards */}
        <View style={styles.scoreCards}>
          <View style={[styles.scoreCard, { backgroundColor: Colors.teal }]}>
            <Text style={styles.scoreCaption}>Health Score</Text>
            <Text style={styles.scoreValue}>85<Text style={styles.scoreMax}>/100</Text></Text>
            <ProgressBar value={85} color="rgba(255,255,255,0.8)" style={{ marginVertical: 8 }} />
            <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>Excellent condition 🎉</Text>
          </View>
          <View style={[styles.scoreCard, { backgroundColor: Colors.accent }]}>
            <Text style={{ fontSize: 32 }}>🔥</Text>
            <Text style={styles.scoreValue}>7</Text>
            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 2 }}>Day Streak!</Text>
            <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, marginTop: 2 }}>Keep it up! 💪</Text>
          </View>
        </View>

        {/* Doctor Card */}
        <Card>
          <View style={{ padding: 16 }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: Colors.gray500, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Your Doctor</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 22 }}>👨‍⚕️</Text>
              </View>
              <View>
                <Text style={{ fontWeight: '700', fontSize: 14, color: Colors.gray800 }}>Dr. Meera Kapoor</Text>
                <Text style={{ fontSize: 11, color: Colors.gray500 }}>General Physician</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Button label="📞 Call"    onPress={() => {}} style={{ flex: 1 }} size="sm" />
              <Button label="💬 Message" onPress={() => router.push('/screens/Messages' as any)} variant="outline" style={{ flex: 1 }} size="sm" />
            </View>
          </View>
        </Card>

        {/* Recent Reports */}
        <Card>
          <CardHeader title="📁 My Reports" right={
            <TouchableOpacity onPress={() => router.push('/screens/Reports' as any)}>
              <Text style={{ color: Colors.primary, fontSize: 12, fontWeight: '600' }}>View All →</Text>
            </TouchableOpacity>
          }/>
          <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
            {recentReports.map((r, i) => (
              <View key={i} style={[styles.reportRow, i < 2 && styles.reportBorder]}>
                <Text style={{ fontSize: 20 }}>{r.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: Colors.gray800 }}>{r.name}</Text>
                  <Text style={{ fontSize: 11, color: Colors.gray400 }}>{r.date}</Text>
                </View>
                <Badge label={r.tag} type={tagType[r.tag] || 'primary'} />
              </View>
            ))}
          </View>
        </Card>

      </ScrollView>
    </DrawerLayout>
  );
}

const styles = StyleSheet.create({
  banner: { backgroundColor: Colors.primaryDark, borderRadius: 16, padding: 20, marginBottom: 16, flexDirection: 'row', alignItems: 'center', overflow: 'hidden' },
  bannerTitle: { fontSize: 18, fontWeight: '800', color: 'white', marginBottom: 4 },
  bannerSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 12 },
  bannerBtns: { flexDirection: 'row', gap: 8 },
  bannerBtn: { backgroundColor: 'white', paddingVertical: 7, paddingHorizontal: 14, borderRadius: 8 },
  bannerBtnText: { color: Colors.primary, fontWeight: '700', fontSize: 12 },
  bannerBtnGhost: { backgroundColor: 'rgba(255,255,255,0.15)', paddingVertical: 7, paddingHorizontal: 14, borderRadius: 8 },
  bannerBtnGhostText: { color: 'white', fontWeight: '600', fontSize: 12 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  statHalf: { width: '48%' },
  medRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 10, borderBottomWidth: 1, borderBottomColor: Colors.gray100 },
  medTime: { fontSize: 10, fontWeight: '700', color: Colors.gray500, width: 52 },
  medDot: { width: 10, height: 10, borderRadius: 5 },
  medName: { flex: 1, fontSize: 13, fontWeight: '600', color: Colors.gray800 },
  qaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, padding: 16 },
  qaItem: { width: '47%', padding: 14, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  qaLabel: { fontSize: 13, fontWeight: '600', color: Colors.gray800 },
  barChart: { flexDirection: 'row', alignItems: 'flex-end', height: 60, gap: 4 },
  bar: { flex: 1, borderRadius: 3, minHeight: 4 },
  barLabel: { flex: 1, fontSize: 10, color: Colors.gray400, textAlign: 'center' },
  scoreCards: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  scoreCard: { flex: 1, borderRadius: 16, padding: 16, alignItems: 'center' },
  scoreCaption: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginBottom: 6 },
  scoreValue: { fontSize: 38, fontWeight: '900', color: 'white', lineHeight: 40 },
  scoreMax: { fontSize: 16, fontWeight: '400', color: 'rgba(255,255,255,0.5)' },
  reportRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  reportBorder: { borderBottomWidth: 1, borderBottomColor: Colors.gray100 },
});
