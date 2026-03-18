import { useThemeStore } from "@/store/themeStore";
import type { AppTheme } from "@/theme/theme";
import {
  borderScale,
  createNeoBrutalNavStyles,
  navSizes,
  spacing,
} from "@/theme/styles";
import { type BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const getRouteIcon = (routeName: string, isFocused: boolean) => {
  if (routeName === "maps") {
    return isFocused ? "map" : "map-outline";
  }

  if (routeName === "alarms") {
    return isFocused ? "alarm" : "alarm-outline";
  }

  return isFocused ? "ellipse" : "ellipse-outline";
};

const getRouteAccent = (routeName: string, theme: AppTheme) => {
  if (routeName === "alarms") {
    return {
      background: theme.colors.accentAlt,
      text: theme.colors.onAccentAlt,
    };
  }

  return {
    background: theme.colors.accent,
    text: theme.colors.onAccent,
  };
};

export default function CustomTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const { theme } = useThemeStore();
  const navStyles = useMemo(() => createNeoBrutalNavStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, spacing.xs);

  return (
    <View
      style={[
        navStyles.tabBarContainer,
        {
          height: navSizes.tabHeight + bottomInset,
          paddingBottom: bottomInset,
        },
      ]}
    >
      {state.routes.map((route, index) => {
        const isFocused = state.index === index;
        const options = descriptors[route.key]?.options;
        const label =
          typeof options?.tabBarLabel === "string"
            ? options.tabBarLabel
            : (options?.title ?? route.name);
        const icon = getRouteIcon(route.name, isFocused);
        const routeAccent = getRouteAccent(route.name, theme);
        const iconColor = isFocused ? routeAccent.text : theme.colors.text;
        const labelColor = isFocused ? routeAccent.text : theme.colors.text;

        const onPress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: "tabLongPress",
            target: route.key,
          });
        };

        return (
          <Pressable
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options?.tabBarAccessibilityLabel}
            testID={options?.tabBarButtonTestID}
            onPress={onPress}
            onLongPress={onLongPress}
            style={({ pressed }) => [
              navStyles.tabBarItem,
              {
                borderRightWidth:
                  index === state.routes.length - 1 ? 0 : borderScale.bold,
                borderRightColor: theme.colors.border,
                backgroundColor: isFocused
                  ? routeAccent.background
                  : theme.colors.surface,
              },
              pressed && localStyles.pressed,
            ]}
          >
            <Ionicons name={icon} size={navSizes.tabIcon} color={iconColor} />

            <Text style={[navStyles.tabBarLabel, { color: labelColor }]}>
              {String(label).toUpperCase()}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const localStyles = StyleSheet.create({
  pressed: {
    transform: [{ translateX: 2 }, { translateY: 2 }],
  },
});
