import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GeoDestination {
  lat: number;
  lng: number;
  name: string;
}

/**
 * Staging area: holds the geofence the user just drew on the map.
 * Consumed when a new GeofenceAlarm is created on the Alarms tab,
 * then cleared so the badge disappears.
 */
export interface PendingGeofence {
  destination: GeoDestination;
  radius: number; // metres
}

// ─── Store ────────────────────────────────────────────────────────────────────

interface GeofenceState {
  // Set from maps tab, cleared after alarm is created
  pendingGeofence: PendingGeofence | null;

  // Runtime — NOT persisted (re-derived each session)
  isMonitoring: boolean;
  isAlarmRinging: boolean;
  ringingAlarmId: string | null; // which alarm fired

  // Actions
  setPendingGeofence: (geofence: PendingGeofence) => void;
  clearPendingGeofence: () => void;
  setMonitoring: (value: boolean) => void;
  setAlarmRinging: (alarmId: string | null) => void;
}

export const useGeofenceStore = create<GeofenceState>()(
  persist(
    (set) => ({
      pendingGeofence: null,
      isMonitoring: false,
      isAlarmRinging: false,
      ringingAlarmId: null,

      setPendingGeofence: (geofence) => set({ pendingGeofence: geofence }),
      clearPendingGeofence: () => set({ pendingGeofence: null }),
      setMonitoring: (value) => set({ isMonitoring: value }),
      setAlarmRinging: (alarmId) =>
        set({ isAlarmRinging: alarmId !== null, ringingAlarmId: alarmId }),
    }),
    {
      name: "geofence-runtime",
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist the staging geofence; runtime flags reset each session
      partialize: (state) => ({
        pendingGeofence: state.pendingGeofence,
      }),
    },
  ),
);
