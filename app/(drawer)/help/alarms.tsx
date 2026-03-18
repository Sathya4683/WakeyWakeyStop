import { useThemeStore } from "@/store/themeStore";
import { baseStyles, createThemeSurfaceStyles } from "@/theme/styles";
import { useMemo } from "react";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function AlarmsHelpScreen() {
  const { theme } = useThemeStore();
  const surfaceStyles = useMemo(() => createThemeSurfaceStyles(theme), [theme]);

  return (
    <SafeAreaView style={surfaceStyles.screen}>
      <View style={baseStyles.container}>
        <View style={surfaceStyles.card}>
          <Text style={[baseStyles.title, { color: theme.colors.text }]}>Alarm Help</Text>
          <Text style={[baseStyles.text, { color: theme.colors.mutedText }]}>
            Start tracking before your trip and keep your notifications on so the
            app can alert you before your destination.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
