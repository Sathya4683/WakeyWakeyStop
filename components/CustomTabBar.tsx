import { useThemeStore } from "@/store/themeStore";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

export default function CustomTabBar({ state, descriptors, navigation }) {
  const { theme } = useThemeStore();

  return (
    <View
      style={{
        flexDirection: "row",
        borderTopWidth: 3,
        borderTopColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
      }}
    >
      {state.routes.map((route, index) => {
        const isFocused = state.index === index;

        const icon = route.name === "maps" ? "map-outline" : "alarm-outline";

        return (
          <Pressable
            key={route.key}
            onPress={() => navigation.navigate(route.name)}
            style={{
              flex: 1,
              paddingVertical: 12,
              alignItems: "center",

              // 🔥 neo-brutal box
              borderRightWidth: index !== state.routes.length - 1 ? 2 : 0,
              borderRightColor: theme.colors.border,

              backgroundColor: isFocused
                ? theme.colors.primary
                : theme.colors.surface,
            }}
          >
            <Ionicons name={icon} size={20} color={theme.colors.text} />

            <Text
              style={{
                fontWeight: "900",
                fontSize: 12,
                marginTop: 2,
                color: theme.colors.text,
              }}
            >
              {route.name.toUpperCase()}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
