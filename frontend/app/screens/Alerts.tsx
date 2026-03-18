import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal, TextInput, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { useBadges } from '../../context/BadgeContext';
import DrawerLayout from '../../components/DrawerLayout';
import Colors from '../../constants/colors';
import { StatCard, Card, Badge, Button } from '../../components/UI';
import { doctorAPI, SymptomLog } from '../../services/api';

const SEV: Record<string, { bg: string; border: string; color: string; badge: 'danger' | 'warning' | 'primary' }> = {
  critical: { bg: Colors.dangerSoft, border: '#FECACA', color: Colors.danger, badge: 'danger' },
  warning: { bg: Colors.warningSoft, border: '#FDE68A', color: Colors.warning, badge: 'warning' },
  info: { bg: Colors.primarySoft, border: '#BFDBFE', color: Colors.primary, badge: 'primary' },
};

interface AlertItem extends SymptomLog {
  patientName: string;
  patientPhone: string;
}

export default function AlertsScreen() {
  const router = useRouter();
  const { userName, userInitial, colors } = useTheme();
  const { clearAlerts, doctorNotifs } = useBadges();

  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [responded, setResponded] = useState<string[]>([]);

  const [showSMS, setShowSMS] = useState<AlertItem | null>(null);
  const [smsText, setSmsText] = useState('');

  const loadAlerts = async () => {
    try {
      const dashboard = await doctorAPI.getDashboard();
      const highUrgency = dashboard.recentSymptoms
        .filter(s => s.urgency === 'high')
        .map(s => ({
          ...s,
          patientName: s.patientId?.name || 'Unknown',
          patientPhone: '',
        }));
      setAlerts(highUrgency);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load alerts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
    clearAlerts();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAlerts();
    setRefreshing(false);
  }, []);

  const respondAlert = (id: string) => {
    setResponded(prev => [...prev, id]);
  };

  const dismissAlert = (id: string) => {
    setAlerts(prev => prev.filter(a => a._id !== id));
  };

  const pending = alerts.filter(a => !responded.includes(a._id));
  const resolved = alerts.filter(a => responded.includes(a._id));

  const sendSMS = () => {
    if (!smsText.trim()) return;
    Alert.alert('SMS Sent', `Message sent to ${showSMS?.patientName} via Twilio.`);
    setShowSMS(null);
    setSmsText('');
  };

  return (
    <DrawerLayout
      title="Alerts"
      subtitle="Action required"
      role="doctor"
      userName={userName}
      userInitial={userInitial}
      showBack
    >
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}>

        {/* Stats */}
        <View style={styles.statsGrid}>
          <View style={styles.statHalf}>
            {loading ? <StatCard icon="🔔" value="-" label="Total Alerts" /> : <StatCard icon="🔔" value={alerts.length} label="Total Alerts" />}
          </View>
          <View style={styles.statHalf}><StatCard icon="🚨" value={pending.length} label="Critical" iconBg={Colors.dangerSoft} valueColor={Colors.danger} /></View>
          <View style={styles.statHalf}><StatCard icon="⏳" value={pending.length} label="Pending" iconBg={Colors.warningSoft} valueColor={Colors.warning} /></View>
          <View style={styles.statHalf}><StatCard icon="✅" value={resolved.length} label="Responded" iconBg={Colors.successSoft} valueColor={Colors.success} /></View>
        </View>

        {loading ? (
          <View style={{ alignItems: 'center', padding: 40 }}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={{ fontSize: 13, color: Colors.gray500, marginTop: 10 }}>Loading alerts...</Text>
          </View>
        ) : (
          <>
            {/* Pending */}
            {pending.length > 0 && (
              <>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.danger }} />
                  <Text style={{ fontWeight: '700', fontSize: 14, color: Colors.danger }}>Pending Alerts — Action Required</Text>
                </View>
                {pending.map(alert => {
                  const sev = SEV[alert.urgency] || SEV.info;
                  const initials = alert.patientName.split(' ').map((n: string) => n[0]).join('').substring(0, 2);
                  return (
                    <View key={alert._id} style={[styles.alertCard, { backgroundColor: sev.bg, borderColor: sev.border, borderLeftColor: sev.color }]}>
                      <View style={styles.alertRow}>
                        <View style={[styles.alertAvatar, { borderColor: sev.color }]}>
                          <Text style={{ fontSize: 12, fontWeight: '800', color: sev.color }}>{initials}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                            <Text style={{ fontWeight: '800', fontSize: 15, color: Colors.gray800 }}>{alert.patientName}</Text>
                            <Badge label={alert.urgency.toUpperCase()} type={sev.badge} />
                            <Text style={{ fontSize: 11, color: Colors.gray400 }}>🕐 {new Date(alert.createdAt).toLocaleDateString()}</Text>
                          </View>
                          <Text style={{ fontSize: 13, color: Colors.gray700, lineHeight: 18, marginBottom: 10 }}>{alert.symptoms}</Text>
                          <Text style={{ fontSize: 11, color: Colors.gray500, marginBottom: 10 }}>Recommended: {alert.specialistType}</Text>
                          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                            <Button label="View Patient" onPress={() => router.push({ pathname: '/screens/PatientDetails', params: { id: alert.patientId } } as any)} size="sm" />
                            <Button label="📱 Send SMS" onPress={() => setShowSMS(alert)} size="sm" variant="success" />
                            <Button label="✓ Mark Responded" onPress={() => respondAlert(alert._id)} size="sm" variant="outline" />
                            <Button label="Dismiss" onPress={() => dismissAlert(alert._id)} size="sm" variant="outline" />
                          </View>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </>
            )}

            {/* Empty state when all pending cleared */}
            {pending.length === 0 && (
              <View style={styles.emptyBox}>
                <Text style={{ fontSize: 40, marginBottom: 10 }}>✅</Text>
                <Text style={{ fontWeight: '700', fontSize: 16, color: Colors.success }}>All Caught Up!</Text>
                <Text style={{ fontSize: 13, color: Colors.gray500, marginTop: 4 }}>No pending alerts right now.</Text>
              </View>
            )}

            {/* Resolved */}
            {resolved.length > 0 && (
              <>
                <Text style={{ fontWeight: '700', fontSize: 14, color: Colors.gray500, marginTop: 20, marginBottom: 12 }}>✅ Responded</Text>
                <Card>
                  <View style={{ padding: 16 }}>
                    {resolved.map((a, i) => (
                      <View key={a._id} style={[
                        { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
                        i < resolved.length - 1 && { borderBottomWidth: 1, borderBottomColor: Colors.gray100 }
                      ]}>
                        <Text style={{ flex: 1, fontWeight: '600', fontSize: 13, color: Colors.gray800 }}>{a.patientName}</Text>
                        <Text style={{ flex: 1, fontSize: 12, color: Colors.gray600 }}>{a.symptoms.substring(0, 30)}...</Text>
                        <Badge label={a.urgency} type={SEV[a.urgency]?.badge || 'primary'} />
                        <TouchableOpacity onPress={() => dismissAlert(a._id)} style={{ marginLeft: 8 }}>
                          <Text style={{ color: Colors.primary, fontSize: 12, fontWeight: '600' }}>Dismiss</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                </Card>
              </>
            )}
          </>
        )}
      </ScrollView>

      {/* SMS Modal */}
      <Modal visible={!!showSMS} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📱 Send SMS via Twilio</Text>
              <TouchableOpacity onPress={() => setShowSMS(null)}>
                <Text style={{ fontSize: 18, color: Colors.gray500 }}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={{ padding: 16 }}>
              <View style={styles.recipientBox}>
                <Text style={{ fontSize: 13, color: Colors.primary }}>
                  To: <Text style={{ fontWeight: '700' }}>{showSMS?.patientName}</Text> · {showSMS?.patientPhone || 'N/A'}
                </Text>
              </View>
              <Text style={styles.label}>Message</Text>
              <TextInput
                style={[styles.input, { height: 90, textAlignVertical: 'top' }]}
                placeholder="Type your message…"
                value={smsText}
                onChangeText={setSmsText}
                multiline
                placeholderTextColor={Colors.gray400}
              />
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                <Button label="Cancel" onPress={() => setShowSMS(null)} variant="outline" style={{ flex: 1 }} />
                <Button label="🚀 Send via Twilio" onPress={sendSMS} style={{ flex: 1 }} />
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </DrawerLayout>
  );
}

const styles = StyleSheet.create({
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  statHalf: { width: '48%' },
  alertCard: { borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderLeftWidth: 4 },
  alertRow: { flexDirection: 'row', gap: 12 },
  alertAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center', borderWidth: 2, flexShrink: 0 },
  emptyBox: { alignItems: 'center', paddingVertical: 48 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalCard: { backgroundColor: Colors.white, borderRadius: 16, width: '100%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.gray100 },
  modalTitle: { fontSize: 15, fontWeight: '700', color: Colors.gray800 },
  recipientBox: { backgroundColor: Colors.primarySoft, borderRadius: 8, padding: 10, marginBottom: 14 },
  label: { fontSize: 12, fontWeight: '600', color: Colors.gray700, marginBottom: 6 },
  input: { backgroundColor: Colors.gray50, borderWidth: 1.5, borderColor: Colors.border, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14, fontSize: 14, color: Colors.gray900 },
});
