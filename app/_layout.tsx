import { useThemeStore } from "@/store/themeStore";
import { Slot } from "expo-router";
import { StatusBar } from "react-native";
import "react-native-gesture-handler";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

export default function RootLayout() {
  const { theme } = useThemeStore();

  return (
    <SafeAreaProvider>
      <SafeAreaView
        style={{ flex: 1, backgroundColor: theme.colors.bg }}
        edges={["top", "bottom"]}
      >
        <StatusBar
          barStyle="dark-content" // 🔥 dark icons
          backgroundColor="#ffffff"
        />

        <Slot />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
