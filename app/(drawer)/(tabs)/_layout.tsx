import { useThemeStore } from "@/store/themeStore";
import { Ionicons } from "@expo/vector-icons";
import { DrawerActions, useNavigation } from "@react-navigation/native";
import { Tabs, useRouter } from "expo-router";
import { Pressable } from "react-native";

export default function TabsLayout() {
  const { theme } = useThemeStore();
  const navigation = useNavigation();
  const router = useRouter();

  return (
    <Tabs
      screenOptions={({ route }) => ({
        // 🔻 HEADER
        headerStyle: {
          backgroundColor: theme.colors.primary,
          borderBottomWidth: 0.5,
          borderBottomColor: "#ddd",
        },

        headerTitle: "",

        // 🔻 LEFT (menu)
        headerLeft: () => (
          <Pressable
            onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
            style={{ marginLeft: 14, padding: 6 }}
          >
            <Ionicons name="menu" size={22} color={theme.colors.bg} />
          </Pressable>
        ),

        // 🔥 RIGHT (context-aware help)
        headerRight: () => (
          <Pressable
            onPress={() => {
              if (route.name === "maps") {
                router.push("/help/maps");
              } else if (route.name === "alarms") {
                router.push("/help/alarms");
              }
            }}
            style={{ marginRight: 14, padding: 6 }}
          >
            <Ionicons
              name="help-circle-outline"
              size={22}
              color={theme.colors.bg}
            />
          </Pressable>
        ),

        headerStatusBarHeight: 0,

        // 🔻 TABS
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          height: 50,
          borderTopWidth: 0.5,
          borderTopColor: "#ddd",
          elevation: 0,
        },

        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "500",
        },

        tabBarActiveTintColor: theme.colors.text,
        tabBarInactiveTintColor: "#888",
      })}
    >
      <Tabs.Screen
        name="maps"
        options={{
          title: "Map",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "map" : "map-outline"}
              size={22}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="alarms"
        options={{
          title: "Alarm",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "alarm" : "alarm-outline"}
              size={22}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
