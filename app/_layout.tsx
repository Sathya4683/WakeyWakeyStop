import { useThemeStore } from "@/store/themeStore";
import { Stack } from "expo-router";
import { StatusBar } from "react-native";
import "react-native-gesture-handler";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

export default function RootLayout() {
  const { theme, isDark } = useThemeStore();

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
