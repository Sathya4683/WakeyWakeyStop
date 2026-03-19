/**
 * notifications.ts — Multi-alarm geofence monitoring engine
 *
 * Architecture:
 *   Background task  → expo-task-manager + expo-location
 *     Reads alarms[] from AsyncStorage (Zustand not available in bg tasks)
 *     Loops every alarm, runs: day ✓ → time window ✓ → geofence ✓ → trigger once
 *
 *   Foreground watcher → Location.watchPositionAsync
 *     Faster (4 s intervals), same multi-alarm logic
 *     Module-level Set tracks which alarms fired this foreground session
 *
 *   Trigger guard (prevents re-fire in same window):
 *     lastTriggeredAt stored per alarm
 *     On each check: if lastTriggeredAt falls within TODAY's window → skip
 *
 * Required:
 *   assets/sounds/alarm.mp3
 *   app.json: expo-location plugin + ACCESS_BACKGROUND_LOCATION permission
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { AudioPlayer, createAudioPlayer } from "expo-audio";
import { Audio } from "expo-av";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import * as TaskManager from "expo-task-manager";
import { Platform } from "react-native";

import { ALARMS_STORAGE_KEY, GeofenceAlarm } from "../store/alarmsStore";
import { haversineDistance } from "./haversine";

// ─── Constants ────────────────────────────────────────────────────────────────

export const GEOFENCE_TASK = "com.app.GEOFENCE_TASK";

/** AsyncStorage keys shared between foreground and background */
const KEY = {
  RINGING: "gf:is_ringing", // 'true' | 'false'
  RINGING_ID: "gf:ringing_id", // alarm id that fired
  NOTIF_ID: "gf:notif_id", // notification id for dismissal
  MONITORING: "gf:monitoring", // 'true' | 'false'
} as const;

const CHANNEL_ALARM = "gf_alarm";
const CHANNEL_MONITOR = "gf_monitor";

// ─── Module-level foreground state ────────────────────────────────────────────

let _player: AudioPlayer | null = null;
let _locationSub: Location.LocationSubscription | null = null;

/**
 * Tracks which alarm IDs have fired in the current foreground session.
 * Cleared when stopGeofenceMonitoring() is called.
 * The persistent guard is lastTriggeredAt inside each alarm object.
 */
const _fgTriggeredIds = new Set<string>();

// ─── Time / Day utilities ─────────────────────────────────────────────────────

/**
 * Parses "HH:MM" → total minutes from midnight.
 */
function toMins(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/**
 * Returns true if the current local time is within [startTime, endTime].
 * Handles overnight windows (e.g. "23:00" → "01:00").
 */
function isWithinWindow(startTime: string, endTime: string): boolean {
  const now = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const startMins = toMins(startTime);
  const endMins = toMins(endTime);

  if (startMins <= endMins) {
    // Normal window: 04:30 → 05:30
    return nowMins >= startMins && nowMins <= endMins;
  }
  // Overnight window: 23:00 → 01:00
  return nowMins >= startMins || nowMins <= endMins;
}

/**
 * Returns true if the alarm's frequency allows triggering today.
 */
function matchesDay(alarm: GeofenceAlarm): boolean {
  const dow = new Date().getDay(); // 0=Sun … 6=Sat
  switch (alarm.frequency) {
    case "once":
      // 'once' alarms fire one time ever; treated as always matching day.
      // The lastTriggeredAt guard prevents re-fire.
      return true;
    case "daily":
      return true;
    case "customDays":
      return alarm.customDays.includes(dow);
  }
}

/**
 * Returns true if the alarm has ALREADY been triggered within today's
 * current time window, meaning it must NOT fire again this window.
 *
 * Reset logic: next valid trigger is when `lastTriggeredAt` no longer
 * falls within the current window's date range.
 */
function alreadyTriggeredInWindow(alarm: GeofenceAlarm): boolean {
  if (!alarm.lastTriggeredAt) return false;

  const triggered = new Date(alarm.lastTriggeredAt);
  const now = new Date();

  const startMins = toMins(alarm.timeWindow.startTime);
  const endMins = toMins(alarm.timeWindow.endTime);

  // Build today's window start and end as Date objects
  const windowStart = new Date(now);
  windowStart.setHours(Math.floor(startMins / 60), startMins % 60, 0, 0);

  const windowEnd = new Date(now);
  windowEnd.setHours(Math.floor(endMins / 60), endMins % 60, 59, 999);

  // Handle overnight window: end is next calendar day
  if (endMins < startMins) {
    // If current time is before midnight (in the "start" half),
    // the window end is tomorrow
    if (now.getHours() * 60 + now.getMinutes() >= startMins) {
      windowEnd.setDate(windowEnd.getDate() + 1);
    } else {
      // We're in the "end" half (past midnight)
      windowStart.setDate(windowStart.getDate() - 1);
    }
  }

  return triggered >= windowStart && triggered <= windowEnd;
}

/**
 * Evaluates a single alarm against the current location.
 * Returns true if it should fire.
 */
function shouldTrigger(
  alarm: GeofenceAlarm,
  userLat: number,
  userLng: number,
): boolean {
  if (!alarm.isActive) return false;
  if (!matchesDay(alarm)) return false;
  if (!isWithinWindow(alarm.timeWindow.startTime, alarm.timeWindow.endTime))
    return false;
  if (alreadyTriggeredInWindow(alarm)) return false;

  const dist = haversineDistance(
    userLat,
    userLng,
    alarm.destination.lat,
    alarm.destination.lng,
  );

  return dist <= alarm.radius;
}

// ─── Background task (must be defined at module top level) ───────────────────

interface TaskData {
  locations: Location.LocationObject[];
}

TaskManager.defineTask(
  GEOFENCE_TASK,
  async ({ data, error }: TaskManager.TaskManagerTaskBody<TaskData>) => {
    if (error) {
      console.error("[GeofenceTask] error:", error.message);
      return;
    }

    const locations = (data as TaskData)?.locations;
    if (!locations?.length) return;

    const { latitude, longitude } = locations[locations.length - 1].coords;

    try {
      // Guard: if already ringing, don't trigger another alarm
      const ringing = await AsyncStorage.getItem(KEY.RINGING);
      if (ringing === "true") return;

      // Read alarms array directly from AsyncStorage
      const raw = await AsyncStorage.getItem(ALARMS_STORAGE_KEY);
      if (!raw) return;

      // Zustand persist wraps the state in { state: { alarms: [...] } }
      const parsed = JSON.parse(raw) as {
        state?: { alarms?: GeofenceAlarm[] };
      };
      const alarms: GeofenceAlarm[] = parsed?.state?.alarms ?? [];

      for (const alarm of alarms) {
        if (shouldTrigger(alarm, latitude, longitude)) {
          // Mark ringing immediately to prevent double-fire
          await AsyncStorage.multiSet([
            [KEY.RINGING, "true"],
            [KEY.RINGING_ID, alarm.id],
          ]);

          // Update lastTriggeredAt in storage so the guard works next check
          const now = Date.now();
          const updated = alarms.map((a) =>
            a.id === alarm.id ? { ...a, lastTriggeredAt: now } : a,
          );
          await AsyncStorage.setItem(
            ALARMS_STORAGE_KEY,
            JSON.stringify({ state: { alarms: updated } }),
          );

          // Fire notification (audio is foreground-only)
          await _sendAlarmNotification(alarm);
          break; // one alarm at a time
        }
      }
    } catch (e) {
      console.error("[GeofenceTask] handler error:", e);
    }
  },
);

// ─── Notification setup ───────────────────────────────────────────────────────

export function setupNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export async function setupAndroidNotificationChannels(): Promise<void> {
  if (Platform.OS !== "android") return;

  await Notifications.setNotificationChannelAsync(CHANNEL_ALARM, {
    name: "Geofence Alarm",
    importance: Notifications.AndroidImportance.MAX,
    sound: "default",
    enableVibrate: true,
    vibrationPattern: [0, 400, 200, 400, 200, 400],
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    bypassDnd: true,
  });

  await Notifications.setNotificationChannelAsync(CHANNEL_MONITOR, {
    name: "Geofence Monitoring",
    importance: Notifications.AndroidImportance.LOW,
    sound: null,
    enableVibrate: false,
    showBadge: false,
  });
}

// ─── Permissions ─────────────────────────────────────────────────────────────

export interface PermissionResult {
  granted: boolean;
  message: string;
}

export async function requestAllPermissions(): Promise<PermissionResult> {
  const { status: notifStatus } = await Notifications.requestPermissionsAsync();
  if (notifStatus !== "granted") {
    return {
      granted: false,
      message: "Notification permission denied. Enable it in Settings.",
    };
  }

  const { status: fgStatus } =
    await Location.requestForegroundPermissionsAsync();
  if (fgStatus !== "granted") {
    return {
      granted: false,
      message: "Location permission denied. Enable it in Settings.",
    };
  }

  const { status: bgStatus } =
    await Location.requestBackgroundPermissionsAsync();
  if (bgStatus !== "granted") {
    console.warn(
      "[Geofence] Background location denied — foreground-only mode.",
    );
  }

  return { granted: true, message: "Permissions granted." };
}

// ─── Monitoring ───────────────────────────────────────────────────────────────

/**
 * Starts background + foreground location monitoring.
 * Monitors ALL active alarms in the store simultaneously.
 * `alarmSummary` is used for the Android foreground service notification.
 */
export async function startGeofenceMonitoring(
  alarmSummary: string,
): Promise<void> {
  _fgTriggeredIds.clear();

  await AsyncStorage.multiSet([
    [KEY.RINGING, "false"],
    [KEY.RINGING_ID, ""],
    [KEY.MONITORING, "true"],
  ]);

  // ── Background task ──────────────────────────────────────────────────────
  try {
    const alreadyRunning =
      await Location.hasStartedLocationUpdatesAsync(GEOFENCE_TASK);
    if (alreadyRunning) {
      await Location.stopLocationUpdatesAsync(GEOFENCE_TASK);
    }

    await Location.startLocationUpdatesAsync(GEOFENCE_TASK, {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 15_000,
      distanceInterval: 20,
      pausesUpdatesAutomatically: false,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: "Geofence Monitoring",
        notificationBody: alarmSummary,
        notificationColor: "#FFE500",
        ...(Platform.OS === "android" && {
          notificationChannelId: CHANNEL_MONITOR,
        }),
      },
      activityType: Location.ActivityType.Other,
    });
  } catch (e) {
    console.warn("[Geofence] Background task start failed:", e);
  }

  // ── Foreground watcher ───────────────────────────────────────────────────
  _stopForegroundWatcher();

  _locationSub = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 4_000,
      distanceInterval: 10,
    },
    async (loc) => {
      const { latitude, longitude } = loc.coords;

      // Re-read alarm list fresh from AsyncStorage each tick so any
      // lastTriggeredAt updates made by the background task are visible
      try {
        const ringing = await AsyncStorage.getItem(KEY.RINGING);
        if (ringing === "true") return;

        const raw = await AsyncStorage.getItem(ALARMS_STORAGE_KEY);
        if (!raw) return;

        const parsed = JSON.parse(raw) as {
          state?: { alarms?: GeofenceAlarm[] };
        };
        const alarms: GeofenceAlarm[] = parsed?.state?.alarms ?? [];

        for (const alarm of alarms) {
          if (_fgTriggeredIds.has(alarm.id)) continue;
          if (!shouldTrigger(alarm, latitude, longitude)) continue;

          _fgTriggeredIds.add(alarm.id);

          // Update lastTriggeredAt in storage
          const now = Date.now();
          const updated = alarms.map((a) =>
            a.id === alarm.id ? { ...a, lastTriggeredAt: now } : a,
          );
          await AsyncStorage.setItem(
            ALARMS_STORAGE_KEY,
            JSON.stringify({ state: { alarms: updated } }),
          );

          await AsyncStorage.multiSet([
            [KEY.RINGING, "true"],
            [KEY.RINGING_ID, alarm.id],
          ]);

          await triggerAlarm(alarm);
          break;
        }
      } catch (e) {
        console.error("[FgWatcher] error:", e);
      }
    },
  );
}

export async function stopGeofenceMonitoring(): Promise<void> {
  try {
    const running =
      await Location.hasStartedLocationUpdatesAsync(GEOFENCE_TASK);
    if (running) await Location.stopLocationUpdatesAsync(GEOFENCE_TASK);
  } catch (e) {
    console.warn("[Geofence] stopLocationUpdates error:", e);
  }

  _stopForegroundWatcher();
  _fgTriggeredIds.clear();

  await AsyncStorage.setItem(KEY.MONITORING, "false");
}

function _stopForegroundWatcher(): void {
  _locationSub?.remove();
  _locationSub = null;
}

// ─── State readers (for UI polling) ──────────────────────────────────────────

export async function checkIsAlarmRinging(): Promise<{
  ringing: boolean;
  alarmId: string | null;
}> {
  const [ringing, alarmId] = await AsyncStorage.multiGet([
    KEY.RINGING,
    KEY.RINGING_ID,
  ]);
  return {
    ringing: ringing[1] === "true",
    alarmId: alarmId[1] || null,
  };
}

export async function checkIsMonitoring(): Promise<boolean> {
  try {
    return await Location.hasStartedLocationUpdatesAsync(GEOFENCE_TASK);
  } catch (_) {
    return false;
  }
}

// ─── Alarm trigger ────────────────────────────────────────────────────────────

export async function triggerAlarm(alarm: GeofenceAlarm): Promise<void> {
  await _sendAlarmNotification(alarm);
  await startAlarmAudio();
}

// ─── Replace startAlarmAudio ──────────────────────────────────────────────────

export async function startAlarmAudio(): Promise<void> {
  // Stop any existing player first — pause THEN remove
  if (_player) {
    try {
      _player.pause();
      _player.remove();
    } catch (_) {}
    _player = null;
  }

  try {
    await Audio.setAudioModeAsync({
      staysActiveInBackground: true,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: false,
      playThroughEarpieceAndroid: false,
    });

    _player = createAudioPlayer(
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require("../assets/sounds/alarm.mp3"),
    );
    _player.loop = true;
    _player.volume = 1.0;
    _player.play();
  } catch (e) {
    console.error("[Alarm] Audio load failed:", e);
  }
}

// ─── Replace stopAlarm ────────────────────────────────────────────────────────

export async function stopAlarm(): Promise<void> {
  // Audio — pause FIRST so sound cuts immediately, then release
  if (_player) {
    try {
      _player.pause(); // ← immediate cutoff
      _player.remove(); // ← release native resources
    } catch (_) {}
    _player = null;
  }

  // Also reset Audio mode so other apps resume normally
  try {
    await Audio.setAudioModeAsync({
      staysActiveInBackground: false,
      playsInSilentModeIOS: false,
      shouldDuckAndroid: true,
    });
  } catch (_) {}

  // Notifications
  try {
    const notifId = await AsyncStorage.getItem(KEY.NOTIF_ID);
    if (notifId) await Notifications.dismissNotificationAsync(notifId);
  } catch (_) {}
  await Notifications.dismissAllNotificationsAsync();

  // State
  await AsyncStorage.multiSet([
    [KEY.RINGING, "false"],
    [KEY.RINGING_ID, ""],
    [KEY.NOTIF_ID, ""],
  ]);
}

// ─── Private helpers ──────────────────────────────────────────────────────────

// ─── Replace _sendAlarmNotification ──────────────────────────────────────────

async function _sendAlarmNotification(alarm: GeofenceAlarm): Promise<void> {
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: "🚨 GEOFENCE REACHED",
      body: `Now within ${Math.round(alarm.radius)}m of ${alarm.destination.name}`,
      sound: true,
      priority: Notifications.AndroidNotificationPriority.MAX,
      categoryIdentifier: "geofence_alarm", // ← attaches the STOP button
      data: { type: "geofence_alarm", alarmId: alarm.id },
      ...(Platform.OS === "android" && { channelId: CHANNEL_ALARM }),
    },
    trigger: null,
  });
  await AsyncStorage.setItem(KEY.NOTIF_ID, id);
}
// ─── Add this new exported function ───────────────────────────────────────────

export async function setupAlarmNotificationCategory(): Promise<void> {
  await Notifications.setNotificationCategoryAsync("geofence_alarm", [
    {
      identifier: "STOP_ALARM",
      buttonTitle: "🔕 STOP ALARM",
      options: {
        opensAppToForeground: true,
        isDestructive: true,
      },
    },
  ]);
}
