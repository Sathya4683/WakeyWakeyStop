import { useThemeStore } from "@/store/themeStore";
import { baseStyles } from "@/theme/styles";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Maps() {
  const { theme } = useThemeStore();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <View style={baseStyles.container}>
        <Text>This is maps page</Text>
      </View>
    </SafeAreaView>
  );
}
