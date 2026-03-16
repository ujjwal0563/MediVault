/**
 * DrawerLayout
 * ─────────────
 * Drop this around any screen's content.
 * It gives you:
 *   • A coloured top bar (title + subtitle + optional right node + ☰ hamburger)
 *   • A slide-in sidebar drawer when ☰ is tapped
 *   • Safe-area padding on iOS
 *
 * Usage:
 *   <DrawerLayout title="My Dashboard" role="patient" userName="Rahul Singh" userInitial="RS">
 *     <ScrollView>...</ScrollView>   ← your screen body goes here
 *   </DrawerLayout>
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Modal, SafeAreaView, StatusBar, Platform,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import Sidebar from './Sidebar';
import Colors from '../constants/colors';

interface DrawerLayoutProps {
  title: string;
  subtitle?: string;
  role?: 'patient' | 'doctor';
  userName?: string;
  userInitial?: string;
  /** Extra buttons on the right side of the top bar */
  headerRight?: React.ReactNode;
  /** Show a ← back arrow instead of nothing on the left */
  showBack?: boolean;
  children: React.ReactNode;
  /** bg colour of the top bar — defaults to primaryDark */
  barColor?: string;
}

export default function DrawerLayout({
  title,
  subtitle,
  role = 'patient',
  userName = 'User',
  userInitial = 'U',
  headerRight,
  showBack = false,
  children,
  barColor = Colors.primaryDark,
}: DrawerLayoutProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const router = useRouter();
  const slideAnim = useRef(new Animated.Value(-240)).current;

  useEffect(() => {
    if (drawerOpen) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 280,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: -240,
        duration: 220,
        useNativeDriver: true,
      }).start();
    }
  }, [drawerOpen]);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={barColor} />

      {/* ── Top bar ────────────────────────────────── */}
      <SafeAreaView style={{ backgroundColor: barColor }}>
        <View style={[styles.topBar, { backgroundColor: barColor }]}>

          {/* Left: hamburger + optional back + title */}
          <View style={styles.topLeft}>
            {/* ☰ Hamburger — always visible */}
            <TouchableOpacity
              style={styles.hamburger}
              onPress={() => setDrawerOpen(true)}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <View style={styles.hLine} />
              <View style={[styles.hLine, { width: 14 }]} />
              <View style={styles.hLine} />
            </TouchableOpacity>

            {showBack && (
              <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 8 }}>
                <Text style={{ color: 'white', fontSize: 20, fontWeight: '700' }}>←</Text>
              </TouchableOpacity>
            )}

            <View>
              <Text style={styles.title} numberOfLines={1}>{title}</Text>
              {subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
            </View>
          </View>

          {/* Right: custom actions + avatar */}
          <View style={styles.topRight}>
            {headerRight}
            {/* Notification bell */}
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => router.push('/screens/Notifications' as any)}
            >
              <Text style={{ fontSize: 15 }}>🔔</Text>
              <View style={styles.notifDot} />
            </TouchableOpacity>
            {/* Avatar */}
            <TouchableOpacity
              style={[styles.avatar, { backgroundColor: role === 'doctor' ? Colors.primary : Colors.teal }]}
              onPress={() => router.push('/screens/Profile' as any)}
            >
              <Text style={styles.avatarText}>{userInitial.slice(0, 2).toUpperCase()}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      {/* ── Page body ──────────────────────────────── */}
      <View style={styles.body}>
        {children}
      </View>

      {/* ── Sidebar Drawer ─────────────────────────── */}
      <Modal
        visible={drawerOpen}
        transparent
        animationType="none"
        onRequestClose={() => setDrawerOpen(false)}
        statusBarTranslucent
      >
        <View style={styles.overlay}>
          {/* Sidebar panel — slides in from left */}
          <Animated.View style={[styles.drawerPanel, { transform: [{ translateX: slideAnim }] }]}>
            <Sidebar
              role={role}
              userName={userName}
              userInitial={userInitial}
              onClose={() => setDrawerOpen(false)}
            />
          </Animated.View>
          {/* Backdrop — tap to close */}
          <TouchableOpacity
            style={styles.backdrop}
            activeOpacity={1}
            onPress={() => setDrawerOpen(false)}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.bgPage,
  },

  /* Top bar */
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 56,
  },
  topLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  topRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginLeft: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: 'white',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.65)',
    marginTop: 1,
  },

  /* Hamburger icon */
  hamburger: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    flexShrink: 0,
  },
  hLine: {
    width: 18,
    height: 2,
    backgroundColor: 'white',
    borderRadius: 2,
  },

  /* Icon button */
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notifDot: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Colors.danger,
    borderWidth: 1,
    borderColor: Colors.primaryDark,
  },

  /* Avatar */
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '800',
  },

  /* Body */
  body: {
    flex: 1,
  },

  /* Drawer */
  overlay: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  drawerPanel: {
    width: 240,
    flexShrink: 0,
  },
  backdrop: {
    flex: 1,
  },
});
