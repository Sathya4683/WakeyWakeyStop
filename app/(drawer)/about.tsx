import { useThemeStore } from "@/store/themeStore";
import { baseStyles, createThemeSurfaceStyles } from "@/theme/styles";
import { useMemo } from "react";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function AboutScreen() {
  const { theme } = useThemeStore();
  const surfaceStyles = useMemo(() => createThemeSurfaceStyles(theme), [theme]);

  return (
    <SafeAreaView style={surfaceStyles.screen}>
      <View style={baseStyles.container}>
        <View style={surfaceStyles.card}>
          <Text style={[baseStyles.title, { color: theme.colors.text }]}>About</Text>
          <Text style={[baseStyles.text, { color: theme.colors.mutedText }]}>
            WakeyWakeyBusStop helps you get a heads-up before your destination so
            you do not miss your stop.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
