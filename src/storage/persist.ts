import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Single typed gateway to AsyncStorage.
 *
 * Both the UI and the background location/geofence tasks (which may run in a
 * headless JS context while the app is killed) read and write through this
 * module, so AsyncStorage is the single source of truth for alarm state.
 */
export const KEYS = {
  alarms: 'wakeystop.alarms.v1',
  settings: 'wakeystop.settings.v1',
  ringing: 'wakeystop.ringing.v1',
  trackingProfile: 'wakeystop.trackingProfile.v1',
  recentPlaces: 'wakeystop.recentPlaces.v1',
} as const;

export async function getJSON<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw == null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function setJSON(key: string, value: unknown): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export async function remove(key: string): Promise<void> {
  await AsyncStorage.removeItem(key);
}
