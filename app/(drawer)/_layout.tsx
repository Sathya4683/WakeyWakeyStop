import { useThemeStore } from "@/store/themeStore";
import { Ionicons } from "@expo/vector-icons";
import {
  DrawerContentScrollView,
  DrawerItemList,
} from "@react-navigation/drawer";
import { useRouter } from "expo-router";
import { Drawer } from "expo-router/drawer";
import { Pressable, Switch, Text, View } from "react-native";

export default function DrawerLayout() {
  const { theme, isDark, toggleTheme } = useThemeStore();
  const router = useRouter();

  return (
    <Drawer
      screenOptions={{
        // 🔻 HEADER
        headerStyle: {
          backgroundColor: theme.colors.bg,
          borderBottomWidth: 0.5,
        },

        headerTitle: "",

        // 🔥 LEFT: Home icon only
        headerLeft: () => (
          <Pressable
            onPress={() => router.push("/maps")}
            style={{
              marginLeft: 14,
              padding: 6,
            }}
          >
            <Ionicons name="home-outline" size={22} color={theme.colors.text} />
          </Pressable>
        ),

        headerRight: undefined,

        headerStatusBarHeight: 0,

        // 🔻 DRAWER STYLE
        drawerStyle: {
          backgroundColor: theme.colors.bg,
        },

        drawerLabelStyle: {
          fontWeight: "600",
          fontSize: 14,
        },

        drawerActiveTintColor: theme.colors.text,
        drawerInactiveTintColor: "#888",
      }}
      // 🔻 Drawer content
      drawerContent={(props) => (
        <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
          {/* Drawer items */}
          <DrawerContentScrollView {...props}>
            <DrawerItemList {...props} />
          </DrawerContentScrollView>

          {/* Theme toggle */}
          <View
            style={{
              padding: 16,
              borderTopWidth: 0.5,
              borderTopColor: "#ddd",
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Text
              style={{
                fontSize: 14,
                fontWeight: "600",
                color: theme.colors.text,
              }}
            >
              Dark Mode
            </Text>

            <Switch value={isDark} onValueChange={toggleTheme} />
          </View>
        </View>
      )}
    >
      {/* Tabs (hidden) */}
      <Drawer.Screen
        name="(tabs)"
        options={{
          headerShown: false,
          drawerItemStyle: { display: "none" },
        }}
      />

      {/* Only required screens */}
      <Drawer.Screen
        name="settings"
        options={{
          title: "Settings",
          drawerIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "settings" : "settings-outline"}
              size={22}
              color={color}
            />
          ),
        }}
      />
      <Drawer.Screen
        name="about"
        options={{
          title: "About",
          drawerIcon: ({ color, focused }) => (
            <Ionicons
              name={
                focused ? "information-circle" : "information-circle-outline"
              }
              size={22}
              color={color}
            />
          ),
        }}
      />
    </Drawer>
  );
}
