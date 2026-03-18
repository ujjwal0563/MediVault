import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import Colors from '../../constants/colors';
import { Button, ProgressBar } from '../../components/UI';
import { authAPI } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

type Role = 'patient' | 'doctor';

export default function RegisterScreen() {
  const router = useRouter();
  const { setUser } = useTheme();
  const [role, setRole] = useState<Role>('patient');
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [username, setUsername] = useState('');
  const [hospitalId, setHospitalId] = useState('');
  const [bloodType, setBloodType] = useState('O+');
  const [allergies, setAllergies] = useState('');
  const [spec, setSpec] = useState('General Physician');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  const steps = [
    { n: 1, label: 'Choose role' },
    { n: 2, label: 'Personal info' },
    { n: 3, label: 'Health profile' },
  ];

  const validateStep2 = (): string[] => {
    const errors: string[] = [];
    if (!firstName.trim()) errors.push('First name is required');
    if (!lastName.trim()) errors.push('Last name is required');
    if (!email.trim()) {
      errors.push('Email is required');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push('Please enter a valid email address');
    }
    if (role === 'doctor' && !hospitalId.trim()) errors.push('Hospital ID is required for doctors');
    return errors;
  };

  const handleNextFromStep2 = () => {
    const errors = validateStep2();
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }
    setValidationErrors([]);
    setStep(3);
  };

  const handleSubmit = async () => {
    if (password !== confirm) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    try {
      const registerData: Parameters<typeof authAPI.register>[0] = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        password,
        role,
      };

      if (username.trim()) registerData.username = username.trim();
      if (phone.trim()) registerData.phone = phone.trim();
      if (role === 'doctor') {
        if (hospitalId.trim()) registerData.hospitalId = hospitalId.trim();
        if (spec) registerData.specialization = spec;
      } else {
        if (bloodType) registerData.bloodType = bloodType;
        if (allergies.trim()) {
          registerData.allergies = allergies.split(',').map(a => a.trim()).filter(Boolean);
        }
      }

      const result = await authAPI.register(registerData);
      setUser(result.user.role, result.user.name || `${firstName} ${lastName}`.trim());
      router.replace(result.user.role === 'doctor' ? '/screens/DoctorDashboard' : '/screens/PatientDashboard');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Registration failed. Please try again.';
      Alert.alert('Registration Failed', message);
    } finally {
      setLoading(false);
    }
  };

  const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
  const specialisations = ['General Physician', 'Cardiologist', 'Neurologist', 'Orthopedic', 'Pediatrician', 'Dermatologist'];

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">

        {/* Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Account</Text>
        </View>

        {/* Step indicator */}
        <View style={styles.stepRow}>
          {steps.map(s => {
            const done = step > s.n;
            const cur  = step === s.n;
            return (
              <View key={s.n} style={styles.stepItem}>
                <View style={[styles.stepCircle, done && styles.stepDone, cur && styles.stepCur]}>
                  <Text style={[styles.stepNum, (done || cur) && { color: done ? Colors.primary : 'white' }]}>
                    {done ? '✓' : s.n}
                  </Text>
                </View>
                <Text style={[styles.stepLabel, cur && { color: Colors.gray800, fontWeight: '700' }]}>{s.label}</Text>
              </View>
            );
          })}
        </View>

        {/* Progress */}
        <ProgressBar value={(step / 3) * 100} style={{ marginBottom: 24 }} />

        <Text style={styles.stepDesc}>
          Step {step} of 3 — {step === 1 ? 'Choose your role' : step === 2 ? 'Personal information' : 'Health profile'}
        </Text>

        {/* STEP 1: Role */}
        {step === 1 && (
          <View>
            <View style={styles.roleGrid}>
              {([
                { r: 'patient', icon: '🏥', label: 'Patient', desc: 'Track health & records' },
                { r: 'doctor',  icon: '👨‍⚕️', label: 'Doctor',  desc: 'Manage your patients' },
              ] as { r: Role; icon: string; label: string; desc: string }[]).map(({ r, icon, label, desc }) => (
                <TouchableOpacity key={r} onPress={() => setRole(r)} style={[styles.roleCard, role === r && styles.roleCardActive]}>
                  <Text style={{ fontSize: 32, marginBottom: 8 }}>{icon}</Text>
                  <Text style={[styles.roleLabel, role === r && { color: Colors.primary }]}>{label}</Text>
                  <Text style={styles.roleDesc}>{desc}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Button label={`Continue as ${role === 'doctor' ? 'Doctor' : 'Patient'} →`} onPress={() => setStep(2)} size="lg" style={{ marginTop: 8 }} />
          </View>
        )}

        {/* STEP 2: Personal info */}
        {step === 2 && (
          <View>
            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.label}>First Name</Text>
                <TextInput style={styles.input} placeholder="Rahul" value={firstName} onChangeText={setFirstName} placeholderTextColor={Colors.gray400} />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Last Name</Text>
                <TextInput style={styles.input} placeholder="Singh" value={lastName} onChangeText={setLastName} placeholderTextColor={Colors.gray400} />
              </View>
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Username</Text>
              <TextInput style={styles.input} placeholder="rahul_singh" value={username} onChangeText={setUsername} autoCapitalize="none" placeholderTextColor={Colors.gray400} />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email Address</Text>
              <TextInput style={styles.input} placeholder="you@example.com" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholderTextColor={Colors.gray400} />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Mobile Number</Text>
              <TextInput style={styles.input} placeholder="+91 98765 43210" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholderTextColor={Colors.gray400} />
            </View>
            {role === 'doctor' && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Hospital ID</Text>
                <TextInput style={styles.input} placeholder="HOSP-2024-001" value={hospitalId} onChangeText={setHospitalId} placeholderTextColor={Colors.gray400} />
              </View>
            )}
            {/* Validation Errors */}
            {validationErrors.length > 0 && (
              <View style={styles.errorBox}>
                {validationErrors.map((err, idx) => (
                  <Text key={idx} style={styles.errorText}>• {err}</Text>
                ))}
              </View>
            )}
            <View style={styles.navRow}>
              <Button label="← Back" onPress={() => { setValidationErrors([]); setStep(1); }} variant="outline" style={{ flex: 1, marginRight: 8 }} />
              <Button label="Continue →" onPress={handleNextFromStep2} style={{ flex: 2 }} />
            </View>
          </View>
        )}

        {/* STEP 3: Health + password */}
        {step === 3 && (
          <View>
            {role === 'patient' && (
              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.label}>Blood Type</Text>
                  <View style={styles.selectWrap}>
                    {bloodTypes.map(b => (
                      <TouchableOpacity key={b} onPress={() => setBloodType(b)} style={[styles.chip, bloodType === b && styles.chipActive]}>
                        <Text style={[styles.chipText, bloodType === b && { color: Colors.primary }]}>{b}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Allergies</Text>
                  <TextInput style={styles.input} placeholder="e.g. Penicillin" value={allergies} onChangeText={setAllergies} placeholderTextColor={Colors.gray400} />
                </View>
              </View>
            )}
            {role === 'doctor' && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Specialisation</Text>
                <View style={styles.selectWrap}>
                  {specialisations.map(s => (
                    <TouchableOpacity key={s} onPress={() => setSpec(s)} style={[styles.chip, spec === s && styles.chipActive]}>
                      <Text style={[styles.chipText, spec === s && { color: Colors.primary }]}>{s}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <TextInput style={styles.input} placeholder="Min. 8 characters" value={password} onChangeText={setPassword} secureTextEntry placeholderTextColor={Colors.gray400} />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirm Password</Text>
              <TextInput style={styles.input} placeholder="Repeat password" value={confirm} onChangeText={setConfirm} secureTextEntry placeholderTextColor={Colors.gray400} />
              {confirm && password !== confirm && <Text style={{ fontSize: 11, color: Colors.danger, marginTop: 4 }}>⚠️ Passwords do not match</Text>}
            </View>
            {/* Summary */}
            <View style={styles.summaryBox}>
              <Text style={styles.summaryTitle}>{role === 'doctor' ? '👨‍⚕️' : '🏥'} Account Summary</Text>
              <Text style={styles.summaryRow}>Name: <Text style={styles.summaryVal}>{firstName} {lastName}</Text></Text>
              <Text style={styles.summaryRow}>Role: <Text style={[styles.summaryVal, { color: Colors.primary }]}>{role === 'doctor' ? 'Doctor' : 'Patient'}</Text></Text>
              {role === 'doctor' && hospitalId ? <Text style={styles.summaryRow}>Hospital ID: <Text style={styles.summaryVal}>{hospitalId}</Text></Text> : null}
              {role === 'doctor' ? <Text style={styles.summaryRow}>Specialisation: <Text style={styles.summaryVal}>{spec}</Text></Text> : null}
            </View>
            <View style={styles.navRow}>
              <Button label="← Back" onPress={() => setStep(2)} variant="outline" style={{ flex: 1, marginRight: 8 }} />
              <Button label={loading ? 'Creating account...' : '🎉 Create Account'} onPress={handleSubmit} disabled={loading || (!!confirm && password !== confirm)} style={{ flex: 2 }} />
            </View>
          </View>
        )}

        <TouchableOpacity onPress={() => router.push('/screens/LoginScreen')} style={{ marginTop: 24, alignItems: 'center' }}>
          <Text style={{ fontSize: 13, color: Colors.gray500 }}>
            Already have an account? <Text style={{ color: Colors.primary, fontWeight: '600' }}>Sign in</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgPage },
  inner: { padding: 24, paddingTop: 56 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  backBtn: { marginRight: 12 },
  backText: { color: Colors.primary, fontSize: 14, fontWeight: '600' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: Colors.gray900 },
  stepRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  stepItem: { alignItems: 'center', gap: 6 },
  stepCircle: { width: 30, height: 30, borderRadius: 15, backgroundColor: Colors.gray200, alignItems: 'center', justifyContent: 'center' },
  stepDone: { backgroundColor: Colors.primarySoft },
  stepCur: { backgroundColor: Colors.primary },
  stepNum: { fontSize: 13, fontWeight: '800', color: Colors.gray500 },
  stepLabel: { fontSize: 11, color: Colors.gray400 },
  stepDesc: { fontSize: 13, color: Colors.gray500, marginBottom: 20 },
  roleGrid: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  roleCard: { flex: 1, padding: 18, borderRadius: 14, borderWidth: 2, borderColor: Colors.border, backgroundColor: Colors.white, alignItems: 'center' },
  roleCardActive: { borderColor: Colors.primary, backgroundColor: Colors.primarySoft },
  roleLabel: { fontSize: 16, fontWeight: '700', color: Colors.gray800 },
  roleDesc: { fontSize: 11, color: Colors.gray400, marginTop: 4, textAlign: 'center' },
  row: { flexDirection: 'row' },
  navRow: { flexDirection: 'row', marginTop: 8 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 12, fontWeight: '600', color: Colors.gray700, marginBottom: 6 },
  input: { backgroundColor: Colors.white, borderWidth: 1.5, borderColor: Colors.border, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 14, fontSize: 14, color: Colors.gray900 },
  selectWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingVertical: 5, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.white },
  chipActive: { borderColor: Colors.primary, backgroundColor: Colors.primarySoft },
  chipText: { fontSize: 12, fontWeight: '600', color: Colors.gray600 },
  summaryBox: { backgroundColor: Colors.primarySoft, borderWidth: 1, borderColor: Colors.primary, borderRadius: 10, padding: 14, marginBottom: 16 },
  summaryTitle: { fontWeight: '700', color: Colors.primary, marginBottom: 6, fontSize: 13 },
  summaryRow: { fontSize: 12, color: Colors.gray600, lineHeight: 22 },
  summaryVal: { fontWeight: '700', color: Colors.gray800 },
  errorBox: { backgroundColor: Colors.dangerSoft, borderWidth: 1, borderColor: Colors.danger, borderRadius: 8, padding: 12, marginBottom: 16 },
  errorText: { fontSize: 12, color: Colors.danger, marginBottom: 4 },
});
