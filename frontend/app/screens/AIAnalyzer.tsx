import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator, TouchableOpacity, Alert,
  Pressable, GestureResponderEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Voice from '@react-native-voice/voice';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import BottomNavLayout from '@/components/BottomNavLayout';
import { Card, Button, Badge, IconBox } from '../../components/UI';
import { aiAPI, patientAPI } from '../../services/api';

const TABS = [
  { key: 'medicine', label: 'Medicine Info', icon: 'medical-outline' },
  { key: 'triage', label: 'Symptom Triage', icon: 'medkit-outline' },
  { key: 'report', label: 'Report Analyze', icon: 'document-text-outline' },
];

export default function AIAnalyzerScreen() {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const latestVoiceTextRef = React.useRef('');
  const [activeTab, setActiveTab] = useState(0);
  const [input, setInput] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reports, setReports] = useState<any[]>([]);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [analyzingReport, setAnalyzingReport] = useState(false);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [cancelOnRelease, setCancelOnRelease] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState<boolean | null>(null);
  const [voiceHint, setVoiceHint] = useState<string>('Hold to record');

  React.useEffect(() => {
    Voice.isAvailable()
      .then((available) => setVoiceSupported(!!available))
      .catch(() => setVoiceSupported(false));

    Voice.onSpeechStart = () => {
      setVoiceHint('Listening... release to send');
    };

    Voice.onSpeechPartialResults = (event: any) => {
      const spoken = event?.value?.[0] || '';
      if (spoken) {
        latestVoiceTextRef.current = spoken;
        setInput(spoken);
      }
    };

    Voice.onSpeechResults = (event: any) => {
      const spoken = event?.value?.[0] || '';
      if (spoken) {
        latestVoiceTextRef.current = spoken;
        setInput(spoken);
      }
    };

    Voice.onSpeechError = () => {
      setIsRecordingVoice(false);
      setCancelOnRelease(false);
      setVoiceHint('Could not understand. Try again.');
    };

    return () => {
      Voice.destroy().finally(() => Voice.removeAllListeners());
    };
  }, []);

  async function runAI(overrideInput?: string, fromVoice: boolean = false) {
    const prompt = (overrideInput ?? input).trim();
    if (!prompt) return;

    if (overrideInput) {
      setInput(prompt);
    }

    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const res = fromVoice
        ? await aiAPI.voiceQuery(prompt, activeTab === 0 ? 'medicine' : 'triage')
        : (activeTab === 0
          ? await aiAPI.explainMedicine(prompt)
          : await aiAPI.triage(prompt));
      setResult(res);
    } catch (err: any) {
      setError(err.message || 'Failed to get AI response');
    }
    setLoading(false);
  }

  async function startVoiceCapture() {
    if (voiceSupported === false || loading || activeTab === 2) {
      return;
    }

    try {
      latestVoiceTextRef.current = '';
      setCancelOnRelease(false);
      setVoiceHint('Listening... release to send');
      await Voice.start('en-US');
      setIsRecordingVoice(true);
    } catch {
      setVoiceHint('Voice start failed. Tap again.');
    }
  }

  async function finishVoiceCapture() {
    if (!isRecordingVoice) {
      return;
    }

    try {
      if (cancelOnRelease) {
        await Voice.cancel();
        setVoiceHint('Recording canceled');
        return;
      }

      await Voice.stop();
      setVoiceHint('Processing voice...');

      setTimeout(() => {
        const spoken = (latestVoiceTextRef.current || input).trim();
        if (spoken) {
          runAI(spoken, true);
        } else {
          setVoiceHint('No speech detected. Hold and try again.');
        }
      }, 200);
    } catch {
      setVoiceHint('Could not process voice. Try again.');
    } finally {
      setIsRecordingVoice(false);
      setCancelOnRelease(false);
    }
  }

  function handleVoiceMove(event: GestureResponderEvent) {
    if (!isRecordingVoice) {
      return;
    }

    // WhatsApp-style gesture: slide finger upward while holding to cancel.
    setCancelOnRelease(event.nativeEvent.locationY < -20);
  }

  async function loadReports() {
    try {
      const res = await patientAPI.getReports();
      setReports(res);
    } catch (err) {
      console.error('Failed to load reports:', err);
    }
  }

  async function analyzeReport(reportId: string) {
    setAnalyzingReport(true);
    try {
      const res = await aiAPI.analyzeReport(reportId);
      setReports(prev => prev.map(r => r._id === reportId ? { ...r, aiSummary: res.aiSummary } : r));
      setSelectedReport({ ...selectedReport, aiSummary: res.aiSummary });
      Alert.alert('Success', res.message);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to analyze report');
    }
    setAnalyzingReport(false);
  }

  function clear() {
    setInput('');
    setResult(null);
    setError(null);
  }

  React.useEffect(() => {
    if (activeTab === 2) {
      loadReports();
      setSelectedReport(null);
      setResult(null);
    }
  }, [activeTab]);

  const tab = TABS[activeTab];
  const lowerError = (error || '').toLowerCase();

  const getErrorHint = () => {
    if (!error) return null;
    if (lowerError.includes('invalid or expired token') || lowerError.includes('access denied')) {
      return 'Your login session expired. Please login again.';
    }
    if (lowerError.includes('user not found') || lowerError.includes('authentication failed')) {
      return 'OpenRouter key/account issue: regenerate OPENROUTER_API_KEY and restart backend.';
    }
    if (lowerError.includes('privacy settings are blocking')) {
      return 'OpenRouter data policy is blocking providers. Update privacy settings or switch model/provider.';
    }
    return 'Check backend logs for detailed AI provider error.';
  };

  return (
    <BottomNavLayout
      title="AI Health Assistant"
      subtitle="Powered by OpenRouter"
      role="patient"
      headerRight={
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ionicons name="sparkles" size={20} color={colors.primary} />
        </View>
      }
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Tab switcher */}
          <View style={[styles.tabs, { backgroundColor: colors.bgPage }]}>
            {TABS.map((t, i) => {
              const isActive = activeTab === i;
              return (
                <TouchableOpacity
                  key={t.key}
                  onPress={() => { setActiveTab(i); clear(); }}
                  style={[
                    styles.tabBtn,
                    {
                      backgroundColor: isActive ? colors.primary : 'transparent',
                      borderColor: isActive ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Ionicons
                    name={t.icon as keyof typeof Ionicons.glyphMap}
                    size={16}
                    color={isActive ? '#fff' : colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.tabText,
                      { color: isActive ? '#fff' : colors.textMuted },
                    ]}
                  >
                    {t.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Medicine & Triage Tab */}
          {activeTab !== 2 && (
            <>
              <Card variant="elevated" glowColor={colors.primary}>
                <Text style={[styles.label, { color: colors.textMuted }]}>
                  {activeTab === 0 ? 'Enter medicine name' : 'Describe your symptoms'}
                </Text>
                <TextInput
                  style={[styles.input, {
                    backgroundColor: colors.bgPage,
                    borderColor: colors.border,
                    color: colors.textPrimary,
                  }]}
                  placeholder={activeTab === 0 ? 'e.g. Paracetamol, Metformin...' : 'e.g. fever, headache, sore throat...'}
                  value={input}
                  onChangeText={setInput}
                  multiline={activeTab === 1}
                  numberOfLines={activeTab === 1 ? 3 : 1}
                  placeholderTextColor={colors.textFaint}
                />
                <View style={styles.btnRow}>
                  <Button
                    label="Ask AI"
                    onPress={runAI}
                    loading={loading}
                    disabled={!input.trim()}
                    style={{ flex: 1 }}
                  />
                  <Pressable
                    onPressIn={startVoiceCapture}
                    onPressOut={finishVoiceCapture}
                    onTouchMove={handleVoiceMove}
                    disabled={voiceSupported === false || loading}
                    style={[
                      styles.voiceBtn,
                      {
                        backgroundColor: isRecordingVoice
                          ? (cancelOnRelease ? colors.danger : colors.primary)
                          : colors.primarySoft,
                        borderColor: isRecordingVoice ? 'transparent' : colors.primary,
                        opacity: voiceSupported === false ? 0.5 : 1,
                      },
                    ]}
                  >
                    <Ionicons
                      name={isRecordingVoice ? (cancelOnRelease ? 'close-outline' : 'radio-button-on-outline') : 'mic-outline'}
                      size={22}
                      color={isRecordingVoice ? '#fff' : colors.primary}
                    />
                  </Pressable>
                  {(result || error) && (
                    <Button
                      label="Clear"
                      variant="outline"
                      onPress={clear}
                      style={{ marginLeft: 8, width: 80 }}
                    />
                  )}
                </View>
                <Text style={[styles.voiceHint, { color: isRecordingVoice ? colors.primary : colors.textFaint }]}>
                  {voiceSupported === false
                    ? 'Voice unavailable on this device'
                    : (cancelOnRelease ? 'Release now to cancel' : voiceHint)}
                </Text>
              </Card>

              {loading && (
                <Card variant="soft">
                  <View style={{ alignItems: 'center', padding: 20 }}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={{ color: colors.textMuted, marginTop: 12 }}>
                      Analyzing...
                    </Text>
                  </View>
                </Card>
              )}

              {error && (
                <Card style={{ backgroundColor: colors.dangerSoft, borderColor: colors.danger }}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                    <IconBox icon="warning-outline" color={colors.danger} bg={colors.dangerSoft} size={36} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.danger, fontWeight: '600', fontSize: 15 }}>
                        Error
                      </Text>
                      <Text style={{ color: colors.danger, marginTop: 4, fontSize: 13 }}>
                        {error}
                      </Text>
                      <Text style={{ color: colors.danger, fontSize: 12, marginTop: 8 }}>
                        {getErrorHint()}
                      </Text>
                    </View>
                  </View>
                </Card>
              )}

              {result && (
                <Card variant="elevated" glowColor={colors.primary}>
                  <View style={styles.resultHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <IconBox
                        icon={activeTab === 0 ? 'medical' : 'medkit'}
                        color={colors.primary}
                        bg={colors.primarySoft}
                        size={32}
                      />
                      <Text style={[styles.resultTitle, { color: colors.textPrimary }]}>
                        {activeTab === 0 ? 'Medicine Info' : 'Triage Result'}
                      </Text>
                    </View>
                    {result.is_mock && (
                      <Badge label="Mock" type="warning" />
                    )}
                  </View>

                  {activeTab === 0 && result.medicine && (
                    <Text style={[styles.medicineName, { color: colors.primary }]}>
                      {result.medicine}
                    </Text>
                  )}

                  <Text style={[styles.resultText, { color: colors.textSecondary }]}>
                    {activeTab === 0 ? result.explanation : result.triage}
                  </Text>

                  {activeTab === 1 && (
                    <View style={[styles.disclaimer, { backgroundColor: colors.warningSoft }]}>
                      <Ionicons name="warning" size={16} color={colors.warning} />
                      <Text style={[styles.disclaimerText, { color: colors.warning }]}>
                        {result.disclaimer || 'This is not a medical diagnosis. Always consult a qualified doctor.'}
                      </Text>
                    </View>
                  )}
                </Card>
              )}

              {/* Example prompts */}
              {!result && !loading && (
                <Card style={{ backgroundColor: colors.primarySoft, borderColor: colors.primary }}>
                  <Text style={[styles.label, { color: colors.primary, marginBottom: 12 }]}>
                    Try these examples
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {(activeTab === 0
                      ? ['Metformin', 'Ibuprofen', 'Amoxicillin', 'Atorvastatin']
                      : ['Fever for 3 days', 'Sharp chest pain', 'Persistent headache']
                    ).map((ex) => (
                      <TouchableOpacity
                        key={ex}
                        onPress={() => setInput(ex)}
                        style={[styles.exampleBtn, { borderColor: colors.primary }]}
                      >
                        <Text style={[styles.exampleText, { color: colors.primary }]}>{ex}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </Card>
              )}
            </>
          )}

          {/* Report Analyze Tab */}
          {activeTab === 2 && (
            <>
              <Text style={[styles.label, { color: colors.textMuted, marginBottom: 12 }]}>
                Select a report to analyze
              </Text>

              {reports.length === 0 ? (
                <Card style={{ backgroundColor: colors.warningSoft, borderColor: colors.warning }}>
                  <Text style={{ color: colors.warning, textAlign: 'center' }}>
                    No reports found. Upload a report first to analyze it.
                  </Text>
                </Card>
              ) : (
                reports.map((report) => (
                  <Card key={report._id} variant="elevated">
                    <TouchableOpacity
                      onPress={() => setSelectedReport(report)}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
                    >
                      <IconBox
                        icon="document-text"
                        color={colors.teal}
                        bg={colors.tealSoft}
                        size={40}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontWeight: '700', fontSize: 14, color: colors.textPrimary }}>
                          {report.reportType}
                        </Text>
                        <Text style={{ fontSize: 12, color: colors.textMuted }}>
                          {new Date(report.createdAt).toLocaleDateString()}
                        </Text>
                      </View>
                      {report.aiSummary ? (
                        <Badge label="Analyzed" type="success" />
                      ) : (
                        <Badge label="Not analyzed" type="warning" />
                      )}
                    </TouchableOpacity>

                    {selectedReport?._id === report._id && (
                      <View style={{ marginTop: 12 }}>
                        {report.aiSummary ? (
                          <View>
                            <Text style={[styles.label, { color: colors.teal, marginBottom: 8 }]}>
                              AI Summary
                            </Text>
                            <Text style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 20 }}>
                              {report.aiSummary}
                            </Text>
                          </View>
                        ) : (
                          <Button
                            label={analyzingReport ? "Analyzing..." : "Analyze with AI"}
                            onPress={() => analyzeReport(report._id)}
                            loading={analyzingReport}
                            style={{ marginTop: 8 }}
                          />
                        )}
                      </View>
                    )}
                  </Card>
                ))
              )}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </BottomNavLayout>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: 16,
    paddingBottom: 32,
  },
  tabs: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
    padding: 4,
    borderRadius: 14,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    textAlignVertical: 'top',
    minHeight: 44,
  },
  btnRow: {
    flexDirection: 'row',
    marginTop: 12,
    alignItems: 'center',
  },
  voiceBtn: {
    width: 48,
    height: 44,
    borderRadius: 12,
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  voiceHint: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '500',
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    flexWrap: 'wrap',
    gap: 8,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  medicineName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
  },
  resultText: {
    fontSize: 14,
    lineHeight: 22,
  },
  disclaimer: {
    marginTop: 14,
    padding: 12,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  disclaimerText: {
    fontSize: 12,
    flex: 1,
    lineHeight: 18,
  },
  exampleBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
  },
  exampleText: {
    fontSize: 13,
    fontWeight: '500',
  },
});