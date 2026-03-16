import React from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Polyline } from 'react-native-svg';
import Colors from '../../constants/colors';
import DrawerLayout from '../../components/DrawerLayout';
import { StatCard, Card, CardHeader, Badge, Button, ProgressBar, Avatar } from '../../components/UI';
import { allPatients, doctorAlerts } from '../../data/mockData';

const weekBars = [65, 72, 68, 80, 75, 87, 92];
const weekDays = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

function MiniTrend({ data, color = Colors.primary }: { data: number[]; color?: string }) {
  const max = Math.max(...data);
  const pts = data.map((v, i) => `${i * 10},${28 - (v / max) * 24}`).join(' ');
  return (
    <Svg width={60} height={28}>
      <Polyline points={pts} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export default function DoctorDashboard() {
  const router = useRouter();

  return (
    <DrawerLayout
      title="Doctor Dashboard"
      subtitle="Monday, 14 March 2026"
      role="doctor"
      userName="Dr. Sharma"
      userInitial="DS"
      headerRight={
        <Button label="+ Add Patient" onPress={() => router.push('/screens/PatientDetails' as any)} size="sm"
          style={{ backgroundColor: 'rgba(255,255,255,0.2)' }} />
      }
    >
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

        {/* Stats */}
        <View style={styles.statsGrid}>
          <View style={styles.statHalf}><StatCard icon="👥" value="28" label="Total Patients" /></View>
          <View style={styles.statHalf}><StatCard icon="🚨" value="2"   label="Critical Alerts" iconBg={Colors.dangerSoft}  valueColor={Colors.danger}  /></View>
          <View style={styles.statHalf}><StatCard icon="📊" value="92%" label="Avg Adherence"  iconBg={Colors.successSoft} valueColor={Colors.success} /></View>
          <View style={styles.statHalf}><StatCard icon="📋" value="5"   label="Pending Reports" iconBg={Colors.warningSoft} /></View>
        </View>

        {/* Recent Alerts */}
        <Card>
          <CardHeader title="🚨 Recent Alerts" right={
            <Button label="View All" onPress={() => router.push('/screens/Alerts' as any)} variant="outline" size="sm" />
          }/>
          <View style={{ paddingHorizontal: 16 }}>
            {doctorAlerts.map((alert, i) => (
              <View key={alert.id} style={[styles.alertRow, i < doctorAlerts.length - 1 && styles.alertBorder]}>
                <View style={[styles.alertDot, { backgroundColor: alert.severity === 'critical' ? Colors.danger : Colors.warning }]} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '700', fontSize: 13, color: Colors.gray800 }}>{alert.patient}</Text>
                  <Text style={{ fontSize: 12, color: Colors.gray500 }}>— {alert.issue}</Text>
                </View>
                <Badge label={alert.issue} type={alert.severity === 'critical' ? 'danger' : 'warning'} />
                <Text style={{ fontSize: 10, color: Colors.gray400, marginLeft: 6 }}>{alert.time}</Text>
              </View>
            ))}
          </View>
        </Card>

        {/* Health Overview */}
        <Card>
          <CardHeader title="📈 Patient Health Overview" />
          <View style={{ padding: 16 }}>
            <View style={{ flexDirection: 'row', gap: 20, marginBottom: 14 }}>
              <View>
                <Text style={{ fontSize: 22, fontWeight: '800', color: Colors.primary }}>87%</Text>
                <Text style={{ fontSize: 11, color: Colors.gray500 }}>Overall Adherence</Text>
              </View>
              <View>
                <Text style={{ fontSize: 22, fontWeight: '800', color: Colors.success }}>+12%</Text>
                <Text style={{ fontSize: 11, color: Colors.gray500 }}>vs Last Week</Text>
              </View>
            </View>
            <View style={styles.barChart}>
              {weekBars.map((v, i) => (
                <View key={i} style={{ flex: 1, alignItems: 'center' }}>
                  <View style={[styles.bar, { height: v * 0.5, backgroundColor: i === 6 ? Colors.primary : Colors.primarySoft }]} />
                </View>
              ))}
            </View>
            <View style={{ flexDirection: 'row', marginTop: 6 }}>
              {weekDays.map(d => <Text key={d} style={styles.barLabel}>{d}</Text>)}
            </View>
          </View>
        </Card>

        {/* Patients Overview */}
        <Card>
          <CardHeader title="👥 Patients Overview" right={
            <Button label="View All" onPress={() => router.push('/screens/Patients' as any)} variant="outline" size="sm" />
          }/>
          <View style={{ padding: 16 }}>
            {allPatients.slice(0, 3).map((p, i) => (
              <View key={p.id} style={[styles.patientRow,
                i < 2 && { borderBottomWidth: 1, borderBottomColor: Colors.gray100, paddingBottom: 12, marginBottom: 12 }]}>
                <Avatar initials={p.name.split(' ').map(n => n[0]).join('')} size={36} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={{ fontWeight: '600', fontSize: 13, color: Colors.gray800 }}>{p.name}</Text>
                  <Badge label={p.condition} />
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <ProgressBar value={p.adherence} color={p.adherence < 75 ? Colors.danger : Colors.success} style={{ width: 60 }} />
                  <Text style={{ fontSize: 12, fontWeight: '600', color: p.adherence < 75 ? Colors.danger : Colors.success }}>{p.adherence}%</Text>
                </View>
                <TouchableOpacity onPress={() => router.push('/screens/PatientDetails' as any)} style={{ marginLeft: 8 }}>
                  <Text style={{ color: Colors.primary, fontSize: 12, fontWeight: '600' }}>View →</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </Card>

      </ScrollView>
    </DrawerLayout>
  );
}

const styles = StyleSheet.create({
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  statHalf: { width: '48%' },
  alertRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 8 },
  alertBorder: { borderBottomWidth: 1, borderBottomColor: Colors.gray100 },
  alertDot: { width: 8, height: 8, borderRadius: 4 },
  barChart: { flexDirection: 'row', alignItems: 'flex-end', height: 50, gap: 4 },
  bar: { flex: 1, borderRadius: 3, minHeight: 4 },
  barLabel: { flex: 1, fontSize: 9, color: Colors.gray400, textAlign: 'center' },
  patientRow: { flexDirection: 'row', alignItems: 'center' },
});
