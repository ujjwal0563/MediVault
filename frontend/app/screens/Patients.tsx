import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import DrawerLayout from '../../components/DrawerLayout';
import { StatCard, Card, Badge, Button, ProgressBar, Avatar } from '../../components/UI';
import { doctorAPI, Patient } from '../../services/api';

const STATUS_STYLE: Record<string, { badge: 'danger' | 'warning' | 'success'; bar: string }> = {
  Critical: { badge: 'danger', bar: '#DC2626' },
  Monitor: { badge: 'warning', bar: '#D97706' },
  Stable: { badge: 'success', bar: '#16A34A' },
};

export default function PatientsScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadPatients = async (query?: string) => {
    try {
      const data = await doctorAPI.getPatients(query);
      setPatients(data.patients || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch patients');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPatients();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadPatients(search || undefined);
    setRefreshing(false);
  }, [search]);

  const handleSearch = () => {
    loadPatients(search || undefined);
  };

  const filtered = patients.filter(p => {
    const matchSearch = (p.name || '').toLowerCase().includes(search.toLowerCase());
    return matchSearch;
  });

  const viewPatient = (p: Patient) => {
    router.push({ pathname: '/screens/PatientDetails', params: { id: p._id } } as any);
  };

  const criticalCount = 0;
  const monitorCount = 0;
  const stableCount = patients.length;

  return (
    <DrawerLayout title="Patients" subtitle={`${patients.length} total patients`}
      role="doctor" userName="Dr. Sharma" userInitial="DS" showBack
      headerRight={
        <Button label="+ Add" onPress={() => router.push('/screens/PatientDetails' as any)} size="sm"
          style={{ backgroundColor: 'rgba(255,255,255,0.2)' }} />
      }>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        style={{ backgroundColor: colors.bgPage }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}>

        {loading ? (
          <View style={{ alignItems: 'center', padding: 40 }}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 10 }}>Loading patients...</Text>
          </View>
        ) : error ? (
          <Text style={{ color: colors.danger, textAlign: 'center', padding: 20 }}>{error}</Text>
        ) : (
          <>
            {/* Stats */}
            <View style={s.statsGrid}>
              <View style={s.statHalf}><StatCard icon="👥" value={patients.length} label="Total Patients" /></View>
              <View style={s.statHalf}><StatCard icon="🚨" value={criticalCount} label="Critical" iconBg={colors.dangerSoft} valueColor={colors.danger} /></View>
              <View style={s.statHalf}><StatCard icon="👁️" value={monitorCount} label="Under Monitor" iconBg={colors.warningSoft} valueColor={colors.warning} /></View>
              <View style={s.statHalf}><StatCard icon="✅" value={stableCount} label="Stable" iconBg={colors.successSoft} valueColor={colors.success} /></View>
            </View>

            {/* Search + Filter */}
            <View style={[s.searchCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
              {/* Search bar */}
              <View style={[s.searchRow, { backgroundColor: colors.bgPage, borderColor: colors.border }]}>
                <Text style={{ fontSize: 16, marginRight: 8, color: colors.textFaint }}>🔍</Text>
                <TextInput
                  style={[s.searchInput, { color: colors.textPrimary }]}
                  placeholder="Search by name, condition, doctor…"
                  placeholderTextColor={colors.textFaint}
                  value={search}
                  onChangeText={setSearch}
                />
                {search.length > 0 && (
                  <TouchableOpacity onPress={() => setSearch('')}>
                    <Text style={{ color: colors.textFaint, fontSize: 16, marginLeft: 6 }}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>
              {/* Filter pills */}
              <View style={s.filterRow}>
                {['All', 'Critical', 'Monitor', 'Stable'].map(f => (
                  <TouchableOpacity key={f} onPress={() => setFilter(f)}
                    style={[s.filterBtn, {
                      backgroundColor: filter === f
                        ? (f === 'Critical' ? colors.danger : f === 'Monitor' ? colors.warning : f === 'Stable' ? colors.success : colors.primary)
                        : colors.bgPage,
                      borderColor: filter === f
                        ? (f === 'Critical' ? colors.danger : f === 'Monitor' ? colors.warning : f === 'Stable' ? colors.success : colors.primary)
                        : colors.border,
                    }]}>
                    <Text style={[s.filterTxt, { color: filter === f ? 'white' : colors.textMuted }]}>{f}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {/* Result count */}
              <Text style={{ fontSize: 11, color: colors.textFaint, marginTop: 8 }}>
                Showing {filtered.length} of {patients.length} patients
              </Text>
            </View>

            {/* Patient Cards */}
            <View style={{ gap: 12 }}>
              {filtered.map(p => {
                const sc = STATUS_STYLE.Stable;
                const initials = p.name ? p.name.split(' ').map((n: string) => n[0]).join('') : '?';
                return (
                  <View key={p._id} style={[s.patientCard, {
                    backgroundColor: colors.bgCard, borderColor: colors.border,
                  }]}>
                    <View style={[s.statusLine, { backgroundColor: sc.bar }]} />

                    <View style={{ padding: 14 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                          <View style={[s.avatar, { backgroundColor: colors.primarySoft }]}>
                            <Text style={{ fontSize: 14, fontWeight: '800', color: colors.primary }}>
                              {initials}
                            </Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontWeight: '800', fontSize: 15, color: colors.textPrimary }}>{p.name}</Text>
                            <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 1 }}>{p.email}</Text>
                          </View>
                        </View>
                        <Badge label="Stable" type={sc.badge} />
                      </View>

                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                        {p.bloodType && <Badge label={`Blood: ${p.bloodType}`} type="primary" />}
                        {p.allergies && p.allergies.length > 0 && <Badge label={`${p.allergies.length} allergies`} type="warning" />}
                      </View>

                      <View style={{ flexDirection: 'row', gap: 10 }}>
                        <Button label="View Details" onPress={() => viewPatient(p)} style={{ flex: 1 }} size="sm" />
                        <Button label="📱 SMS" onPress={() => { }} variant="outline" size="sm" />
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>

            {filtered.length === 0 && (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <Text style={{ fontSize: 40, marginBottom: 10 }}>🔍</Text>
                <Text style={{ color: colors.textMuted, fontSize: 15, fontWeight: '600' }}>No patients found</Text>
                <Text style={{ color: colors.textFaint, fontSize: 12, marginTop: 4 }}>Try a different search term</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </DrawerLayout>
  );
}

const s = StyleSheet.create({
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  statHalf: { width: '48%' },
  searchCard: {
    borderRadius: 16, borderWidth: 1, padding: 14, marginBottom: 16,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2
  },
  searchRow: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1.5,
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10
  },
  searchInput: { flex: 1, fontSize: 14 },
  filterRow: { flexDirection: 'row', gap: 8 },
  filterBtn: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1.5 },
  filterTxt: { fontSize: 12, fontWeight: '600' },
  patientCard: {
    borderRadius: 16, borderWidth: 1, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2
  },
  statusLine: { height: 4 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
