import { Theme } from "@/theme/theme";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import React, { useState } from "react";
import {
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseHHMM(t: string): Date {
  const [h, m] = t.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

function toHHMM(d: Date): string {
  const h = d.getHours().toString().padStart(2, "0");
  const m = d.getMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
}

function display12h(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const displayH = h % 12 || 12;
  return `${displayH}:${m.toString().padStart(2, "0")} ${period}`;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  theme: Theme;
  label: string;
  time: string; // "HH:MM" 24-hour
  onChange: (time: string) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TimeSelector({ theme, label, time, onChange }: Props) {
  const [visible, setVisible] = useState(false);
  const s = makeStyles(theme);

  const handleChange = (_: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === "android") {
      setVisible(false);
    }
    if (date) onChange(toHHMM(date));
  };

  return (
    <View style={s.container}>
      <Text style={s.label}>{label}</Text>

      <TouchableOpacity
        style={s.timeBtn}
        onPress={() => setVisible(true)}
        activeOpacity={0.8}
      >
        <Text style={s.timeText}>{display12h(time)}</Text>
        <Text style={s.chevron}>▾</Text>
      </TouchableOpacity>

      {/* ── Android: native modal picker ── */}
      {Platform.OS === "android" && visible && (
        <DateTimePicker
          value={parseHHMM(time)}
          mode="time"
          display="default"
          onChange={handleChange}
        />
      )}

      {/* ── iOS: bottom-sheet modal ── */}
      {Platform.OS === "ios" && (
        <Modal
          transparent
          visible={visible}
          animationType="slide"
          onRequestClose={() => setVisible(false)}
        >
          <View style={s.backdrop}>
            <View style={s.sheet}>
              {/* Sheet header */}
              <View style={s.sheetHeader}>
                <Text style={s.sheetTitle}>{label}</Text>
                <TouchableOpacity
                  onPress={() => setVisible(false)}
                  style={s.doneBtn}
                  activeOpacity={0.8}
                >
                  <Text style={s.doneBtnText}>DONE</Text>
                </TouchableOpacity>
              </View>

              <DateTimePicker
                value={parseHHMM(time)}
                mode="time"
                display="spinner"
                onChange={handleChange}
                textColor={theme.text}
                style={{ backgroundColor: theme.surface }}
              />
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    container: {
      marginBottom: 14,
    },
    label: {
      color: t.textMuted,
      fontSize: 9,
      fontWeight: "700",
      letterSpacing: 1.5,
      textTransform: "uppercase",
      marginBottom: 6,
    },
    timeBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: t.inputBackground,
      borderWidth: t.borderWidth,
      borderColor: t.border,
      paddingHorizontal: 14,
      paddingVertical: 12,
      shadowColor: t.shadow.shadowColor,
      shadowOffset: { width: 3, height: 3 },
      shadowOpacity: t.shadow.shadowOpacity,
      shadowRadius: 0,
      elevation: 4,
    },
    timeText: {
      color: t.text,
      fontSize: 20,
      fontWeight: "800",
    },
    chevron: {
      color: t.textMuted,
      fontSize: 14,
      fontWeight: "700",
    },
    // iOS modal
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.55)",
      justifyContent: "flex-end",
    },
    sheet: {
      backgroundColor: t.surface,
      borderTopWidth: t.borderWidth,
      borderLeftWidth: t.borderWidth,
      borderRightWidth: t.borderWidth,
      borderColor: t.border,
      paddingBottom: 36,
    },
    sheetHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: t.borderWidth,
      borderBottomColor: t.border,
    },
    sheetTitle: {
      color: t.text,
      fontSize: 16,
      fontWeight: "800",
    },
    doneBtn: {
      backgroundColor: t.primary,
      borderWidth: 2,
      borderColor: t.border,
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    doneBtnText: {
      color: t.primaryText,
      fontWeight: "900",
      fontSize: 13,
    },
  });
