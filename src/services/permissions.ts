import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import * as IntentLauncher from 'expo-intent-launcher';
import { Linking, Platform } from 'react-native';

export interface PermissionSnapshot {
  foreground: boolean;
  background: boolean;
  notifications: boolean;
  /** Everything needed for fully reliable, screen-off alarms. */
  reliable: boolean;
}

export async function getPermissionSnapshot(): Promise<PermissionSnapshot> {
  const [fg, bg, notif] = await Promise.all([
    Location.getForegroundPermissionsAsync(),
    Location.getBackgroundPermissionsAsync(),
    Notifications.getPermissionsAsync(),
  ]);
  const snapshot = {
    foreground: fg.granted,
    background: bg.granted,
    notifications: notif.granted,
  };
  return { ...snapshot, reliable: snapshot.foreground && snapshot.background && snapshot.notifications };
}

export async function requestForegroundLocation(): Promise<boolean> {
  const res = await Location.requestForegroundPermissionsAsync();
  return res.granted;
}

/**
 * On Android 11+ this jumps to the app's location settings page where the
 * user must pick "Allow all the time" — the OS no longer shows an in-app
 * dialog for background location.
 */
export async function requestBackgroundLocation(): Promise<boolean> {
  const res = await Location.requestBackgroundPermissionsAsync();
  return res.granted;
}

export async function requestNotifications(): Promise<boolean> {
  const res = await Notifications.requestPermissionsAsync();
  return res.granted;
}

export function openAppSettings(): void {
  void Linking.openSettings();
}

/**
 * Opens the system battery-optimization list so the user can exempt
 * WakeyStop. We deliberately use the settings screen (no extra permission,
 * Play-policy friendly) instead of the direct exemption dialog.
 */
export async function openBatteryOptimizationSettings(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    await IntentLauncher.startActivityAsync(
      IntentLauncher.ActivityAction.IGNORE_BATTERY_OPTIMIZATION_SETTINGS,
    );
  } catch {
    openAppSettings();
  }
}
