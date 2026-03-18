import { useThemeStore } from "@/store/themeStore";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

export default function HelpAlarms() {
  const { theme } = useThemeStore();
  const router = useRouter();

  const steps = [
    "Step 1: Open Alarm tab",
    "Step 2: Set your stop",
    "Step 3: Choose schedule",
    "Step 4: Enable alarm",
  ];

  const [index, setIndex] = useState(0);

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
        <Text
          style={{
            fontWeight: "900",
            fontSize: 18,
            color: theme.colors.text,
          }}
        >
          Alarm Help
        </Text>

        <Text
          style={{
            marginTop: 20,
            color: theme.colors.text,
          }}
        >
          {steps[index]}
        </Text>

        {/* Controls */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            marginTop: 20,
          }}
        >
          <Pressable onPress={() => setIndex((i) => Math.max(i - 1, 0))}>
            <Text style={{ color: theme.colors.text }}>Prev</Text>
          </Pressable>

          <Pressable
            onPress={() => setIndex((i) => Math.min(i + 1, steps.length - 1))}
          >
            <Text style={{ color: theme.colors.text }}>Next</Text>
          </Pressable>
        </View>

        <Pressable
          onPress={() => router.back()}
          style={{ marginTop: 20, alignItems: "center" }}
        >
          <Text
            style={{
              fontWeight: "800",
              color: theme.colors.text,
            }}
          >
            Close
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
