import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  AppState,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Button, Card, Screen } from '../components/ui';
import { RingMark } from '../components/RingMark';
import { colors, radii, spacing, type } from '../theme';
import type { ScreenProps } from '../navigation';
import { useSettings } from '../storage/stores';
import {
  getPermissionSnapshot,
  requestBackgroundLocation,
  requestForegroundLocation,
  requestNotifications,
  type PermissionSnapshot,
} from '../services/permissions';

const PAGE_COUNT = 3;

/**
 * First-launch experience. Three pages:
 *   1. What WakeyStop is (value proposition)
 *   2. How it works (pick a place → wake distance → sleep)
 *   3. Reliability setup — the contextual permission walk-through
 *
 * The whole thing is skippable; the Home screen's reliability banner and
 * Settings checklist pick up anything left unfinished. Re-openable from
 * Settings ("Replay the intro").
 */
export function OnboardingScreen({ navigation }: ScreenProps<'Onboarding'>) {
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const [page, setPage] = useState(0);
  const [perms, setPerms] = useState<PermissionSnapshot | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const updateSettings = useSettings((s) => s.update);
  const alreadyDone = useSettings((s) => s.settings.onboardingDone);

  const refreshPerms = useCallback(() => {
    void getPermissionSnapshot().then(setPerms);
  }, []);

  useEffect(() => {
    refreshPerms();
    // Background-location grant happens on a system settings page on
    // Android 11+, so re-check whenever the user returns to the app.
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') refreshPerms();
    });
    return () => sub.remove();
  }, [refreshPerms]);

  const goTo = (next: number) => {
    scrollRef.current?.scrollTo({ x: next * width, animated: true });
    setPage(next);
  };

  const finish = useCallback(
    async (skipped: boolean) => {
      const done = async () => {
        await updateSettings({ onboardingDone: true });
        if (alreadyDone) navigation.goBack();
        else navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
      };
      if (skipped && perms && !perms.reliable) {
        Alert.alert(
          'Finish setup later?',
          'Without these permissions, alarms only work while WakeyStop is open on screen. You can complete setup any time from Settings.',
          [
            { text: 'Go back', style: 'cancel' },
            { text: 'Skip for now', style: 'destructive', onPress: () => void done() },
          ],
        );
      } else {
        await done();
      }
    },
    [alreadyDone, navigation, perms, updateSettings],
  );

  const grant = async (
    key: string,
    request: () => Promise<boolean>,
    deniedMessage: string,
  ) => {
    setBusy(key);
    try {
      const ok = await request();
      if (!ok) Alert.alert('Permission not granted', deniedMessage);
    } finally {
      setBusy(null);
      refreshPerms();
    }
  };

  const fgGranted = perms?.foreground ?? false;
  const bgGranted = perms?.background ?? false;
  const notifGranted = perms?.notifications ?? false;

  return (
    <Screen edges={['top', 'bottom']}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) =>
          setPage(Math.round(e.nativeEvent.contentOffset.x / width))
        }
      >
        {/* ------------------------------------------------ page 1: hello */}
        <ScrollView
          style={{ width }}
          contentContainerStyle={styles.page}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <RingMark size={180} pulse />
          </View>
          <Text style={[type.display, styles.center]}>Sleep through the ride,{'\n'}not your stop.</Text>
          <Text style={[type.bodyDim, styles.center, styles.lede]}>
            WakeyStop is an alarm that rings by <Text style={styles.em}>place</Text>, not time.
            Pick where you're headed, close your eyes, and it wakes you as you
            approach — even when the bus is late.
          </Text>
        </ScrollView>

        {/* ------------------------------------------- page 2: how it works */}
        <ScrollView
          style={{ width }}
          contentContainerStyle={styles.page}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[type.eyebrow, styles.center]}>How it works</Text>
          <Text style={[type.title, styles.center, { marginTop: spacing.sm }]}>
            Three steps, then rest
          </Text>
          <View style={{ marginTop: spacing.xl, gap: spacing.md }}>
            <Step n="1" title="Drop a pin on your stop" body="Search for it or tap the map — stations, street corners, anywhere." />
            <Step n="2" title="Choose a wake distance" body="From 200 m for a city tram to 10 km for a highway exit — enough time to gather your things." />
            <Step n="3" title="Arm it and doze off" body="Screen off, phone in your pocket. WakeyStop watches the distance quietly and rings loudly when you arrive." />
          </View>
          <Card style={{ marginTop: spacing.xl }}>
            <Text style={type.bodyDim}>
              <Text style={styles.em}>Private by design.</Text> Your journey never leaves
              your phone — there's no account, no server, no tracking.
            </Text>
          </Card>
        </ScrollView>

        {/* ---------------------------------------- page 3: reliability setup */}
        <ScrollView
          style={{ width }}
          contentContainerStyle={styles.page}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[type.eyebrow, styles.center]}>Reliability setup</Text>
          <Text style={[type.title, styles.center, { marginTop: spacing.sm }]}>
            So it works while you sleep
          </Text>
          <Text style={[type.bodyDim, styles.center, { marginTop: spacing.sm }]}>
            Android needs your explicit OK for each of these. Grant them in
            order — about 20 seconds total.
          </Text>

          <View style={{ marginTop: spacing.xl, gap: spacing.md }}>
            <PermissionItem
              done={fgGranted}
              busy={busy === 'fg'}
              title="Location while using the app"
              body="Lets WakeyStop measure how far you are from your stop."
              cta="Allow location"
              onPress={() =>
                grant('fg', requestForegroundLocation, 'WakeyStop cannot measure distance to your stop without location access. You can grant it later from Settings.')
              }
            />
            <PermissionItem
              done={bgGranted}
              busy={busy === 'bg'}
              disabled={!fgGranted}
              title={'Background location — "Allow all the time"'}
              body={'The crucial one: it keeps watch with the screen off. Android opens a settings page — choose "Allow all the time".'}
              cta="Allow in background"
              onPress={() =>
                grant('bg', requestBackgroundLocation, 'Pick "Allow all the time" on the settings page so alarms work with the screen off. You can finish this later from Settings.')
              }
            />
            <PermissionItem
              done={notifGranted}
              busy={busy === 'notif'}
              title="Notifications"
              body="The alarm itself is a full-volume notification that breaks through the lock screen."
              cta="Allow notifications"
              onPress={() =>
                grant('notif', requestNotifications, 'Without notifications the alarm cannot ring from the background. You can enable them later from Settings.')
              }
            />
          </View>

          {perms?.reliable ? (
            <Card style={[styles.readyCard, { marginTop: spacing.xl }]}>
              <Text style={[type.body, { color: colors.success }]}>
                You're all set — alarms will ring even when you're asleep.
              </Text>
            </Card>
          ) : null}
        </ScrollView>
      </ScrollView>

      {/* ------------------------------------------------------ footer nav */}
      <View style={styles.footer}>
        <View style={styles.dots}>
          {Array.from({ length: PAGE_COUNT }).map((_, i) => (
            <View key={i} style={[styles.dot, i === page && styles.dotActive]} />
          ))}
        </View>
        {page < PAGE_COUNT - 1 ? (
          <View style={styles.footerRow}>
            <Button title="Skip" variant="ghost" onPress={() => void finish(true)} />
            <Button title="Next" onPress={() => goTo(page + 1)} style={styles.footerBtn} />
          </View>
        ) : (
          <View style={styles.footerRow}>
            {!perms?.reliable ? (
              <Button title="Later" variant="ghost" onPress={() => void finish(true)} />
            ) : (
              <View />
            )}
            <Button
              title={perms?.reliable ? 'Start using WakeyStop' : 'Continue anyway'}
              variant={perms?.reliable ? 'primary' : 'secondary'}
              onPress={() => void finish(!perms?.reliable)}
              style={styles.footerBtn}
            />
          </View>
        )}
      </View>
    </Screen>
  );
}

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <View style={styles.step}>
      <View style={styles.stepBadge}>
        <Text style={styles.stepBadgeText}>{n}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={type.heading}>{title}</Text>
        <Text style={[type.bodyDim, { marginTop: 2 }]}>{body}</Text>
      </View>
    </View>
  );
}

function PermissionItem({
  done,
  busy,
  disabled,
  title,
  body,
  cta,
  onPress,
}: {
  done: boolean;
  busy: boolean;
  disabled?: boolean;
  title: string;
  body: string;
  cta: string;
  onPress: () => void;
}) {
  return (
    <Card style={[styles.permCard, done && styles.permCardDone]}>
      <View style={styles.permHead}>
        <View style={[styles.permTick, done && styles.permTickDone]}>
          <Text style={[styles.permTickText, done && { color: colors.onAmber }]}>
            {done ? '✓' : ''}
          </Text>
        </View>
        <Text style={[type.heading, { flex: 1 }]}>{title}</Text>
      </View>
      <Text style={[type.bodyDim, { marginTop: spacing.xs }]}>{body}</Text>
      {!done ? (
        <Button
          title={cta}
          variant="secondary"
          disabled={disabled}
          loading={busy}
          onPress={onPress}
          style={{ marginTop: spacing.md }}
          accessibilityHint={disabled ? 'Grant location while using the app first' : undefined}
        />
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  page: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xl,
  },
  hero: { alignItems: 'center', marginBottom: spacing.xxl },
  center: { textAlign: 'center' },
  lede: { marginTop: spacing.lg },
  em: { color: colors.amber, fontWeight: '700' },

  step: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: radii.pill,
    backgroundColor: colors.amberSoft,
    borderWidth: 1,
    borderColor: colors.amberLine,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  stepBadgeText: { color: colors.amber, fontWeight: '800', fontSize: 13 },

  permCard: { borderWidth: 1, borderColor: colors.line },
  permCardDone: { borderColor: colors.success, backgroundColor: colors.successSoft },
  permHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  permTick: {
    width: 22,
    height: 22,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permTickDone: { backgroundColor: colors.success, borderColor: colors.success },
  permTickText: { fontSize: 13, fontWeight: '800', color: 'transparent' },
  readyCard: { borderWidth: 1, borderColor: colors.success, backgroundColor: colors.successSoft },

  footer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm },
  dot: {
    width: 8,
    height: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.line,
  },
  dotActive: { backgroundColor: colors.amber, width: 20 },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footerBtn: { minWidth: 160 },
});
