import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Dimensions, StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import Colors from '../../constants/colors';

const { width } = Dimensions.get('window');

const QUOTES = [
  { text: 'Your health story, told completely.', sub: 'Every report. Every prescription. Every moment.' },
  { text: 'AI that understands your health.', sub: 'Get plain-English summaries of complex reports.' },
  { text: 'Doctors and patients, connected.', sub: 'One tap to reach your doctor. Anytime, anywhere.' },
  { text: 'Never miss a dose again.', sub: 'Smart reminders. Real accountability.' },
];

const FEATURES = ['🤖 AI Reports', '💊 Med Tracker', '🔲 QR Profile', '📱 Doctor SMS', '🩺 Symptom Check'];

export default function SplashScreen() {
  const router = useRouter();
  const [qIdx, setQIdx] = useState(0);
  const [phase, setPhase] = useState(0);

  const logoAnim  = useRef(new Animated.Value(0)).current;
  const ctaAnim   = useRef(new Animated.Value(0)).current;
  const quoteAnim = useRef(new Animated.Value(0)).current;
  const pillsAnim = useRef(new Animated.Value(0)).current;

  

  useEffect(() => {
    Animated.sequence([
      Animated.timing(logoAnim,  { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(quoteAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(ctaAnim,   { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(pillsAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
    setPhase(1);
  }, []);

  // Rotate quotes
  useEffect(() => {
    const id = setInterval(() => {
      Animated.timing(quoteAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
        setQIdx(i => (i + 1) % QUOTES.length);
        Animated.timing(quoteAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
      });
    }, 3200);
    return () => clearInterval(id);
  }, []);

  const q = QUOTES[qIdx];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0A1628" />

      {/* Logo */}
      <Animated.View style={[styles.logoWrap, { opacity: logoAnim, transform: [{ scale: logoAnim.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) }] }]}>
        <View style={styles.logoBox}>
          <Text style={styles.logoPlus}>✚</Text>
        </View>
      </Animated.View>

      {/* Brand */}
      <Animated.View style={{ opacity: logoAnim, alignItems: 'center', marginBottom: 8 }}>
        <Text style={styles.brandName}>MediVault</Text>
        <Text style={styles.brandSub}> HEALTH-PLATFORM </Text>
      </Animated.View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Quote */}
      <Animated.View style={[styles.quoteWrap, { opacity: quoteAnim }]}>
        <Text style={styles.quoteText}>{q.text}</Text>
        <Text style={styles.quoteSub}>{q.sub}</Text>
      </Animated.View>

      {/* Dots */}
      <View style={styles.dots}>
        {QUOTES.map((_, i) => (
          <View key={i} style={[styles.dot, { width: i === qIdx ? 20 : 6, backgroundColor: i === qIdx ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.25)' }]} />
        ))}
      </View>

      {/* CTA */}
      <Animated.View style={{ opacity: ctaAnim, marginTop: 40, alignItems: 'center' }}>
        <TouchableOpacity onPress={() => router.replace('/screens/LoginScreen')} style={styles.enterBtn} activeOpacity={0.8}>
          <Text style={styles.enterArrow}>→</Text>
        </TouchableOpacity>
        <Text style={styles.enterLabel}>Tap to Enter</Text>
      </Animated.View>

      {/* Feature Pills */}
      <Animated.View style={[styles.pillsRow, { opacity: pillsAnim }]}>
        {FEATURES.map(f => (
          <View key={f} style={styles.pill}>
            <Text style={styles.pillText}>{f}</Text>
          </View>
        ))}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A1628',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  logoWrap: { marginBottom: 20 },
  logoBox: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoPlus: { fontSize: 36, color: 'white', fontWeight: '800' },
  brandName: { fontSize: 42, fontWeight: '900', color: 'white', letterSpacing: -1.5 },
  brandSub: { fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: 4, textTransform: 'uppercase', marginTop: 4 },
  divider: { width: 70, height: 1, backgroundColor: 'rgba(255,255,255,0.3)', marginVertical: 20 },
  quoteWrap: { alignItems: 'center', minHeight: 70 },
  quoteText: { fontSize: 20, fontWeight: '700', color: 'white', textAlign: 'center', letterSpacing: -0.3 },
  quoteSub: { fontSize: 13, color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginTop: 8 },
  dots: { flexDirection: 'row', gap: 6, marginTop: 14 },
  dot: { height: 6, borderRadius: 3 },
  enterBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  enterArrow: { fontSize: 22, color: 'white' },
  enterLabel: { color: 'white', fontWeight: '700', fontSize: 15, marginTop: 12 },
  enterSub: { color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 2 },
  pillsRow: {
    position: 'absolute',
    bottom: 40,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 24,
  },
  pill: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  pillText: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '500' },
});
