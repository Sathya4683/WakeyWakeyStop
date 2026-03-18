import { useThemeStore } from "@/store/themeStore";
import { createNeoBrutalNavStyles, navSizes, spacing } from "@/theme/styles";
import { Ionicons } from "@expo/vector-icons";
import {
  DrawerContentScrollView,
  DrawerItemList,
} from "@react-navigation/drawer";
import { useRouter } from "expo-router";
import { Drawer } from "expo-router/drawer";
import { useMemo } from "react";
import { Pressable, StyleSheet, Switch, Text, View } from "react-native";

export default function DrawerLayout() {
  const { theme, isDark, toggleTheme } = useThemeStore();
  const router = useRouter();
  const navStyles = useMemo(() => createNeoBrutalNavStyles(theme), [theme]);

  return (
    <Drawer
      screenOptions={{
        headerStyle: navStyles.headerStyle,
        headerShadowVisible: false,

        headerTitle: "",

        headerLeft: () => (
          <Pressable
            onPress={() => router.push("/maps")}
            style={({ pressed }) => [
              navStyles.headerIconButton,
              { backgroundColor: theme.colors.accentAlt },
              pressed && localStyles.pressed,
            ]}
          >
            <Ionicons
              name="home-outline"
              size={navSizes.headerIcon}
              color={theme.colors.onAccentAlt}
            />
          </Pressable>
        ),

        headerRight: undefined,

        headerStatusBarHeight: 0,

        drawerStyle: navStyles.drawerStyle,
        drawerLabelStyle: navStyles.drawerLabelStyle,
        drawerItemStyle: navStyles.drawerItemStyle,
        drawerActiveBackgroundColor: theme.colors.accentAlt,
        drawerInactiveBackgroundColor: theme.colors.surface,
        drawerActiveTintColor: theme.colors.onAccentAlt,
        drawerInactiveTintColor: theme.colors.text,
      }}
      drawerContent={(props) => (
        <View style={[localStyles.drawerContent, { backgroundColor: theme.colors.bg }]}>
          <DrawerContentScrollView
            {...props}
            contentContainerStyle={localStyles.drawerScrollContent}
          >
            <DrawerItemList {...props} />
          </DrawerContentScrollView>

          <View style={navStyles.drawerFooter}>
            <Text style={navStyles.drawerFooterLabel}>
              Dark Mode
            </Text>

            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{
                false: theme.colors.inactive,
                true: theme.colors.accent,
              }}
              thumbColor={theme.colors.surface}
            />
          </View>
        </View>
      )}
    >
      <Drawer.Screen
        name="(tabs)"
        options={{
          headerShown: false,
          drawerItemStyle: { display: "none" },
        }}
      />

      <Drawer.Screen
        name="settings"
        options={{
          title: "Settings",
          drawerIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "settings" : "settings-outline"}
              size={navSizes.headerIcon}
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
              size={navSizes.headerIcon}
              color={color}
            />
          ),
        }}
      />
      <Drawer.Screen
        name="help/maps"
        options={{
          drawerItemStyle: { display: "none" },
        }}
      />

      <Drawer.Screen
        name="help/alarms"
        options={{
          drawerItemStyle: { display: "none" },
        }}
      />
    </Drawer>
  );
}

const localStyles = StyleSheet.create({
  drawerContent: {
    flex: 1,
  },
  drawerScrollContent: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  pressed: {
    transform: [{ translateX: 2 }, { translateY: 2 }],
    shadowOpacity: 0,
    elevation: 0,
  },
});
