import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { Alarm } from '../types';
import { colors } from '../theme';

export const ALARM_CHANNEL_ID = 'alarm-v1';
export const ALARM_CATEGORY = 'wakeystop-ring';
export const ACTION_DISMISS = 'dismiss';
export const ACTION_SNOOZE = 'snooze';

/** Vibration pattern shared by channel and in-app vibration. */
export const VIBRATION_PATTERN = [0, 600, 350, 600, 350, 900];

let prepared = false;

/**
 * Creates the high-importance alarm channel (with the bundled alarm sound,
 * ALARM audio usage so it respects the alarm volume stream, and lock-screen
 * visibility) and the notification action category. Safe to call repeatedly,
 * from both the UI and headless background contexts.
 */
export async function prepareNotifications(): Promise<void> {
  if (prepared) return;
  prepared = true;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(ALARM_CHANNEL_ID, {
      name: 'Destination alarms',
      description: 'Rings when you approach a destination you set an alarm for.',
      importance: Notifications.AndroidImportance.MAX,
      sound: 'alarm.wav',
      vibrationPattern: VIBRATION_PATTERN,
      enableVibrate: true,
      enableLights: true,
      lightColor: colors.amber,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: true,
      audioAttributes: {
        usage: Notifications.AndroidAudioUsage.ALARM,
        contentType: Notifications.AndroidAudioContentType.SONIFICATION,
      },
    });
  }

  await Notifications.setNotificationCategoryAsync(ALARM_CATEGORY, [
    {
      identifier: ACTION_DISMISS,
      buttonTitle: 'Dismiss',
      options: { opensAppToForeground: false },
    },
    {
      identifier: ACTION_SNOOZE,
      buttonTitle: 'Remind me in 5 min',
      options: { opensAppToForeground: false },
    },
  ]);
}

function ringId(alarmId: string): string {
  return `ring-${alarmId}`;
}

/** Presents (or re-presents) the loud, sticky alarm notification. */
export async function presentRingNotification(
  alarm: Alarm,
  distanceMeters?: number,
): Promise<void> {
  await prepareNotifications();
  const where = alarm.destination.name ?? alarm.destination.address ?? 'your destination';
  await Notifications.scheduleNotificationAsync({
    identifier: ringId(alarm.id),
    content: {
      title: `⏰ ${alarm.label}`,
      body:
        distanceMeters != null
          ? `You're ${Math.max(0, Math.round(distanceMeters))} m from ${where}. Time to get ready!`
          : `You're approaching ${where}. Time to get ready!`,
      sound: 'alarm.wav',
      vibrate: VIBRATION_PATTERN,
      priority: Notifications.AndroidNotificationPriority.MAX,
      sticky: true,
      autoDismiss: false,
      color: colors.amber,
      categoryIdentifier: ALARM_CATEGORY,
      data: { alarmId: alarm.id, kind: 'ring' },
    },
    trigger: { channelId: ALARM_CHANNEL_ID },
  });
}

export async function dismissRingNotification(alarmId: string): Promise<void> {
  await Notifications.dismissNotificationAsync(ringId(alarmId)).catch(() => {});
  await Notifications.cancelScheduledNotificationAsync(ringId(alarmId)).catch(() => {});
}

/** Schedules a one-shot reminder used by "Remind me in 5 min". */
export async function scheduleSnooze(alarm: Alarm, minutes: number): Promise<void> {
  await prepareNotifications();
  const where = alarm.destination.name ?? alarm.destination.address ?? 'your destination';
  await Notifications.scheduleNotificationAsync({
    identifier: `snooze-${alarm.id}`,
    content: {
      title: `⏰ ${alarm.label} — snoozed reminder`,
      body: `Reminder: you were arriving near ${where}.`,
      sound: 'alarm.wav',
      vibrate: VIBRATION_PATTERN,
      priority: Notifications.AndroidNotificationPriority.MAX,
      color: colors.amber,
      data: { alarmId: alarm.id, kind: 'snooze' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: Math.round(minutes * 60),
      channelId: ALARM_CHANNEL_ID,
    },
  });
}

export async function cancelSnooze(alarmId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(`snooze-${alarmId}`).catch(() => {});
}
