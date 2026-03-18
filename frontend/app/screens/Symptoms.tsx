import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import DrawerLayout from '../../components/DrawerLayout';
import Colors from '../../constants/colors';
import { Card, CardHeader, Badge, Button, ProgressBar } from '../../components/UI';
import { symptomAPI, SymptomLog } from '../../services/api';

const doctors = [
  { name: 'Dr. Meera Kapoor', spec: 'General Physician', rating: 4.8, available: true },
  { name: 'Dr. Arun Sharma', spec: 'Infectious Disease', rating: 4.9, available: false },
  { name: 'Dr. Priya Singh', spec: 'Internal Medicine', rating: 4.7, available: true },
];

const CHIPS = ['Fever', 'Headache', 'Cough', 'Nausea', 'Body Ache', 'Fatigue', 'Chest Pain', 'Dizziness', 'Sore Throat'];

export default function SymptomsScreen() {
  const router = useRouter();
  const { role, userName, userInitial, colors } = useTheme();
  const [symptoms, setSymptoms] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [history, setHistory] = useState<SymptomLog[]>([]);
  const [selectedChips, setSelectedChips] = useState<string[]>([]);

  const loadHistory = async () => {
    try {
      const historyData = await symptomAPI.getHistory();
      setHistory(historyData);
    } catch (error) {
      console.error('Failed to load history:', error);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadHistory();
    setRefreshing(false);
  }, []);

  const toggleChip = (s: string) =>
    setSelectedChips(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);

  const analyze = async () => {
    if (!symptoms.trim() && selectedChips.length === 0) return;
    setLoading(true);
    try {
      const combinedSymptoms = selectedChips.length > 0 
        ? `${symptoms} ${selectedChips.join(', ')}`.trim()
        : symptoms;
      const result = await symptomAPI.checkSymptoms(combinedSymptoms);
      setHistory(prev => [result, ...prev]);
      Alert.alert('Analysis Complete', `Urgency: ${result.urgency}\nRecommended: ${result.specialistType}`);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to analyze symptoms');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DrawerLayout title="Symptom Checker" subtitle="AI-powered triage assistant" showBack>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}>

        {/* Input */}
        <Card>
          <CardHeader title="🩺 Describe Your Symptoms" />
          <View style={{ padding: 16 }}>
            <Text style={styles.label}>What symptoms are you experiencing?</Text>
            <TextInput
              style={[styles.input, { height: 90, textAlignVertical: 'top' }]}
              placeholder="e.g. I have high fever since yesterday, severe headache, body ache…"
              value={symptoms}
              onChangeText={setSymptoms}
              multiline
              placeholderTextColor={Colors.gray400}
            />

            <Text style={[styles.label, { marginTop: 14 }]}>Quick Select Common Symptoms</Text>
            <View style={styles.chipsRow}>
              {CHIPS.map(s => {
                const active = selectedChips.includes(s);
                return (
                  <TouchableOpacity key={s} onPress={() => toggleChip(s)} style={[styles.chip, active && styles.chipActive]}>
                    <Text style={[styles.chipText, active && { color: Colors.primary }]}>{active ? '✓ ' : ''}{s}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Button
              label={loading ? '🤖 Analysing with AI...' : '🔍 Analyse Symptoms'}
              onPress={analyze}
              disabled={loading}
              size="lg"
              style={{ marginTop: 18, width: '100%' }}
            />

            {loading && (
              <View style={{ alignItems: 'center', marginTop: 10 }}>
                <ActivityIndicator color={Colors.primary} />
                <Text style={{ fontSize: 11, color: Colors.gray400, marginTop: 6 }}>AI is processing your symptoms...</Text>
              </View>
            )}
          </View>
        </Card>

        {/* Latest Result */}
        {history.length > 0 && (
          <>
            <View style={styles.disclaimer}>
              <Text style={styles.disclaimerText}>⚠️ <Text style={{ fontWeight: '700' }}>AI Disclaimer:</Text> For informational purposes only. Not a substitute for professional medical diagnosis.</Text>
            </View>
            <Card>
              <View style={{ padding: 16 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Text style={{ fontSize: 28 }}>
                      {history[0].urgency === 'high' ? '🚨' : history[0].urgency === 'medium' ? '⚠️' : '✅'}
                    </Text>
                    <View>
                      <Text style={{ fontWeight: '700', fontSize: 15, color: Colors.gray800 }}>
                        {history[0].aiConditions?.[0] || 'Analysis Complete'}
                      </Text>
                      <Text style={{ fontSize: 11, color: Colors.gray500 }}>
                        Recommended: {history[0].specialistType}
                      </Text>
                    </View>
                  </View>
                  <Badge
                    label={history[0].urgency.toUpperCase()}
                    type={history[0].urgency === 'high' ? 'danger' : history[0].urgency === 'medium' ? 'warning' : 'success'}
                  />
                </View>
                <View style={{ backgroundColor: Colors.gray50, padding: 12, borderRadius: 8, marginBottom: 8 }}>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: Colors.primary, marginBottom: 4 }}>YOUR SYMPTOMS</Text>
                  <Text style={{ fontSize: 13, color: Colors.gray700, lineHeight: 20 }}>{history[0].symptoms}</Text>
                </View>
                <View style={{ backgroundColor: Colors.primarySoft, padding: 12, borderRadius: 8 }}>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: Colors.primary, marginBottom: 4 }}>AI ADVICE</Text>
                  <Text style={{ fontSize: 13, color: Colors.gray700, lineHeight: 20 }}>{history[0].advice}</Text>
                </View>
                {history[0].aiConditions && history[0].aiConditions.length > 1 && (
                  <View style={{ marginTop: 12 }}>
                    <Text style={{ fontSize: 11, fontWeight: '600', color: Colors.gray500, marginBottom: 6 }}>POSSIBLE CONDITIONS</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                      {history[0].aiConditions.slice(1).map((condition, idx) => (
                        <View key={idx} style={{ backgroundColor: Colors.gray100, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                          <Text style={{ fontSize: 12, color: Colors.gray700 }}>{condition}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            </Card>
          </>
        )}

        {/* Matched Doctors */}
        <Card>
          <CardHeader title="👨‍⚕️ Matched Doctors" />
          <View style={{ padding: 16 }}>
            {doctors.map((doc, i) => (
              <View key={i} style={[styles.docRow, i < doctors.length - 1 && { borderBottomWidth: 1, borderBottomColor: Colors.gray100, paddingBottom: 12, marginBottom: 12 }]}>
                <View style={styles.docAvatar}><Text style={{ fontSize: 22 }}>👨‍⚕️</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '700', fontSize: 13, color: Colors.gray800 }}>{doc.name}</Text>
                  <Text style={{ fontSize: 11, color: Colors.gray500 }}>{doc.spec}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                    <Text style={{ fontSize: 11, color: '#F59E0B' }}>★ {doc.rating}</Text>
                    <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: doc.available ? Colors.success : Colors.gray300 }} />
                    <Text style={{ fontSize: 11, color: doc.available ? Colors.success : Colors.gray400 }}>{doc.available ? 'Available' : 'Busy'}</Text>
                  </View>
                </View>
                <Button label={doc.available ? 'Book' : 'Full'} onPress={() => {}} disabled={!doc.available} size="sm" variant={doc.available ? 'primary' : 'outline'} />
              </View>
            ))}
          </View>
        </Card>

        {/* Recent Checks */}
        <Card>
          <CardHeader title="📜 Recent Checks" />
          <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
            {history.length === 0 ? (
              <Text style={{ fontSize: 12, color: Colors.gray500, textAlign: 'center', paddingVertical: 10 }}>
                No symptom history yet
              </Text>
            ) : (
              history.slice(0, 5).map((c, i) => (
                <View key={c._id || i} style={[{ paddingVertical: 10 }, i < Math.min(history.length, 5) - 1 && { borderBottomWidth: 1, borderBottomColor: Colors.gray100 }]}>
                  <Text style={{ fontWeight: '600', fontSize: 13, color: Colors.gray800 }}>{c.symptoms}</Text>
                  <Text style={{ fontSize: 11, color: Colors.gray500 }}>
                    {new Date(c.createdAt).toLocaleDateString()} · {c.aiConditions?.[0] || 'Analyzed'}
                  </Text>
                </View>
              ))
            )}
          </View>
        </Card>

      </ScrollView>
    </DrawerLayout>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 12, fontWeight: '600', color: Colors.gray700, marginBottom: 6 },
  input: { backgroundColor: Colors.gray50, borderWidth: 1.5, borderColor: Colors.border, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14, fontSize: 14, color: Colors.gray900 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.white },
  chipActive: { borderColor: Colors.primary, backgroundColor: Colors.primarySoft },
  chipText: { fontSize: 12, fontWeight: '600', color: Colors.gray600 },
  disclaimer: { backgroundColor: Colors.warningSoft, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: Colors.warning, marginBottom: 12 },
  disclaimerText: { fontSize: 12, color: Colors.warning },
  docRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  docAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
});
