import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  DarkTheme,
  NavigationContainer,
  createNavigationContainerRef,
  type Theme,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import type { RootStackParamList } from './src/navigation';
import { colors } from './src/theme';
import { useAlarms, useRecentPlaces, useSettings } from './src/storage/stores';
import { bootstrap } from './src/services/engine';
import { HomeScreen } from './src/screens/HomeScreen';
import { EditAlarmScreen } from './src/screens/EditAlarmScreen';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { RingingScreen } from './src/screens/RingingScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

const Stack = createNativeStackNavigator<RootStackParamList>();
export const navigationRef = createNavigationContainerRef<RootStackParamList>();

const theme: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colors.amber,
    background: colors.bg,
    card: colors.bg,
    text: colors.text,
    border: colors.line,
    notification: colors.amber,
  },
};

function goToRinging(): void {
  if (!navigationRef.isReady()) return;
  const current = navigationRef.getCurrentRoute()?.name;
  if (current !== 'Ringing') navigationRef.navigate('Ringing');
}

export default function App() {
  const [ready, setReady] = useState(false);
  const bootstrapped = useRef(false);

  const hydrateAlarms = useAlarms((s) => s.hydrate);
  const hydrateSettings = useSettings((s) => s.hydrate);
  const hydratePlaces = useRecentPlaces((s) => s.hydrate);
  const settingsHydrated = useSettings((s) => s.hydrated);
  const onboardingDone = useSettings((s) => s.settings.onboardingDone);

  // ----------------------------------------------------------- start-up
  useEffect(() => {
    let cancelled = false;
    (async () => {
      await Promise.all([hydrateAlarms(), hydrateSettings(), hydratePlaces()]);
      // bootstrap() re-registers watchers (Android drops geofences on
      // reboot), repairs an interrupted ring and prepares channels.
      await bootstrap().catch((e) => console.warn('[app] bootstrap failed', e));
      bootstrapped.current = true;
      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [hydrateAlarms, hydrateSettings, hydratePlaces]);

  // Re-run recovery whenever the app returns to the foreground: the user
  // may have changed permissions, rebooted, or the OS may have culled us.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active' && bootstrapped.current) {
        void bootstrap().catch((e) => console.warn('[app] bootstrap failed', e));
      }
    });
    return () => sub.remove();
  }, []);

  // ------------------------------------------- notification interaction
  useEffect(() => {
    // Tapping the body of the ringing notification (not an action button)
    // should open the full-screen ringing experience.
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      if (
        response.actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER &&
        response.notification.request.identifier.startsWith('ring-')
      ) {
        goToRinging();
      }
    });

    // Cold-start case: the app was launched *by* that tap.
    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (
        response &&
        response.actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER &&
        response.notification.request.identifier.startsWith('ring-')
      ) {
        goToRinging();
      }
    });

    return () => sub.remove();
  }, []);

  // If an alarm starts ringing while any screen is open, surface it.
  const ringingAlarmId = useAlarms((s) => s.ringingAlarmId);
  useEffect(() => {
    if (ready && ringingAlarmId) goToRinging();
  }, [ready, ringingAlarmId]);

  const onNavReady = useCallback(() => {
    void SplashScreen.hideAsync().catch(() => undefined);
  }, []);

  if (!ready || !settingsHydrated) {
    // Splash stays up while we hydrate (sub-100 ms in practice).
    return <View style={styles.boot} />;
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" backgroundColor={colors.bg} />
      <NavigationContainer ref={navigationRef} theme={theme} onReady={onNavReady}>
        <Stack.Navigator
          initialRouteName={onboardingDone ? 'Home' : 'Onboarding'}
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.bg },
            animation: 'slide_from_right',
            animationDuration: 260,
          }}
        >
          <Stack.Screen name="Onboarding" component={OnboardingScreen} options={{ animation: 'fade' }} />
          <Stack.Screen name="Home" component={HomeScreen} options={{ animation: 'fade' }} />
          <Stack.Screen
            name="EditAlarm"
            component={EditAlarmScreen}
            options={{ animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="Ringing"
            component={RingingScreen}
            options={{ animation: 'fade', gestureEnabled: false }}
          />
          <Stack.Screen
            name="Settings"
            component={SettingsScreen}
            options={{
              headerShown: true,
              title: 'Settings',
              headerStyle: { backgroundColor: colors.bg },
              headerTintColor: colors.text,
              headerTitleStyle: { fontWeight: '700' },
              headerShadowVisible: false,
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  boot: { flex: 1, backgroundColor: colors.bg },
});
