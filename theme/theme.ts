// theme/theme.ts

export type ThemeColors = {
  bg: string;
  surface: string;
  surfaceAlt: string;
  primary: string;
  onPrimary: string;
  accent: string;
  onAccent: string;
  accentAlt: string;
  onAccentAlt: string;
  text: string;
  mutedText: string;
  border: string;
  inactive: string;
};

export type AppTheme = {
  colors: ThemeColors;
};

export const lightTheme: AppTheme = {
  colors: {
    bg: "#EFF8FF",
    surface: "#FFFFFF",
    surfaceAlt: "#DFF4FF",
    primary: "#0A1428",
    onPrimary: "#F5FAFF",
    accent: "#00D1FF",
    onAccent: "#00161D",
    accentAlt: "#C9FF2F",
    onAccentAlt: "#1A1F00",
    text: "#0A1428",
    mutedText: "#3B4B66",
    border: "#0A1428",
    inactive: "#A9BCD7",
  },
};

export const darkTheme: AppTheme = {
  colors: {
    bg: "#0A1322",
    surface: "#121E34",
    surfaceAlt: "#1D2C47",
    primary: "#F2F8FF",
    onPrimary: "#09111F",
    accent: "#38E6FF",
    onAccent: "#07212A",
    accentAlt: "#D9FF5C",
    onAccentAlt: "#1C2500",
    text: "#F2F8FF",
    mutedText: "#9CB2D2",
    border: "#F2F8FF",
    inactive: "#4C5D7D",
  },
};
