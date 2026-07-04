import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import type { LocationSubscription } from 'expo-location';
import { Screen } from '../components/ui';
import { RingMark } from '../components/RingMark';
import { AlarmCard } from '../components/AlarmCard';
import { useAlarms } from '../storage/stores';
import { colors, radii, spacing, type } from '../theme';
import { distanceMeters } from '../lib/geo';
import { handleLocationFixes } from '../services/engine';
import { getPermissionSnapshot, type PermissionSnapshot } from '../services/permissions';
import type { ScreenProps } from '../navigation';

export function HomeScreen({ navigation }: ScreenProps<'Home'>) {
  const { alarms, toggle, remove } = useAlarms();
  const [fix, setFix] = useState<Location.LocationObject | null>(null);
  const [perms, setPerms] = useState<PermissionSnapshot | null>(null);
  const watcher = useRef<LocationSubscription | null>(null);
  const insets = useSafeAreaInsets();

  const activeCount = useMemo(() => alarms.filter((a) => a.enabled).length, [alarms]);

  // While the screen is visible, keep a light foreground watcher running.
  // It feeds live distances into the list and doubles as a trigger path
  // when background permission is missing (degraded mode).
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void (async () => {
        const snap = await getPermissionSnapshot();
        if (cancelled) return;
        setPerms(snap);
        if (!snap.foreground) return;
        const last = await Location.getLastKnownPositionAsync().catch(() => null);
        if (last && !cancelled) setFix(last);
        watcher.current = await Location.watchPositionAsync(
          { accuracy: Location.LocationAccuracy.Balanced, timeInterval: 10_000, distanceInterval: 50 },
          (loc) => {
            setFix(loc);
            void handleLocationFixes([loc]);
          },
        );
      })();
      return () => {
        cancelled = true;
        watcher.current?.remove();
        watcher.current = null;
      };
    }, []),
  );

  // Jump to the ringing screen the moment any alarm fires.
  const ringingAlarmId = useAlarms((s) => s.ringingAlarmId);
  useEffect(() => {
    if (ringingAlarmId) navigation.navigate('Ringing');
  }, [ringingAlarmId, navigation]);

  const statusLine =
    activeCount === 0
      ? 'No alarms armed'
      : activeCount === 1
        ? 'Watching 1 destination'
        : `Watching ${activeCount} destinations`;

  return (
    <Screen>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={type.display}>WakeyStop</Text>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: activeCount > 0 ? colors.amber : colors.line }]} />
            <Text style={styles.status}>{statusLine}</Text>
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Settings"
          onPress={() => navigation.navigate('Settings')}
          android_ripple={{ color: 'rgba(255,255,255,0.08)', borderless: true }}
          style={({ pressed }) => [styles.iconButton, pressed && { opacity: 0.7 }]}
        >
          <Text style={styles.iconButtonText}>⚙</Text>
        </Pressable>
      </View>

      {perms && !perms.reliable && alarms.length > 0 && (
        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.navigate('Settings')}
          style={({ pressed }) => [styles.banner, pressed && { opacity: 0.85 }]}
        >
          <Text style={styles.bannerTitle}>Alarms may not ring in the background</Text>
          <Text style={styles.bannerBody}>
            {!perms.background
              ? 'Location access is not set to "Allow all the time". Tap to fix in Settings.'
              : 'Notifications are off. Tap to fix in Settings.'}
          </Text>
        </Pressable>
      )}

      <FlatList
        data={alarms}
        keyExtractor={(a) => a.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <AlarmCard
            alarm={item}
            distance={fix ? distanceMeters(fix.coords, item.destination) : undefined}
            onPress={() => navigation.navigate('EditAlarm', { alarmId: item.id })}
            onToggle={(enabled) => void toggle(item.id, enabled)}
            onDelete={() => void remove(item.id)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <RingMark size={140} />
            <Text style={[type.title, styles.emptyTitle]}>Sleep. We'll watch the road.</Text>
            <Text style={styles.emptyBody}>
              Pick a destination and a wake distance. WakeyStop rings when you get close —
              no matter how late the bus runs.
            </Text>
          </View>
        }
      />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="New alarm"
        onPress={() => navigation.navigate('EditAlarm', {})}
        android_ripple={{ color: 'rgba(26,18,6,0.14)' }}
        style={({ pressed }) => [
          styles.fab,
          { bottom: insets.bottom + spacing.xl },
          pressed && { backgroundColor: colors.amberPressed, transform: [{ scale: 0.97 }] },
        ]}
      >
        <Text style={styles.fabPlus}>+</Text>
        <Text style={styles.fabText}>New alarm</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xs },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  status: { ...type.label },
  iconButton: {
    width: 44,
    height: 44,
    overflow: 'hidden',
    borderRadius: 22,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonText: { fontSize: 20, color: colors.textDim },
  banner: {
    marginHorizontal: spacing.xl,
    marginBottom: spacing.md,
    backgroundColor: colors.amberSoft,
    borderColor: colors.amberLine,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.lg,
  },
  bannerTitle: { color: colors.amber, fontWeight: '700', fontSize: 14 },
  bannerBody: { color: colors.textDim, fontSize: 13, marginTop: 2, lineHeight: 18 },
  listContent: { paddingHorizontal: spacing.xl, paddingBottom: 120, flexGrow: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl, gap: spacing.md, paddingBottom: spacing.xxl },
  emptyTitle: { textAlign: 'center', marginTop: spacing.sm },
  emptyBody: { ...type.bodyDim, textAlign: 'center', lineHeight: 22 },
  fab: {
    position: 'absolute',
    overflow: 'hidden',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.amber,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.xl,
    height: 56,
    elevation: 6,
  },
  fabPlus: { color: colors.onAmber, fontSize: 24, fontWeight: '600', lineHeight: 28 },
  fabText: { color: colors.onAmber, fontSize: 16, fontWeight: '800' },
});
