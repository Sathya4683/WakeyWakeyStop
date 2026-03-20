import { useTrackingStore } from "@/store/trackingStore";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import { Animated, Pressable, Text, View } from "react-native";

const STEPS = [
  {
    number: "01",
    title: "Open Alarms",
    description: "Switch to the Alarm tab using the bottom navigation bar.",
    icon: "🔔",
  },
  {
    number: "02",
    title: "Set Your Stop",
    description: "Choose the transit stop where you want to be alerted.",
    icon: "🚉",
  },
  {
    number: "03",
    title: "Choose Schedule",
    description: "Pick a one-time or recurring schedule for your alarm.",
    icon: "📅",
  },
  {
    number: "04",
    title: "Enable Alarm",
    description:
      "Toggle the alarm on and you'll be notified before you arrive.",
    icon: "⚡",
  },
];

// ── Neo-brutalist tokens ──────────────────────────────────────────────────
const B = {
  bg: "#fffbea",
  surface: "#ffffff",
  accent: "#ffb800",
  black: "#0a0a0a",
  muted: "#6b6b6b",
  border: "#0a0a0a",
  error: "#ff3b30",
  success: "#00c566",
};

export default function HelpAlarms() {
  const router = useRouter();
  const { status, destination } = useTrackingStore();

  const [index, setIndex] = useState(0);
  const slideAnim = useRef(new Animated.Value(0)).current;

  const animateSlide = (direction: "next" | "prev", newIndex: number) => {
    Animated.sequence([
      Animated.timing(slideAnim, {
        toValue: direction === "next" ? -40 : 40,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 180,
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

  const statusColor =
    status === "tracking" ? B.success : status === "error" ? B.error : B.muted;

  const statusLabel =
    status === "tracking"
      ? "● TRACKING"
      : status === "error"
        ? "✕ ERROR"
        : "○ IDLE";

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.55)",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {/* Card — hard shadow, no border-radius */}
      <View
        style={{
          width: "88%",
          backgroundColor: B.surface,
          borderWidth: 3,
          borderColor: B.border,
          shadowColor: B.black,
          shadowOffset: { width: 6, height: 6 },
          shadowOpacity: 1,
          shadowRadius: 0,
          elevation: 8,
        }}
      >
        {/* Header bar */}
        <View
          style={{
            backgroundColor: B.accent,
            borderBottomWidth: 3,
            borderBottomColor: B.border,
            paddingHorizontal: 16,
            paddingVertical: 12,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Text
            style={{
              color: B.black,
              fontSize: 13,
              fontWeight: "900",
              letterSpacing: 3,
            }}
          >
            ALARM GUIDE
          </Text>

          {/* Live status from Zustand */}
          <Text
            style={{
              color: statusColor,
              fontSize: 9,
              fontWeight: "800",
              letterSpacing: 1.5,
              backgroundColor: B.black,
              paddingHorizontal: 8,
              paddingVertical: 3,
            }}
          >
            {statusLabel}
          </Text>
        </View>

        {/* Destination banner — only shown when set */}
        {destination && (
          <View
            style={{
              backgroundColor: B.bg,
              borderBottomWidth: 2,
              borderBottomColor: B.border,
              paddingHorizontal: 16,
              paddingVertical: 8,
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Text
              style={{
                fontSize: 9,
                color: B.muted,
                fontWeight: "900",
                letterSpacing: 2,
              }}
            >
              DEST
            </Text>
            <Text
              style={{
                fontSize: 12,
                color: B.black,
                fontWeight: "800",
                flex: 1,
              }}
              numberOfLines={1}
            >
              {destination.label
                ? destination.label.toUpperCase()
                : `${destination.lat.toFixed(4)}, ${destination.lon.toFixed(4)}`}
            </Text>
          </View>
        )}

        {/* Step content */}
        <Animated.View
          style={{
            paddingHorizontal: 20,
            paddingTop: 24,
            paddingBottom: 16,
            transform: [{ translateX: slideAnim }],
          }}
        >
          <View
            style={{ flexDirection: "row", alignItems: "flex-start", gap: 14 }}
          >
            {/* Icon tile */}
            <View
              style={{
                width: 52,
                height: 52,
                backgroundColor: B.bg,
                borderWidth: 3,
                borderColor: B.border,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ fontSize: 22 }}>{step.icon}</Text>
            </View>

            <View style={{ flex: 1 }}>
              {/* Step badge */}
              <View
                style={{
                  alignSelf: "flex-start",
                  backgroundColor: B.black,
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                  marginBottom: 4,
                }}
              >
                <Text
                  style={{
                    color: B.accent,
                    fontSize: 9,
                    fontWeight: "900",
                    letterSpacing: 3,
                  }}
                >
                  STEP {step.number}
                </Text>
              </View>

              <Text
                style={{
                  color: B.black,
                  fontSize: 20,
                  fontWeight: "900",
                  letterSpacing: -0.5,
                }}
              >
                {step.title}
              </Text>
            </View>
          </View>

          <Text
            style={{
              color: B.muted,
              fontSize: 13,
              lineHeight: 20,
              marginTop: 16,
              fontWeight: "500",
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
            paddingBottom: 18,
          }}
        >
          {STEPS.map((_, i) => (
            <Pressable key={i} onPress={() => setIndex(i)}>
              <View
                style={{
                  width: i === index ? 24 : 8,
                  height: 8,
                  backgroundColor: i === index ? B.accent : "#d0d0d0",
                  borderWidth: 2,
                  borderColor: B.border,
                }}
              />
            </Pressable>
          ))}
        </View>

        {/* Nav row */}
        <View
          style={{
            flexDirection: "row",
            borderTopWidth: 3,
            borderTopColor: B.border,
          }}
        >
          <Pressable
            onPress={goPrev}
            disabled={index === 0}
            style={({ pressed }) => ({
              flex: 1,
              paddingVertical: 14,
              alignItems: "center",
              backgroundColor: pressed ? "#ebebeb" : B.surface,
              borderRightWidth: 3,
              borderRightColor: B.border,
              opacity: index === 0 ? 0.3 : 1,
            })}
          >
            <Text
              style={{
                color: B.black,
                fontSize: 11,
                fontWeight: "900",
                letterSpacing: 2,
              }}
            >
              ← PREV
            </Text>
          </Pressable>

          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => ({
              paddingVertical: 14,
              paddingHorizontal: 18,
              alignItems: "center",
              backgroundColor: pressed ? B.black : B.surface,
              borderRightWidth: 3,
              borderRightColor: B.border,
            })}
          >
            <Text style={{ color: B.muted, fontSize: 13, fontWeight: "900" }}>
              ✕
            </Text>
          </Pressable>

          <Pressable
            onPress={goNext}
            disabled={index === STEPS.length - 1}
            style={({ pressed }) => ({
              flex: 1,
              paddingVertical: 14,
              alignItems: "center",
              backgroundColor: pressed ? B.accent : B.surface,
              opacity: index === STEPS.length - 1 ? 0.3 : 1,
            })}
          >
            <Text
              style={{
                color: B.black,
                fontSize: 11,
                fontWeight: "900",
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
