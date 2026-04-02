import React, { useState, useEffect, useContext } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Switch, Alert, ActivityIndicator, Share,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import BottomNavLayout from '@/components/BottomNavLayout';
import { Card, Button, Badge, IconBox } from '../../components/UI';
import { qrAPI, getUserData } from '../../services/api';

interface UserData {
  _id: string;
  name: string;
  email?: string;
  bloodType?: string;
  allergies?: string[];
}

export default function QRCodeScreen() {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const [user, setUser] = useState<UserData | null>(null);
  const [qrData, setQrData] = useState<{ qrToken: string; url: string; expiresIn: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadUserAndQR();
  }, []);

  const loadUserAndQR = async () => {
    try {
      setLoading(true);
      const userData = await getUserData();
      if (userData) {
        setUser(userData as UserData);
        const data = await qrAPI.getEmergencyProfile();
        setQrData(data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load QR');
    } finally {
      setLoading(false);
    }
  };

  const regenerateQR = async () => {
    try {
      setGenerating(true);
      const data = await qrAPI.getEmergencyProfile();
      setQrData(data);
      Alert.alert('Success', 'New QR code generated');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to generate QR');
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = async () => {
    if (qrData?.url) {
      await Clipboard.setStringAsync(qrData.url);
      Alert.alert('Copied', 'URL copied to clipboard');
    }
  };

  const shareQR = async () => {
    if (qrData?.url) {
      try {
        await Share.share({
          message: `Emergency Medical Profile QR: ${qrData.url}`,
          title: 'MediVault Emergency QR',
        });
      } catch (err) {
        console.log('Share cancelled');
      }
    }
  };

  if (loading) {
    return (
      <BottomNavLayout
        title="Emergency QR"
        subtitle="Quick access medical profile"
        role="patient"
      >
        <View style={[styles.centered, { backgroundColor: colors.bgPage }]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ color: colors.textMuted, marginTop: 16 }}>Loading...</Text>
        </View>
      </BottomNavLayout>
    );
  }

  if (!user) {
    return (
      <BottomNavLayout
        title="Emergency QR"
        subtitle="Quick access medical profile"
        role="patient"
      >
        <View style={[styles.centered, { backgroundColor: colors.bgPage }]}>
          <IconBox icon="person-outline" color={colors.textMuted} bg={colors.bgPage} size={64} />
          <Text style={[styles.emptyTitle, { color: colors.textMuted }]}>
            Please login to access QR
          </Text>
        </View>
      </BottomNavLayout>
    );
  }

  return (
    <BottomNavLayout
      title="Emergency QR"
      subtitle="Quick access medical profile"
      role="patient"
      headerRight={
        <Button
          label=""
          variant="ghost"
          size="sm"
          icon="refresh"
          onPress={regenerateQR}
          loading={generating}
        />
      }
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Patient Info Card */}
        <Card variant="elevated" glowColor={colors.primary}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <IconBox icon="person-circle" color={colors.primary} bg={colors.primarySoft} size={44} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.name, { color: colors.textPrimary }]}>
                {user.name}
              </Text>
              <Text style={[styles.email, { color: colors.textMuted }]}>
                {user.email || 'No email'}
              </Text>
            </View>
          </View>
          {(user.bloodType || (user.allergies && user.allergies.length > 0)) && (
            <View style={{ marginTop: 14, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {user.bloodType && (
                <Badge
                  label={`🩸 ${user.bloodType}`}
                  type="primary"
                />
              )}
              {user.allergies && user.allergies.map((allergy, i) => (
                <Badge key={i} label={`⚠️ ${allergy}`} type="danger" />
              ))}
            </View>
          )}
        </Card>

        {/* QR Code Card */}
        <Card variant="gradient" glowColor={colors.primary}>
          <View style={styles.qrHeader}>
            <IconBox icon="qr-code" color={colors.primary} bg={colors.primarySoft} size={28} />
            <Text style={[styles.qrTitle, { color: colors.textPrimary }]}>
              Emergency QR Code
            </Text>
          </View>

          <View style={[styles.qrBox, { backgroundColor: colors.bgPage }]}>
            {qrData ? (
              <QRCode
                value={qrData.url}
                size={200}
                color={colors.textPrimary}
                backgroundColor="white"
              />
            ) : (
              <ActivityIndicator size="large" color={colors.primary} />
            )}
          </View>

          {qrData && (
            <>
              <Badge
                label={qrData.expiresIn ? `Expires: ${qrData.expiresIn}` : 'No expiry'}
                type="success"
              />

              <View style={[styles.urlBox, { backgroundColor: colors.bgPage }]}>
                <Text style={[styles.urlLabel, { color: colors.textMuted }]}>
                  QR URL
                </Text>
                <Text style={[styles.urlText, { color: colors.textSecondary }]} numberOfLines={2}>
                  {qrData.url}
                </Text>
              </View>

              <View style={styles.actionButtons}>
                <Button
                  label="Copy URL"
                  variant="outline"
                  icon="copy"
                  onPress={copyToClipboard}
                  style={{ flex: 1 }}
                />
                <Button
                  label="Share"
                  variant="outline"
                  icon="share-social"
                  onPress={shareQR}
                  style={{ flex: 1, marginLeft: 10 }}
                />
              </View>
            </>
          )}
        </Card>

        {/* How it works */}
        <Card style={{ backgroundColor: colors.warningSoft, borderColor: colors.warning }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
            <IconBox icon="information-circle" color={colors.warning} bg={colors.warningSoft} size={32} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.howTitle, { color: colors.warning }]}>
                How it works
              </Text>
              <Text style={[styles.howText, { color: colors.warning }]}>
                1. Generate a QR code{"\n"}
                2. Save or print it on a medical card{"\n"}
                3. First responders scan it to see your emergency medical profile{"\n"}
                4. No app needed — works in any browser
              </Text>
            </View>
          </View>
        </Card>

        {error && (
          <Card style={{ backgroundColor: colors.dangerSoft, borderColor: colors.danger }}>
            <Text style={{ color: colors.danger }}>{error}</Text>
          </Card>
        )}
      </ScrollView>
    </BottomNavLayout>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: {
    padding: 16,
    paddingBottom: 32,
  },
  name: {
    fontSize: 17,
    fontWeight: '700',
  },
  email: {
    fontSize: 13,
    marginTop: 2,
  },
  qrHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  qrTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  qrBox: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
  },
  urlBox: {
    padding: 12,
    borderRadius: 10,
    marginTop: 8,
  },
  urlLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  urlText: {
    fontSize: 12,
    lineHeight: 18,
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: 16,
  },
  howTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  howText: {
    fontSize: 13,
    lineHeight: 20,
  },
  emptyTitle: {
    fontSize: 16,
    marginTop: 16,
  },
});