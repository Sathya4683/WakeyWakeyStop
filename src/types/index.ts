/** A geographic point with an optional human-readable description. */
export interface Place {
  latitude: number;
  longitude: number;
  /** Short name, e.g. "Chennai Central". */
  name?: string;
  /** Full address line from reverse geocoding. */
  address?: string;
}

/**
 * A location alarm. The user picks a destination and a wake distance; the
 * alarm rings when the device comes within `radiusMeters` of `destination`.
 */
export interface Alarm {
  id: string;
  label: string;
  destination: Place;
  /** Wake distance: ring when within this many metres of the destination. */
  radiusMeters: number;
  /** Whether the alarm is armed and being watched. */
  enabled: boolean;
  /**
   * Commuter mode. One-time alarms disable themselves after ringing;
   * repeating alarms stay armed and re-arm once you leave the area.
   */
  repeat: boolean;
  sound: boolean;
  vibrate: boolean;
  /**
   * Active window, minutes since local midnight (0–1439). The alarm only
   * rings inside this window — e.g. heading to the bus stop at 8 am should
   * not trigger the "wake me near home" alarm meant for the 5–6 pm ride
   * back. May cross midnight (start > end).
   */
  windowStart: number;
  windowEnd: number;
  /**
   * Local day key (YYYY-MM-DD) on which a repeating alarm was dismissed.
   * Once dismissed it's done for that day and re-arms the next day.
   */
  lastCompletedDay?: string;
  createdAt: number;
  updatedAt: number;
  lastTriggeredAt?: number;
  /**
   * True while the device is inside the alarm region. Used to prevent a
   * repeating alarm from re-ringing until the user has left the area.
   */
  inside?: boolean;
}

export interface AppSettings {
  onboardingDone: boolean;
  defaultRadiusMeters: number;
  defaultSound: boolean;
  defaultVibrate: boolean;
  /** Last map camera position, so the editor opens somewhere familiar. */
  lastMapCenter?: { latitude: number; longitude: number; zoom: number };
}

export const DEFAULT_SETTINGS: AppSettings = {
  onboardingDone: false,
  defaultRadiusMeters: 1000,
  defaultSound: true,
  defaultVibrate: true,
};

/** Wake distance presets surfaced in the editor (metres). */
export const RADIUS_PRESETS = [300, 500, 1000, 2000, 5000] as const;
export const MIN_RADIUS = 200;
export const MAX_RADIUS = 10000;

export interface GeocodeResult {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
}
