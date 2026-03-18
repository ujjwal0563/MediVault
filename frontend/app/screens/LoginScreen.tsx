import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import Colors from '../../constants/colors';
import { Button } from '../../components/UI';
import { useTheme } from '../../context/ThemeContext';
import { authAPI } from '../../services/api';

type Role = 'patient' | 'doctor';
type LoginMode = 'email' | 'mobile' | 'username' | 'hospitalId';

export default function LoginScreen() {
  const router = useRouter();
  const { setUser, colors } = useTheme();

  const [role, setRole] = useState<Role>('patient');
  const [loginMode, setLoginMode] = useState<LoginMode>('email');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const patientModes: LoginMode[] = ['email', 'mobile', 'username'];
  const doctorModes: LoginMode[]  = ['hospitalId', 'email'];
  const modes = role === 'doctor' ? doctorModes : patientModes;

  const modeLabel: Record<LoginMode, string> = {
    email: 'Email', mobile: 'Mobile', username: 'Username', hospitalId: 'Hospital ID',
  };

  const handleSignIn = async () => {
    if (!identifier.trim()) {
      setError(`Please enter your ${modeLabel[loginMode].toLowerCase()}.`);
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const loginData: { identifier?: string; password: string; role: Role; loginMode?: string } = {
        password,
        role,
      };

      if (loginMode === 'email') {
        loginData.identifier = identifier;
        loginData.loginMode = 'email';
      } else if (loginMode === 'mobile') {
        loginData.identifier = identifier;
        loginData.loginMode = 'mobile';
      } else if (loginMode === 'username') {
        loginData.identifier = identifier;
        loginData.loginMode = 'username';
      } else if (loginMode === 'hospitalId') {
        loginData.identifier = identifier;
        loginData.loginMode = 'hospitalId';
      }

      const result = await authAPI.login(loginData);
      setUser(result.user.role, result.user.name || `${result.user.firstName || ''} ${result.user.lastName || ''}`.trim());
      router.replace(result.user.role === 'doctor' ? '/screens/DoctorDashboard' : '/screens/PatientDashboard');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed. Please try again.';
      setError(message);
      Alert.alert('Login Failed', message);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoAccess = async (demoRole: Role) => {
    Alert.alert(
      'Demo Mode',
      'Demo access skips authentication. For full functionality, please create an account or login.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue Demo',
          onPress: () => {
            setUser(demoRole, demoRole === 'doctor' ? 'Dr. Demo User' : 'Demo Patient');
            router.replace(demoRole === 'doctor' ? '/screens/DoctorDashboard' : '/screens/PatientDashboard');
          },
        },
      ]
    );
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoBox}><Text style={styles.logoText}>✚</Text></View>
          <Text style={styles.brand}>MediVault</Text>
          <Text style={styles.brandSub}>HEALTH PLATFORM</Text>
        </View>

        <Text style={styles.title}>Welcome back 👋</Text>
        <Text style={styles.subtitle}>Sign in to your MediVault account</Text>

        {/* Role Picker */}
        <View style={styles.roleRow}>
          {(['patient', 'doctor'] as Role[]).map(r => (
            <TouchableOpacity
              key={r}
              onPress={() => { setRole(r); setLoginMode(r === 'doctor' ? 'hospitalId' : 'email'); setError(''); }}
              style={[styles.roleBtn, role === r && styles.roleBtnActive]}
            >
              <Text style={{ fontSize: 20 }}>{r === 'patient' ? '🏥' : '👨‍⚕️'}</Text>
              <Text style={[styles.roleBtnText, role === r && { color: Colors.primary }]}>
                {r === 'patient' ? 'Patient' : 'Doctor'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Login Mode Tabs */}
        <View style={styles.modeTabs}>
          {modes.map(m => (
            <TouchableOpacity key={m} onPress={() => { setLoginMode(m); setError(''); }} style={[styles.modeTab, loginMode === m && styles.modeTabActive]}>
              <Text style={[styles.modeTabText, loginMode === m && { color: Colors.primary }]}>{modeLabel[m]}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Primary Field */}
        <View style={styles.inputGroup}>
          {loginMode === 'email' && (
            <>
              <Text style={styles.label}>Email Address</Text>
              <TextInput style={styles.input} placeholder={role === 'doctor' ? 'doctor@hospital.com' : 'you@example.com'} value={identifier} onChangeText={setIdentifier} keyboardType="email-address" autoCapitalize="none" placeholderTextColor={Colors.gray400} />
            </>
          )}
          {loginMode === 'mobile' && (
            <>
              <Text style={styles.label}>Mobile Number</Text>
              <TextInput style={styles.input} placeholder="+91 98765 43210" value={identifier} onChangeText={setIdentifier} keyboardType="phone-pad" placeholderTextColor={Colors.gray400} />
            </>
          )}
          {loginMode === 'username' && (
            <>
              <Text style={styles.label}>Username</Text>
              <TextInput style={styles.input} placeholder="your_username" value={identifier} onChangeText={setIdentifier} autoCapitalize="none" placeholderTextColor={Colors.gray400} />
            </>
          )}
          {loginMode === 'hospitalId' && (
            <>
              <Text style={styles.label}>Hospital ID</Text>
              <TextInput style={styles.input} placeholder="e.g. HOSP-2024-001" value={identifier} onChangeText={setIdentifier} autoCapitalize="none" placeholderTextColor={Colors.gray400} />
            </>
          )}
        </View>

        {/* Password */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Password</Text>
          <TextInput style={styles.input} placeholder="Enter your password" value={password} onChangeText={setPassword} secureTextEntry placeholderTextColor={Colors.gray400} />
        </View>

        {/* Error */}
        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
          </View>
        ) : null}

        {/* Sign In */}
        <Button label={loading ? 'Signing in...' : `Sign In as ${role === 'doctor' ? 'Doctor' : 'Patient'} →`} onPress={handleSignIn} disabled={loading} size="lg" style={{ marginTop: 8 }} />

        {/* Demo shortcuts */}
        <View style={styles.demoBox}>
          <Text style={styles.demoLabel}>QUICK DEMO ACCESS</Text>
          <View style={styles.demoRow}>
            <Button label="Doctor View" onPress={() => handleDemoAccess('doctor')} variant="outline" size="sm" style={{ flex: 1, marginRight: 8 }} />
            <Button label="Patient View" onPress={() => handleDemoAccess('patient')} variant="outline" size="sm" style={{ flex: 1 }} />
          </View>
        </View>

        {/* Register */}
        <TouchableOpacity onPress={() => router.push('/screens/Register')} style={{ marginTop: 16, alignItems: 'center' }}>
          <Text style={{ fontSize: 13, color: Colors.gray500 }}>
            Don't have an account?{' '}
            <Text style={{ color: Colors.primary, fontWeight: '600' }}>Create account</Text>
          </Text>
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgPage },
  inner: { padding: 24, paddingTop: 60 },
  header: { alignItems: 'center', marginBottom: 32 },
  logoBox: { width: 60, height: 60, borderRadius: 18, backgroundColor: Colors.primaryDark, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  logoText: { fontSize: 28, color: 'white', fontWeight: '800' },
  brand: { fontSize: 28, fontWeight: '900', color: Colors.primaryDark, letterSpacing: -1 },
  brandSub: { fontSize: 10, color: Colors.gray400, letterSpacing: 3, textTransform: 'uppercase', marginTop: 2 },
  title: { fontSize: 24, fontWeight: '800', color: Colors.gray900, letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: Colors.gray500, marginBottom: 24, marginTop: 2 },
  roleRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  roleBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 10, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.white },
  roleBtnActive: { borderColor: Colors.primary, backgroundColor: Colors.primarySoft },
  roleBtnText: { fontSize: 14, fontWeight: '600', color: Colors.gray600 },
  modeTabs: { flexDirection: 'row', borderBottomWidth: 2, borderBottomColor: Colors.border, marginBottom: 20 },
  modeTab: { paddingVertical: 8, paddingHorizontal: 14, borderBottomWidth: 2, borderBottomColor: 'transparent', marginBottom: -2 },
  modeTabActive: { borderBottomColor: Colors.primary },
  modeTabText: { fontSize: 12, fontWeight: '600', color: Colors.gray400 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 12, fontWeight: '600', color: Colors.gray700, marginBottom: 6 },
  input: { backgroundColor: Colors.white, borderWidth: 1.5, borderColor: Colors.border, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 14, fontSize: 14, color: Colors.gray900 },
  errorBox: { backgroundColor: Colors.dangerSoft, borderWidth: 1, borderColor: Colors.danger, borderRadius: 8, padding: 12, marginBottom: 12 },
  errorText: { fontSize: 12, color: Colors.danger },
  demoBox: { marginTop: 24, padding: 14, backgroundColor: Colors.gray50, borderRadius: 12, borderWidth: 1, borderColor: Colors.border },
  demoLabel: { fontSize: 10, fontWeight: '700', color: Colors.gray400, letterSpacing: 0.5, marginBottom: 10 },
  demoRow: { flexDirection: 'row' },
});
