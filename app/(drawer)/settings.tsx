import { useThemeStore } from "@/store/themeStore";
import { baseStyles } from "@/theme/styles";
import { Text } from "@react-navigation/elements";
import { StyleSheet, View } from "react-native";

export default function Settings() {
  const { theme } = useThemeStore();

  const styles = StyleSheet.create({
    text: {
      color: theme.colors.text,
      fontSize: 18,
      fontWeight: "600",
    },
  });

  return (
    <View style={[baseStyles.container, { backgroundColor: theme.colors.bg }]}>
      <Text style={styles.text}>This is settings page</Text>
    </View>
  );
}
