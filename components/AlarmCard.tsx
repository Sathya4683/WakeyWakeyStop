import { AlarmConfig } from "@/store/geofenceStore";
import { Theme } from "@/theme/theme";
import React from "react";
import { StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";

// ─── Constants ────────────────────────────────────────────────────────────────

const DAY_SHORT = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function format12h(hhmm: string): { clock: string; period: string } {
  const [h, m] = hhmm.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const displayH = h % 12 || 12;
  return { clock: `${displayH}:${m.toString().padStart(2, "0")}`, period };
}

function frequencyLabel(alarm: AlarmConfig): string {
  if (alarm.frequency === "once") return "Once";
  if (alarm.frequency === "daily") return "Every day";
  if (alarm.customDays.length === 0) return "No days";
  return alarm.customDays.map((d) => DAY_SHORT[d]).join(" · ");
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  alarm: AlarmConfig;
  theme: Theme;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AlarmCard({ alarm, theme, onToggle, onDelete }: Props) {
  const { clock, period } = format12h(alarm.time);
  const s = makeStyles(theme);

  return (
    <View style={[s.card, alarm.isActive && s.cardActive]}>
      {/* ── Header row: time + toggle ── */}
      <View style={s.headerRow}>
        <View style={s.timeRow}>
          <Text style={[s.clock, !alarm.isActive && s.dimmed]}>{clock}</Text>
          <Text style={[s.period, !alarm.isActive && s.dimmed]}>{period}</Text>
        </View>
        <Switch
          value={alarm.isActive}
          onValueChange={() => onToggle(alarm.id)}
          trackColor={{ false: "#767577", true: theme.primary }}
          thumbColor={alarm.isActive ? theme.primaryText : "#CCCCCC"}
          ios_backgroundColor="#767577"
        />
      </View>

      {/* ── Label ── */}
      {alarm.label ? (
        <Text style={[s.label, !alarm.isActive && s.dimmed]} numberOfLines={1}>
          {alarm.label}
        </Text>
      ) : null}

      {/* ── Meta badges ── */}
      <View style={s.badgeRow}>
        <View style={s.badge}>
          <Text style={s.badgeText}>{frequencyLabel(alarm)}</Text>
        </View>
        <View style={s.badge}>
          <Text style={s.badgeText}>
            {alarm.activeWindowStart} – {alarm.activeWindowEnd}
          </Text>
        </View>
        {!alarm.isActive && (
          <View style={[s.badge, s.badgeOff]}>
            <Text style={[s.badgeText, { color: theme.textMuted }]}>OFF</Text>
          </View>
        )}
      </View>

      {/* ── Delete ── */}
      <TouchableOpacity
        style={s.deleteBtn}
        onPress={() => onDelete(alarm.id)}
        activeOpacity={0.75}
      >
        <Text style={s.deleteBtnText}>✕ DELETE</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    card: {
      backgroundColor: t.cardBackground,
      borderWidth: t.borderWidth,
      borderColor: t.border,
      padding: 16,
      marginBottom: 12,
      ...t.shadow,
    },
    cardActive: {
      borderLeftWidth: 6,
      borderLeftColor: t.primary,
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 4,
    },
    timeRow: {
      flexDirection: "row",
      alignItems: "flex-end",
    },
    clock: {
      color: t.text,
      fontSize: 44,
      fontWeight: "900",
      lineHeight: 48,
      letterSpacing: -1,
    },
    period: {
      color: t.textMuted,
      fontSize: 18,
      fontWeight: "700",
      marginBottom: 6,
      marginLeft: 6,
    },
    dimmed: {
      opacity: 0.4,
    },
    label: {
      color: t.textSecondary,
      fontSize: 14,
      fontWeight: "600",
      marginBottom: 10,
    },
    badgeRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
      marginBottom: 14,
    },
    badge: {
      backgroundColor: t.tagBackground,
      borderWidth: 1.5,
      borderColor: t.border,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    badgeOff: {
      backgroundColor: t.surface,
    },
    badgeText: {
      color: t.tagText,
      fontSize: 11,
      fontWeight: "700",
    },
    deleteBtn: {
      borderWidth: 1.5,
      borderColor: t.error,
      paddingVertical: 8,
      alignItems: "center",
    },
    deleteBtnText: {
      color: t.error,
      fontWeight: "800",
      fontSize: 12,
      letterSpacing: 1,
    },
  });
