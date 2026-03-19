import { StyleSheet } from "react-native";
import { Theme } from "./theme";

export const createCommonStyles = (t: Theme) =>
  StyleSheet.create({
    flex1: { flex: 1 },

    row: {
      flexDirection: "row",
      alignItems: "center",
    },
    rowBetween: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },

    card: {
      backgroundColor: t.cardBackground,
      borderWidth: t.borderWidth,
      borderColor: t.border,
      padding: 16,
      marginBottom: 12,
      ...t.shadow,
    },

    btnPrimary: {
      backgroundColor: t.primary,
      borderWidth: t.borderWidth,
      borderColor: t.border,
      paddingVertical: 14,
      paddingHorizontal: 24,
      alignItems: "center",
      ...t.shadow,
    },
    btnPrimaryText: {
      color: t.primaryText,
      fontWeight: "900",
      fontSize: 15,
      letterSpacing: 0.5,
    },

    btnSecondary: {
      backgroundColor: t.surface,
      borderWidth: t.borderWidth,
      borderColor: t.border,
      paddingVertical: 12,
      paddingHorizontal: 20,
      alignItems: "center",
      shadowColor: t.shadow.shadowColor,
      shadowOffset: { width: 3, height: 3 },
      shadowOpacity: t.shadow.shadowOpacity,
      shadowRadius: 0,
      elevation: 4,
    },
    btnSecondaryText: {
      color: t.text,
      fontWeight: "700",
      fontSize: 14,
    },

    btnDanger: {
      backgroundColor: t.error,
      borderWidth: t.borderWidth,
      borderColor: t.border,
      paddingVertical: 10,
      paddingHorizontal: 16,
      alignItems: "center",
    },
    btnDangerText: {
      color: "#FFFFFF",
      fontWeight: "900",
      fontSize: 13,
    },

    inputWrap: {
      borderWidth: t.borderWidth,
      borderColor: t.border,
      backgroundColor: t.inputBackground,
      shadowColor: t.shadow.shadowColor,
      shadowOffset: { width: 3, height: 3 },
      shadowOpacity: t.shadow.shadowOpacity,
      shadowRadius: 0,
      elevation: 4,
    },
    inputText: {
      paddingHorizontal: 14,
      paddingVertical: 12,
      color: t.text,
      fontSize: 15,
      fontWeight: "500",
    },

    tag: {
      backgroundColor: t.tagBackground,
      borderWidth: 1.5,
      borderColor: t.border,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    tagText: {
      color: t.tagText,
      fontWeight: "700",
      fontSize: 11,
    },

    h1: {
      color: t.text,
      fontSize: 32,
      fontWeight: "900",
      letterSpacing: -1,
    },
    h2: {
      color: t.text,
      fontSize: 22,
      fontWeight: "800",
    },
    h3: {
      color: t.text,
      fontSize: 18,
      fontWeight: "700",
    },
    body: {
      color: t.text,
      fontSize: 14,
      fontWeight: "500",
    },
    muted: {
      color: t.textMuted,
      fontSize: 13,
      fontWeight: "400",
    },
    capsLabel: {
      color: t.textMuted,
      fontSize: 10,
      fontWeight: "700",
      letterSpacing: 1.5,
      textTransform: "uppercase",
    },
    sectionTitle: {
      color: t.text,
      fontSize: 11,
      fontWeight: "900",
      letterSpacing: 2,
      textTransform: "uppercase",
      borderBottomWidth: 2,
      borderBottomColor: t.border,
      paddingBottom: 6,
      marginBottom: 14,
    },

    divider: {
      height: t.borderWidth,
      backgroundColor: t.border,
      marginVertical: 12,
    },

    mapOverlay: {
      backgroundColor: t.mapOverlayBackground,
      borderWidth: t.borderWidth,
      borderColor: t.border,
      padding: 12,
      ...t.shadow,
    },
  });

// 🔥 Backward compatibility (old components)
export const baseStyles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },

  card: {
    borderWidth: 3,
    padding: 16,
    marginBottom: 16,
  },

  button: {
    borderWidth: 3,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
  },

  buttonText: {
    fontWeight: "900",
    fontSize: 16,
  },

  text: {
    fontWeight: "700",
    fontSize: 16,
  },

  title: {
    fontWeight: "900",
    fontSize: 24,
    marginBottom: 12,
  },

  input: {
    borderWidth: 3,
    padding: 12,
    marginBottom: 12,
  },
});

// 🔥 Optional shadow (old usage support)
export const brutalShadow = {
  shadowOffset: { width: 4, height: 4 },
  shadowOpacity: 1,
  shadowRadius: 0,
  elevation: 4,
};
