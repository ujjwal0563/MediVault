import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Modal, TextInput, Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import DrawerLayout from '../../components/DrawerLayout';
import Colors from '../../constants/colors';
import { StatCard, Card, CardHeader, Badge, Button } from '../../components/UI';
import { patientAPI, doctorAPI, MedRecord } from '../../services/api';

interface RecordItem {
  _id: string; date: string; doctor?: string; hospital?: string;
  diagnosis: string; notes?: string;
  medicines?: string[]; fileUrls?: string[];
  type: 'Admission' | 'OPD' | 'Check-up' | 'Emergency';
}

const RECORDS: RecordItem[] = [];

const TYPE_STYLE: Record<string, { bg: string; color: string; badge: 'danger' | 'primary' | 'success' | 'warning'; icon: string }> = {
  Admission: { bg: Colors.dangerSoft,  color: Colors.danger,   badge: 'danger',  icon: '🏥' },
  OPD:       { bg: Colors.primarySoft, color: Colors.primary,  badge: 'primary', icon: '🩺' },
  'Check-up':{ bg: Colors.successSoft, color: Colors.success,  badge: 'success', icon: '✅' },
  Emergency: { bg: Colors.dangerSoft,  color: Colors.danger,   badge: 'danger',  icon: '🚨' },
};

export default function RecordsScreen() {
  const router = useRouter();
  const { role, userName, userInitial, colors } = useTheme();
  const [records, setRecords] = useState<MedRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const [form, setForm] = useState({ date: '', doctor: '', hospital: '', diagnosis: '', notes: '', type: 'OPD' as RecordItem['type'] });

  const loadRecords = async () => {
    try {
      const data = await patientAPI.getRecords();
      setRecords(data);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecords();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadRecords();
    setRefreshing(false);
  }, []);

  const addRecord = async () => {
    if (!form.diagnosis) return;
    try {
      const newRecord = await doctorAPI.createRecord({
        patientId: '',
        diagnosis: form.diagnosis,
        notes: form.notes,
        date: form.date || new Date().toISOString(),
      });
      setRecords(prev => [newRecord, ...prev]);
      setShowAdd(false);
      setForm({ date: '', doctor: '', hospital: '', diagnosis: '', notes: '', type: 'OPD' });
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create record');
    }
  };

  const visitTypes: RecordItem['type'][] = ['OPD', 'Admission', 'Check-up', 'Emergency'];

  return (
    <DrawerLayout
      title="Medical Records"
      subtitle="Complete health history"
      showBack
      headerRight={
        <Button label="+ Add" onPress={() => setShowAdd(true)} size="sm" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }} />
      }>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}>

        {/* Stats */}
        <View style={styles.statsGrid}>
          <View style={styles.statHalf}>
            {loading ? <StatCard icon="📋" value="-" label="Total Records" /> : <StatCard icon="📋" value={records.length} label="Total Records" />}
          </View>
          <View style={styles.statHalf}><StatCard icon="🏥" value={0} label="Admissions" iconBg={Colors.dangerSoft} valueColor={Colors.danger} /></View>
          <View style={styles.statHalf}><StatCard icon="🩺" value={0} label="OPD Visits" iconBg={Colors.tealSoft} valueColor={Colors.teal} /></View>
          <View style={styles.statHalf}><StatCard icon="✅" value={0} label="Check-ups" iconBg={Colors.successSoft} valueColor={Colors.success} /></View>
        </View>

        {/* Records */}
        {loading ? (
          <View style={{ alignItems: 'center', padding: 40 }}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={{ fontSize: 13, color: Colors.gray500, marginTop: 10 }}>Loading records...</Text>
          </View>
        ) : records.length === 0 ? (
          <View style={{ alignItems: 'center', padding: 40 }}>
            <Text style={{ fontSize: 40, marginBottom: 10 }}>📋</Text>
            <Text style={{ fontWeight: '600', fontSize: 15, color: Colors.gray700 }}>No records found</Text>
            <Text style={{ fontSize: 12, color: Colors.gray500, marginTop: 4 }}>Your medical records will appear here</Text>
          </View>
        ) : (
          records.map(record => {
            const recordType = 'Check-up';
            const ts = TYPE_STYLE[recordType] || TYPE_STYLE.OPD;
            const open = expanded === record._id;
            return (
              <View key={record._id} style={[styles.recordCard, { borderLeftColor: ts.color }]}>
              {/* Header - tap to expand */}
              <TouchableOpacity onPress={() => setExpanded(open ? null : record._id)} style={{ padding: 16 }} activeOpacity={0.7}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={[styles.recordIcon, { backgroundColor: ts.bg }]}>
                    <Text style={{ fontSize: 20 }}>{ts.icon}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <Text style={{ fontWeight: '800', fontSize: 14, color: Colors.gray800 }}>{record.diagnosis}</Text>
                      <Badge label={recordType} type={ts.badge} />
                    </View>
                    <Text style={{ fontSize: 11, color: Colors.gray500, marginTop: 3 }}>
                      📅 {record.date ? new Date(record.date).toLocaleDateString() : 'N/A'} · 👨‍⚕️ {record.doctorId || 'N/A'}
                    </Text>
                  </View>
                  <Text style={{ color: Colors.gray400, fontSize: 14 }}>{open ? '▲' : '▼'}</Text>
                </View>
              </TouchableOpacity>

              {/* Expanded body */}
              {open && (
                <View style={{ borderTopWidth: 1, borderTopColor: Colors.gray100, padding: 16 }}>
                  {record.notes ? (
                    <View style={{ marginBottom: 16 }}>
                      <Text style={styles.sectionLabel}>DOCTOR'S NOTES</Text>
                      <View style={{ backgroundColor: Colors.gray50, borderRadius: 8, padding: 12 }}>
                        <Text style={{ fontSize: 13, color: Colors.gray700, lineHeight: 20 }}>{record.notes}</Text>
                      </View>
                    </View>
                  ) : null}

                  {record.medicines && record.medicines.length > 0 && (
                    <View style={{ marginBottom: 16 }}>
                      <Text style={styles.sectionLabel}>PRESCRIBED MEDICINES</Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                        {record.medicines.map((m, i) => (
                          <Badge key={i} label={`💊 ${m}`} style={{ marginBottom: 4 }} />
                        ))}
                      </View>
                    </View>
                  )}

                  {record.fileUrls && record.fileUrls.length > 0 && (
                    <View>
                      <Text style={styles.sectionLabel}>ATTACHED FILES</Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                        {record.fileUrls.map((f, i) => (
                          <TouchableOpacity key={i} style={styles.fileBtn} onPress={() => Alert.alert('View', `Opening file`)}>
                            <Text style={{ fontSize: 18 }}>📄</Text>
                            <Text style={{ fontSize: 12, fontWeight: '600', color: Colors.gray700 }}>Report {i + 1}</Text>
                            <Text style={{ fontSize: 11, color: Colors.primary }}>View →</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  )}
                </View>
              )}
            </View>
          );
          })
        )}
      </ScrollView>

      {/* Add Record Modal */}
      <Modal visible={showAdd} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📋 Add Medical Record</Text>
              <TouchableOpacity onPress={() => setShowAdd(false)}>
                <Text style={{ fontSize: 18, color: Colors.gray500 }}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ padding: 16 }}>
              <Text style={styles.label}>Visit Type</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
                {visitTypes.map(t => (
                  <TouchableOpacity key={t} onPress={() => setForm(p => ({ ...p, type: t }))} style={[styles.typeChip, form.type === t && styles.typeChipActive]}>
                    <Text style={[{ fontSize: 12, fontWeight: '600', color: Colors.gray600 }, form.type === t && { color: Colors.primary }]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {[
                { label: 'Doctor Name', key: 'doctor', placeholder: 'Dr. Full Name' },
                { label: 'Hospital / Clinic', key: 'hospital', placeholder: 'Hospital name' },
                { label: 'Diagnosis', key: 'diagnosis', placeholder: 'Primary diagnosis' },
              ].map(f => (
                <View key={f.key} style={{ marginBottom: 14 }}>
                  <Text style={styles.label}>{f.label}</Text>
                  <TextInput
                    style={styles.input}
                    placeholder={f.placeholder}
                    value={(form as any)[f.key]}
                    onChangeText={v => setForm(p => ({ ...p, [f.key]: v }))}
                    placeholderTextColor={Colors.gray400}
                  />
                </View>
              ))}
              <Text style={styles.label}>Doctor's Notes</Text>
              <TextInput
                style={[styles.input, { height: 80, textAlignVertical: 'top', marginBottom: 14 }]}
                placeholder="Notes, instructions, observations…"
                value={form.notes}
                onChangeText={v => setForm(p => ({ ...p, notes: v }))}
                multiline
                placeholderTextColor={Colors.gray400}
              />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Button label="Cancel" onPress={() => setShowAdd(false)} variant="outline" style={{ flex: 1 }} />
                <Button label="Save Record" onPress={addRecord} style={{ flex: 1 }} />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </DrawerLayout>
  );
}

const styles = StyleSheet.create({
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  statHalf: { width: '48%' },
  recordCard: { backgroundColor: Colors.white, borderRadius: 14, overflow: 'hidden', marginBottom: 12, borderLeftWidth: 4, borderWidth: 1, borderColor: Colors.border, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  recordIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  sectionLabel: { fontSize: 10, fontWeight: '700', color: Colors.gray500, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  fileBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 12, backgroundColor: Colors.gray50, borderWidth: 1, borderColor: Colors.gray200, borderRadius: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: Colors.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.gray100 },
  modalTitle: { fontSize: 15, fontWeight: '700', color: Colors.gray800 },
  label: { fontSize: 12, fontWeight: '600', color: Colors.gray700, marginBottom: 6 },
  input: { backgroundColor: Colors.gray50, borderWidth: 1.5, borderColor: Colors.border, borderRadius: 10, paddingVertical: 11, paddingHorizontal: 14, fontSize: 14, color: Colors.gray900 },
  typeChip: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.white },
  typeChipActive: { borderColor: Colors.primary, backgroundColor: Colors.primarySoft },
});
