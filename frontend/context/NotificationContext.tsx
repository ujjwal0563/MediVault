import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { NotificationToast, ToastNotification } from '../components/NotificationToast';
import { notificationAPI, Notification } from '../services/api';
import { useRouter } from 'expo-router';
import { useBadges } from './BadgeContext';

interface NotificationContextType {
  showToast: (notification: Omit<ToastNotification, 'id' | 'timestamp'>) => void;
  dismissToast: (id: string) => void;
  startPolling: () => void;
  stopPolling: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();
  const { refreshNotifications } = useBadges();
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const [lastChecked, setLastChecked] = useState<Date>(new Date());
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);

  const showToast = useCallback((notification: Omit<ToastNotification, 'id' | 'timestamp'>) => {
    const newToast: ToastNotification = {
      ...notification,
      id: `${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
    };

    setToasts((prev) => {
      // Limit to 3 toasts at a time
      const updated = [newToast, ...prev].slice(0, 3);
      return updated;
    });
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const handleToastPress = useCallback((id: string) => {
    // Navigate to notifications screen
    router.push('/screens/Notifications');
  }, [router]);

  // Poll for new notifications
  const checkForNewNotifications = useCallback(async () => {
    try {
      const response = await notificationAPI.getNotifications(1, 10);
      const newNotifications = response.notifications.filter(
        (notif: Notification) => {
          const isNew = new Date(notif.createdAt) > lastChecked && !notif.isRead;
          
          // Only show dose-related notifications if they're for pending/missed doses
          if (notif.type === 'dose_missed' || notif.type === 'dose_missed_caregiver') {
            // Check if the notification metadata indicates the dose is still pending
            const metadata = notif.metadata as any;
            if (metadata?.status === 'taken') {
              return false; // Don't show notification for already taken doses
            }
          }
          
          return isNew;
        }
      );

      // Show toast for each new notification
      newNotifications.forEach((notif: Notification) => {
        const metadata = notif.metadata as any;
        let minutesRemaining: number | undefined;
        
        // Calculate time remaining for dose reminders
        if (notif.type === 'dose_reminder' && metadata?.scheduledTime) {
          const scheduledTime = new Date(metadata.scheduledTime);
          const now = new Date();
          const diffMs = scheduledTime.getTime() - now.getTime();
          minutesRemaining = Math.max(0, diffMs / 60000);
        }
        
        showToast({
          type: notif.type,
          title: notif.title,
          message: notif.message,
          scheduledTime: metadata?.scheduledTime,
          minutesRemaining,
        });
      });

      if (newNotifications.length > 0) {
        setLastChecked(new Date());
        // Refresh badge count when new notifications arrive
        await refreshNotifications();
      }
    } catch (error) {
      console.warn('Failed to check notifications:', error);
    }
  }, [lastChecked, showToast, refreshNotifications]);

  const startPolling = useCallback(() => {
    if (pollingInterval) return;

    // Check immediately
    checkForNewNotifications();

    // Then check every 30 seconds
    const interval = setInterval(checkForNewNotifications, 30000);
    setPollingInterval(interval);
  }, [checkForNewNotifications, pollingInterval]);

  const stopPolling = useCallback(() => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }
  }, [pollingInterval]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);

  return (
    <NotificationContext.Provider value={{ showToast, dismissToast, startPolling, stopPolling }}>
      {children}
      
      {/* Toast container */}
      <View style={styles.toastContainer} pointerEvents="box-none">
        {toasts.map((toast, index) => (
          <View
            key={toast.id}
            style={[
              styles.toastWrapper,
              { top: 50 + index * 110 }, // Stack toasts vertically
            ]}
            pointerEvents="box-none"
          >
            <NotificationToast
              notification={toast}
              onDismiss={dismissToast}
              onPress={handleToastPress}
            />
          </View>
        ))}
      </View>
    </NotificationContext.Provider>
  );
};

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
  },
  toastWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 9999,
  },
});
