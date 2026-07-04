# WakeyStop architecture

This document explains how WakeyStop is built, and — more importantly — why.
The two product goals that shaped every decision are **reliability** (a
sleeping user must be woken) and **battery efficiency** (a long journey must
not drain the phone). They pull in opposite directions; the architecture is
the negotiated peace between them.

---

## 1. The watching strategy: hybrid geofence + adaptive stream

A naive implementation polls GPS every few seconds for the whole journey.
That is accurate, battery-hostile and exactly what the OS will punish. The
opposite extreme — OS geofences only — is battery-friendly but, on real
Android devices, geofence latency can stretch to minutes and OEM power
managers sometimes swallow transitions entirely. Neither is acceptable alone,
so WakeyStop runs **both**, each covering the other's weakness:

### Layer 1 — OS geofences (the safety net)

For every enabled alarm, `expo-location`'s `startGeofencingAsync` registers a
region with Google Play Services' fused, hardware-batched geofencing. This
costs essentially nothing in battery and survives the app's JS process being
killed: a transition wakes the app headlessly through
`expo-task-manager` (`GEOFENCE_TASK` in `src/background/tasks.ts`).

### Layer 2 — adaptive foreground-service location stream (the precision layer)

`startLocationUpdatesAsync` runs with a **foreground service** (the
persistent "WakeyStop is watching the road" notification), which is the only
sanctioned way to receive ongoing location on modern Android. Its settings
adapt to how far the nearest armed destination is:

| Profile | When | Accuracy | Interval / displacement |
|---|---|---|---|
| **Idle** | armed, but no active window open | Low | 15 min / 500 m |
| **Far** | window open, gap > 15 km | Balanced (cell/Wi-Fi) | 120 s / 1000 m |
| **Mid** | window open, gap 2.5 – 15 km | Balanced | 30 s / 250 m |
| **Near** | window open, gap < 2.5 km | High (GPS) | 8 s / 60 m |

Far from the destination the phone mostly uses cheap network location at a
lazy cadence; GPS only spins up for the final approach, when precision
actually matters. Profile switches are rate-limited (≥ 45 s apart) so a noisy
fix can't thrash the service, and each restart refreshes the notification
text ("12.4 km to Chennai Central"), doubling as honest progress feedback.

The same fix-handling code path (`handleLocationFixes` in
`src/services/engine.ts`) serves three sources: the background stream, the
geofence transition, and — in degraded mode (background permission missing) —
a plain foreground watcher run by the Home screen while the app is open.

### Active hours (time windows)

Every alarm carries a **mandatory active window** (`windowStart`/`windowEnd`,
minutes since local midnight; may cross midnight). The window models intent:
"wake me near home" should fire on the 5–6 pm ride back, not while walking
to the bus stop at 8 am. The gating is layered deliberately:

* **Geofences stay registered regardless of the window** — they're free,
  they survive process death, and a transition is a wake-up that lets the
  engine re-evaluate. The *ring decision* is made at trigger time
  (`isRingable`): window open, not already done today.
* **The stream runs in Idle outside windows.** Idle's only job is to tick
  every ~15 min so the engine can promote itself to the adaptive profiles
  the moment a window opens — without it, nothing would start precise
  watching if the app were killed before the window began.
* **`inside` is tracked even outside the window, silently.** If you're
  already home before the window opens, the flag is set without ringing —
  the alarm then only fires on a genuine *arrival* (outside → inside)
  during the window. Geofence ENTER events outside the window do the same.

### Triggering

A fix inside `radiusMeters` of a ringable alarm triggers it. Alarms carry an
`inside` flag with **1.25× exit hysteresis** and a 90-second retrigger
guard, so GPS jitter at the boundary can't re-ring an alarm the user just
dismissed; they must genuinely leave the area before it re-arms.

**Per-day completion**: dismissing a repeating alarm stamps it with today's
date (`lastCompletedDay`) — it's done for the day and won't ring again until
tomorrow, even if you cross the zone repeatedly. A snooze does *not* stamp
it (the ride isn't over). Completed alarms stay on the Idle heartbeat so
they re-arm after midnight without the app ever being opened; toggling an
alarm off and on clears the stamp deliberately.

## 2. The ring: engineered to actually wake someone

Ringing is belt-and-braces because the user is asleep:

* A notification on a **dedicated max-importance channel** (`alarm-v1`)
  with the bundled `alarm.wav`, `AndroidAudioUsage.ALARM` (plays on the
  alarm volume stream, not media), DND bypass, lock-screen visibility, and
  **Dismiss / Remind me in 5 min** action buttons handled at module scope —
  they work even if the UI process never starts.
* A **looping audio player** (`expo-audio`, `shouldPlayInBackground`) plus a
  vibration loop, started in whichever JS context triggered the alarm.
* A **re-ring loop**: the notification is re-presented every 30 s (max 10×)
  until dismissed, in case the first one was swiped away half-asleep.
* If the app is opened, a **full-screen ringing experience** (keep-awake,
  pulsing ring, huge buttons) takes over; the hardware back button is
  blocked so the ring can't be left dangling.

Snooze is implemented as a scheduled time-interval notification on the same
alarm channel — it survives the app being killed in the meantime.

One-time alarms disable themselves on trigger (the common "wake me at my
stop" case); repeat alarms stay armed for commuters, bounded by the per-day
completion rule above.

## 3. State: AsyncStorage as the single source of truth

Android may run WakeyStop's JS in **two different contexts**: the full app,
and a headless context for background tasks. They do not share memory, so
in-memory state is a trap. Instead:

* **AsyncStorage** (`src/storage/persist.ts` + `repo.ts`) holds everything:
  alarms, settings, ringing state, last tracking profile, recent places.
  Every mutation goes through the repo, which emits `DeviceEventEmitter`
  events.
* **zustand stores** (`src/storage/stores.ts`) are a *UI cache* over the
  repo. They re-hydrate on those events, so a write made by a background
  task is reflected in any live UI within milliseconds.

This keeps the headless and UI worlds consistent without a database, sync
engine or native module — appropriate for the data volume (a handful of
alarms) and fully offline.

## 4. Recovery: `reconcileWatching()` and `bootstrap()`

Reliability on Android is mostly about **recovering from being killed**.

* `reconcileWatching()` is **idempotent**: it reads the enabled alarms and
  permission state, then starts/stops/retunes geofencing and the location
  stream to match. Because it converges on the desired state rather than
  mutating incrementally, it is safe to call from anywhere, any time — and
  it is, after every alarm mutation and every recovery event.
* `bootstrap()` runs on cold start and on every return to foreground. It
  prepares notification channels, repairs an interrupted ring (process died
  mid-ring → resume sound; ring older than 15 min → auto-dismiss), and calls
  `reconcileWatching()`. Android silently drops geofences on reboot, so the
  first app open after a restart re-registers everything.
* **Degraded mode**: if background permission is missing, the engine doesn't
  pretend. Watching falls back to a foreground-only watcher on the Home
  screen, and the UI shows a persistent reliability banner explaining
  exactly what's reduced and how to fix it.

## 5. Permission UX

Permissions are requested **contextually, in order, with the reason first**
(onboarding page 3, mirrored by the Settings reliability checklist):

1. Foreground location — "lets WakeyStop measure distance to your stop".
2. Background location — Android 11+ shows no dialog; the OS opens a
   settings page where the user must pick *Allow all the time*. The UI says
   exactly that, and re-checks state on `AppState` resume since no callback
   fires.
3. Notifications (Android 13+) — "the alarm itself is a notification".

Denial is never a dead end: every screen degrades gracefully and points at
the Settings checklist, which deep-links to the app's system settings when a
permission has been permanently denied, and to the battery-optimisation list
for the OEM-killer problem.

## 6. Mapping & search: free, keyless, swappable

* **Renderer**: `@maplibre/maplibre-react-native` — open-source, no SDK key.
* **Tiles/style**: OpenFreeMap `dark` (no key, no limits, free for any
  use) — a dark-matter basemap matching the app theme. One constant
  (`MAP_STYLE_URL`) to change provider or switch to a light style.
* **Geocoding**: Nominatim with a proper `User-Agent`, 450 ms input
  debounce, request abortion on every keystroke, and graceful offline
  failure (search errors suggest dropping a pin instead — pin-dropping is
  fully offline once tiles are cached).

This was a deliberate product decision: zero setup friction (`npm install`
and run — no `.env`), zero recurring cost, and no location-search data
flowing to a commercial tracker.

## 7. Design system

A tiny token set (`src/theme`) drives a deliberate dark-only "night transit"
look: deep navy `#0B1220`, one warm amber accent `#FFB547`, generous type
scale. The signature **approach-ring mark** (destination dot inside its wake
rings) appears in the app icon, onboarding hero and the pulsing ringing
screen — the product's mental model drawn literally.

## 8. Key files

| Concern | File |
|---|---|
| Alarm engine (watching, trigger, recovery) | `src/services/engine.ts` |
| Headless task definitions | `src/background/tasks.ts` |
| Notification channel + ring/snooze | `src/services/notifications.ts` |
| Persistence + cross-context events | `src/storage/repo.ts` |
| UI stores | `src/storage/stores.ts` |
| Permission helpers | `src/services/permissions.ts` |
| Geo math | `src/lib/geo.ts` |
| Time-window math | `src/lib/time.ts` |
| Android config (permissions, plugins, sound) | `app.json` |
