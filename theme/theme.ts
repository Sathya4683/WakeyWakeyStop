// theme/theme.ts

export interface ShadowStyle {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;
}

export interface Theme {
  // Base
  background: string;
  surface: string;

  // Brand
  primary: string;
  primaryText: string;

  // Text
  text: string;
  textSecondary: string;
  textMuted: string;

  // Borders
  border: string;
  borderWidth: number;

  // Semantic
  error: string;
  success: string;
  accent: string;
  warning: string;

  // UI
  inputBackground: string;
  cardBackground: string;

  tagBackground: string;
  tagText: string;

  shadow: ShadowStyle;

  mapOverlayBackground: string;
  geofenceCircleFill: string;
  geofenceCircleStroke: string;

  // 🔥 BACKWARD COMPAT (OLD SYSTEM)
  colors: {
    bg: string;
    surface: string;
    primary: string;
    accent: string;
    text: string;
    border: string;
  };
}

export const lightTheme: Theme = {
  background: "#FFFDF0",
  surface: "#FFFFFF",

  primary: "#FFE500",
  primaryText: "#000000",

  text: "#000000",
  textSecondary: "#1A1A1A",
  textMuted: "#555555",

  border: "#000000",
  borderWidth: 2.5,

  error: "#EF0000",
  success: "#00A800",
  accent: "#0000EE",
  warning: "#FF6600",

  inputBackground: "#FFFFFF",
  cardBackground: "#FFFFFF",

  tagBackground: "#FFE500",
  tagText: "#000000",

  shadow: {
    shadowColor: "#000000",
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 6,
  },

  mapOverlayBackground: "rgba(255, 253, 240, 0.97)",
  geofenceCircleFill: "rgba(239, 0, 0, 0.10)",
  geofenceCircleStroke: "#EF0000",

  // 🔥 OLD SYSTEM SUPPORT
  colors: {
    bg: "#FFFDF0",
    surface: "#FFFFFF",
    primary: "#FFE500",
    accent: "#0000EE",
    text: "#000000",
    border: "#000000",
  },
};

export const darkTheme: Theme = {
  background: "#0D0D0D",
  surface: "#1A1A1A",

  primary: "#FFE500",
  primaryText: "#000000",

  text: "#FFFFFF",
  textSecondary: "#E0E0E0",
  textMuted: "#999999",

  border: "#FFFFFF",
  borderWidth: 2.5,

  error: "#FF4444",
  success: "#44DD44",
  accent: "#4499FF",
  warning: "#FF8833",

  inputBackground: "#1C1C1C",
  cardBackground: "#1C1C1C",

  tagBackground: "#FFE500",
  tagText: "#000000",

  shadow: {
    shadowColor: "#FFFFFF",
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 0,
    elevation: 6,
  },

  mapOverlayBackground: "rgba(13, 13, 13, 0.97)",
  geofenceCircleFill: "rgba(255, 68, 68, 0.12)",
  geofenceCircleStroke: "#FF4444",

  // 🔥 OLD SYSTEM SUPPORT
  colors: {
    bg: "#0D0D0D",
    surface: "#1A1A1A",
    primary: "#FFE500",
    accent: "#4499FF",
    text: "#FFFFFF",
    border: "#FFFFFF",
  },
};

export const getTheme = (isDark: boolean): Theme =>
  isDark ? darkTheme : lightTheme;
