# WakeyWakeyStop

**Alarms that ring by place, not time.** WakeyWakeyStop wakes you as you *approach* your destination — built for naps on buses, trains and long rides where arrival time is anyone's guess. Pick a spot on the map, choose a wake distance, arm the alarm and close your eyes.

This is a full React Native / Expo SDK 54 rewrite of the earlier prototype (the previous commits on this repo). The new app is Android-first, uses MapLibre + OpenFreeMap tiles, Nominatim for search, and runs entirely on-device — no accounts, no API keys, no backend. Map tiles and geocoding are keyless; everything else (your trips, alarms, places) stays on your phone.

For setup, usage, project layout and design rationale see [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) and [`docs/TROUBLESHOOTING.md`](docs/TROUBLESHOOTING.md).