import { DeviceEventEmitter } from 'react-native';
import type { Alarm, AppSettings, Place } from '../types';
import { DEFAULT_SETTINGS } from '../types';
import { getJSON, setJSON, KEYS } from './persist';

/** Emitted whenever alarm data changes, so UI stores can re-hydrate. */
export const EVT_ALARMS_CHANGED = 'wakeystop:alarms-changed';
/** Emitted whenever the ringing state changes. */
export const EVT_RINGING_CHANGED = 'wakeystop:ringing-changed';

export interface RingingState {
  alarmId: string;
  startedAt: number;
}

// ---------------------------------------------------------------- alarms

export async function loadAlarms(): Promise<Alarm[]> {
  const alarms = await getJSON<Alarm[]>(KEYS.alarms, []);
  // Migration: alarms saved before active windows existed get an all-day
  // window so they keep behaving exactly as before.
  return alarms.map((a) =>
    a.windowStart == null || a.windowEnd == null
      ? { ...a, windowStart: 0, windowEnd: 1439 }
      : a,
  );
}

export async function saveAlarms(alarms: Alarm[]): Promise<void> {
  await setJSON(KEYS.alarms, alarms);
  DeviceEventEmitter.emit(EVT_ALARMS_CHANGED);
}

export async function upsertAlarm(alarm: Alarm): Promise<Alarm[]> {
  const alarms = await loadAlarms();
  const i = alarms.findIndex((a) => a.id === alarm.id);
  if (i >= 0) alarms[i] = alarm;
  else alarms.unshift(alarm);
  await saveAlarms(alarms);
  return alarms;
}

export async function patchAlarm(
  id: string,
  patch: Partial<Alarm>,
): Promise<Alarm | undefined> {
  const alarms = await loadAlarms();
  const i = alarms.findIndex((a) => a.id === id);
  if (i < 0) return undefined;
  alarms[i] = { ...alarms[i], ...patch, updatedAt: Date.now() };
  await saveAlarms(alarms);
  return alarms[i];
}

export async function deleteAlarm(id: string): Promise<Alarm[]> {
  const alarms = (await loadAlarms()).filter((a) => a.id !== id);
  await saveAlarms(alarms);
  return alarms;
}

// --------------------------------------------------------------- ringing

export async function getRinging(): Promise<RingingState | null> {
  return getJSON<RingingState | null>(KEYS.ringing, null);
}

export async function setRinging(state: RingingState | null): Promise<void> {
  await setJSON(KEYS.ringing, state);
  DeviceEventEmitter.emit(EVT_RINGING_CHANGED, state);
}

// -------------------------------------------------------------- settings

export async function loadSettings(): Promise<AppSettings> {
  const stored = await getJSON<Partial<AppSettings>>(KEYS.settings, {});
  return { ...DEFAULT_SETTINGS, ...stored };
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  await setJSON(KEYS.settings, settings);
}

// --------------------------------------------------------- recent places

const MAX_RECENT = 6;

export async function loadRecentPlaces(): Promise<Place[]> {
  return getJSON<Place[]>(KEYS.recentPlaces, []);
}

export async function rememberPlace(place: Place): Promise<void> {
  const list = await loadRecentPlaces();
  const next = [
    place,
    ...list.filter(
      (p) =>
        Math.abs(p.latitude - place.latitude) > 1e-4 ||
        Math.abs(p.longitude - place.longitude) > 1e-4,
    ),
  ].slice(0, MAX_RECENT);
  await setJSON(KEYS.recentPlaces, next);
}
