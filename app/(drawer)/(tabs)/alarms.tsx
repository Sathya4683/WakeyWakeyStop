import { useThemeStore } from "@/store/themeStore";
import { baseStyles, createThemeSurfaceStyles, spacing } from "@/theme/styles";
import { useMemo } from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Alarms() {
  const { theme } = useThemeStore();
  const surfaceStyles = useMemo(() => createThemeSurfaceStyles(theme), [theme]);

  return (
    <SafeAreaView style={surfaceStyles.screen}>
      <View style={baseStyles.container}>
        <View style={surfaceStyles.card}>
          <Text style={[baseStyles.title, { color: theme.colors.text }]}>Alarm Tab</Text>
          <Text
            style={[
              baseStyles.text,
              { color: theme.colors.mutedText, marginBottom: spacing.md },
            ]}
          >
            Start tracking when you are on the bus and get alerted before your stop.
          </Text>

          <Pressable
            style={[surfaceStyles.buttonPrimary, { marginBottom: spacing.sm }]}
          >
            <Text style={surfaceStyles.buttonPrimaryText}>START TRACKING</Text>
          </Pressable>

          <Pressable style={surfaceStyles.buttonSecondary}>
            <Text style={surfaceStyles.buttonSecondaryText}>STOP TRACKING</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
