import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform, LogBox } from 'react-native';
import Constants from 'expo-constants';
import { medicineAPI, Medicine } from '../services/api';

// Suppress the Expo Go SDK 53 push notification warning — we handle this gracefully
LogBox.ignoreLogs([
  'expo-notifications: Android Push notifications (remote notifications) functionality provided by expo-notifications was removed from Expo Go',
]);

// True when running inside Expo Go (ownership === 'expo')
const isExpoGo = Constants.appOwnership === 'expo';

// Set how notifications appear in foreground (dev builds / production only)
if (!isExpoGo) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

const REMINDER_OFFSETS_MIN = [10, 2]; // fire before dose time
const MISSED_DELAY_MIN = 30;          // fire this many minutes after dose time if not taken

/** Request permission — returns false in Expo Go or simulators */
async function requestPermissions(): Promise<boolean> {
  if (isExpoGo || !Device.isDevice) return false;

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

/** Cancel all previously scheduled dose reminders */
async function cancelDoseReminders() {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter(n => n.content.data?.type === 'dose_reminder' || n.content.data?.type === 'dose_missed')
      .map(n => Notifications.cancelScheduledNotificationAsync(n.identifier))
  );
}

/** Schedule a local notification at a specific Date */
async function scheduleAt(
  date: Date,
  title: string,
  body: string,
  data: Record<string, unknown>
) {
  await Notifications.scheduleNotificationAsync({
    content: { title, body, sound: true, vibrate: [0, 250, 250, 250], data },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date,
    },
  });
}

/** Parse HH:MM slot string into a Date for today */
function slotToDate(slot: string): Date | null {
  const match = slot.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const d = new Date();
  d.setHours(Number(match[1]), Number(match[2]), 0, 0);
  return d;
}

export function useDoseNotifications(isLoggedIn: boolean) {
  const scheduledRef = useRef(false);

  useEffect(() => {
    if (!isLoggedIn) return;

    // Android notification channel (dev builds / production only)
    if (!isExpoGo && Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('dose-reminders', {
        name: 'Dose Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#2196F3',
        sound: 'default',
      });
    }

    const schedule = async () => {
      const granted = await requestPermissions();
      if (!granted) return;

      let medicines: Medicine[];
      try {
        medicines = await medicineAPI.getMedicines();
      } catch {
        return;
      }

      await cancelDoseReminders();

      const now = new Date();

      for (const med of medicines) {
        const slots: string[] = med.timeSlots?.length ? med.timeSlots : ['09:00'];

        for (const slot of slots) {
          const doseTime = slotToDate(slot);
          if (!doseTime) continue;

          // Upcoming reminders (10 min and 2 min before)
          for (const offsetMin of REMINDER_OFFSETS_MIN) {
            const fireAt = new Date(doseTime.getTime() - offsetMin * 60 * 1000);
            if (fireAt <= now) continue;

            const label = offsetMin === 10 ? '10 minutes' : '2 minutes';
            await scheduleAt(
              fireAt,
              '💊 Upcoming Dose',
              `${med.name} (${med.dosage}) is due in ${label}.`,
              { type: 'dose_reminder', medicineId: med._id, medicineName: med.name, slot }
            );
          }

          // Missed dose alert (MISSED_DELAY_MIN after dose time)
          const missedAt = new Date(doseTime.getTime() + MISSED_DELAY_MIN * 60 * 1000);
          if (missedAt > now) {
            await scheduleAt(
              missedAt,
              '⚠️ Missed Dose',
              `You missed your ${med.name} (${med.dosage}) dose scheduled at ${slot}.`,
              { type: 'dose_missed', medicineId: med._id, medicineName: med.name, slot }
            );
          }
        }
      }

      scheduledRef.current = true;
    };

    schedule();
  }, [isLoggedIn]);
}
