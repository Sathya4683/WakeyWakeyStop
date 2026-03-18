// store/themeStore.ts

import { darkTheme, lightTheme } from "@/theme/theme";
import { create } from "zustand";

type ThemeType = typeof lightTheme;

type ThemeStore = {
  theme: ThemeType;
  isDark: boolean;
  toggleTheme: () => void;
};

export const useThemeStore = create<ThemeStore>((set) => ({
  theme: lightTheme,
  isDark: false,

  toggleTheme: () =>
    set((state) => ({
      isDark: !state.isDark,
      theme: state.isDark ? lightTheme : darkTheme,
    })),
}));
