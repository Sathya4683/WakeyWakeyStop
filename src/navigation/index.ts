import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export type RootStackParamList = {
  Onboarding: undefined;
  Home: undefined;
  EditAlarm: { alarmId?: string };
  Ringing: undefined;
  Settings: undefined;
};

export type ScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<
  RootStackParamList,
  T
>;

/**
 * Basemap style. OpenFreeMap is free for any use, has no usage limits and
 * needs no API key. The `dark` style matches the app's night-transit theme;
 * swap to `liberty`, `bright` or `positron` on the same host for a light
 * look — see README for alternatives.
 */
export const MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/dark';
