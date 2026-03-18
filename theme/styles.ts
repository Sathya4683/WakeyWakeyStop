// theme/styles.ts

import { StyleSheet, type TextStyle, type ViewStyle } from "react-native";
import { fontFamilies } from "@/theme/fonts";
import type { AppTheme } from "@/theme/theme";

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
} as const;

export const borderScale = {
  thin: 2,
  bold: 3,
  heavy: 4,
} as const;

export const typeScale = {
  caption: 12,
  body: 16,
  title: 24,
  hero: 32,
} as const;

export const navSizes = {
  headerIcon: 24,
  headerButtonSize: 46,
  headerButtonMargin: 12,
  drawerWidth: 304,
  drawerLabel: 15,
  drawerItemMinHeight: 52,
  tabHeight: 72,
  tabIcon: 24,
  tabLabel: 13,
} as const;

// Hard shadow for neo-brutal depth.
export const brutalShadow: ViewStyle = {
  shadowColor: "#000000",
  shadowOffset: { width: 4, height: 4 },
  shadowOpacity: 1,
  shadowRadius: 0,
  elevation: 6,
};

export const baseStyles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.md,
  },
  card: {
    borderWidth: borderScale.bold,
    borderRadius: 0,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  button: {
    borderWidth: borderScale.bold,
    borderRadius: 0,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  buttonText: {
    fontFamily: fontFamilies.extraBold,
    fontSize: typeScale.body,
    letterSpacing: 0.4,
  },
  text: {
    fontFamily: fontFamilies.semiBold,
    fontSize: typeScale.body,
  },
  title: {
    fontFamily: fontFamilies.extraBold,
    fontSize: typeScale.title,
    marginBottom: spacing.sm,
    letterSpacing: 0.6,
  },
  input: {
    borderWidth: borderScale.bold,
    borderRadius: 0,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    minHeight: 48,
  },
});

export type NeoBrutalNavStyles = {
  headerStyle: ViewStyle;
  headerIconButton: ViewStyle;
  drawerStyle: ViewStyle;
  drawerLabelStyle: TextStyle;
  drawerItemStyle: ViewStyle;
  drawerFooter: ViewStyle;
  drawerFooterLabel: TextStyle;
  tabBarContainer: ViewStyle;
  tabBarItem: ViewStyle;
  tabBarLabel: TextStyle;
};

export const createNeoBrutalNavStyles = (theme: AppTheme): NeoBrutalNavStyles => ({
  headerStyle: {
    backgroundColor: theme.colors.primary,
    borderBottomWidth: borderScale.bold,
    borderBottomColor: theme.colors.border,
  },
  headerIconButton: {
    width: navSizes.headerButtonSize,
    height: navSizes.headerButtonSize,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: navSizes.headerButtonMargin,
    borderWidth: borderScale.bold,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.accent,
    borderRadius: 0,
    ...brutalShadow,
  },
  drawerStyle: {
    width: navSizes.drawerWidth,
    backgroundColor: theme.colors.bg,
    borderRightWidth: borderScale.bold,
    borderRightColor: theme.colors.border,
  },
  drawerLabelStyle: {
    fontSize: navSizes.drawerLabel,
    fontFamily: fontFamilies.bold,
    letterSpacing: 0.4,
  },
  drawerItemStyle: {
    minHeight: navSizes.drawerItemMinHeight,
    marginHorizontal: spacing.sm,
    marginVertical: spacing.xxs,
    borderWidth: borderScale.bold,
    borderColor: theme.colors.border,
    borderRadius: 0,
    ...brutalShadow,
  },
  drawerFooter: {
    padding: spacing.md,
    borderTopWidth: borderScale.bold,
    borderTopColor: theme.colors.border,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: theme.colors.surfaceAlt,
  },
  drawerFooterLabel: {
    fontSize: navSizes.drawerLabel,
    fontFamily: fontFamilies.bold,
    letterSpacing: 0.3,
    color: theme.colors.text,
  },
  tabBarContainer: {
    flexDirection: "row",
    height: navSizes.tabHeight,
    borderTopWidth: borderScale.bold,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceAlt,
  },
  tabBarItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 0,
  },
  tabBarLabel: {
    fontSize: navSizes.tabLabel,
    fontFamily: fontFamilies.bold,
    letterSpacing: 0.5,
    marginTop: spacing.xxs,
  },
});

export const createThemeSurfaceStyles = (theme: AppTheme) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.colors.bg,
    },
    card: {
      borderWidth: borderScale.bold,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      borderRadius: 0,
      padding: spacing.md,
      marginBottom: spacing.md,
      ...brutalShadow,
    },
    buttonPrimary: {
      borderWidth: borderScale.bold,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.accent,
      borderRadius: 0,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      alignItems: "center",
      justifyContent: "center",
      ...brutalShadow,
    },
    buttonPrimaryText: {
      color: theme.colors.onAccent,
      fontFamily: fontFamilies.extraBold,
      fontSize: typeScale.body,
      letterSpacing: 0.4,
    },
    buttonSecondary: {
      borderWidth: borderScale.bold,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.accentAlt,
      borderRadius: 0,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      alignItems: "center",
      justifyContent: "center",
      ...brutalShadow,
    },
    buttonSecondaryText: {
      color: theme.colors.onAccentAlt,
      fontFamily: fontFamilies.extraBold,
      fontSize: typeScale.body,
      letterSpacing: 0.4,
    },
  });
