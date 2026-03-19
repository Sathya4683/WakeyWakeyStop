/**
 * alarms.tsx — Recurrent geofence alarm manager
 *
 * State layers:
 *   useAlarmsStore     — persisted alarm list (Zustand + AsyncStorage)
 *   useGeofenceStore   — pending geofence from maps tab + runtime flags
 *   Local state        — create-form modal, UI interactions
 *   AsyncStorage poll  — detects background-triggered alarms
 *   AppState listener  — re-sync on foreground resume
 *   Notification sub   — instant detection when app is open
 */

import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Alert,
  Animated,
  AppState,
  AppStateStatus,
  Easing,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import {
  AlarmFrequency,
  GeofenceAlarm,
  useAlarmsStore,
} from "@/store/alarmsStore";
import { useGeofenceStore } from "@/store/geofenceStore";
import { useThemeStore } from "@/store/themeStore";
import { getTheme, Theme } from "@/theme/theme";
import { formatDistance } from "@/utils/haversine";
import {
  checkIsAlarmRinging,
  checkIsMonitoring,
  requestAllPermissions,
  setupAlarmNotificationCategory,
  setupAndroidNotificationChannels,
  setupNotificationHandler,
  startAlarmAudio,
  startGeofenceMonitoring,
  stopAlarm,
  stopGeofenceMonitoring,
} from "@/utils/notifications";

// ─── Constants ────────────────────────────────────────────────────────────────

const DAY_LABELS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] as const;
const POLL_MS = 3_000;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt12h(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const p = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${m.toString().padStart(2, "0")} ${p}`;
}

function frequencyLabel(alarm: GeofenceAlarm): string {
  switch (alarm.frequency) {
    case "once":
      return "Once";
    case "daily":
      return "Daily";
    case "customDays":
      if (!alarm.customDays.length) return "No days";
      return alarm.customDays.map((d) => DAY_LABELS[d]).join(" · ");
  }
}

// Very small time-picker: renders HH and MM as +/- nudge buttons.
// Cross-platform, no native module dependencies.
function InlineTimePicker({
  value,
  onChange,
  theme,
}: {
  value: string;
  onChange: (v: string) => void;
  theme: Theme;
}) {
  const [h, m] = value.split(":").map(Number);

  const nudge = (field: "h" | "m", delta: number) => {
    let nh = h;
    let nm = m;
    if (field === "h") nh = (h + delta + 24) % 24;
    else nm = (m + delta + 60) % 60;
    onChange(
      `${nh.toString().padStart(2, "0")}:${nm.toString().padStart(2, "0")}`,
    );
  };

  const s = makeStyles(theme);
  return (
    <View style={s.timePicker}>
      {/* Hours */}
      <View style={s.timeUnit}>
        <TouchableOpacity onPress={() => nudge("h", 1)} style={s.nudgeBtn}>
          <Text style={s.nudgeBtnText}>+</Text>
        </TouchableOpacity>
        <Text style={s.timeDigit}>{h.toString().padStart(2, "0")}</Text>
        <TouchableOpacity onPress={() => nudge("h", -1)} style={s.nudgeBtn}>
          <Text style={s.nudgeBtnText}>-</Text>
        </TouchableOpacity>
      </View>

      <Text style={s.timeColon}>:</Text>

      {/* Minutes — 5-minute steps */}
      <View style={s.timeUnit}>
        <TouchableOpacity onPress={() => nudge("m", 5)} style={s.nudgeBtn}>
          <Text style={s.nudgeBtnText}>+</Text>
        </TouchableOpacity>
        <Text style={s.timeDigit}>{m.toString().padStart(2, "0")}</Text>
        <TouchableOpacity onPress={() => nudge("m", -5)} style={s.nudgeBtn}>
          <Text style={s.nudgeBtnText}>-</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Create-alarm form (modal) ────────────────────────────────────────────────

interface CreateFormProps {
  theme: Theme;
  visible: boolean;
  onClose: () => void;
  onSubmit: (
    frequency: AlarmFrequency,
    customDays: number[],
    startTime: string,
    endTime: string,
  ) => void;
}

function CreateAlarmModal({
  theme,
  visible,
  onClose,
  onSubmit,
}: CreateFormProps) {
  const [frequency, setFrequency] = useState<AlarmFrequency>("daily");
  const [customDays, setCustomDays] = useState<number[]>([1, 2, 3, 4, 5]); // Mon–Fri
  const [startTime, setStartTime] = useState("06:00");
  const [endTime, setEndTime] = useState("07:30");

  const toggleDay = (d: number) =>
    setCustomDays((prev) =>
      prev.includes(d)
        ? prev.filter((x) => x !== d)
        : [...prev, d].sort((a, b) => a - b),
    );

  const handleSubmit = () => {
    if (frequency === "customDays" && customDays.length === 0) {
      Alert.alert("Select Days", "Choose at least one day.");
      return;
    }
    onSubmit(frequency, customDays, startTime, endTime);
    // Reset
    setFrequency("daily");
    setCustomDays([1, 2, 3, 4, 5]);
    setStartTime("06:00");
    setEndTime("07:30");
  };

  const s = makeStyles(theme);
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={s.modalBackdrop}>
        <ScrollView
          style={s.modalSheet}
          contentContainerStyle={s.modalContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>NEW ALARM</Text>
            <TouchableOpacity onPress={onClose} style={s.modalCloseBtn}>
              <Text style={s.modalCloseBtnText}>CANCEL</Text>
            </TouchableOpacity>
          </View>

          {/* Frequency */}
          <Text style={s.formLabel}>FREQUENCY</Text>
          <View style={s.segmentRow}>
            {(["once", "daily", "customDays"] as AlarmFrequency[]).map(
              (f, i, arr) => (
                <TouchableOpacity
                  key={f}
                  style={[
                    s.segmentBtn,
                    i < arr.length - 1 && s.segmentBtnBorder,
                    frequency === f && s.segmentBtnActive,
                  ]}
                  onPress={() => setFrequency(f)}
                  activeOpacity={0.75}
                >
                  <Text
                    style={[
                      s.segmentBtnText,
                      frequency === f && s.segmentBtnTextActive,
                    ]}
                  >
                    {f === "customDays" ? "CUSTOM" : f.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ),
            )}
          </View>

          {/* Custom days grid */}
          {frequency === "customDays" && (
            <View>
              <Text style={[s.formLabel, { marginTop: 16 }]}>REPEAT ON</Text>
              <View style={s.daysGrid}>
                {DAY_LABELS.map((label, idx) => (
                  <TouchableOpacity
                    key={label}
                    style={[
                      s.dayBtn,
                      customDays.includes(idx) && s.dayBtnActive,
                    ]}
                    onPress={() => toggleDay(idx)}
                    activeOpacity={0.75}
                  >
                    <Text
                      style={[
                        s.dayBtnText,
                        customDays.includes(idx) && s.dayBtnTextActive,
                      ]}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Time window */}
          <View style={s.windowDivider} />
          <Text style={s.formSectionTitle}>ACTIVE TIME WINDOW</Text>
          <Text style={s.windowHint}>
            Alarm only fires if you enter the radius during this window.
            Re-entering the same window will NOT re-trigger.
          </Text>

          <View style={s.windowRow}>
            <View style={s.windowHalf}>
              <Text style={s.formLabel}>FROM</Text>
              <InlineTimePicker
                value={startTime}
                onChange={setStartTime}
                theme={theme}
              />
              <Text style={s.timeDisplay12}>{fmt12h(startTime)}</Text>
            </View>
            <Text style={s.windowArrow}>→</Text>
            <View style={s.windowHalf}>
              <Text style={s.formLabel}>TO</Text>
              <InlineTimePicker
                value={endTime}
                onChange={setEndTime}
                theme={theme}
              />
              <Text style={s.timeDisplay12}>{fmt12h(endTime)}</Text>
            </View>
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={s.createBtn}
            onPress={handleSubmit}
            activeOpacity={0.85}
          >
            <Text style={s.createBtnText}>CREATE ALARM</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
}

// ─── Alarm card ───────────────────────────────────────────────────────────────

function AlarmCard({
  alarm,
  theme,
  onToggle,
  onDelete,
}: {
  alarm: GeofenceAlarm;
  theme: Theme;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const s = makeStyles(theme);
  return (
    <View style={[s.alarmCard, alarm.isActive && s.alarmCardActive]}>
      {/* Top row: destination + toggle */}
      <View style={s.cardTopRow}>
        <Text
          style={[s.cardDestName, !alarm.isActive && s.dimmed]}
          numberOfLines={1}
        >
          {alarm.destination.name}
        </Text>
        <Switch
          value={alarm.isActive}
          onValueChange={() => onToggle(alarm.id)}
          trackColor={{ false: "#555", true: theme.primary }}
          thumbColor={alarm.isActive ? theme.primaryText : "#aaa"}
        />
      </View>

      {/* Badges row */}
      <View style={s.badgeRow}>
        <View style={s.badge}>
          <Text style={s.badgeText}>{formatDistance(alarm.radius)}</Text>
        </View>
        <View style={s.badge}>
          <Text style={s.badgeText}>{frequencyLabel(alarm)}</Text>
        </View>
        <View style={[s.badge, s.badgeWindow]}>
          <Text style={s.badgeText}>
            {fmt12h(alarm.timeWindow.startTime)} –{" "}
            {fmt12h(alarm.timeWindow.endTime)}
          </Text>
        </View>
      </View>

      {/* Last triggered */}
      {alarm.lastTriggeredAt ? (
        <Text style={s.lastTriggeredText}>
          Last triggered: {new Date(alarm.lastTriggeredAt).toLocaleString()}
        </Text>
      ) : (
        <Text style={s.lastTriggeredText}>Never triggered</Text>
      )}

      {/* Delete */}
      <TouchableOpacity
        style={s.deleteBtn}
        onPress={() => onDelete(alarm.id)}
        activeOpacity={0.75}
      >
        <Text style={s.deleteBtnText}>DELETE</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function AlarmsScreen() {
  const { isDark } = useThemeStore();
  const theme = getTheme(isDark);

  const { alarms, addAlarm, removeAlarm, toggleAlarm, updateAlarm } =
    useAlarmsStore();
  const {
    pendingGeofence,
    clearPendingGeofence,
    isMonitoring,
    isAlarmRinging,
    ringingAlarmId,
    setMonitoring,
    setAlarmRinging,
  } = useGeofenceStore();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  // Pulse animation
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  // ── Setup ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    setupNotificationHandler();
    setupAndroidNotificationChannels();
    _syncRuntimeState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Auto-open create modal when maps sends a pending geofence ─────────────
  useEffect(() => {
    if (pendingGeofence) {
      setShowCreateModal(true);
    }
  }, [pendingGeofence]);

  // ── Sync runtime state from native layer ──────────────────────────────────
  const _syncRuntimeState = useCallback(async () => {
    const [monitoring, { ringing, alarmId }] = await Promise.all([
      checkIsMonitoring(),
      checkIsAlarmRinging(),
    ]);
    setMonitoring(monitoring);
    if (ringing && alarmId && !isAlarmRinging) {
      setAlarmRinging(alarmId);
      await startAlarmAudio();
      // Sync lastTriggeredAt into store if background task fired the alarm
      updateAlarm(alarmId, { lastTriggeredAt: Date.now() });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAlarmRinging]);

  useEffect(() => {
    setupNotificationHandler();
    setupAndroidNotificationChannels();
    setupAlarmNotificationCategory(); // ← add this line
    _syncRuntimeState(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Poll for background-triggered alarms ─────────────────────────────────
  useEffect(() => {
    if (!isMonitoring) return;
    const timer = setInterval(async () => {
      const { ringing, alarmId } = await checkIsAlarmRinging();
      if (ringing && alarmId && !isAlarmRinging) {
        setAlarmRinging(alarmId);
        await startAlarmAudio();
        updateAlarm(alarmId, { lastTriggeredAt: Date.now() });
      }
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [isMonitoring, isAlarmRinging, setAlarmRinging, updateAlarm]);

  // ─── Replace the notification response listener useEffect ────────────────────

  useEffect(() => {
    const received = Notifications.addNotificationReceivedListener((n) => {
      const data = n.request.content.data as
        | Record<string, unknown>
        | undefined;
      if (data?.type === "geofence_alarm" && typeof data.alarmId === "string") {
        setAlarmRinging(data.alarmId);
        startAlarmAudio();
        updateAlarm(data.alarmId, { lastTriggeredAt: Date.now() });
      }
    });

    const response = Notifications.addNotificationResponseReceivedListener(
      async (r) => {
        const data = r.notification.request.content.data as
          | Record<string, unknown>
          | undefined;

        // ── User tapped the "STOP ALARM" action button ──────────────────────
        if (r.actionIdentifier === "STOP_ALARM") {
          await stopAlarm();
          setAlarmRinging(null);
          return;
        }

        // ── User tapped the notification body (open app) ────────────────────
        if (
          data?.type === "geofence_alarm" &&
          typeof data.alarmId === "string"
        ) {
          setAlarmRinging(data.alarmId);
          startAlarmAudio();
          updateAlarm(data.alarmId, { lastTriggeredAt: Date.now() });
        }
      },
    );

    return () => {
      received.remove();
      response.remove();
    };
  }, [setAlarmRinging, updateAlarm]);

  // ── AppState: re-sync on resume ────────────────────────────────────────────
  useEffect(() => {
    const sub = AppState.addEventListener("change", (next: AppStateStatus) => {
      if (next === "active") _syncRuntimeState();
    });
    return () => sub.remove();
  }, [_syncRuntimeState]);

  // ── Pulse when ringing ────────────────────────────────────────────────────
  useEffect(() => {
    if (isAlarmRinging) {
      pulseLoopRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.04,
            duration: 380,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 380,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
      );
      pulseLoopRef.current.start();
    } else {
      pulseLoopRef.current?.stop();
      pulseAnim.setValue(1);
    }
  }, [isAlarmRinging, pulseAnim]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleCreateAlarm = useCallback(
    (
      frequency: AlarmFrequency,
      customDays: number[],
      startTime: string,
      endTime: string,
    ) => {
      if (!pendingGeofence) return;

      const alarm: GeofenceAlarm = {
        id: `alarm_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        destination: pendingGeofence.destination,
        radius: pendingGeofence.radius,
        frequency,
        customDays: frequency === "customDays" ? customDays : [],
        timeWindow: { startTime, endTime },
        isActive: true,
        lastTriggeredAt: null,
        createdAt: Date.now(),
      };

      addAlarm(alarm);
      clearPendingGeofence();
      setShowCreateModal(false);
    },
    [pendingGeofence, addAlarm, clearPendingGeofence],
  );

  const handleCancelCreate = useCallback(() => {
    setShowCreateModal(false);
    clearPendingGeofence();
  }, [clearPendingGeofence]);

  const handleDeleteAlarm = useCallback(
    (id: string) => {
      Alert.alert("Delete Alarm", "Remove this alarm permanently?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => removeAlarm(id),
        },
      ]);
    },
    [removeAlarm],
  );

  const activeCount = useMemo(
    () => alarms.filter((a) => a.isActive).length,
    [alarms],
  );

  const monitoringSummary = useMemo(() => {
    const active = alarms.filter((a) => a.isActive);
    if (!active.length) return "No active alarms";
    return active.map((a) => a.destination.name).join(", ");
  }, [alarms]);

  const handleStartMonitoring = useCallback(async () => {
    if (activeCount === 0) {
      Alert.alert(
        "No Active Alarms",
        "Enable at least one alarm before starting monitoring.",
      );
      return;
    }
    setStatusMsg("Requesting permissions...");
    const { granted, message } = await requestAllPermissions();
    if (!granted) {
      setStatusMsg(message);
      return;
    }
    setStatusMsg("Starting...");
    try {
      await startGeofenceMonitoring(monitoringSummary);
      setMonitoring(true);
      setStatusMsg("");
    } catch (e) {
      console.error("[Alarms] start monitoring error:", e);
      setStatusMsg("Failed to start. Check location permissions.");
    }
  }, [activeCount, monitoringSummary, setMonitoring]);

  const handleStopMonitoring = useCallback(async () => {
    await stopGeofenceMonitoring();
    setMonitoring(false);
    setStatusMsg("");
  }, [setMonitoring]);

  const handleStopAlarm = useCallback(async () => {
    await stopAlarm();
    setAlarmRinging(null);
  }, [setAlarmRinging]);

  const s = makeStyles(theme);

  // ─────────────────────────────────────────────────────────────────────────
  // Alarm ringing: full-screen takeover
  // ─────────────────────────────────────────────────────────────────────────
  if (isAlarmRinging) {
    const ringing = ringingAlarmId
      ? alarms.find((a) => a.id === ringingAlarmId)
      : null;

    return (
      <View style={s.alarmOverlay}>
        <StatusBar barStyle="light-content" backgroundColor="#C00000" />

        <Animated.View
          style={[s.alarmCard, { transform: [{ scale: pulseAnim }] }]}
        >
          <Text style={s.alarmBigTitle}>ALARM</Text>
          <Text style={s.alarmSubtitle}>GEOFENCE REACHED</Text>
          <View style={s.alarmDivider} />
          {ringing ? (
            <>
              <Text style={s.alarmFieldLabel}>DESTINATION</Text>
              <Text style={s.alarmDestText}>{ringing.destination.name}</Text>
              <Text style={s.alarmRadiusText}>
                {formatDistance(ringing.radius)} radius
              </Text>
              <Text style={s.alarmWindowText}>
                Window: {fmt12h(ringing.timeWindow.startTime)} –{" "}
                {fmt12h(ringing.timeWindow.endTime)}
              </Text>
            </>
          ) : null}
        </Animated.View>

        <TouchableOpacity
          style={s.stopAlarmBtn}
          onPress={handleStopAlarm}
          activeOpacity={0.85}
        >
          <Text style={s.stopAlarmBtnText}>STOP ALARM</Text>
        </TouchableOpacity>

        <Text style={s.alarmNote}>
          Will not trigger again in this time window
        </Text>
      </View>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Normal screen
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <View style={s.screenRoot}>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={theme.background}
      />

      {/* Create alarm modal */}
      <CreateAlarmModal
        theme={theme}
        visible={showCreateModal}
        onClose={handleCancelCreate}
        onSubmit={handleCreateAlarm}
      />

      <ScrollView
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Page header ─────────────────────────────────────────────────── */}
        <View style={s.pageHeader}>
          <Text style={s.pageTitle}>ALARMS</Text>
          <Text style={s.pageSubtitle}>Location-triggered, time-windowed</Text>
        </View>

        {/* ── Monitoring status banner ────────────────────────────────────── */}
        <View
          style={[s.statusBanner, isMonitoring ? s.statusActive : s.statusIdle]}
        >
          <View
            style={[s.statusDot, isMonitoring ? s.statusDotOn : s.statusDotOff]}
          />
          <Text
            style={[
              s.statusText,
              isMonitoring ? s.statusTextOn : s.statusTextOff,
            ]}
          >
            {isMonitoring
              ? `MONITORING — ${activeCount} ALARM${activeCount !== 1 ? "S" : ""} ACTIVE`
              : "MONITORING INACTIVE"}
          </Text>
        </View>

        {statusMsg ? (
          <View style={s.msgBanner}>
            <Text style={s.msgText}>{statusMsg}</Text>
          </View>
        ) : null}

        {/* ── Controls ────────────────────────────────────────────────────── */}
        <View style={s.controlRow}>
          {!isMonitoring ? (
            <TouchableOpacity
              style={[
                s.ctrlBtn,
                s.ctrlBtnStart,
                activeCount === 0 && s.ctrlBtnDisabled,
              ]}
              onPress={handleStartMonitoring}
              disabled={activeCount === 0}
              activeOpacity={0.85}
            >
              <Text style={s.ctrlBtnStartText}>START MONITORING</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[s.ctrlBtn, s.ctrlBtnStop]}
              onPress={handleStopMonitoring}
              activeOpacity={0.85}
            >
              <Text style={s.ctrlBtnStopText}>STOP MONITORING</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[s.ctrlBtn, s.ctrlBtnAdd]}
            onPress={() => {
              if (!pendingGeofence) {
                router.push("/(drawer)/(tabs)/maps");
              } else {
                setShowCreateModal(true);
              }
            }}
            activeOpacity={0.85}
          >
            <Text style={s.ctrlBtnAddText}>
              {pendingGeofence ? "+ NEW ALARM" : "SET GEOFENCE"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Pending geofence hint */}
        {pendingGeofence && (
          <View style={s.pendingBanner}>
            <Text style={s.pendingBannerLabel}>GEOFENCE READY</Text>
            <Text style={s.pendingBannerName} numberOfLines={1}>
              {pendingGeofence.destination.name}
            </Text>
            <Text style={s.pendingBannerRadius}>
              {formatDistance(pendingGeofence.radius)} radius
            </Text>
          </View>
        )}

        {/* ── Alarm list ──────────────────────────────────────────────────── */}
        <View style={s.listSection}>
          <View style={s.listHeader}>
            <Text style={s.listSectionTitle}>ALARMS ({alarms.length})</Text>
          </View>

          {alarms.length === 0 ? (
            <View style={s.emptyCard}>
              <Text style={s.emptyTitle}>NO ALARMS</Text>
              <Text style={s.emptyBody}>
                Go to the Map tab, pin a destination, drag to set a radius, then
                tap "Save Geofence". Come back here to create an alarm.
              </Text>
              <TouchableOpacity
                style={s.goMapBtn}
                onPress={() => router.push("/(drawer)/(tabs)/maps")}
                activeOpacity={0.85}
              >
                <Text style={s.goMapBtnText}>OPEN MAP</Text>
              </TouchableOpacity>
            </View>
          ) : (
            alarms.map((alarm) => (
              <AlarmCard
                key={alarm.id}
                alarm={alarm}
                theme={theme}
                onToggle={toggleAlarm}
                onDelete={handleDeleteAlarm}
              />
            ))
          )}
        </View>

        {/* ── How it works ────────────────────────────────────────────────── */}
        <View style={s.infoBox}>
          <Text style={s.infoBoxTitle}>HOW IT WORKS</Text>
          <Text style={s.infoBoxBody}>
            Each alarm has a destination, radius, and a time window (e.g.
            06:00–07:30). Monitoring only checks geofences during the configured
            window. Once triggered, the alarm will not fire again in the same
            window — even if you re-enter the radius. It resets the next valid
            day.
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    screenRoot: {
      flex: 1,
      backgroundColor: t.background,
    },
    content: {
      paddingHorizontal: 16,
      paddingTop: Platform.OS === "ios" ? 58 : 16,
      paddingBottom: 24,
    },

    // ── Page header ───────────────────────────────────────────────────────────
    pageHeader: { marginBottom: 20 },
    pageTitle: {
      color: t.text,
      fontSize: 36,
      fontWeight: "900",
      letterSpacing: -1.5,
    },
    pageSubtitle: {
      color: t.textMuted,
      fontSize: 13,
      fontWeight: "500",
      marginTop: 2,
    },

    // ── Status banner ─────────────────────────────────────────────────────────
    statusBanner: {
      flexDirection: "row",
      alignItems: "center",
      borderWidth: t.borderWidth,
      borderColor: t.border,
      paddingHorizontal: 14,
      paddingVertical: 12,
      marginBottom: 10,
      ...t.shadow,
    },
    statusActive: { backgroundColor: t.primary },
    statusIdle: { backgroundColor: t.surface },
    statusDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      marginRight: 10,
      borderWidth: 1.5,
      borderColor: t.border,
    },
    statusDotOn: { backgroundColor: "#00C853" },
    statusDotOff: { backgroundColor: t.textMuted },
    statusText: { fontWeight: "900", fontSize: 12, letterSpacing: 1.2 },
    statusTextOn: { color: t.primaryText },
    statusTextOff: { color: t.textMuted },

    msgBanner: {
      borderWidth: t.borderWidth,
      borderColor: t.border,
      backgroundColor: t.surface,
      padding: 10,
      marginBottom: 10,
    },
    msgText: { color: t.textMuted, fontSize: 12, fontWeight: "500" },

    // ── Controls row ──────────────────────────────────────────────────────────
    controlRow: {
      flexDirection: "row",
      gap: 8,
      marginBottom: 12,
    },
    ctrlBtn: {
      flex: 1,
      borderWidth: t.borderWidth,
      borderColor: t.border,
      paddingVertical: 14,
      alignItems: "center",
      shadowColor: t.border,
      shadowOffset: { width: 3, height: 3 },
      shadowOpacity: 1,
      shadowRadius: 0,
      elevation: 5,
    },
    ctrlBtnStart: { backgroundColor: "#00C853" },
    ctrlBtnStartText: {
      color: "#000",
      fontWeight: "900",
      fontSize: 12,
      letterSpacing: 0.8,
    },
    ctrlBtnStop: { backgroundColor: t.warning ?? "#FF6600" },
    ctrlBtnStopText: {
      color: "#000",
      fontWeight: "900",
      fontSize: 12,
      letterSpacing: 0.8,
    },
    ctrlBtnAdd: { backgroundColor: t.primary },
    ctrlBtnAddText: {
      color: t.primaryText,
      fontWeight: "900",
      fontSize: 12,
      letterSpacing: 0.8,
    },
    ctrlBtnDisabled: { opacity: 0.4 },

    // ── Pending geofence banner ───────────────────────────────────────────────
    pendingBanner: {
      backgroundColor: t.accent + "22",
      borderWidth: t.borderWidth,
      borderColor: t.accent,
      padding: 12,
      marginBottom: 16,
    },
    pendingBannerLabel: {
      color: t.accent,
      fontSize: 8,
      fontWeight: "900",
      letterSpacing: 2,
      marginBottom: 4,
    },
    pendingBannerName: {
      color: t.text,
      fontSize: 14,
      fontWeight: "800",
      marginBottom: 2,
    },
    pendingBannerRadius: {
      color: t.textMuted,
      fontSize: 12,
      fontWeight: "600",
    },

    // ── Alarms list ───────────────────────────────────────────────────────────
    listSection: { marginBottom: 16 },
    listHeader: {
      borderBottomWidth: 2,
      borderBottomColor: t.border,
      paddingBottom: 6,
      marginBottom: 12,
    },
    listSectionTitle: {
      color: t.text,
      fontSize: 10,
      fontWeight: "900",
      letterSpacing: 2,
    },

    // ── Alarm card ────────────────────────────────────────────────────────────
    alarmCard: {
      backgroundColor: t.cardBackground,
      borderWidth: t.borderWidth,
      borderColor: t.border,
      padding: 14,
      marginBottom: 12,
      ...t.shadow,
    },
    alarmCardActive: {
      borderLeftWidth: 5,
      borderLeftColor: t.primary,
    },
    cardTopRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 8,
    },
    cardDestName: {
      flex: 1,
      color: t.text,
      fontSize: 16,
      fontWeight: "800",
      marginRight: 8,
    },
    dimmed: { opacity: 0.4 },
    badgeRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
      marginBottom: 8,
    },
    badge: {
      backgroundColor: t.tagBackground,
      borderWidth: 1.5,
      borderColor: t.border,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    badgeWindow: { backgroundColor: t.surface },
    badgeText: {
      color: t.tagText,
      fontSize: 10,
      fontWeight: "700",
    },
    lastTriggeredText: {
      color: t.textMuted,
      fontSize: 10,
      fontWeight: "400",
      marginBottom: 10,
    },
    deleteBtn: {
      borderWidth: 1.5,
      borderColor: t.error,
      paddingVertical: 7,
      alignItems: "center",
    },
    deleteBtnText: {
      color: t.error,
      fontWeight: "800",
      fontSize: 11,
      letterSpacing: 1,
    },

    // ── Empty state ───────────────────────────────────────────────────────────
    emptyCard: {
      backgroundColor: t.surface,
      borderWidth: t.borderWidth,
      borderColor: t.border,
      padding: 24,
      alignItems: "center",
      ...t.shadow,
    },
    emptyTitle: {
      color: t.text,
      fontSize: 17,
      fontWeight: "900",
      marginBottom: 8,
      letterSpacing: 1,
    },
    emptyBody: {
      color: t.textMuted,
      fontSize: 13,
      textAlign: "center",
      lineHeight: 20,
      marginBottom: 18,
    },
    goMapBtn: {
      backgroundColor: t.primary,
      borderWidth: t.borderWidth,
      borderColor: t.border,
      paddingHorizontal: 24,
      paddingVertical: 12,
      ...t.shadow,
    },
    goMapBtnText: {
      color: t.primaryText,
      fontWeight: "900",
      fontSize: 13,
      letterSpacing: 0.8,
    },

    // ── Info box ──────────────────────────────────────────────────────────────
    infoBox: {
      borderWidth: t.borderWidth,
      borderColor: t.border,
      backgroundColor: t.surface,
      padding: 16,
    },
    infoBoxTitle: {
      color: t.text,
      fontSize: 10,
      fontWeight: "900",
      letterSpacing: 2,
      marginBottom: 8,
    },
    infoBoxBody: {
      color: t.textMuted,
      fontSize: 13,
      lineHeight: 20,
    },

    // ── Create alarm modal ────────────────────────────────────────────────────
    modalBackdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.6)",
      justifyContent: "flex-end",
    },
    modalSheet: {
      backgroundColor: t.background,
      borderTopWidth: t.borderWidth,
      borderLeftWidth: t.borderWidth,
      borderRightWidth: t.borderWidth,
      borderColor: t.border,
      maxHeight: "90%",
    },
    modalContent: {
      padding: 20,
      paddingBottom: 40,
    },
    modalHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 20,
      paddingBottom: 12,
      borderBottomWidth: 2,
      borderBottomColor: t.border,
    },
    modalTitle: {
      color: t.text,
      fontSize: 22,
      fontWeight: "900",
      letterSpacing: -0.5,
    },
    modalCloseBtn: {
      borderWidth: t.borderWidth,
      borderColor: t.border,
      backgroundColor: t.surface,
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    modalCloseBtnText: {
      color: t.text,
      fontWeight: "700",
      fontSize: 12,
    },

    formLabel: {
      color: t.textMuted,
      fontSize: 9,
      fontWeight: "700",
      letterSpacing: 1.5,
      marginBottom: 6,
      textTransform: "uppercase",
    },
    formSectionTitle: {
      color: t.text,
      fontSize: 11,
      fontWeight: "900",
      letterSpacing: 1.5,
      marginBottom: 6,
    },

    // Frequency segment
    segmentRow: {
      flexDirection: "row",
      borderWidth: t.borderWidth,
      borderColor: t.border,
      overflow: "hidden",
      marginBottom: 8,
    },
    segmentBtn: {
      flex: 1,
      paddingVertical: 13,
      alignItems: "center",
      backgroundColor: t.surface,
    },
    segmentBtnBorder: {
      borderRightWidth: t.borderWidth,
      borderRightColor: t.border,
    },
    segmentBtnActive: { backgroundColor: t.primary },
    segmentBtnText: {
      color: t.text,
      fontWeight: "700",
      fontSize: 11,
      letterSpacing: 0.5,
    },
    segmentBtnTextActive: { color: t.primaryText },

    // Custom days grid
    daysGrid: {
      flexDirection: "row",
      gap: 5,
      marginBottom: 4,
    },
    dayBtn: {
      flex: 1,
      paddingVertical: 11,
      alignItems: "center",
      borderWidth: t.borderWidth,
      borderColor: t.border,
      backgroundColor: t.surface,
    },
    dayBtnActive: { backgroundColor: t.primary },
    dayBtnText: { color: t.text, fontSize: 8, fontWeight: "800" },
    dayBtnTextActive: { color: t.primaryText },

    // Time window
    windowDivider: {
      height: t.borderWidth,
      backgroundColor: t.border,
      marginVertical: 18,
    },
    windowHint: {
      color: t.textMuted,
      fontSize: 12,
      lineHeight: 18,
      marginBottom: 16,
    },
    windowRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 4,
    },
    windowHalf: { flex: 1 },
    windowArrow: {
      color: t.text,
      fontSize: 22,
      fontWeight: "900",
      paddingTop: 36,
      paddingHorizontal: 4,
    },

    // Inline time picker
    timePicker: {
      flexDirection: "row",
      alignItems: "center",
      borderWidth: t.borderWidth,
      borderColor: t.border,
      backgroundColor: t.inputBackground,
      shadowColor: t.border,
      shadowOffset: { width: 3, height: 3 },
      shadowOpacity: 1,
      shadowRadius: 0,
      elevation: 4,
    },
    timeUnit: {
      flex: 1,
      alignItems: "center",
      paddingVertical: 6,
    },
    timeColon: {
      color: t.text,
      fontSize: 22,
      fontWeight: "900",
    },
    timeDigit: {
      color: t.text,
      fontSize: 24,
      fontWeight: "900",
      letterSpacing: -1,
      marginVertical: 2,
    },
    nudgeBtn: {
      width: "100%",
      alignItems: "center",
      paddingVertical: 4,
    },
    nudgeBtnText: {
      color: t.text,
      fontSize: 18,
      fontWeight: "900",
      lineHeight: 20,
    },
    timeDisplay12: {
      color: t.textMuted,
      fontSize: 11,
      fontWeight: "600",
      textAlign: "center",
      marginTop: 5,
    },

    createBtn: {
      backgroundColor: t.primary,
      borderWidth: t.borderWidth,
      borderColor: t.border,
      paddingVertical: 17,
      alignItems: "center",
      marginTop: 24,
      ...t.shadow,
    },
    createBtnText: {
      color: t.primaryText,
      fontWeight: "900",
      fontSize: 15,
      letterSpacing: 1,
    },

    // ── Full-screen alarm overlay ──────────────────────────────────────────────
    alarmOverlay: {
      flex: 1,
      backgroundColor: "#C00000",
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
    },
    // alarmCard: {
    //   backgroundColor: "#FFFFFF",
    //   borderWidth: 4,
    //   borderColor: "#000",
    //   padding: 28,
    //   width: "100%",
    //   alignItems: "center",
    //   shadowColor: "#000",
    //   shadowOffset: { width: 8, height: 8 },
    //   shadowOpacity: 1,
    //   shadowRadius: 0,
    //   elevation: 12,
    //   marginBottom: 28,
    // },
    alarmBigTitle: {
      color: "#C00000",
      fontSize: 60,
      fontWeight: "900",
      letterSpacing: -2,
      lineHeight: 64,
    },
    alarmSubtitle: {
      color: "#000",
      fontSize: 13,
      fontWeight: "900",
      letterSpacing: 3,
      marginTop: 4,
      marginBottom: 20,
    },
    alarmDivider: {
      height: 3,
      backgroundColor: "#000",
      width: "100%",
      marginBottom: 20,
    },
    alarmFieldLabel: {
      color: "#555",
      fontSize: 9,
      fontWeight: "900",
      letterSpacing: 2,
      marginBottom: 6,
    },
    alarmDestText: {
      color: "#000",
      fontSize: 20,
      fontWeight: "900",
      textAlign: "center",
      marginBottom: 8,
    },
    alarmRadiusText: {
      color: "#444",
      fontSize: 14,
      fontWeight: "700",
      marginBottom: 4,
    },
    alarmWindowText: {
      color: "#666",
      fontSize: 12,
      fontWeight: "600",
    },
    stopAlarmBtn: {
      backgroundColor: "#FFF",
      borderWidth: 4,
      borderColor: "#000",
      paddingVertical: 20,
      paddingHorizontal: 48,
      shadowColor: "#000",
      shadowOffset: { width: 6, height: 6 },
      shadowOpacity: 1,
      shadowRadius: 0,
      elevation: 10,
    },
    stopAlarmBtnText: {
      color: "#C00000",
      fontWeight: "900",
      fontSize: 18,
      letterSpacing: 2,
    },
    alarmNote: {
      color: "rgba(255,255,255,0.65)",
      fontSize: 11,
      fontWeight: "500",
      marginTop: 20,
      textAlign: "center",
    },
  });
