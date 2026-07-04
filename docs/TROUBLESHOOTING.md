# Troubleshooting

Real-world Android is messy; this page covers the issues you're most likely
to meet, in rough order of likelihood.

---

## "The alarm didn't ring while my screen was off"

First, two quick checks that aren't bugs:

* **Was the alarm inside its active hours?** Alarms only ring inside the
  time window set on the alarm (shown on its card, e.g. "5 pm – 6 pm").
* **Had it already rung today?** A repeating alarm dismissed once is done
  for the day ("done for today" on its card) and re-arms tomorrow. Toggle
  it off and on to re-arm it immediately.

Then work through these in order — the in-app **Settings → Reliability checklist**
automates most of it.

1. **Background location must be "Allow all the time".**
   System settings → Apps → WakeyStop → Permissions → Location →
   *Allow all the time*. "Only while using the app" means Android stops
   location the moment the screen locks. This is the single most common
   cause.

2. **Notifications must be allowed** (Android 13+ asks explicitly), and the
   **"Alarms" channel** must not have been silenced: long-press a WakeyStop
   notification → settings → check the *Alarms* category is set to alert
   with sound.

3. **Battery optimisation.** Use *Settings → Open battery settings* in the
   app, find WakeyStop and choose **Don't optimise / Unrestricted**.

4. **OEM battery killers.** Xiaomi (MIUI/HyperOS), OnePlus, Oppo, Vivo,
   Huawei, and aggressive modes on Samsung ship proprietary "battery saver"
   layers that kill background apps *in addition to* stock Android's rules.
   Typical fixes (names vary by brand/version):
   * Xiaomi: Security app → Battery → App battery saver → WakeyStop →
     *No restrictions*; also enable *Autostart*.
   * OnePlus/Oppo/Vivo: Battery → *Don't optimise* + allow auto-launch /
     background activity.
   * Samsung: Battery → Background usage limits → make sure WakeyStop is
     **not** in "Sleeping" or "Deep sleeping" apps; add it to
     *Never sleeping apps*.
   The community-maintained per-brand guides at
   [dontkillmyapp.com](https://dontkillmyapp.com) are excellent — the app
   links there from Settings.

5. **Alarm volume.** The alarm plays on the *alarm* audio stream (so media
   volume doesn't matter), but if the alarm stream itself is at zero you'll
   only get vibration. Check volume → alarm slider.

6. **The foreground notification is your heartbeat.** While any alarm is
   armed and permissions are complete you should see a quiet, persistent
   "WakeyStop is watching the road" notification. If it's not there, watching
   isn't running — open the app once (recovery runs automatically on every
   open) and re-check the list above.

## After a phone reboot

Android **silently discards all geofences and background location sessions
on reboot** and offers no reliable, policy-friendly way for an Expo app to
resurrect them headlessly. WakeyStop therefore re-registers everything the
first time you open the app after a restart (`bootstrap()` on launch).

**Practical rule: if your phone restarted mid-journey, open WakeyStop once.**
The persistent foreground notification reappearing is your confirmation.

## Permissions

* **No dialog appears for background location** — that's expected on
  Android 11+: the system opens the app's location settings page instead,
  where you must manually select *Allow all the time*. WakeyStop's UI
  re-checks the result when you return to the app.
* **A permission button does nothing** — after two denials Android stops
  showing the dialog ("permanently denied"). The Settings checklist detects
  a failed request and opens the system app-settings page so you can grant
  it manually.
* **Revoked mid-flight** — if you revoke location while alarms are armed,
  Android kills the watchers. Next time the app runs its recovery pass it
  degrades gracefully and shows the reliability banner on Home.

## Maps & search

* **Map is blank / tiles don't load** — OpenFreeMap tiles need a network
  connection the first time; areas you've viewed before render from cache.
  Pin-dropping and all alarm functionality work fully offline.
* **Search returns nothing or errors** — Nominatim is a free shared service
  with a ~1 req/s fair-use limit; very occasionally it's slow or down. The
  app debounces input and falls back gracefully — drop a pin on the map
  instead (long term, the pin is the more private option anyway).
* **Want a different map look?** Change `MAP_STYLE_URL` in
  `src/navigation/index.ts` to any MapLibre style JSON URL.

## Build & run issues

* **`npx expo run:android` can't find a device** — enable USB debugging,
  accept the RSA prompt on the phone, verify with `adb devices`.
* **Gradle/Java errors** — the project targets JDK 17. Check
  `java -version`; multiple JDKs are the usual culprit (`JAVA_HOME`).
* **Stale native project after changing `app.json`** — config plugins only
  apply at prebuild. Run `npx expo prebuild --clean` to regenerate
  `android/` from scratch (it is generated output; never edit it by hand).
* **Dependency oddities after experimenting** — delete `node_modules` and
  `package-lock.json`, then `npm install`. Versions in `package.json` are
  pinned to Expo SDK 54-compatible releases (note `react-native-screens`
  is intentionally `~4.16.0`; newer majors require RN ≥ 0.82).
* **Emulator testing** — possible but awkward: use the emulator's extended
  controls → Location → routes to simulate movement. Geofence/foreground-
  service behaviour is only truly representative on a physical device.

## Behaviour notes (not bugs)

* **One-time alarms switch themselves off after ringing** — by design; the
  trip is over. Enable **Repeat** for commute alarms that should re-arm
  after you leave the area.
* **A repeat alarm won't re-ring immediately** — also by design, twice
  over: within a ride it re-arms only after you've moved ~1.25× the wake
  distance away (hysteresis), and once dismissed it's done for the whole
  day, re-arming after midnight.
* **You were already at the destination when the window opened and nothing
  rang** — by design: the alarm fires on a genuine *arrival* during the
  window, not on the clock. If you're already there, there's nothing to
  wake you for.
* **The persistent notification says "Standing by"** — that's the cheap
  idle heartbeat used while an alarm is armed but its active window hasn't
  opened (or it's done for today). It promotes itself to precise watching
  when the window opens.
* **An untouched ringing alarm stops after ~5 minutes of re-rings, and a
  ring older than 15 minutes is auto-dismissed on next app start** — caps to
  avoid a runaway alarm draining the battery for hours.
* **Distance on the Home screen only updates while the app is open without
  full permissions** — that's degraded mode; the reliability banner explains
  how to restore background watching.
