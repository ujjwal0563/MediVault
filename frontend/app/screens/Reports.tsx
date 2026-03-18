import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as WebBrowser from 'expo-web-browser';
import { useTheme } from '../../context/ThemeContext';
import DrawerLayout from '../../components/DrawerLayout';
import Colors from '../../constants/colors';
import { Card, CardHeader, Badge, Button } from '../../components/UI';
import { patientAPI, Report } from '../../services/api';

const reportTypes = ['X-Ray', 'Blood Test', 'MRI', 'CT Scan', 'Ultrasound', 'ECG', 'Prescription', 'Other'];

export default function ReportsScreen() {
  const { colors } = useTheme();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [selectedType, setSelectedType] = useState('Blood Test');
  const [selectedFile, setSelectedFile] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<{ type: string; summary?: string } | null>(null);

  const fetchReports = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const data = await patientAPI.getReports();
      setReports(data);
    } catch (error) {
      console.error('Failed to fetch reports:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const onRefresh = useCallback(() => {
    fetchReports(true);
  }, [fetchReports]);

  const pickImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Required', 'Please allow access to your photos to upload reports.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedFile(result.assets[0]);
        setShowSuccess(false);
        setUploadSuccess(null);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      Alert.alert('Select File', 'Please select a file to upload');
      return;
    }

    setUploading(true);
    setShowSuccess(false);
    setUploadSuccess(null);

    try {
      const formData = new FormData();
      formData.append('report', {
        uri: selectedFile.uri,
        type: selectedFile.mimeType || 'image/jpeg',
        name: selectedFile.fileName || `${selectedType.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}.jpg`,
      } as unknown as Blob);
      formData.append('reportType', selectedType);

      const newReport = await patientAPI.uploadReport(formData);
      setReports(prev => [newReport, ...prev]);
      setShowSuccess(true);
      setUploadSuccess({
        type: selectedType,
        summary: newReport.aiSummary || 'Report uploaded successfully.',
      });
      setSelectedFile(null);
    } catch (error) {
      Alert.alert('Upload Failed', error instanceof Error ? error.message : 'Failed to upload report');
    } finally {
      setUploading(false);
    }
  };

  const handleViewReport = async (report: Report) => {
    if (report.fileUrl) {
      try {
        await WebBrowser.openBrowserAsync(report.fileUrl);
      } catch (error) {
        Alert.alert('Error', 'Failed to open report');
      }
    }
  };

  const handleDeleteReport = async (reportId: string) => {
    Alert.alert(
      'Delete Report',
      'Are you sure you want to delete this report?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await patientAPI.deleteReport(reportId);
              setReports(prev => prev.filter(r => r._id !== reportId));
              Alert.alert('Success', 'Report deleted');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete report');
            }
          },
        },
      ]
    );
  };

  const getReportIcon = (type: string) => {
    const lower = type.toLowerCase();
    if (lower.includes('blood')) return '🩸';
    if (lower.includes('x-ray') || lower.includes('xray')) return '📷';
    if (lower.includes('ultrasound')) return '🔊';
    if (lower.includes('ecg') || lower.includes('ekg')) return '❤️';
    if (lower.includes('ct')) return '🧠';
    if (lower.includes('mri')) return '🔬';
    if (lower.includes('prescription') || lower.includes('rx')) return '💊';
    return '📄';
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <DrawerLayout title="Reports & Tests" subtitle="Upload and manage your reports" showBack>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Upload Card */}
        <Card>
          <CardHeader title="📤 Upload Medical Report" />
          <View style={{ padding: 16 }}>
            <Text style={styles.label}>Report Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              {reportTypes.map(t => (
                <TouchableOpacity
                  key={t}
                  onPress={() => setSelectedType(t)}
                  style={[styles.typeChip, selectedType === t && styles.typeChipActive]}
                >
                  <Text style={[styles.typeChipText, selectedType === t && { color: Colors.primary }]}>
                    {getReportIcon(t)} {t}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Drop zone */}
            <TouchableOpacity style={styles.dropZone} activeOpacity={0.7} onPress={pickImage}>
              {selectedFile ? (
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ fontSize: 32, marginBottom: 8 }}>✅</Text>
                  <Text style={styles.dropText}>File Selected</Text>
                  <Text style={styles.dropSub}>{selectedFile.fileName || 'image.jpg'}</Text>
                  <TouchableOpacity onPress={() => setSelectedFile(null)} style={{ marginTop: 8 }}>
                    <Text style={{ color: Colors.danger, fontSize: 12 }}>Remove</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <Text style={{ fontSize: 32, marginBottom: 8 }}>📁</Text>
                  <Text style={styles.dropText}>Tap to upload file</Text>
                  <Text style={styles.dropSub}>PDF, JPG, PNG up to 10MB</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Quick upload buttons */}
            <View style={styles.quickRow}>
              {[
                { icon: '🫁', label: 'X-Ray', bg: Colors.primarySoft },
                { icon: '🔊', label: 'Ultrasound', bg: Colors.tealSoft },
                { icon: '🔬', label: 'Blood Test', bg: Colors.dangerSoft },
              ].map(b => (
                <TouchableOpacity
                  key={b.label}
                  style={[styles.quickBtn, { backgroundColor: b.bg }]}
                  onPress={() => {
                    setSelectedType(b.label);
                    pickImage();
                  }}
                >
                  <Text style={{ fontSize: 20 }}>{b.icon}</Text>
                  <Text style={styles.quickBtnText}>{b.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Upload button */}
            <Button
              label={uploading ? '⏳ Uploading & Analysing...' : '🚀 Upload Report'}
              onPress={handleUpload}
              disabled={uploading || !selectedFile}
              size="lg"
              style={{ marginTop: 12, width: '100%' }}
            />

            {uploading && (
              <View style={{ alignItems: 'center', marginTop: 12 }}>
                <ActivityIndicator color={Colors.primary} />
                <Text style={{ fontSize: 11, color: Colors.gray400, marginTop: 6 }}>🤖 AI is analysing your report...</Text>
              </View>
            )}

            {showSuccess && uploadSuccess && (
              <View style={styles.successBox}>
                <Text style={styles.successTitle}>✅ Upload Successful!</Text>
                <Text style={styles.successBody}>{uploadSuccess.summary}</Text>
                <Text style={{ fontSize: 10, color: Colors.gray500, marginTop: 6 }}>
                  ⚠️ Not a substitute for professional medical advice.
                </Text>
              </View>
            )}
          </View>
        </Card>

        {/* My Reports */}
        <Card>
          <CardHeader title="📁 My Reports" right={<Badge label={`${reports.length} reports`} />} />
          <View>
            {loading ? (
              <View style={{ alignItems: 'center', padding: 30 }}>
                <ActivityIndicator color={Colors.primary} />
              </View>
            ) : reports.length === 0 ? (
              <View style={{ alignItems: 'center', padding: 30 }}>
                <Text style={{ fontSize: 40, marginBottom: 8 }}>📁</Text>
                <Text style={{ color: Colors.gray500 }}>No reports uploaded yet</Text>
              </View>
            ) : (
              reports.map((r, i) => (
                <View key={r._id} style={[styles.reportItem, i < reports.length - 1 && styles.reportBorder]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <View style={styles.reportIconBox}>
                        <Text style={{ fontSize: 22 }}>{getReportIcon(r.reportType)}</Text>
                      </View>
                      <View>
                        <Text style={{ fontWeight: '700', fontSize: 13, color: Colors.gray800 }}>{r.reportType}</Text>
                        <Text style={{ fontSize: 11, color: Colors.gray400 }}>
                          {formatDate(r.createdAt)} · {formatFileSize(r.size)}
                        </Text>
                        <Text style={{ fontSize: 10, color: Colors.gray400 }} numberOfLines={1}>
                          {r.originalName}
                        </Text>
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <TouchableOpacity onPress={() => handleDeleteReport(r._id)}>
                        <Text style={{ fontSize: 16, color: Colors.danger }}>🗑️</Text>
                      </TouchableOpacity>
                      <Button label="View →" onPress={() => handleViewReport(r)} size="sm" />
                    </View>
                  </View>
                  {r.aiSummary && (
                    <View style={styles.aiBox}>
                      <Text style={styles.aiLabel}>🤖 AI SUMMARY</Text>
                      <Text style={styles.aiText}>{r.aiSummary}</Text>
                    </View>
                  )}
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
  label: { fontSize: 12, fontWeight: '600', color: Colors.gray700, marginBottom: 8 },
  typeChip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.white, marginRight: 8 },
  typeChipActive: { borderColor: Colors.primary, backgroundColor: Colors.primarySoft },
  typeChipText: { fontSize: 12, fontWeight: '600', color: Colors.gray600 },
  dropZone: { borderWidth: 2, borderColor: Colors.border, borderStyle: 'dashed', borderRadius: 12, padding: 24, alignItems: 'center', backgroundColor: Colors.gray50, marginBottom: 14 },
  dropText: { fontSize: 14, fontWeight: '600', color: Colors.gray700 },
  dropSub: { fontSize: 11, color: Colors.gray400, marginTop: 4 },
  quickRow: { flexDirection: 'row', gap: 10, marginBottom: 4 },
  quickBtn: { flex: 1, padding: 10, borderRadius: 10, alignItems: 'center', gap: 4 },
  quickBtnText: { fontSize: 11, fontWeight: '600', color: Colors.gray700 },
  successBox: { marginTop: 12, padding: 14, backgroundColor: Colors.successSoft, borderRadius: 10, borderWidth: 1, borderColor: '#BBF7D0' },
  successTitle: { fontSize: 13, fontWeight: '700', color: Colors.success, marginBottom: 4 },
  successBody: { fontSize: 12, color: Colors.success, fontWeight: '500' },
  reportItem: { padding: 16 },
  reportBorder: { borderBottomWidth: 1, borderBottomColor: Colors.gray100 },
  reportIconBox: { width: 44, height: 44, backgroundColor: Colors.gray100, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  aiBox: { backgroundColor: Colors.gray50, borderRadius: 8, padding: 10, borderLeftWidth: 3, borderLeftColor: Colors.primary },
  aiLabel: { fontSize: 10, fontWeight: '700', color: Colors.primary, marginBottom: 4 },
  aiText: { fontSize: 12, color: Colors.gray600, lineHeight: 18 },
});
