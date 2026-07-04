import { create } from 'zustand';
import { DeviceEventEmitter } from 'react-native';
import type { Alarm, AppSettings, Place } from '../types';
import { DEFAULT_SETTINGS } from '../types';
import * as repo from './repo';
import { reconcileWatching } from '../services/engine';

interface AlarmStore {
  alarms: Alarm[];
  hydrated: boolean;
  ringingAlarmId: string | null;
  hydrate: () => Promise<void>;
  upsert: (alarm: Alarm) => Promise<void>;
  toggle: (id: string, enabled: boolean) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

export const useAlarms = create<AlarmStore>((set) => ({
  alarms: [],
  hydrated: false,
  ringingAlarmId: null,

  hydrate: async () => {
    const [alarms, ringing] = await Promise.all([repo.loadAlarms(), repo.getRinging()]);
    set({ alarms, ringingAlarmId: ringing?.alarmId ?? null, hydrated: true });
  },

  upsert: async (alarm) => {
    const alarms = await repo.upsertAlarm(alarm);
    set({ alarms });
    await reconcileWatching();
  },

  toggle: async (id, enabled) => {
    // Flipping an alarm back on is a deliberate act — clear today's
    // completion so a repeating alarm can ring again the same day.
    await repo.patchAlarm(id, { enabled, inside: false, lastCompletedDay: undefined });
    const alarms = await repo.loadAlarms();
    set({ alarms });
    await reconcileWatching();
  },

  remove: async (id) => {
    const alarms = await repo.deleteAlarm(id);
    set({ alarms });
    await reconcileWatching();
  },
}));

// Keep the UI store in sync with writes made by background tasks (or by the
// engine running in this same context).
DeviceEventEmitter.addListener(repo.EVT_ALARMS_CHANGED, () => {
  void useAlarms.getState().hydrate();
});
DeviceEventEmitter.addListener(repo.EVT_RINGING_CHANGED, () => {
  void useAlarms.getState().hydrate();
});

interface SettingsStore {
  settings: AppSettings;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  update: (patch: Partial<AppSettings>) => Promise<void>;
}

export const useSettings = create<SettingsStore>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  hydrated: false,

  hydrate: async () => {
    set({ settings: await repo.loadSettings(), hydrated: true });
  },

  update: async (patch) => {
    const next = { ...get().settings, ...patch };
    set({ settings: next });
    await repo.saveSettings(next);
  },
}));

interface RecentPlacesStore {
  places: Place[];
  hydrate: () => Promise<void>;
  remember: (p: Place) => Promise<void>;
}

export const useRecentPlaces = create<RecentPlacesStore>((set) => ({
  places: [],
  hydrate: async () => set({ places: await repo.loadRecentPlaces() }),
  remember: async (p) => {
    await repo.rememberPlace(p);
    set({ places: await repo.loadRecentPlaces() });
  },
}));
