import React from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  SafeAreaView,
} from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useTheme } from '../context/ThemeContext';

// ─── Navigation definitions (mirrors Sidebar.js exactly) ─────────────────────
interface NavSection { section: string }
interface NavLink {
  label: string;
  href: string;
  icon: string;
  badge?: number;
}
type NavEntry = NavSection | NavLink;

const doctorNav: NavEntry[] = [
  { section: 'Main' },
  { label: 'Dashboard',     href: '/screens/DoctorDashboard', icon: '▦'          },
  { label: 'Patients',      href: '/screens/Patients',         icon: '👥', badge: 28 },
  { label: 'Alerts',        href: '/screens/Alerts',           icon: '🚨', badge: 2  },
  { label: 'Messages',      href: '/screens/Messages',         icon: '💬', badge: 3  },
  { section: 'Activity' },
  { label: 'Notifications', href: '/screens/Notifications',    icon: '🔔', badge: 5  },
  { section: 'Account' },
  { label: 'Profile',       href: '/screens/Profile',          icon: '⚙️'          },
  { label: 'Logout',        href: '/screens/SplashScreen',     icon: '🚪'          },
];

const patientNav: NavEntry[] = [
  { section: 'My Health' },
  { label: 'Dashboard',     href: '/screens/PatientDashboard', icon: '▦'          },
  { label: 'Medicines',     href: '/screens/Medicines',        icon: '💊'          },
  { label: 'My Records',    href: '/screens/Records',          icon: '📁'          },
  { label: 'Reports',       href: '/screens/Reports',          icon: '📋'          },
  { section: 'Tools' },
  { label: 'Symptom Check', href: '/screens/Symptoms',         icon: '🩺'          },
  { label: 'Timeline',      href: '/screens/Timeline',         icon: '📅'          },
  { label: 'QR Profile',    href: '/screens/QRProfile',        icon: '🔲'          },
  { section: 'Account' },
  { label: 'Notifications', href: '/screens/Notifications',    icon: '🔔', badge: 1 },
  { label: 'Profile',       href: '/screens/Profile',          icon: '⚙️'          },
  { label: 'Logout',        href: '/screens/SplashScreen',     icon: '🚪'          },
];

// ─── Type guards ──────────────────────────────────────────────────────────────
function isSection(entry: NavEntry): entry is NavSection {
  return 'section' in entry;
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface SidebarProps {
  role?: 'doctor' | 'patient';
  userName?: string;
  userInitial?: string;
  /** Called when any nav item is pressed (use to close drawer on mobile) */
  onClose?: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function Sidebar({
  role = 'patient',
  userName = 'User',
  userInitial = 'U',
  onClose,
}: SidebarProps) {
  const router   = useRouter();
  const pathname = usePathname();
  const { colors } = useTheme();

  const navItems = role === 'doctor' ? doctorNav : patientNav;
  const homePath = role === 'doctor' ? '/screens/DoctorDashboard' : '/screens/PatientDashboard';

  const handleNav = (href: string) => {
    router.push(href as any);
    onClose?.();
  };

  return (
    <View style={[styles.sidebar, { backgroundColor: colors.sidebarBg }]}>
      <SafeAreaView style={{ flex: 1 }}>

        {/* ── Logo ─────────────────────────────────────── */}
        <TouchableOpacity
          style={styles.logoArea}
          onPress={() => handleNav(homePath)}
          activeOpacity={0.8}
        >
          <View style={styles.logoIcon}>
            <Text style={styles.logoIconText}>+</Text>
          </View>
          <View>
            <Text style={styles.logoText}>MediVault</Text>
            <Text style={styles.logoSub}>HEALTH PLATFORM</Text>
          </View>
        </TouchableOpacity>

        {/* ── Nav ──────────────────────────────────────── */}
        <ScrollView
          style={styles.nav}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 16 }}
        >
          {navItems.map((item, i) => {
            if (isSection(item)) {
              return (
                <Text key={i} style={styles.sectionLabel}>{item.section}</Text>
              );
            }

            const isActive = pathname === item.href;
            return (
              <TouchableOpacity
                key={item.href}
                onPress={() => handleNav(item.href)}
                activeOpacity={0.75}
                style={[
                  styles.navItem,
                  isActive && [styles.navItemActive, { backgroundColor: colors.sidebarActive }],
                ]}
              >
                <Text style={styles.navIcon}>{item.icon}</Text>
                <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
                  {item.label}
                </Text>
                {item.badge ? (
                  <View style={[styles.badge, { backgroundColor: colors.danger }]}>
                    <Text style={styles.badgeText}>{item.badge}</Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ── Footer user ───────────────────────────────── */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.footerUser} activeOpacity={0.7}>
            <View style={[styles.userAvatar, { backgroundColor: colors.primaryLight }]}>
              <Text style={styles.userAvatarText}>{userInitial}</Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName} numberOfLines={1}>{userName}</Text>
              <Text style={styles.userRole}>
                {role === 'doctor' ? 'Physician' : 'Patient'}
              </Text>
            </View>
            <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 16 }}>⋮</Text>
          </TouchableOpacity>
        </View>

      </SafeAreaView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  sidebar: {
    width: 220,
    flex: 1,
  },
  logoArea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  logoIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#2E6AE6',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2E6AE6',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  logoIconText: { color: 'white', fontSize: 18, fontWeight: '800' },
  logoText: {
    fontSize: 15,
    fontWeight: '800',
    color: 'white',
    letterSpacing: -0.3,
  },
  logoSub: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: 1,
  },

  nav: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 16,
  },
  sectionLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.3)',
    letterSpacing: 1,
    textTransform: 'uppercase',
    paddingHorizontal: 8,
    paddingTop: 12,
    paddingBottom: 6,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 2,
  },
  navItemActive: {
    shadowColor: '#2E6AE6',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  navIcon: {
    width: 18,
    textAlign: 'center',
    fontSize: 15,
  },
  navLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.6)',
  },
  navLabelActive: {
    color: 'white',
    fontWeight: '600',
  },
  badge: {
    borderRadius: 20,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 18,
    alignItems: 'center',
  },
  badgeText: {
    color: 'white',
    fontSize: 9,
    fontWeight: '700',
  },

  footer: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  footerUser: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 8,
    borderRadius: 8,
  },
  userAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 12,
  },
  userInfo: { flex: 1, minWidth: 0 },
  userName: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  userRole: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
  },
});
