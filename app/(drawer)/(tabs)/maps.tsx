import { useThemeStore } from "@/store/themeStore";
import { baseStyles } from "@/theme/styles";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Maps() {
  const { theme } = useThemeStore();

  const styles = StyleSheet.create({
    text: {
      color: theme.colors.text, // primary text color
      fontSize: 18,
      fontWeight: "600",
    },
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <View style={baseStyles.container}>
        <Text style={styles.text}>This is maps page</Text>
      </View>
    </SafeAreaView>
  );
}
