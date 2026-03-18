# Frontend Implementation Plan

## Phase 1: API Service Layer (Day 1)

### 1.1 Add AsyncStorage for Token Persistence
- **File:** `frontend/services/api.ts`
- **Issue:** Token stored in memory — lost on app restart
- **Dependency:** `@react-native-async-storage/async-storage`
- **Fix:**
```bash
cd frontend && npx expo install @react-native-async-storage/async-storage
```

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = '@MediVault:authToken';
const USER_KEY = '@MediVault:userData';

// Update getToken:
export const getToken = async (): Promise<string | null> => {
  return await AsyncStorage.getItem(TOKEN_KEY);
};

// Update setToken:
export const setToken = async (token: string): Promise<void> => {
  await AsyncStorage.setItem(TOKEN_KEY, token);
};

// Update clearToken:
export const clearToken = async (): Promise<void> => {
  await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
};

// Update setUserData:
export const setUserData = async (user: User): Promise<void> => {
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
};

// Update getUserData:
export const getUserData = async (): Promise<User | null> => {
  const data = await AsyncStorage.getItem(USER_KEY);
  return data ? JSON.parse(data) : null;
};
```

### 1.2 Add Request Timeout
- **File:** `frontend/services/api.ts`
- **Issue:** API calls hang forever on network issues
- **Fix:**
```typescript
const TIMEOUT_MS = 15000;

const apiCall = async (
  endpoint: string,
  options: RequestInit = {},
  requiresAuth: boolean = true
): Promise<ApiResponse> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
  
  try {
    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    // ... rest of response handling
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Request timed out. Please check your connection.');
    }
    throw error;
  }
};
```

### 1.3 Add JSON Parse Error Handling
- **File:** `frontend/services/api.ts` | **Line:** 69
- **Fix:**
```typescript
// BEFORE:
const data = await response.json();

// AFTER:
const text = await response.text();
if (!text) return {};
try {
  const data = JSON.parse(text);
} catch {
  throw new Error('Invalid response from server');
}
```

### 1.4 Fix uploadReport Method
- **File:** `frontend/services/api.ts` | **Lines:** 188-205
- **Fix:**
```typescript
uploadReport: async (fileData: FormData): Promise<ApiResponse> => {
  const response = await fetch(`${BASE_URL}/patient/reports`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${await getToken()}`,
      // Do NOT set Content-Type for FormData
    },
    body: fileData,
  });
  
  const text = await response.text();
  if (!text) throw new Error('Empty response from server');
  
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('Invalid JSON response');
  }
  
  if (!response.ok) {
    throw new Error(data.message || `Upload Error: ${response.status}`);
  }
  return data;
},
```

### 1.5 Add TypeScript Interfaces
- **File:** `frontend/services/api.ts`
- **Add:**
```typescript
export interface User {
  _id: string;
  name: string;
  email: string;
  role: 'patient' | 'doctor';
  phone?: string;
  hospitalId?: string;
  firstName?: string;
  lastName?: string;
}

export interface Medicine {
  _id: string;
  name: string;
  dosage: string;
  frequency: string;
  timeSlots: string[];
  startDate: string;
  endDate?: string;
  instructions?: string;
  createdBy?: string;
}

export interface MedRecord {
  _id: string;
  patientId: string;
  doctorId: string;
  diagnosis: string;
  notes: string;
  date: string;
  fileUrls: string[];
  aiSummary?: string;
  createdAt: string;
}

export interface Report {
  _id: string;
  patientId: string;
  reportType: string;
  fileUrl: string;
  cloudinaryPublicId: string;
  uploadDate: string;
  status: string;
  aiSummary?: string;
}

export interface SymptomLog {
  _id: string;
  userId: string;
  symptoms: string;
  aiConditions: string[];
  urgency: 'low' | 'medium' | 'high';
  advice: string;
  createdAt: string;
}

export interface Notification {
  _id: string;
  userId: string;
  title: string;
  body: string;
  type: string;
  tag?: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}
```

**Replace all `any` types in API method signatures with proper types.**

---

## Phase 2: Global Error Handling (Day 1)

### 2.1 Create ErrorBoundary Component
- **File:** `frontend/components/ErrorBoundary.tsx` (new)
```typescript
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface Props { children: React.ReactNode; fallback?: React.ReactNode; }
interface State { hasError: boolean; error: Error | null; }

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: null };
  
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }
  
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info);
  }
  
  handleReset = () => {
    this.setState({ hasError: false, error: null });
  }
  
  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>{this.state.error?.message}</Text>
          <TouchableOpacity style={styles.button} onPress={this.handleReset}>
            <Text style={styles.buttonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 10 },
  message: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 20 },
  button: { backgroundColor: '#007AFF', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  buttonText: { color: '#fff', fontWeight: '600' },
});
```

### 2.2 Wrap Root Layout
- **File:** `frontend/app/_layout.tsx`
- **Fix:**
```typescript
import ErrorBoundary from '@/components/ErrorBoundary';

// Wrap everything:
export default function RootLayout() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <BadgeProvider>
          {/* existing components */}
        </BadgeProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
```

### 2.3 Create ErrorMessage Component
- **File:** `frontend/components/ErrorMessage.tsx` (new)
```typescript
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';

interface Props { message: string; onRetry?: () => void; }

export default function ErrorMessage({ message, onRetry }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>{message || 'An error occurred'}</Text>
      {onRetry && (
        <TouchableOpacity onPress={onRetry} style={styles.retryButton}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, alignItems: 'center' },
  text: { color: Colors.danger, textAlign: 'center', marginBottom: 8 },
  retryButton: { marginTop: 8 },
  retryText: { color: Colors.primary, fontWeight: '600' },
});
```

---

## Phase 3: Screen Data & Logic Fixes (Day 2-4)

### 3.1 Fix Data Fetching Race Conditions
**All screens with async `useEffect` need:**
- `isMounted` flag to prevent state updates on unmount
- `AbortController` to cancel in-flight requests
- Proper error handling with `Alert.alert`
- Functional state updates to avoid stale closures

**Pattern:**
```typescript
useEffect(() => {
  let isMounted = true;
  const controller = new AbortController();
  
  const loadData = async () => {
    try {
      setLoading(true);
      const response = await api.endpoint({ signal: controller.signal });
      if (isMounted) {
        setData(response.data);
        setError(null);
      }
    } catch (err: any) {
      if (isMounted && err.name !== 'AbortError') {
        setError(err.message);
        Alert.alert('Error', err.message);
      }
    } finally {
      if (isMounted) setLoading(false);
    }
  };
  
  loadData();
  
  return () => {
    isMounted = false;
    controller.abort();
  };
}, []);
```

**Screens needing fix:**
- `PatientDashboard.tsx` (lines 68-89)
- `DoctorDashboard.tsx` (lines 94-96)
- `Medicines.tsx` (line 31)
- `Records.tsx` (fetchRecords)
- `Reports.tsx` (fetchReports)
- `Symptoms.tsx` (fetchRecentChecks)
- `Alerts.tsx` (fetchAlerts)
- `Timeline.tsx` (fetchTimelineData)
- `QRProfile.tsx` (lines 42-57)
- `PatientDetails.tsx` (lines 44-47)

### 3.2 Fix SplashScreen Animations
- **File:** `frontend/app/screens/SplashScreen.tsx`
- **Fix:**
```typescript
const animationRef = useRef<Animated.CompositeAnimation | null>(null);

useEffect(() => {
  animationRef.current = Animated.loop(
    Animated.sequence([
      Animated.timing(opacity, { toValue: 0.3, duration: 1500, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 1500, useNativeDriver: true }),
    ])
  );
  animationRef.current.start();

  // ... existing setInterval logic with ref

  return () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (animationRef.current) animationRef.current.stop();
  };
}, []);
```

### 3.3 Fix LoginScreen Validation
- **File:** `frontend/app/screens/LoginScreen.tsx`
- **Add email validation:**
```typescript
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const handleLogin = async () => {
  if (!emailRegex.test(email)) {
    Alert.alert('Invalid Email', 'Please enter a valid email address');
    return;
  }
  if (password.length < 8) {
    Alert.alert('Invalid Password', 'Password must be at least 8 characters');
    return;
  }
  // ... existing login logic
};
```

### 3.4 Fix Register Validation
- **File:** `frontend/app/screens/Register.tsx`
- **Add comprehensive validation:**
```typescript
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^[0-9]{10}$/;

const validateForm = () => {
  const errors: string[] = [];
  if (!firstName.trim()) errors.push('First name is required');
  if (!lastName.trim()) errors.push('Last name is required');
  if (!emailRegex.test(email)) errors.push('Valid email is required');
  if (!phoneRegex.test(phone)) errors.push('Valid phone number is required');
  if (password.length < 8) errors.push('Password must be at least 8 characters');
  if (!/[A-Z]/.test(password)) errors.push('Password needs uppercase letter');
  if (!/[a-z]/.test(password)) errors.push('Password needs lowercase letter');
  if (!/[0-9]/.test(password)) errors.push('Password needs a number');
  if (!/[!@#$%^&*]/.test(password)) errors.push('Password needs special character');
  if (password !== confirmPassword) errors.push('Passwords do not match');
  if (role === 'doctor' && !hospitalId.trim()) errors.push('Hospital ID required');
  return errors;
};

const handleSubmit = async () => {
  const errors = validateForm();
  if (errors.length > 0) {
    Alert.alert('Please fix the following:', errors.join('\n'));
    return;
  }
  // ... existing submit logic
};
```

### 3.5 Implement Medicines CRUD
- **File:** `frontend/app/screens/Medicines.tsx`
- **Edit button (line 132):**
```typescript
onPress={() => {
  setEditingMedicine(med);
  setShowModal(true);
}}
```
- **Delete button (line 133):**
```typescript
onPress={() => {
  Alert.alert(
    'Delete Medicine',
    `Are you sure you want to delete ${med.name}?`,
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await medicineAPI.deleteMedicine(med._id);
            setMedicines(prev => prev.filter(m => m._id !== med._id));
          } catch (error: any) {
            Alert.alert('Error', error.message);
          }
        },
      },
    ]
  );
}}
```
- **Add API method to api.ts:**
```typescript
deleteMedicine: async (medicineId: string): Promise<ApiResponse> => {
  return apiCall(`/medicine/${medicineId}`, { method: 'DELETE' }, true);
},
```

### 3.6 Implement Reports Upload
- **File:** `frontend/app/screens/Reports.tsx`
- **Dependencies:** `expo-image-picker`, `expo-web-browser`
```bash
cd frontend && npx expo install expo-image-picker expo-web-browser
```
- **Add ImagePicker:**
```typescript
import * as ImagePicker from 'expo-image-picker';
import * as WebBrowser from 'expo-web-browser';

const pickImage = async () => {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    Alert.alert('Permission Required', 'Please allow access to your photos');
    return;
  }
  
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.8,
  });
  
  if (!result.canceled && result.assets[0]) {
    setSelectedFile(result.assets[0]);
  }
};
```
- **Wire Dropzone (line 92):** `<TouchableOpacity onPress={pickImage} ...>`
- **Wire quick buttons (line 105):**
```typescript
<TouchableOpacity onPress={() => { setSelectedType('X-Ray'); pickImage(); }}>
<TouchableOpacity onPress={() => { setSelectedType('Ultrasound'); pickImage(); }}>
<TouchableOpacity onPress={() => { setSelectedType('Blood Report'); pickImage(); }}>
```
- **Fix handleUpload (line 54):**
```typescript
const handleUpload = async () => {
  if (!selectedFile) {
    Alert.alert('Select a file', 'Please select a report file to upload');
    return;
  }
  
  setUploading(true);
  try {
    const formData = new FormData();
    formData.append('report', {
      uri: selectedFile.uri,
      type: selectedFile.mimeType || 'image/jpeg',
      name: selectedFile.fileName || 'report.jpg',
    } as any);
    formData.append('reportType', selectedType);
    
    const response = await patientAPI.uploadReport(formData);
    setReports(prev => [response.data, ...prev]);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  } catch (error: any) {
    Alert.alert('Upload Failed', error.message);
  } finally {
    setUploading(false);
    setSelectedFile(null);
  }
};
```
- **Fix View button (line 157):**
```typescript
onPress={() => {
  if (r.fileUrl) {
    WebBrowser.openBrowserAsync(r.fileUrl);
  }
}}
```

### 3.7 Implement Profile Saves
- **File:** `frontend/app/screens/Profile.tsx`
- **Fix Field component (line 22):**
```typescript
// BEFORE: defaultValue={value}
// AFTER:  value={value}
```
- **Add API methods to authAPI:**
```typescript
updateProfile: async (data: Partial<User>): Promise<ApiResponse> => {
  return apiCall('/auth/profile', { method: 'PUT', body: JSON.stringify(data) }, true);
},

updatePassword: async (data: { currentPassword: string; newPassword: string }): Promise<ApiResponse> => {
  return apiCall('/auth/password', { method: 'PUT', body: JSON.stringify(data) }, true);
},

deleteAccount: async (): Promise<ApiResponse> => {
  return apiCall('/auth/account', { method: 'DELETE' }, true);
},
```
- **Wire Save buttons (lines 141, 174, 282, 305, 338):** Call appropriate API methods with validation
- **Delete account (line 348):**
```typescript
const handleDeleteAccount = () => {
  Alert.alert(
    'Delete Account',
    'This action cannot be undone. All your data will be permanently deleted.',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: () => {
          Alert.alert('Confirm Delete', 'Type DELETE to confirm.', [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Delete Permanently', style: 'destructive',
              onPress: async () => {
                try {
                  await authAPI.deleteAccount();
                  await clearToken();
                  router.replace('/');
                } catch (error: any) {
                  Alert.alert('Error', error.message);
                }
              },
            },
          ]);
        },
      },
    ]
  );
};
```

### 3.8 Fix Alerts Type Mismatch
- **File:** `frontend/context/BadgeContext.tsx`
- **Fix AlertItem type (line 16):**
```typescript
export interface AlertItem {
  _id: string;  // Changed from number
  patient?: string;
  doctor?: string;
  message: string;
  tag: string;
  read: boolean;
  time: string;
  createdAt: string;
  icon?: string;
}
```
- **File:** `frontend/app/screens/Alerts.tsx`
```typescript
import { AlertItem } from '@/context/BadgeContext';
const [alerts, setAlerts] = useState<AlertItem[]>([]);

// Fix respondAlert:
const respondAlert = async (id: string) => {
  try {
    await notificationAPI.markAsRead(id);
    setAlerts(prev => prev.map(a => a._id === id ? { ...a, read: true } : a));
  } catch (error: any) {
    Alert.alert('Error', error.message);
  }
};

// Fix dismissAlert:
const dismissAlert = (id: string) => {
  setAlerts(prev => prev.filter(a => a._id !== id));
};
```

### 3.9 Add Records Date Input
- **File:** `frontend/app/screens/Records.tsx` | **Line:** 60
- **Add:**
```typescript
const [recordDate, setRecordDate] = useState(new Date().toISOString().split('T')[0]);

// Add in form before submit button:
<View style={styles.dateField}>
  <Text style={styles.label}>Date *</Text>
  <TouchableOpacity style={styles.dateInput} onPress={() => Alert.alert('Date Picker', 'Implement date picker here')}>
    <Text>{recordDate}</Text>
  </TouchableOpacity>
</View>

// Update addRecord:
const addRecord = () => {
  if (!form.diagnosis.trim()) {
    Alert.alert('Required Field', 'Please enter a diagnosis');
    return;
  }
  const newRecord = { ...form, date: recordDate, _id: Date.now().toString(), fileUrls: [] };
  setRecords(prev => [newRecord, ...prev]);
  setForm({ diagnosis: '', doctor: '', hospital: '', notes: '', fileUrls: [] });
};
```

### 3.10 Fix QR Profile
- **File:** `frontend/app/screens/QRProfile.tsx`
- **Add clarifying comment above QR code:**
```typescript
{/*
 * NOTE: This is a decorative emergency profile code for display purposes.
 * In case of emergency, share this screen with first responders.
 */}
```
- **Fix Download button (line 88):**
```typescript
onPress={() => {
  Alert.alert('Demo Mode', 'QR download will be available in production version.');
}}
```
- **Fix Copy Link button (line 89):** Install `expo-clipboard` and implement actual copy

### 3.11 Fix Symptom Doctor Booking
- **File:** `frontend/app/screens/Symptoms.tsx` | **Line:** 164
```typescript
onPress={() => {
  if (doc.available) {
    Alert.alert('Book Appointment', `Book with Dr. ${doc.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Book', onPress: () => Alert.alert('Demo Mode', 'Booking available in production') },
    ]);
  } else {
    Alert.alert('Unavailable', 'This doctor is currently unavailable');
  }
}}
```

### 3.12 Remove Random Data Generation
- **File:** `frontend/app/screens/PatientDetails.tsx` | **Lines:** 60-62
- **Remove:**
```typescript
// DELETE these lines:
streak: Math.floor(Math.random() * 30),
adherence: Math.floor(Math.random() * 40) + 60
```
- **Replace with:** API call to `medicineAPI.getAdherenceSummary()` or show actual data

### 3.13 Remove All `as any` Type Assertions
**Files to fix:** `LoginScreen.tsx`, `PatientDashboard.tsx`, `DoctorDashboard.tsx`, `Patients.tsx`, `Alerts.tsx`, `DrawerLayout.tsx`, `Sidebar.tsx`, `UI.tsx`

**Pattern:**
```typescript
// BEFORE:
router.push('/screens/PatientDashboard' as any);

// AFTER:
router.push('/screens/PatientDashboard');
```

---

## Phase 4: UX Improvements (Day 5)

### 4.1 Add Pull-to-Refresh
**All list screens:**
```typescript
const [refreshing, setRefreshing] = useState(false);

const onRefresh = useCallback(async () => {
  setRefreshing(true);
  await fetchData();
  setRefreshing(false);
}, [fetchData]);

// Add to FlatList:
<FlatList
  data={data}
  onRefresh={onRefresh}
  refreshing={refreshing}
  // ... rest
/>
```

### 4.2 Add Loading Skeletons
- **File:** `frontend/components/LoadingSkeleton.tsx` (new)
```typescript
import { View, StyleSheet, Animated } from 'react-native';

export default function LoadingSkeleton({ width = '100%', height = 20 }) {
  const animatedValue = new Animated.Value(0);
  
  Animated.loop(
    Animated.sequence([
      Animated.timing(animatedValue, { toValue: 1, duration: 1000, useNativeDriver: true }),
      Animated.timing(animatedValue, { toValue: 0, duration: 1000, useNativeDriver: true }),
    ])
  ).start();
  
  const opacity = animatedValue.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.7] });
  
  return <Animated.View style={[styles.skeleton, { width, height, opacity }]} />;
}

const styles = StyleSheet.create({
  skeleton: { backgroundColor: '#ddd', borderRadius: 4, marginVertical: 4 },
});
```

### 4.3 Add Accessibility Props
**All TouchableOpacity/Button components:**
```typescript
<TouchableOpacity
  onPress={handlePress}
  accessibilityLabel="Navigate to patient details"
  accessibilityHint="Double tap to view patient information"
  accessibilityRole="button"
>
```

---

## Phase 5: Build Verification (Day 6)

```bash
cd frontend
npm install
npx tsc --noEmit
npm run lint
npx expo prebuild
npx expo run:android
```

---

## Files to Modify Summary

| Priority | File | Changes |
|----------|------|---------|
| **CRITICAL** | `services/api.ts` | AsyncStorage, timeout, JSON parse, FormData, interfaces |
| **CRITICAL** | `app/screens/Medicines.tsx` | Implement edit/delete |
| **CRITICAL** | `app/screens/Reports.tsx` | File picker, actual upload, view |
| **CRITICAL** | `app/screens/Profile.tsx` | Controlled inputs, save/delete methods |
| **HIGH** | `app/screens/PatientDetails.tsx` | Remove Math.random(), real adherence |
| **HIGH** | `app/screens/SplashScreen.tsx` | Animation cleanup |
| **HIGH** | `app/screens/PatientDashboard.tsx` | Race condition fix |
| **HIGH** | `app/screens/DoctorDashboard.tsx` | Race condition fix |
| **HIGH** | `app/screens/Alerts.tsx` | Type mismatch fix |
| **HIGH** | `app/screens/LoginScreen.tsx` | Email validation |
| **HIGH** | `app/screens/Register.tsx` | Comprehensive validation |
| **HIGH** | `context/BadgeContext.tsx` | AlertItem type fix |
| **MEDIUM** | `app/screens/QRProfile.tsx` | Clarify decorative, clipboard |
| **MEDIUM** | `app/screens/Records.tsx` | Date input |
| **MEDIUM** | `app/screens/Symptoms.tsx` | Booking implementation |
| **NEW** | `components/ErrorBoundary.tsx` | Error boundary component |
| **NEW** | `components/ErrorMessage.tsx` | Error display component |
| **NEW** | `components/LoadingSkeleton.tsx` | Loading skeleton component |
| **LOW** | All screens | Remove `as any` casts |
| **LOW** | All screens | Accessibility props |
| **LOW** | All screens | Pull-to-refresh |

---

## Implementation Checklist

- [ ] `services/api.ts` - install AsyncStorage
- [ ] `services/api.ts` - implement persistent token storage
- [ ] `services/api.ts` - add request timeout
- [ ] `services/api.ts` - add JSON parse error handling
- [ ] `services/api.ts` - fix uploadReport method
- [ ] `services/api.ts` - add TypeScript interfaces
- [ ] `components/ErrorBoundary.tsx` - create
- [ ] `app/_layout.tsx` - wrap with ErrorBoundary
- [ ] `components/ErrorMessage.tsx` - create
- [ ] `app/screens/Medicines.tsx` - implement edit/delete
- [ ] `app/screens/Reports.tsx` - install image picker
- [ ] `app/screens/Reports.tsx` - implement file picker
- [ ] `app/screens/Reports.tsx` - implement actual upload
- [ ] `app/screens/Profile.tsx` - fix Field value prop
- [ ] `app/screens/Profile.tsx` - implement save methods
- [ ] `app/screens/Profile.tsx` - implement delete confirmation
- [ ] `app/screens/SplashScreen.tsx` - fix animation cleanup
- [ ] `app/screens/PatientDashboard.tsx` - fix race condition
- [ ] `app/screens/DoctorDashboard.tsx` - fix race condition
- [ ] `app/screens/LoginScreen.tsx` - add email validation
- [ ] `app/screens/Register.tsx` - add comprehensive validation
- [ ] `app/screens/Alerts.tsx` - fix AlertItem type
- [ ] `app/screens/QRProfile.tsx` - clarify decorative QR
- [ ] `app/screens/QRProfile.tsx` - implement clipboard
- [ ] `app/screens/Records.tsx` - add date input
- [ ] `app/screens/Symptoms.tsx` - implement booking
- [ ] `app/screens/PatientDetails.tsx` - remove Math.random()
- [ ] `app/screens/PatientDetails.tsx` - fetch real adherence
- [ ] `context/BadgeContext.tsx` - fix AlertItem type
- [ ] All screens - remove `as any` casts
- [ ] All screens - add accessibility props
- [ ] All screens - add pull-to-refresh
- [ ] `components/LoadingSkeleton.tsx` - create
- [ ] Run lint and typecheck
- [ ] Test build
