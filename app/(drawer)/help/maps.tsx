import { useThemeStore } from "@/store/themeStore";
import { baseStyles, createThemeSurfaceStyles } from "@/theme/styles";
import { useMemo } from "react";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function MapsHelpScreen() {
  const { theme } = useThemeStore();
  const surfaceStyles = useMemo(() => createThemeSurfaceStyles(theme), [theme]);

  return (
    <SafeAreaView style={surfaceStyles.screen}>
      <View style={baseStyles.container}>
        <View style={surfaceStyles.card}>
          <Text style={[baseStyles.title, { color: theme.colors.text }]}>Map Help</Text>
          <Text style={[baseStyles.text, { color: theme.colors.mutedText }]}>
            Tap anywhere on the map to set your destination, or search for a
            place name to drop a stop marker quickly.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
