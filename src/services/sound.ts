import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { Vibration } from 'react-native';
import { VIBRATION_PATTERN } from './notifications';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const ALARM_SOURCE = require('../../assets/sounds/alarm.wav');

let player: AudioPlayer | null = null;

/**
 * Starts the looping in-app alarm sound and vibration. This runs whenever
 * the JS runtime is alive (the foreground location service keeps it alive
 * during an armed journey). The notification channel sound is the fallback
 * if the runtime is not available.
 */
export async function startRinging(opts: { sound: boolean; vibrate: boolean }): Promise<void> {
  if (opts.vibrate) {
    Vibration.vibrate(VIBRATION_PATTERN, true);
  }
  if (!opts.sound) return;
  try {
    await setAudioModeAsync({
      shouldPlayInBackground: true,
      playsInSilentMode: true,
      interruptionMode: 'doNotMix',
      interruptionModeAndroid: 'doNotMix',
      shouldRouteThroughEarpiece: false,
      allowsRecording: false,
    });
    stopSound();
    player = createAudioPlayer(ALARM_SOURCE);
    player.loop = true;
    player.volume = 1;
    player.play();
  } catch {
    // Notification channel sound still rings; never let audio failures
    // break the trigger path.
  }
}

function stopSound(): void {
  try {
    player?.pause();
    player?.remove();
  } catch {
    // already released
  }
  player = null;
}

export function stopRinging(): void {
  Vibration.cancel();
  stopSound();
}
