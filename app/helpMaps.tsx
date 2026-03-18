import { useThemeStore } from "@/store/themeStore";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

export default function HelpMaps() {
  const { theme } = useThemeStore();
  const router = useRouter();

  const steps = [
    "Step 1: Open Maps tab",
    "Step 2: Select your destination",
    "Step 3: Confirm location",
    "Step 4: Start tracking",
  ];

  const [index, setIndex] = useState(0);

  const textColor = { color: theme.colors.text };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.4)",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <View
        style={{
          width: "85%",
          backgroundColor: theme.colors.surface,
          padding: 20,
          borderWidth: 3,
          borderColor: theme.colors.border,
        }}
      >
        <Text style={[textColor, { fontWeight: "900", fontSize: 18 }]}>
          Maps Help
        </Text>

        <Text style={[textColor, { marginTop: 20 }]}>{steps[index]}</Text>

        {/* Controls */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            marginTop: 20,
          }}
        >
          <Pressable onPress={() => setIndex((i) => Math.max(i - 1, 0))}>
            <Text style={textColor}>Prev</Text>
          </Pressable>

          <Pressable
            onPress={() => setIndex((i) => Math.min(i + 1, steps.length - 1))}
          >
            <Text style={textColor}>Next</Text>
          </Pressable>
        </View>

        <Pressable
          onPress={() => router.back()}
          style={{ marginTop: 20, alignItems: "center" }}
        >
          <Text style={[textColor, { fontWeight: "800" }]}>Close</Text>
        </Pressable>
      </View>
    </View>
  );
}
