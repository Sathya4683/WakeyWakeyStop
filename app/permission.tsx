import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

export default function PermissionScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handlePermission = async () => {
    setLoading(true);

    const loc1 = await Location.requestForegroundPermissionsAsync();
    const loc2 = await Location.requestBackgroundPermissionsAsync();
    const notif = await Notifications.requestPermissionsAsync();
    const ok = loc1.status === "granted" && loc2.status === "granted";
    notif.status === "granted";

    if (ok) {
      router.replace("/(drawer)/(tabs)/maps");
    } else {
      setLoading(false);
    }
  };

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Text style={{ fontSize: 18, fontWeight: "800" }}>
        Permissions Required
      </Text>

      <Pressable
        onPress={handlePermission}
        style={{
          marginTop: 20,
          padding: 10,
          borderWidth: 2,
        }}
      >
        <Text>{loading ? "Checking..." : "Grant Permissions"}</Text>
      </Pressable>
    </View>
  );
}
