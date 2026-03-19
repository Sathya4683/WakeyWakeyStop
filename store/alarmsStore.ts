/**
 * alarmsStore.ts
 *
 * Single source of truth for the list of GeofenceAlarm objects.
 * Persisted to AsyncStorage under the key 'geofence-alarms'.
 *
 * The background location task reads the SAME key directly from
 * AsyncStorage (Zustand store is unavailable in background tasks),
 * so the storage key is exported as ALARMS_STORAGE_KEY.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

// ─── Types ────────────────────────────────────────────────────────────────────

export type AlarmFrequency = "once" | "daily" | "customDays";

export interface TimeWindow {
  startTime: string; // "HH:MM" 24-hour
  endTime: string; // "HH:MM" 24-hour
}

export interface GeofenceAlarm {
  id: string;
  destination: {
    lat: number;
    lng: number;
    name: string;
  };
  radius: number; // metres
  frequency: AlarmFrequency;
  customDays: number[]; // 0 = Sun … 6 = Sat (used when frequency === 'customDays')
  timeWindow: TimeWindow;
  isActive: boolean;
  lastTriggeredAt: number | null; // epoch ms — null means never triggered
  createdAt: number; // epoch ms
}

// ─── Storage key (also read by background task) ───────────────────────────────

export const ALARMS_STORAGE_KEY = "geofence-alarms";

// ─── Store ────────────────────────────────────────────────────────────────────

interface AlarmsState {
  alarms: GeofenceAlarm[];

  // Actions
  addAlarm: (alarm: GeofenceAlarm) => void;
  removeAlarm: (id: string) => void;
  toggleAlarm: (id: string) => void;
  updateAlarm: (id: string, updates: Partial<GeofenceAlarm>) => void;
  setLastTriggered: (id: string, timestamp: number) => void;
  clearAll: () => void;
}

export const useAlarmsStore = create<AlarmsState>()(
  persist(
    (set) => ({
      alarms: [],

      addAlarm: (alarm) => set((s) => ({ alarms: [alarm, ...s.alarms] })),

      removeAlarm: (id) =>
        set((s) => ({ alarms: s.alarms.filter((a) => a.id !== id) })),

      toggleAlarm: (id) =>
        set((s) => ({
          alarms: s.alarms.map((a) =>
            a.id === id ? { ...a, isActive: !a.isActive } : a,
          ),
        })),

      updateAlarm: (id, updates) =>
        set((s) => ({
          alarms: s.alarms.map((a) => (a.id === id ? { ...a, ...updates } : a)),
        })),

      setLastTriggered: (id, timestamp) =>
        set((s) => ({
          alarms: s.alarms.map((a) =>
            a.id === id ? { ...a, lastTriggeredAt: timestamp } : a,
          ),
        })),

      clearAll: () => set({ alarms: [] }),
    }),
    {
      name: ALARMS_STORAGE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
