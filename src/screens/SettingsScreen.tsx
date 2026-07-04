import React, { useCallback, useEffect, useState } from 'react';
import {
  AppState,
  Linking,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import Constants from 'expo-constants';
import { Button, Card, Chip, Row, Screen, SectionLabel } from '../components/ui';
import { colors, radii, spacing, type } from '../theme';
import type { ScreenProps } from '../navigation';
import { useSettings } from '../storage/stores';
import { RADIUS_PRESETS } from '../types';
import { formatDistance } from '../lib/geo';
import {
  getPermissionSnapshot,
  openAppSettings,
  openBatteryOptimizationSettings,
  requestBackgroundLocation,
  requestForegroundLocation,
  requestNotifications,
  type PermissionSnapshot,
} from '../services/permissions';

const DONT_KILL_URL = 'https://dontkillmyapp.com';

/**
 * Settings = the app's "trust centre": a live reliability checklist first
 * (this is what saves a missed stop), then alarm defaults, privacy facts and
 * about info.
 */
export function SettingsScreen({ navigation }: ScreenProps<'Settings'>) {
  const settings = useSettings((s) => s.settings);
  const update = useSettings((s) => s.update);
  const [perms, setPerms] = useState<PermissionSnapshot | null>(null);

  const refresh = useCallback(() => {
    void getPermissionSnapshot().then(setPerms);
  }, []);

  useEffect(() => {
    refresh();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  const grant = async (request: () => Promise<boolean>) => {
    const ok = await request();
    // Permanently denied → the OS no longer shows a dialog; send the user
    // to the app's settings page instead.
    if (!ok) openAppSettings();
    refresh();
  };

  return (
    <Screen edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* ------------------------------------------------- reliability */}
        <SectionLabel>Reliability checklist</SectionLabel>
        <Card>
          <CheckRow
            ok={perms?.foreground ?? false}
            title="Location access"
            detail="Needed to measure distance to your stop."
            actionTitle="Allow"
            onAction={() => void grant(requestForegroundLocation)}
          />
          <Divider />
          <CheckRow
            ok={perms?.background ?? false}
            title={'Background location: "Allow all the time"'}
            detail="Keeps watch with the screen off — the setting that matters most."
            actionTitle="Allow"
            onAction={() => void grant(requestBackgroundLocation)}
          />
          <Divider />
          <CheckRow
            ok={perms?.notifications ?? false}
            title="Notifications"
            detail="The alarm rings as a full-volume notification."
            actionTitle="Allow"
            onAction={() => void grant(requestNotifications)}
          />
          <Divider />
          <View style={styles.checkRow}>
            <View style={styles.checkBadgeNeutral}>
              <Text style={styles.checkBadgeNeutralText}>!</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={type.heading}>Battery optimisation</Text>
              <Text style={[type.bodyDim, { marginTop: 2 }]}>
                Some phones pause apps to save power. Exempt WakeyStop so
                long journeys aren't interrupted — find it in the list and
                choose "Don't optimise" or "Unrestricted".
              </Text>
              <Button
                title="Open battery settings"
                variant="secondary"
                onPress={() => void openBatteryOptimizationSettings()}
                style={{ marginTop: spacing.md, alignSelf: 'flex-start' }}
              />
            </View>
          </View>
        </Card>

        <Card style={{ marginTop: spacing.md }}>
          <Text style={type.bodyDim}>
            <Text style={{ color: colors.text, fontWeight: '700' }}>
              Using a Xiaomi, OnePlus, Oppo, Vivo, Huawei or Samsung?
            </Text>{' '}
            These brands ship extra "battery saver" layers that can silently
            kill background apps. If an alarm ever fails, check the
            brand-specific steps at dontkillmyapp.com.
          </Text>
          <Button
            title="Open dontkillmyapp.com"
            variant="ghost"
            onPress={() => void Linking.openURL(DONT_KILL_URL)}
            style={{ marginTop: spacing.sm, alignSelf: 'flex-start' }}
          />
        </Card>

        {/* ----------------------------------------------- alarm defaults */}
        <SectionLabel style={{ marginTop: spacing.xl }}>New alarm defaults</SectionLabel>
        <Card>
          <Text style={type.heading}>Wake distance</Text>
          <Text style={[type.bodyDim, { marginTop: 2 }]}>
            Pre-selected when you create an alarm — currently{' '}
            {formatDistance(settings.defaultRadiusMeters)}.
          </Text>
          <View style={styles.chips}>
            {RADIUS_PRESETS.map((r) => (
              <Chip
                key={r}
                label={formatDistance(r)}
                active={settings.defaultRadiusMeters === r}
                onPress={() => void update({ defaultRadiusMeters: r })}
              />
            ))}
          </View>
          <Divider />
          <Row style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={type.heading}>Sound</Text>
              <Text style={[type.bodyDim, { marginTop: 2 }]}>New alarms ring out loud.</Text>
            </View>
            <Switch
              value={settings.defaultSound}
              onValueChange={(v) => void update({ defaultSound: v })}
              trackColor={{ false: colors.line, true: colors.amber }}
              thumbColor={colors.text}
            />
          </Row>
          <Divider />
          <Row style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={type.heading}>Vibration</Text>
              <Text style={[type.bodyDim, { marginTop: 2 }]}>New alarms also vibrate.</Text>
            </View>
            <Switch
              value={settings.defaultVibrate}
              onValueChange={(v) => void update({ defaultVibrate: v })}
              trackColor={{ false: colors.line, true: colors.amber }}
              thumbColor={colors.text}
            />
          </Row>
        </Card>

        {/* ------------------------------------------------------ privacy */}
        <SectionLabel style={{ marginTop: spacing.xl }}>Privacy</SectionLabel>
        <Card>
          <Text style={type.bodyDim}>
            Your location and alarms live only on this phone. WakeyStop has no
            account, no analytics and no server of its own.
          </Text>
          <Text style={[type.bodyDim, { marginTop: spacing.sm }]}>
            One honest caveat: when you type in the destination search box,
            that search text is sent to OpenStreetMap's free Nominatim service
            to find matching places. Your live position during a journey is
            never sent anywhere. Prefer total silence? Skip search and drop a
            pin on the map instead.
          </Text>
        </Card>

        {/* -------------------------------------------------------- intro */}
        <SectionLabel style={{ marginTop: spacing.xl }}>Help</SectionLabel>
        <Card>
          <Row style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={type.heading}>Replay the intro</Text>
              <Text style={[type.bodyDim, { marginTop: 2 }]}>
                Revisit how WakeyStop works and the permission walk-through.
              </Text>
            </View>
            <Button
              title="Open"
              variant="secondary"
              onPress={() => navigation.navigate('Onboarding')}
            />
          </Row>
        </Card>

        {/* -------------------------------------------------------- about */}
        <Text style={[type.label, styles.about]}>
          WakeyStop {Constants.expoConfig?.version ?? '1.0.0'} · alarms that ring by
          place, not time · map data © OpenStreetMap contributors
        </Text>
      </ScrollView>
    </Screen>
  );
}

function CheckRow({
  ok,
  title,
  detail,
  actionTitle,
  onAction,
}: {
  ok: boolean;
  title: string;
  detail: string;
  actionTitle: string;
  onAction: () => void;
}) {
  return (
    <View style={styles.checkRow}>
      <View style={[styles.checkBadge, ok ? styles.checkBadgeOk : styles.checkBadgeBad]}>
        <Text style={[styles.checkBadgeText, { color: ok ? colors.onAmber : colors.danger }]}>
          {ok ? '✓' : '✕'}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={type.heading}>{title}</Text>
        <Text style={[type.bodyDim, { marginTop: 2 }]}>{detail}</Text>
        {!ok ? (
          <Button
            title={actionTitle}
            variant="secondary"
            onPress={onAction}
            style={{ marginTop: spacing.md, alignSelf: 'flex-start' }}
          />
        ) : null}
      </View>
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  checkRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  checkBadge: {
    width: 24,
    height: 24,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkBadgeOk: { backgroundColor: colors.success },
  checkBadgeBad: { backgroundColor: colors.dangerSoft, borderWidth: 1, borderColor: colors.danger },
  checkBadgeText: { fontSize: 12, fontWeight: '800' },
  checkBadgeNeutral: {
    width: 24,
    height: 24,
    borderRadius: radii.pill,
    backgroundColor: colors.amberSoft,
    borderWidth: 1,
    borderColor: colors.amberLine,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkBadgeNeutralText: { fontSize: 12, fontWeight: '800', color: colors.amber },
  divider: { height: 1, backgroundColor: colors.lineSoft, marginVertical: spacing.lg },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  switchRow: { alignItems: 'center', gap: spacing.md },
  about: {
    textAlign: 'center',
    marginTop: spacing.xl,
    color: colors.textFaint,
  },
});
