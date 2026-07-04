/**
 * Background task registry.
 *
 * This module MUST be imported from the app entry point (index.ts) before
 * the React tree mounts: expo-task-manager requires tasks to be defined in
 * the global scope so they can run in a headless JS context while the app
 * UI is dead.
 */
import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';
import type { LocationObject, LocationRegion, GeofencingEventType } from 'expo-location';
import {
  GEOFENCE_TASK,
  LOCATION_TASK,
  handleGeofenceEvent,
  handleLocationFixes,
  dismissRinging,
} from '../services/engine';
import {
  prepareNotifications,
  ACTION_DISMISS,
  ACTION_SNOOZE,
} from '../services/notifications';

void prepareNotifications();

TaskManager.defineTask(LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.warn('[task:location]', error.message);
    return;
  }
  const { locations } = (data ?? {}) as { locations?: LocationObject[] };
  if (locations?.length) {
    await handleLocationFixes(locations).catch((e) =>
      console.warn('[task:location] handler failed', e),
    );
  }
});

TaskManager.defineTask(GEOFENCE_TASK, async ({ data, error }) => {
  if (error) {
    console.warn('[task:geofence]', error.message);
    return;
  }
  const { eventType, region } = (data ?? {}) as {
    eventType?: GeofencingEventType;
    region?: LocationRegion;
  };
  if (eventType != null && region) {
    await handleGeofenceEvent(eventType, region).catch((e) =>
      console.warn('[task:geofence] handler failed', e),
    );
  }
});

/**
 * Notification action buttons ("Dismiss" / "Remind me in 5 min") are handled
 * here at module scope so they work even when no screen is mounted — the
 * foreground service keeps this JS context alive during a watched journey.
 * Plain taps (DEFAULT_ACTION_IDENTIFIER) are left for the UI layer, which
 * navigates to the ringing screen.
 */
Notifications.addNotificationResponseReceivedListener((response) => {
  const action = response.actionIdentifier;
  if (action === ACTION_DISMISS) {
    void dismissRinging();
  } else if (action === ACTION_SNOOZE) {
    void dismissRinging({ snoozeMinutes: 5 });
  }
});
