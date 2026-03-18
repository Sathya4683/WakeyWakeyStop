import { useThemeStore } from "@/store/themeStore";
import { nerdFontAssets } from "@/theme/fonts";
import { useFonts } from "expo-font";
import { Slot } from "expo-router";
import { StatusBar } from "react-native";
import "react-native-gesture-handler";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

export default function RootLayout() {
  const { theme, isDark } = useThemeStore();
  const [fontsLoaded] = useFonts(nerdFontAssets);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView
        style={{ flex: 1, backgroundColor: theme.colors.bg }}
        edges={["top", "bottom"]}
      >
        <StatusBar
          barStyle={isDark ? "light-content" : "dark-content"}
          backgroundColor={theme.colors.bg}
        />

        <Slot />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
