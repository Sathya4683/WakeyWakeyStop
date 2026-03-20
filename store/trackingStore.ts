import { create } from "zustand";

export type TrackingStatus = "idle" | "tracking" | "error";

export interface Destination {
  lat: number;
  lon: number;
  label?: string;
}

interface TrackingState {
  destination: Destination | null;
  status: TrackingStatus;
  distanceMeters: number | null;
  errorMessage: string | null;

  setDestination: (dest: Destination | null) => void;
  startTracking: () => void;
  stopTracking: () => void;
  setDistance: (meters: number) => void;
  setError: (message: string) => void;
}

export const useTrackingStore = create<TrackingState>((set) => ({
  destination: null,
  status: "idle",
  distanceMeters: null,
  errorMessage: null,

  setDestination: (dest) =>
    set({ destination: dest, distanceMeters: null, errorMessage: null }),

  startTracking: () =>
    set({ status: "tracking", distanceMeters: null, errorMessage: null }),

  stopTracking: () =>
    set({ status: "idle", distanceMeters: null, errorMessage: null }),

  setDistance: (meters) => set({ distanceMeters: meters }),

  setError: (message) => set({ status: "error", errorMessage: message }),
}));
