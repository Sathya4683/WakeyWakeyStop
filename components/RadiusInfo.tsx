import { Theme } from "@/theme/theme";
import { formatDistance } from "@/utils/haversine";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  theme: Theme;
  destinationName: string;
  radius: number; // metres
  onConfirm: () => void;
  onReset: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function RadiusInfo({
  theme,
  destinationName,
  radius,
  onConfirm,
  onReset,
}: Props) {
  const canConfirm = radius >= 50;
  const s = makeStyles(theme);

  return (
    <View style={s.container}>
      {/* ── Top row: destination + radius badge ── */}
      <View style={s.infoRow}>
        <View style={s.destBlock}>
          <Text style={s.capsLabel}>DESTINATION</Text>
          <Text style={s.destName} numberOfLines={1}>
            {destinationName}
          </Text>
        </View>

        <View style={[s.radiusBadge, radius < 50 && s.radiusBadgeWarn]}>
          <Text style={s.radiusValue}>{formatDistance(radius)}</Text>
        </View>
      </View>

      {/* ── Hint ── */}
      <View style={s.hintRow}>
        <Text style={s.hintText}>
          {radius < 50
            ? "⚠️  Drag the red marker outward to set a valid radius (min 50 m)"
            : '✅  Radius set — tap "Set Alarm" to continue'}
        </Text>
      </View>

      {/* ── Actions ── */}
      <View style={s.buttonRow}>
        <TouchableOpacity
          style={s.resetBtn}
          onPress={onReset}
          activeOpacity={0.8}
        >
          <Text style={s.resetBtnText}>RESET</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.confirmBtn, !canConfirm && s.confirmBtnDisabled]}
          onPress={onConfirm}
          disabled={!canConfirm}
          activeOpacity={0.8}
        >
          <Text style={s.confirmBtnText}>SET ALARM →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    container: {
      backgroundColor: t.mapOverlayBackground,
      borderWidth: t.borderWidth,
      borderColor: t.border,
      padding: 14,
      ...t.shadow,
    },
    infoRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 8,
    },
    destBlock: {
      flex: 1,
      marginRight: 12,
    },
    capsLabel: {
      color: t.textMuted,
      fontSize: 9,
      fontWeight: "700",
      letterSpacing: 1.5,
      textTransform: "uppercase",
      marginBottom: 2,
    },
    destName: {
      color: t.text,
      fontSize: 17,
      fontWeight: "800",
    },
    radiusBadge: {
      backgroundColor: t.primary,
      borderWidth: 2,
      borderColor: t.border,
      paddingHorizontal: 14,
      paddingVertical: 7,
    },
    radiusBadgeWarn: {
      backgroundColor: t.warning,
    },
    radiusValue: {
      color: t.primaryText,
      fontSize: 18,
      fontWeight: "900",
    },
    hintRow: {
      marginBottom: 12,
    },
    hintText: {
      color: t.textMuted,
      fontSize: 12,
      fontWeight: "500",
      lineHeight: 17,
    },
    buttonRow: {
      flexDirection: "row",
      gap: 10,
    },
    resetBtn: {
      flex: 1,
      backgroundColor: t.surface,
      borderWidth: t.borderWidth,
      borderColor: t.border,
      paddingVertical: 12,
      alignItems: "center",
    },
    resetBtnText: {
      color: t.text,
      fontWeight: "800",
      fontSize: 13,
      letterSpacing: 0.5,
    },
    confirmBtn: {
      flex: 2,
      backgroundColor: t.primary,
      borderWidth: t.borderWidth,
      borderColor: t.border,
      paddingVertical: 12,
      alignItems: "center",
      ...t.shadow,
    },
    confirmBtnText: {
      color: t.primaryText,
      fontWeight: "900",
      fontSize: 13,
      letterSpacing: 0.5,
    },
    confirmBtnDisabled: {
      opacity: 0.35,
    },
  });
