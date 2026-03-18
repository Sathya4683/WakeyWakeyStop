import { useThemeStore } from "@/store/themeStore";
import { baseStyles, createThemeSurfaceStyles, spacing } from "@/theme/styles";
import { useMemo } from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SettingsScreen() {
  const { theme, isDark, toggleTheme } = useThemeStore();
  const surfaceStyles = useMemo(() => createThemeSurfaceStyles(theme), [theme]);

  return (
    <SafeAreaView style={surfaceStyles.screen}>
      <View style={baseStyles.container}>
        <View style={surfaceStyles.card}>
          <Text style={[baseStyles.title, { color: theme.colors.text }]}>Settings</Text>
          <Text
            style={[
              baseStyles.text,
              { color: theme.colors.mutedText, marginBottom: spacing.md },
            ]}
          >
            Manage sounds, notification behavior, and your visual theme.
          </Text>

          <Pressable style={surfaceStyles.buttonSecondary} onPress={toggleTheme}>
            <Text style={surfaceStyles.buttonSecondaryText}>
              {isDark ? "SWITCH TO LIGHT MODE" : "SWITCH TO DARK MODE"}
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
