import { useThemeStore } from "@/store/themeStore";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import {
  Animated,
  Pressable,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

const STEPS = [
  {
    number: "01",
    title: "Open Maps",
    description: "Navigate to the Maps tab from the bottom navigation bar.",
    icon: "🗺️",
  },
  {
    number: "02",
    title: "Pick Destination",
    description: "Tap any stop on the map or search by name to select it.",
    icon: "📍",
  },
  {
    number: "03",
    title: "Confirm Location",
    description: "Review the stop details and confirm your destination.",
    icon: "✅",
  },
  {
    number: "04",
    title: "Start Tracking",
    description: "Hit Track and get live updates as you approach your stop.",
    icon: "🚦",
  },
];

export default function HelpMaps() {
  const { theme } = useThemeStore();
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const { width } = useWindowDimensions();

  const animateSlide = (direction: "next" | "prev", newIndex: number) => {
    const toValue = direction === "next" ? -30 : 30;
    Animated.sequence([
      Animated.timing(slideAnim, {
        toValue,
        duration: 120,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
    setIndex(newIndex);
  };

  const goNext = () => {
    if (index < STEPS.length - 1) animateSlide("next", index + 1);
  };

  const goPrev = () => {
    if (index > 0) animateSlide("prev", index - 1);
  };

  const step = STEPS[index];

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.65)",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {/* Card */}
      <View
        style={{
          width: "88%",
          backgroundColor: "#0d0d14",
          borderRadius: 2,
          overflow: "hidden",
          borderWidth: 1,
          borderColor: "#2a2a3a",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 12 },
          shadowOpacity: 0.6,
          shadowRadius: 24,
          elevation: 20,
        }}
      >
        {/* Top accent bar */}
        <View style={{ height: 3, backgroundColor: "#00c8ff" }} />

        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 20,
            paddingTop: 18,
            paddingBottom: 10,
            borderBottomWidth: 1,
            borderBottomColor: "#1e1e2e",
          }}
        >
          <Text
            style={{
              color: "#00c8ff",
              fontSize: 10,
              fontWeight: "800",
              letterSpacing: 3,
              textTransform: "uppercase",
            }}
          >
            Maps Guide
          </Text>
          <Text
            style={{
              color: "#3a3a5a",
              fontSize: 10,
              fontWeight: "700",
              letterSpacing: 2,
            }}
          >
            {index + 1} / {STEPS.length}
          </Text>
        </View>

        {/* Step content */}
        <Animated.View
          style={{
            paddingHorizontal: 20,
            paddingTop: 28,
            paddingBottom: 20,
            transform: [{ translateX: slideAnim }],
          }}
        >
          {/* Icon + step number row */}
          <View
            style={{ flexDirection: "row", alignItems: "flex-start", gap: 14 }}
          >
            <View
              style={{
                width: 52,
                height: 52,
                backgroundColor: "#111122",
                borderRadius: 2,
                borderWidth: 1,
                borderColor: "#2a2a3a",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ fontSize: 24 }}>{step.icon}</Text>
            </View>

            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: "#00c8ff",
                  fontSize: 11,
                  fontWeight: "800",
                  letterSpacing: 2,
                  marginBottom: 4,
                }}
              >
                STEP {step.number}
              </Text>
              <Text
                style={{
                  color: "#ffffff",
                  fontSize: 20,
                  fontWeight: "800",
                  letterSpacing: -0.3,
                  lineHeight: 24,
                }}
              >
                {step.title}
              </Text>
            </View>
          </View>

          {/* Description */}
          <Text
            style={{
              color: "#7a7a9a",
              fontSize: 13,
              lineHeight: 20,
              marginTop: 18,
              fontWeight: "400",
            }}
          >
            {step.description}
          </Text>
        </Animated.View>

        {/* Progress dots */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "center",
            gap: 6,
            paddingBottom: 20,
          }}
        >
          {STEPS.map((_, i) => (
            <Pressable key={i} onPress={() => setIndex(i)}>
              <View
                style={{
                  width: i === index ? 20 : 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: i === index ? "#00c8ff" : "#2a2a3a",
                }}
              />
            </Pressable>
          ))}
        </View>

        {/* Divider */}
        <View style={{ height: 1, backgroundColor: "#1e1e2e" }} />

        {/* Navigation row */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          {/* Prev */}
          <Pressable
            onPress={goPrev}
            style={({ pressed }) => ({
              flex: 1,
              paddingVertical: 16,
              alignItems: "center",
              opacity: index === 0 ? 0.25 : pressed ? 0.6 : 1,
              borderRightWidth: 1,
              borderRightColor: "#1e1e2e",
            })}
            disabled={index === 0}
          >
            <Text
              style={{
                color: "#ffffff",
                fontSize: 11,
                fontWeight: "700",
                letterSpacing: 2,
              }}
            >
              ← PREV
            </Text>
          </Pressable>

          {/* Close */}
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => ({
              paddingVertical: 16,
              paddingHorizontal: 20,
              alignItems: "center",
              opacity: pressed ? 0.6 : 1,
              borderRightWidth: 1,
              borderRightColor: "#1e1e2e",
            })}
          >
            <Text
              style={{
                color: "#3a3a5a",
                fontSize: 11,
                fontWeight: "700",
                letterSpacing: 2,
              }}
            >
              CLOSE
            </Text>
          </Pressable>

          {/* Next */}
          <Pressable
            onPress={goNext}
            style={({ pressed }) => ({
              flex: 1,
              paddingVertical: 16,
              alignItems: "center",
              opacity: index === STEPS.length - 1 ? 0.25 : pressed ? 0.6 : 1,
            })}
            disabled={index === STEPS.length - 1}
          >
            <Text
              style={{
                color: "#00c8ff",
                fontSize: 11,
                fontWeight: "700",
                letterSpacing: 2,
              }}
            >
              NEXT →
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
