import CustomTabBar from "@/components/CustomTabBar";
import { useThemeStore } from "@/store/themeStore";
import { createNeoBrutalNavStyles, navSizes } from "@/theme/styles";
import { Ionicons } from "@expo/vector-icons";
import { DrawerActions, useNavigation } from "@react-navigation/native";
import { Tabs, useRouter } from "expo-router";
import { useMemo } from "react";
import { Pressable, StyleSheet } from "react-native";

export default function TabsLayout() {
  const { theme } = useThemeStore();
  const navigation = useNavigation();
  const router = useRouter();
  const navStyles = useMemo(() => createNeoBrutalNavStyles(theme), [theme]);

  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={({ route }) => ({
        headerStyle: navStyles.headerStyle,
        headerShadowVisible: false,

        headerTitle: "",

        headerLeft: () => (
          <Pressable
            onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
            style={({ pressed }) => [
              navStyles.headerIconButton,
              { backgroundColor: theme.colors.accent },
              pressed && localStyles.pressed,
            ]}
          >
            <Ionicons
              name="menu"
              size={navSizes.headerIcon}
              color={theme.colors.onAccent}
            />
          </Pressable>
        ),

        headerRight: () => (
          <Pressable
            onPress={() => {
              if (route.name === "maps") {
                router.push("/help/maps");
              } else if (route.name === "alarms") {
                router.push("/help/alarms");
              }
            }}
            style={({ pressed }) => [
              navStyles.headerIconButton,
              { backgroundColor: theme.colors.accentAlt },
              pressed && localStyles.pressed,
            ]}
          >
            <Ionicons
              name="help-circle-outline"
              size={navSizes.headerIcon}
              color={theme.colors.onAccentAlt}
            />
          </Pressable>
        ),

        headerStatusBarHeight: 0,
      })}
    >
      <Tabs.Screen
        name="maps"
        options={{
          title: "Map",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "map" : "map-outline"}
              size={navSizes.tabIcon}
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
              size={navSizes.tabIcon}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const localStyles = StyleSheet.create({
  pressed: {
    transform: [{ translateX: 2 }, { translateY: 2 }],
    shadowOpacity: 0,
    elevation: 0,
  },
});
