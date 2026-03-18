// store/themeStore.ts

import { type AppTheme, darkTheme, lightTheme } from "@/theme/theme";
import { create } from "zustand";

type ThemeMode = "light" | "dark";

type ThemeStore = {
  theme: AppTheme;
  mode: ThemeMode;
  isDark: boolean;
  toggleTheme: () => void;
};

export const useThemeStore = create<ThemeStore>((set) => ({
  theme: lightTheme,
  mode: "light",
  isDark: false,

  toggleTheme: () =>
    set((state) => {
      const nextIsDark = !state.isDark;

      return {
        isDark: nextIsDark,
        mode: nextIsDark ? "dark" : "light",
        theme: nextIsDark ? darkTheme : lightTheme,
      };
    }),
}));
