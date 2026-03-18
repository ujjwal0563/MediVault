import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import DrawerLayout from '../../components/DrawerLayout';
import { useTheme } from '../../context/ThemeContext';
import { useBadges } from '../../context/BadgeContext';
import { Badge, Button } from '../../components/UI';
import { notificationAPI, Notification } from '../../services/api';

const TAG_COLORS: Record<string, 'danger'|'warning'|'primary'|'success'|'teal'|'default'> = {
  Critical:'danger', Adherence:'warning', Report:'primary', SMS:'teal',
  AI:'teal', Medicine:'success', Message:'primary', Streak:'success',
  Record:'primary', System:'default',
};

export default function NotificationsScreen() {
  const { colors, isDark, role, userName, userInitial } = useTheme();
  const {
    clearNotifs,
    doctorNotifs, patientNotifs,
    markOneNotif, markAllNotifs, removeNotif,
  } = useBadges();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = React.useState('All');

  const loadNotifications = async () => {
    try {
      const data = await notificationAPI.getNotifications();
      setNotifications(data.notifications);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
    clearNotifs();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  }, []);

  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationAPI.markAsRead(id);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
      markOneNotif(role, id);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to mark as read');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationAPI.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      markAllNotifs(role);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to mark all as read');
    }
  };

  const isDoctor = role === 'doctor';
  const accent   = isDoctor ? colors.primary : colors.teal;

  const unread   = notifications.filter(n => !n.isRead).length;

  const filters = isDoctor
    ? ['All', 'Unread', 'Critical', 'Report']
    : ['All', 'Unread', 'Medicine', 'Message'];

  const displayed = notifications.filter(n => {
    if (filter === 'All')    return true;
    if (filter === 'Unread') return !n.isRead;
    return n.type === filter;
  });

  return (
    <DrawerLayout
      title="Notifications"
      subtitle={unread > 0 ? `${unread} unread` : 'All caught up!'}
      role={role}
      userName={userName}
      userInitial={userInitial}
      headerRight={
        unread > 0
          ? <Button label="Mark all" onPress={handleMarkAllAsRead} size="sm"
              style={{ backgroundColor: 'rgba(255,255,255,0.18)' }} />
          : undefined
      }
    >
      <View style={{ flex: 1, backgroundColor: colors.bgPage }}>

        {/* Role Banner */}
        <View style={[s.banner, {
          backgroundColor: isDoctor
            ? (isDark ? '#1a2d5a' : '#EFF6FF')
            : (isDark ? '#052e2e' : '#F0FDFA'),
          borderColor: accent + '40',
        }]}>
          <Text style={{ fontSize: 22 }}>{isDoctor ? '👨‍⚕️' : '🧑'}</Text>
          <View style={{ flex: 1 }}>
            <Text style={[s.bannerTitle, { color: accent }]}>
              {isDoctor ? 'Doctor Notifications' : 'Patient Notifications'}
            </Text>
            <Text style={[s.bannerSub, { color: colors.textMuted }]}>
              {isDoctor ? 'Patient alerts & system updates' : 'Medications, messages & updates'}
            </Text>
          </View>
          {unread > 0 && (
            <View style={[s.unreadBubble, { backgroundColor: accent }]}>
              <Text style={{ color: 'white', fontSize: 14, fontWeight: '800' }}>{unread}</Text>
            </View>
          )}
        </View>

        {/* Filter Pills */}
        <View style={[s.filterWrap, { backgroundColor: colors.bgCard, borderBottomColor: colors.border }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 14, paddingVertical: 10, gap: 8 }}>
            {filters.map(f => {
              const active = filter === f;
              return (
                <TouchableOpacity key={f} onPress={() => setFilter(f)}
                  style={[s.filterBtn, {
                    backgroundColor: active ? accent : colors.bgPage,
                    borderColor: active ? accent : colors.border,
                  }]}>
                  <Text style={[s.filterTxt, { color: active ? 'white' : colors.textMuted }]}>{f}</Text>
                  {f === 'Unread' && unread > 0 && (
                    <View style={[s.filterCount, { backgroundColor: active ? 'rgba(255,255,255,0.3)' : '#FF4444' }]}>
                      <Text style={{ fontSize: 9, fontWeight: '900', color: 'white' }}>{unread}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Notification List */}
        <ScrollView contentContainerStyle={{ padding: 14, gap: 10, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[accent]} />}>

          {loading ? (
            <View style={{ alignItems: 'center', paddingTop: 60 }}>
              <ActivityIndicator size="large" color={accent} />
              <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 10 }}>Loading notifications...</Text>
            </View>
          ) : displayed.length === 0 ? (
            <View style={{ alignItems: 'center', paddingTop: 60 }}>
              <Text style={{ fontSize: 50 }}>🎉</Text>
              <Text style={{ fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginTop: 12 }}>All caught up!</Text>
              <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 4 }}>No notifications here.</Text>
            </View>
          ) : (
            displayed.map(n => {
              const typeIcon = n.type === 'dose_missed' ? '💊' : n.type === 'symptom_urgent' ? '🚨' : '🔔';
              const typeTag = n.type === 'dose_missed' ? 'Medicine' : n.type === 'symptom_urgent' ? 'Critical' : 'System';
              return (
                <View key={n._id} style={[s.card, {
                  backgroundColor: n.isRead
                    ? colors.bgCard
                    : isDoctor ? (isDark ? '#1a2540' : '#EFF6FF') : (isDark ? '#052e2e' : '#F0FDFA'),
                  borderColor:     n.isRead ? colors.border : accent + '40',
                  borderLeftColor: n.isRead ? colors.border : accent,
                  shadowOpacity:   n.isRead ? 0.04 : 0.1,
                }]}>
                  <View style={[s.dot, { backgroundColor: n.isRead ? 'transparent' : accent }]} />

                  <View style={[s.iconBox, {
                    backgroundColor: n.isRead ? colors.bgCardHover : accent + '18',
                    borderColor: n.isRead ? colors.border : accent + '40',
                  }]}>
                    <Text style={{ fontSize: 20 }}>{typeIcon}</Text>
                  </View>

                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3, flexWrap: 'wrap' }}>
                      <Text style={[s.notifTitle, {
                        color: n.isRead ? colors.textMuted : colors.textPrimary,
                        fontWeight: n.isRead ? '500' : '700',
                      }]} numberOfLines={1}>{n.title}</Text>
                      <Badge label={typeTag} type={TAG_COLORS[typeTag] || 'primary'} />
                    </View>
                    <Text style={[s.notifBody, { color: n.isRead ? colors.textFaint : colors.textMuted }]}
                      numberOfLines={2}>{n.message}</Text>
                    <Text style={[s.notifTime, { color: colors.textFaint }]}>🕐 {new Date(n.createdAt).toLocaleDateString()}</Text>
                  </View>

                  <View style={{ gap: 6, flexShrink: 0 }}>
                    {!n.isRead && (
                      <TouchableOpacity onPress={() => handleMarkAsRead(n._id)}
                        style={[s.actionBtn, { backgroundColor: colors.successSoft, borderColor: colors.success + '40' }]}>
                        <Text style={{ color: colors.success, fontSize: 14, fontWeight: '800' }}>✓</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity onPress={() => removeNotif(role, n._id)}
                      style={[s.actionBtn, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
                      <Text style={{ color: colors.textFaint, fontSize: 13 }}>✕</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      </View>
    </DrawerLayout>
  );
}

const s = StyleSheet.create({
  banner: { flexDirection: 'row', alignItems: 'center', gap: 12, margin: 14, padding: 14, borderRadius: 14, borderWidth: 1 },
  bannerTitle: { fontSize: 14, fontWeight: '800' },
  bannerSub:   { fontSize: 11, marginTop: 2 },
  unreadBubble: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  filterWrap: { borderBottomWidth: 1 },
  filterBtn: { paddingVertical: 7, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1.5, flexDirection: 'row', alignItems: 'center', gap: 5 },
  filterTxt: { fontSize: 12, fontWeight: '600' },
  filterCount: { minWidth: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  card: { borderRadius: 16, padding: 14, flexDirection: 'row', gap: 10, alignItems: 'flex-start', borderWidth: 1, borderLeftWidth: 4, shadowColor: '#000', shadowRadius: 6, elevation: 2, shadowOffset: { width: 0, height: 2 } },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 6, flexShrink: 0 },
  iconBox: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center', borderWidth: 1, flexShrink: 0 },
  notifTitle: { fontSize: 13 },
  notifBody:  { fontSize: 12, lineHeight: 17, marginBottom: 4 },
  notifTime:  { fontSize: 11 },
  actionBtn: { width: 30, height: 30, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
