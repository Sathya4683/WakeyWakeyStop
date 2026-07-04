import * as Location from 'expo-location';
import type { LocationObject, LocationRegion } from 'expo-location';
import type { Alarm } from '../types';
import { distanceMeters, formatDistance, describePlace } from '../lib/geo';
import { getJSON, setJSON, KEYS } from '../storage/persist';
import * as repo from '../storage/repo';
import {
  presentRingNotification,
  dismissRingNotification,
  scheduleSnooze,
  cancelSnooze,
  prepareNotifications,
} from './notifications';
import { startRinging, stopRinging } from './sound';
import {
  formatMinutes,
  isWindowActive,
  minutesNow,
  minutesUntilWindow,
  todayKey,
} from '../lib/time';

export const GEOFENCE_TASK = 'wakeystop-geofence';
export const LOCATION_TASK = 'wakeystop-location';

/**
 * An alarm worth keeping watchers registered for: simply enabled. Repeating
 * alarms that were already dismissed today stay watched on the cheap idle
 * heartbeat — that heartbeat is what re-arms them after midnight even if
 * the app is never opened. (One-time alarms disable themselves on trigger.)
 */
function isWatchable(a: Alarm): boolean {
  return a.enabled;
}

/** Allowed to ring right now: window open, and not already done today. */
function isRingable(a: Alarm): boolean {
  if (!a.enabled) return false;
  if (a.repeat && a.lastCompletedDay === todayKey()) return false;
  return isWindowActive(a.windowStart, a.windowEnd);
}

/**
 * How WakeyStop watches a journey — two cooperating mechanisms:
 *
 * 1. OS geofences (Location.startGeofencingAsync). These use Android's fused
 *    geofencing service: near-zero battery cost and they survive the app
 *    being backgrounded. They are the safety net.
 *
 * 2. An adaptive foreground-service location stream. Geofence delivery on
 *    Android can be delayed by minutes when the device is stationary or
 *    dozing — unacceptable for someone asleep on a train. The foreground
 *    service guarantees timely fixes, keeps the JS runtime alive so the full
 *    alarm experience (looping sound, ringing screen) works, and shows the
 *    user an honest "watching your trip" notification. Its sampling rate
 *    adapts to the distance from the nearest alarm so a 300 km journey
 *    costs almost nothing until the final approach.
 */
interface TrackingProfile {
  id: 'idle' | 'far' | 'mid' | 'near';
  accuracy: Location.LocationAccuracy;
  timeInterval: number;
  distanceInterval: number;
}

const PROFILES: Record<TrackingProfile['id'], TrackingProfile> = {
  /**
   * Heartbeat mode: an alarm is armed but its active window hasn't opened
   * yet. Cheap, low-accuracy ticks whose only job is to keep the engine
   * alive so it can promote itself the moment the window opens — without
   * this, nothing would start the precise watchers if the app is killed
   * before the window begins.
   */
  idle: {
    id: 'idle',
    accuracy: Location.LocationAccuracy.Low,
    timeInterval: 15 * 60_000,
    distanceInterval: 500,
  },
  far: {
    id: 'far',
    accuracy: Location.LocationAccuracy.Balanced,
    timeInterval: 120_000,
    distanceInterval: 1000,
  },
  mid: {
    id: 'mid',
    accuracy: Location.LocationAccuracy.Balanced,
    timeInterval: 30_000,
    distanceInterval: 250,
  },
  near: {
    id: 'near',
    accuracy: Location.LocationAccuracy.High,
    timeInterval: 8_000,
    distanceInterval: 60,
  },
};

/** Hysteresis bands (metres beyond the wake radius) for profile switching. */
function profileFor(nearestGapMeters: number): TrackingProfile {
  if (nearestGapMeters > 15_000) return PROFILES.far;
  if (nearestGapMeters > 2_500) return PROFILES.mid;
  return PROFILES.near;
}

interface StoredProfile {
  id: TrackingProfile['id'];
  notice: string;
  setAt: number;
}

// ------------------------------------------------------------- reconcile

/**
 * Brings the OS watchers in line with the current alarm list. Called after
 * every alarm mutation, on app launch and on app foreground — it is
 * idempotent, which also makes it our recovery path after process death or
 * device restart.
 */
export async function reconcileWatching(): Promise<void> {
  const alarms = await repo.loadAlarms();
  const watchable = alarms.filter(isWatchable);

  const [fg, bg] = await Promise.all([
    Location.getForegroundPermissionsAsync(),
    Location.getBackgroundPermissionsAsync(),
  ]);

  if (watchable.length === 0 || !fg.granted || !bg.granted) {
    await stopWatchers();
    return;
  }

  // Geofences: one region per watchable alarm. Registered even outside the
  // active window — they're free, and a transition is a wake-up that lets
  // the engine re-evaluate (the actual ring is gated on the window).
  const regions: LocationRegion[] = watchable.map((a) => ({
    identifier: a.id,
    latitude: a.destination.latitude,
    longitude: a.destination.longitude,
    radius: a.radiusMeters,
    notifyOnEnter: true,
    notifyOnExit: true,
  }));
  try {
    await Location.startGeofencingAsync(GEOFENCE_TASK, regions);
  } catch (e) {
    console.warn('[engine] geofencing unavailable', e);
  }

  // Foreground-service stream: adaptive while a window is active, a cheap
  // idle heartbeat while we're only waiting for one to open.
  const ringable = watchable.filter(isRingable);
  if (ringable.length === 0) {
    await startStream(PROFILES.idle, idleNotice(watchable));
    return;
  }
  let gap = Number.POSITIVE_INFINITY;
  const last = await Location.getLastKnownPositionAsync().catch(() => null);
  if (last) gap = nearestGap(ringable, last);
  await startStream(profileFor(gap), watchNotice(ringable, last));
}

async function stopWatchers(): Promise<void> {
  await Location.stopGeofencingAsync(GEOFENCE_TASK).catch(() => {});
  await Location.stopLocationUpdatesAsync(LOCATION_TASK).catch(() => {});
  await setJSON(KEYS.trackingProfile, null);
}

function nearestGap(active: Alarm[], loc: LocationObject): number {
  return Math.min(
    ...active.map(
      (a) => distanceMeters(loc.coords, a.destination) - a.radiusMeters,
    ),
  );
}

function watchNotice(active: Alarm[], loc: LocationObject | null): string {
  if (active.length === 1) {
    const a = active[0];
    if (loc) {
      const d = distanceMeters(loc.coords, a.destination);
      return `${formatDistance(d)} to ${describePlace(a.destination)}`;
    }
    return `Watching for ${describePlace(a.destination)}`;
  }
  return `Watching ${active.length} destinations`;
}

/** Honest "waiting" text while nothing is allowed to ring right now. */
function idleNotice(watchable: Alarm[]): string {
  let soonest: { alarm: Alarm; inMin: number; doneToday: boolean } | null = null;
  for (const a of watchable) {
    const doneToday = a.repeat && a.lastCompletedDay === todayKey();
    let inMin = minutesUntilWindow(a.windowStart, a.windowEnd);
    // Done for today: the next opportunity is tomorrow's window start.
    if (doneToday && inMin === 0) {
      inMin = ((a.windowStart - minutesNow() + 1440) % 1440) || 1440;
    }
    if (!soonest || inMin < soonest.inMin) soonest = { alarm: a, inMin, doneToday };
  }
  if (!soonest) return 'Waiting for an alarm window';
  const at = formatMinutes(soonest.alarm.windowStart);
  return soonest.doneToday
    ? `"${soonest.alarm.label}" is done for today — re-arms at ${at}`
    : `Standing by — "${soonest.alarm.label}" goes live at ${at}`;
}

async function startStream(profile: TrackingProfile, notice: string): Promise<void> {
  const stored = await getJSON<StoredProfile | null>(KEYS.trackingProfile, null);
  const running = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK).catch(
    () => false,
  );
  // Restart only when something meaningful changed; restarting also refreshes
  // the foreground-service notification text. Rate-limited to avoid churn.
  const staleText =
    stored != null && stored.notice !== notice && Date.now() - stored.setAt > 45_000;
  if (running && stored?.id === profile.id && !staleText) return;

  try {
    await Location.startLocationUpdatesAsync(LOCATION_TASK, {
      accuracy: profile.accuracy,
      timeInterval: profile.timeInterval,
      distanceInterval: profile.distanceInterval,
      deferredUpdatesInterval: profile.timeInterval,
      pausesUpdatesAutomatically: false,
      foregroundService: {
        notificationTitle: 'WakeyStop is watching your trip',
        notificationBody: notice,
        notificationColor: '#FFB547',
        killServiceOnDestroy: false,
      },
    });
    await setJSON(KEYS.trackingProfile, {
      id: profile.id,
      notice,
      setAt: Date.now(),
    } satisfies StoredProfile);
  } catch (e) {
    console.warn('[engine] could not start location stream', e);
  }
}

// ------------------------------------------------------- event handling

/**
 * Evaluates a batch of fixes from the background stream (or the in-app
 * foreground watcher) against every active alarm.
 */
export async function handleLocationFixes(locations: LocationObject[]): Promise<void> {
  const latest = locations[locations.length - 1];
  if (!latest) return;

  const alarms = await repo.loadAlarms();
  const watchable = alarms.filter(isWatchable);
  if (watchable.length === 0) return;

  for (const alarm of watchable) {
    const d = distanceMeters(latest.coords, alarm.destination);
    if (d <= alarm.radiusMeters) {
      if (isRingable(alarm)) {
        await triggerAlarm(alarm.id, d);
      } else if (!alarm.inside) {
        // Outside the active window: don't ring, but remember we're inside.
        // This is what makes "already home before the window opens" silent —
        // the alarm only rings on a genuine *arrival* during the window.
        await repo.patchAlarm(alarm.id, { inside: true });
      }
    } else if (alarm.inside && d > alarm.radiusMeters * 1.25) {
      // Left the area: repeating alarms re-arm for the next ride.
      await repo.patchAlarm(alarm.id, { inside: false });
    }
  }

  // Adapt sampling: precise while a window is open, heartbeat otherwise.
  const fresh = (await repo.loadAlarms()).filter(isWatchable);
  if (fresh.length > 0) {
    const ringable = fresh.filter(isRingable);
    if (ringable.length > 0) {
      await startStream(
        profileFor(nearestGap(ringable, latest)),
        watchNotice(ringable, latest),
      );
    } else {
      await startStream(PROFILES.idle, idleNotice(fresh));
    }
  }
}

/** Geofence transitions from the OS — the low-power safety net. */
export async function handleGeofenceEvent(
  eventType: Location.GeofencingEventType,
  region: LocationRegion,
): Promise<void> {
  const alarmId = region.identifier;
  if (!alarmId) return;
  if (eventType === Location.GeofencingEventType.Enter) {
    const alarm = (await repo.loadAlarms()).find((a) => a.id === alarmId);
    if (!alarm || !isWatchable(alarm)) return;
    if (isRingable(alarm)) {
      await triggerAlarm(alarmId);
    } else if (!alarm.inside) {
      await repo.patchAlarm(alarmId, { inside: true });
    }
    // Any wake-up is a chance to promote the stream if a window just opened.
    await reconcileWatching();
  } else if (eventType === Location.GeofencingEventType.Exit) {
    await repo.patchAlarm(alarmId, { inside: false });
  }
}

// --------------------------------------------------------------- ringing

const RETRIGGER_GUARD_MS = 90_000;
/** Re-present the alarm notification while unacknowledged (re-ring loop). */
const RERING_INTERVAL_MS = 30_000;
const RERING_MAX = 10;

let reRingTimer: ReturnType<typeof setInterval> | null = null;

export async function triggerAlarm(alarmId: string, distance?: number): Promise<void> {
  const alarms = await repo.loadAlarms();
  const alarm = alarms.find((a) => a.id === alarmId);
  if (!alarm || !isRingable(alarm)) return;

  // Idempotency: geofence ENTER and the location stream can both fire.
  if (alarm.inside) return;
  if (alarm.lastTriggeredAt && Date.now() - alarm.lastTriggeredAt < RETRIGGER_GUARD_MS) {
    return;
  }

  await repo.patchAlarm(alarmId, {
    inside: true,
    lastTriggeredAt: Date.now(),
    // One-time alarms disarm themselves; repeating alarms stay on.
    enabled: alarm.repeat,
  });
  await repo.setRinging({ alarmId, startedAt: Date.now() });

  await presentRingNotification(alarm, distance);
  await startRinging({ sound: alarm.sound, vibrate: alarm.vibrate });
  startReRingLoop(alarmId);

  // Keep watchers honest (a fired one-time alarm may have been the last one,
  // but we keep the stream alive until the user dismisses the ring).
}

function startReRingLoop(alarmId: string): void {
  stopReRingLoop();
  let count = 0;
  reRingTimer = setInterval(async () => {
    count += 1;
    const ringing = await repo.getRinging();
    if (!ringing || ringing.alarmId !== alarmId || count > RERING_MAX) {
      stopReRingLoop();
      return;
    }
    const alarm = (await repo.loadAlarms()).find((a) => a.id === alarmId);
    if (alarm) await presentRingNotification(alarm);
  }, RERING_INTERVAL_MS);
}

function stopReRingLoop(): void {
  if (reRingTimer) clearInterval(reRingTimer);
  reRingTimer = null;
}

/** Stops sound/vibration/notification and settles alarm state. */
export async function dismissRinging(opts?: { snoozeMinutes?: number }): Promise<void> {
  const ringing = await repo.getRinging();
  stopReRingLoop();
  stopRinging();
  if (ringing) {
    await dismissRingNotification(ringing.alarmId);
    const alarm = (await repo.loadAlarms()).find((a) => a.id === ringing.alarmId);
    if (alarm) {
      if (opts?.snoozeMinutes) {
        await scheduleSnooze(alarm, opts.snoozeMinutes);
      } else {
        await cancelSnooze(alarm.id);
        // A plain dismiss settles a repeating alarm for the day; it re-arms
        // automatically tomorrow. (A snooze keeps it "in flight".)
        if (alarm.repeat) {
          await repo.patchAlarm(alarm.id, { lastCompletedDay: todayKey() });
        }
      }
    }
  }
  await repo.setRinging(null);
  await reconcileWatching();
}

// ------------------------------------------------------------- bootstrap

/**
 * Called on every cold start and foreground. Re-registers watchers (Android
 * drops geofences on reboot), repairs ringing state and prepares channels.
 */
export async function bootstrap(): Promise<void> {
  await prepareNotifications();

  // If the process died mid-ring, surface it again rather than losing it.
  const ringing = await repo.getRinging();
  if (ringing) {
    const stale = Date.now() - ringing.startedAt > 15 * 60_000;
    if (stale) {
      await dismissRinging();
    } else {
      const alarm = (await repo.loadAlarms()).find((a) => a.id === ringing.alarmId);
      if (alarm) await startRinging({ sound: alarm.sound, vibrate: alarm.vibrate });
    }
  }

  await reconcileWatching();
}
