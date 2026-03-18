import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";

// 🔥 keep splash visible
SplashScreen.preventAutoHideAsync();

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    const checkPermissions = async () => {
      const loc1 = await Location.getForegroundPermissionsAsync();
      const loc2 = await Location.getBackgroundPermissionsAsync();
      const notif = await Notifications.getPermissionsAsync();

      const ok =
        loc1.status === "granted" &&
        loc2.status === "granted" &&
        notif.status === "granted";

      // hide splash AFTER decision
      await SplashScreen.hideAsync();

      if (ok) {
        router.replace("/(drawer)/(tabs)/maps");
      } else {
        router.replace("/permission");
      }
    };

    checkPermissions();
  }, []);

  return null; // 🔥 no UI needed
}
