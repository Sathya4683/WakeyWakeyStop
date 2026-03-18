import { useThemeStore } from "@/store/themeStore";
import * as NavigationBar from "expo-navigation-bar";
import { Stack } from "expo-router";
import { useEffect } from "react";
import { StatusBar } from "react-native";
import "react-native-gesture-handler";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

export default function RootLayout() {
  const { theme, isDark } = useThemeStore();

  // 🔥 Control Android bottom navigation bar
  useEffect(() => {
    if (isDark) {
      // NavigationBar.setBackgroundColorAsync("#000000"); // dark bg
      NavigationBar.setButtonStyleAsync("light"); // white icons
    } else {
      // NavigationBar.setBackgroundColorAsync("#ffffff"); // light bg
      NavigationBar.setButtonStyleAsync("dark"); // dark icons
    }
  }, [isDark]);

  return (
    <SafeAreaProvider>
      <SafeAreaView
        style={{ flex: 1, backgroundColor: theme.colors.bg }}
        edges={["top", "bottom"]}
      >
        <StatusBar
          barStyle={isDark ? "light-content" : "dark-content"}
          backgroundColor={isDark ? "#000000" : "#ffffff"}
        />

        <Stack screenOptions={{ headerShown: false }}>
          {/* Main app */}
          <Stack.Screen name="(drawer)" />

          {/* Modals */}
          <Stack.Screen
            name="helpMaps"
            options={{
              presentation: "transparentModal",
              animation: "fade",
            }}
          />

          <Stack.Screen
            name="helpAlarms"
            options={{
              presentation: "transparentModal",
              animation: "fade",
            }}
          />
        </Stack>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
