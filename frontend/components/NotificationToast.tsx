import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');

export interface ToastNotification {
  id: string;
  type: 'dose_missed' | 'dose_missed_caregiver' | 'dose_daily_summary' | 'symptom_urgent' | 'system' | 'dose_reminder';
  title: string;
  message: string;
  timestamp: Date;
  scheduledTime?: string; // ISO string for dose time
  minutesRemaining?: number; // Calculated time remaining
}

interface NotificationToastProps {
  notification: ToastNotification;
  onDismiss: (id: string) => void;
  onPress: (id: string) => void;
}

const getNotificationStyle = (type: ToastNotification['type'], colors: any) => {
  switch (type) {
    case 'dose_missed':
    case 'dose_missed_caregiver':
      return {
        bg: colors.dangerSoft,
        border: colors.danger,
        icon: 'alert-circle' as const,
        iconColor: colors.danger,
      };
    case 'dose_reminder':
      return {
        bg: colors.tealSoft,
        border: colors.teal,
        icon: 'time' as const,
        iconColor: colors.teal,
      };
    case 'symptom_urgent':
      return {
        bg: colors.warningSoft,
        border: colors.warning,
        icon: 'warning' as const,
        iconColor: colors.warning,
      };
    case 'dose_daily_summary':
      return {
        bg: colors.primarySoft,
        border: colors.primary,
        icon: 'stats-chart' as const,
        iconColor: colors.primary,
      };
    default:
      return {
        bg: colors.tealSoft,
        border: colors.teal,
        icon: 'notifications' as const,
        iconColor: colors.teal,
      };
  }
};

export const NotificationToast: React.FC<NotificationToastProps> = ({
  notification,
  onDismiss,
  onPress,
}) => {
  const { colors } = useTheme();
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  const style = getNotificationStyle(notification.type, colors);

  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto dismiss after 5 seconds
    const timer = setTimeout(() => {
      handleDismiss();
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 0.8,
        tension: 100,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss(notification.id);
    });
  };

  const handlePress = () => {
    onPress(notification.id);
    handleDismiss();
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [
            { translateY: slideAnim },
            { scale: scaleAnim },
          ],
          opacity: opacityAnim,
        },
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={handlePress}
        style={[
          styles.toast,
          {
            backgroundColor: style.bg,
            borderColor: style.border,
            shadowColor: style.border,
          },
        ]}
      >
        {/* Glow effect */}
        <View style={[styles.glow, { backgroundColor: style.iconColor, opacity: 0.1 }]} />
        
        {/* Icon */}
        <View style={[styles.iconContainer, { backgroundColor: style.iconColor + '20' }]}>
          <Ionicons name={style.icon} size={24} color={style.iconColor} />
        </View>

        {/* Content */}
        <View style={styles.content}>
          <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
            {notification.title}
          </Text>
          <Text style={[styles.message, { color: colors.textMuted }]} numberOfLines={2}>
            {notification.message}
          </Text>
          {notification.minutesRemaining !== undefined && notification.minutesRemaining > 0 && (
            <View style={styles.timeContainer}>
              <Ionicons name="time-outline" size={12} color={style.iconColor} />
              <Text style={[styles.timeText, { color: style.iconColor }]}>
                {notification.minutesRemaining < 1 
                  ? 'Due now' 
                  : notification.minutesRemaining === 1
                  ? '1 minute remaining'
                  : `${Math.floor(notification.minutesRemaining)} minutes remaining`}
              </Text>
            </View>
          )}
        </View>

        {/* Close button */}
        <TouchableOpacity
          onPress={handleDismiss}
          style={styles.closeButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close" size={20} color={colors.textMuted} />
        </TouchableOpacity>

        {/* Progress bar */}
        <View style={styles.progressBarContainer}>
          <Animated.View
            style={[
              styles.progressBar,
              {
                backgroundColor: style.iconColor,
                transform: [{
                  scaleX: opacityAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 1],
                  }),
                }],
              },
            ]}
          />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    zIndex: 9999,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
    overflow: 'hidden',
  },
  glow: {
    position: 'absolute',
    top: -20,
    right: -20,
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  message: {
    fontSize: 13,
    lineHeight: 18,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  timeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  progressBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    overflow: 'hidden',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  progressBar: {
    width: '100%',
    height: '100%',
    transformOrigin: 'left',
  },
});
