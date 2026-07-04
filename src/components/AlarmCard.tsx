import React, { useRef } from 'react';
import {
  Animated,
  PanResponder,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import type { Alarm } from '../types';
import { colors, radii, spacing, type } from '../theme';
import { describePlace, formatDistance } from '../lib/geo';
import { formatWindow, isWindowActive, todayKey } from '../lib/time';

const DELETE_WIDTH = 80;
const SNAP_THRESHOLD = DELETE_WIDTH / 2;

export function AlarmCard({
  alarm,
  distance,
  onPress,
  onToggle,
  onDelete,
}: {
  alarm: Alarm;
  /** Live metres to destination, when the app has a recent fix. */
  distance?: number;
  onPress: () => void;
  onToggle: (enabled: boolean) => void;
  /** When provided, the card becomes swipe-to-delete capable. */
  onDelete?: () => void;
}) {
  const subtitle = describePlace(alarm.destination);
  const within = distance != null && distance <= alarm.radiusMeters;
  const doneToday = alarm.repeat && alarm.lastCompletedDay === todayKey();
  const windowOpen = isWindowActive(alarm.windowStart, alarm.windowEnd);

  let status: { text: string; color: string } | null = null;
  if (alarm.enabled) {
    if (doneToday) status = { text: 'done for today', color: colors.success };
    else if (!windowOpen) status = { text: 'waiting for window', color: colors.textFaint };
    else if (distance != null)
      status = within
        ? { text: 'inside wake zone', color: colors.amber }
        : { text: `${formatDistance(distance)} away`, color: colors.teal };
  }

  const accentColor = alarm.enabled
    ? doneToday
      ? colors.success
      : colors.amber
    : 'transparent';

  // ── Swipe-to-delete ──────────────────────────────────────────────────────
  const swipeX = useRef(new Animated.Value(0)).current;
  const isOpen = useRef(false);

  const settle = (open: boolean) => {
    isOpen.current = open;
    Animated.spring(swipeX, {
      toValue: open ? -DELETE_WIDTH : 0,
      useNativeDriver: true,
      bounciness: 4,
      speed: 18,
    }).start();
  };

  const pan = useRef(
    PanResponder.create({
      // Only claim clearly horizontal gestures; leaves taps and vertical
      // scrolls to their natural handlers.
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, g) =>
        onDelete != null &&
        Math.abs(g.dx) > 8 &&
        Math.abs(g.dx) > Math.abs(g.dy) * 2,
      onPanResponderMove: (_, g) => {
        const base = isOpen.current ? -DELETE_WIDTH : 0;
        swipeX.setValue(Math.min(0, Math.max(base + g.dx, -DELETE_WIDTH)));
      },
      onPanResponderRelease: (_, g) => {
        const base = isOpen.current ? -DELETE_WIDTH : 0;
        const landed = base + g.dx;
        // Fast fling always decides; slow drags use midpoint threshold.
        const open = g.vx < -0.5 || (Math.abs(g.vx) <= 0.5 && landed < -SNAP_THRESHOLD);
        settle(open);
      },
      onPanResponderTerminate: () => settle(false),
    }),
  ).current;

  const deleteOpacity = swipeX.interpolate({
    inputRange: [-DELETE_WIDTH, -DELETE_WIDTH / 3, 0],
    outputRange: [1, 0.6, 0],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.swipeOuter}>
      {/* Red delete zone sits behind the card and is revealed on left-swipe */}
      {onDelete && (
        <Animated.View style={[styles.deleteZone, { opacity: deleteOpacity }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Delete alarm"
            onPress={() => { settle(false); onDelete(); }}
            android_ripple={{ color: 'rgba(255,255,255,0.14)' }}
            style={styles.deleteBtn}
          >
            <Text style={styles.deleteBtnIcon}>✕</Text>
            <Text style={styles.deleteBtnText}>Delete</Text>
          </Pressable>
        </Animated.View>
      )}

      {/* Swipeable card surface */}
      <Animated.View
        {...pan.panHandlers}
        style={{ transform: [{ translateX: swipeX }] }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Alarm ${alarm.label}, ${alarm.enabled ? 'on' : 'off'}`}
          accessibilityHint={isOpen.current ? 'Closes delete option' : 'Opens the alarm editor'}
          onPress={() => {
            if (isOpen.current) { settle(false); return; }
            onPress();
          }}
          android_ripple={{ color: 'rgba(255,255,255,0.06)' }}
          style={({ pressed }) => [
            styles.card,
            !alarm.enabled && styles.cardOff,
            pressed && { opacity: 0.82 },
          ]}
        >
          <View style={[styles.accentStripe, { backgroundColor: accentColor }]} />

          <View style={styles.body}>
            <Text
              style={[type.heading, !alarm.enabled && styles.labelOff]}
              numberOfLines={1}
            >
              {alarm.label}
            </Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
            <View style={styles.metaRow}>
              <Text style={styles.meta}>{formatWindow(alarm.windowStart, alarm.windowEnd)}</Text>
              <Text style={styles.metaDivider}>·</Text>
              <Text style={styles.meta}>wake at {formatDistance(alarm.radiusMeters)}</Text>
              {alarm.repeat && (
                <>
                  <Text style={styles.metaDivider}>·</Text>
                  <Text style={styles.meta}>daily</Text>
                </>
              )}
              {status && (
                <>
                  <Text style={styles.metaDivider}>·</Text>
                  <Text style={[styles.meta, { color: status.color }]}>{status.text}</Text>
                </>
              )}
            </View>
          </View>

          <Switch
            value={alarm.enabled}
            onValueChange={onToggle}
            trackColor={{ false: colors.line, true: colors.amberLine }}
            thumbColor={alarm.enabled ? colors.amber : colors.textFaint}
            accessibilityLabel={`Turn alarm ${alarm.enabled ? 'off' : 'on'}`}
          />
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  swipeOuter: {
    borderRadius: radii.lg,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  deleteZone: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'stretch',
    backgroundColor: colors.danger,
  },
  deleteBtn: {
    width: DELETE_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    overflow: 'hidden',
  },
  deleteBtnIcon: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 20,
  },
  deleteBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 0.4,
  },
  card: {
    flexDirection: 'row',
    overflow: 'hidden',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    paddingVertical: spacing.lg,
    paddingLeft: spacing.xl,
    paddingRight: spacing.md,
  },
  cardOff: { opacity: 0.5 },
  accentStripe: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
  },
  labelOff: { color: colors.textDim },
  body: { flex: 1, gap: 3 },
  subtitle: { ...type.bodyDim, fontSize: 13, lineHeight: 18 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 4, marginTop: 1 },
  meta: { fontSize: 12, fontWeight: '600', color: colors.textFaint },
  metaDivider: { fontSize: 10, color: colors.line, marginHorizontal: 1 },
});
