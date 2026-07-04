import { registerRootComponent } from 'expo';

/**
 * Background tasks must be defined at module scope *before* the app
 * registers, so expo-task-manager can execute them in a headless JS
 * context when the UI process is dead (geofence transitions, foreground-
 * service location batches, notification action buttons).
 */
import './src/background/tasks';

import App from './App';

registerRootComponent(App);
