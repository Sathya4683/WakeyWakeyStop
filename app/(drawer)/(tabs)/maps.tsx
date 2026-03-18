import { useThemeStore } from "@/store/themeStore";
import { baseStyles, createThemeSurfaceStyles, spacing } from "@/theme/styles";
import { useMemo } from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Maps() {
  const { theme } = useThemeStore();
  const surfaceStyles = useMemo(() => createThemeSurfaceStyles(theme), [theme]);

  return (
    <SafeAreaView style={surfaceStyles.screen}>
      <View style={baseStyles.container}>
        <View style={surfaceStyles.card}>
          <Text style={[baseStyles.title, { color: theme.colors.text }]}>Map Tab</Text>
          <Text
            style={[
              baseStyles.text,
              { color: theme.colors.mutedText, marginBottom: spacing.md },
            ]}
          >
            Pick your destination and keep this tab open while planning your ride.
          </Text>

          <Pressable style={surfaceStyles.buttonPrimary}>
            <Text style={surfaceStyles.buttonPrimaryText}>SELECT DESTINATION</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
