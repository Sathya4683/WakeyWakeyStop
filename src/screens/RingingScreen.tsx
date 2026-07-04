import React, { useEffect, useMemo, useState } from 'react';
import { BackHandler, StyleSheet, Text, View } from 'react-native';
import { useKeepAwake } from 'expo-keep-awake';
import { Button, Screen } from '../components/ui';
import { RingMark } from '../components/RingMark';
import { colors, spacing, type } from '../theme';
import type { ScreenProps } from '../navigation';
import { useAlarms } from '../storage/stores';
import { dismissRinging } from '../services/engine';
import { describePlace } from '../lib/geo';

const SNOOZE_MINUTES = 5;

/**
 * The wake moment. Shown when an alarm fires while the app is open, or when
 * the user taps the ringing notification. Keeps the screen awake, pulses the
 * approach ring and offers two huge targets — Dismiss and Snooze — sized for
 * someone who was asleep ten seconds ago.
 */
export function RingingScreen({ navigation }: ScreenProps<'Ringing'>) {
  useKeepAwake();

  const ringingAlarmId = useAlarms((s) => s.ringingAlarmId);
  const alarms = useAlarms((s) => s.alarms);
  const [acting, setActing] = useState<'dismiss' | 'snooze' | null>(null);

  // Capture the alarm once — it may disable itself (one-time alarms) while
  // this screen is still up, and we don't want the labels to vanish.
  const alarm = useMemo(
    () => alarms.find((a) => a.id === ringingAlarmId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ringingAlarmId],
  );

  // Leave automatically if the ring was resolved elsewhere (notification
  // action, snooze elapsed handling, another device state repair…).
  useEffect(() => {
    if (!ringingAlarmId && !acting) {
      navigation.canGoBack()
        ? navigation.goBack()
        : navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
    }
  }, [ringingAlarmId, acting, navigation]);

  // The hardware back button should not silently leave a ringing alarm.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, []);

  const leave = () => {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
  };

  const onDismiss = async () => {
    setActing('dismiss');
    await dismissRinging();
    leave();
  };

  const onSnooze = async () => {
    setActing('snooze');
    await dismissRinging({ snoozeMinutes: SNOOZE_MINUTES });
    leave();
  };

  return (
    <Screen edges={['top', 'bottom']} style={styles.screen}>
      <View style={styles.top}>
        <Text style={[styles.arrivedLabel, styles.center]}>You've arrived</Text>
        <Text style={[styles.alarmName, styles.center]}>
          {alarm?.label ?? 'Wake up!'}
        </Text>
        {alarm ? (
          <Text style={[type.bodyDim, styles.center, styles.location]}>
            {describePlace(alarm.destination)}
          </Text>
        ) : null}
      </View>

      <View style={styles.ringWrap}>
        <RingMark size={240} pulse />
      </View>

      <View style={styles.actions}>
        <Button
          title="Dismiss alarm"
          onPress={() => void onDismiss()}
          loading={acting === 'dismiss'}
          disabled={acting !== null}
          style={styles.dismiss}
        />
        <Button
          title={`Snooze · ${SNOOZE_MINUTES} min`}
          variant="ghost"
          onPress={() => void onSnooze()}
          loading={acting === 'snooze'}
          disabled={acting !== null}
          accessibilityHint="Stops the alarm and reminds you again in five minutes"
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.bg },
  top: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl + spacing.md,
    gap: spacing.xs,
  },
  center: { textAlign: 'center' },
  arrivedLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.amber,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  alarmName: {
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -0.5,
    color: colors.text,
    lineHeight: 44,
    marginTop: spacing.xs,
  },
  location: {
    marginTop: spacing.xs,
  },
  ringWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  actions: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
  },
  dismiss: { minHeight: 60 },
});
