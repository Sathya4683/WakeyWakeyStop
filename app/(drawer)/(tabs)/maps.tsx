/**
 * maps.tsx — Destination picker + radius setter
 *
 * Flow:
 *   1. User location shown on load
 *   2. Search via Photon API → pick destination → blue marker
 *   3. Tap destination marker → radius mode
 *   4. Drag red marker → live circle preview
 *   5. Tap "Save Geofence" → stores PendingGeofence in Zustand → navigates to alarms tab
 *
 * This screen does NOT start monitoring. Monitoring is started from alarms.tsx.
 */

import * as Location from "expo-location";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, {
  Circle,
  Marker,
  MarkerDragStartEndEvent,
  PROVIDER_GOOGLE,
} from "react-native-maps";

import RadiusInfo from "@/components/RadiusInfo";
import SearchBar, { PhotonFeature } from "@/components/SearchBar";
import { useGeofenceStore } from "@/store/geofenceStore";
import { useThemeStore } from "@/store/themeStore";
import { getTheme, Theme } from "@/theme/theme";
import {
  formatDistance,
  haversineDistance,
  offsetNorth,
} from "@/utils/haversine";
import {
  setupAndroidNotificationChannels,
  setupNotificationHandler,
} from "@/utils/notifications";

// ─── Types ────────────────────────────────────────────────────────────────────

interface LatLng {
  latitude: number;
  longitude: number;
}

type MapMode = "idle" | "destination_set" | "radius_mode";

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_REGION = {
  latitude: 13.0827,
  longitude: 80.2707,
  latitudeDelta: 0.06,
  longitudeDelta: 0.06,
};
const INITIAL_RADIUS_M = 300;
const MIN_RADIUS_M = 50;

// ─── Component ────────────────────────────────────────────────────────────────

export default function MapsScreen() {
  const { isDark } = useThemeStore();
  const theme = getTheme(isDark);
  const { setPendingGeofence } = useGeofenceStore();
  const mapRef = useRef<MapView>(null);

  const [userLocation, setUserLocation] = useState<LatLng | null>(null);
  const [destination, setDestination] = useState<{
    coords: LatLng;
    name: string;
  } | null>(null);
  const [radiusMarker, setRadiusMarker] = useState<LatLng | null>(null);
  const [radius, setRadius] = useState(0);
  const [mode, setMode] = useState<MapMode>("idle");
  const [isDragging, setIsDragging] = useState(false);

  // ── One-time setup ────────────────────────────────────────────────────────
  useEffect(() => {
    setupNotificationHandler();
    setupAndroidNotificationChannels();
  }, []);

  // ── User location ─────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Location Required",
          "Enable location in Settings to use this app.",
        );
        return;
      }
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const coords: LatLng = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      };
      setUserLocation(coords);
      mapRef.current?.animateToRegion(
        { ...coords, latitudeDelta: 0.025, longitudeDelta: 0.025 },
        800,
      );
    })();
  }, []);

  // ── Search ────────────────────────────────────────────────────────────────
  const handleSearchSelect = useCallback((feature: PhotonFeature) => {
    const [lng, lat] = feature.geometry.coordinates;
    const { name, city, country } = feature.properties;
    const label = [name, city, country].filter(Boolean).join(", ");
    const coords: LatLng = { latitude: lat, longitude: lng };

    setDestination({ coords, name: label });
    setMode("destination_set");
    setRadiusMarker(null);
    setRadius(0);

    mapRef.current?.animateToRegion(
      { ...coords, latitudeDelta: 0.012, longitudeDelta: 0.012 },
      700,
    );
  }, []);

  const handleSearchClear = useCallback(() => {
    setDestination(null);
    setMode("idle");
    setRadiusMarker(null);
    setRadius(0);
  }, []);

  // ── Enter radius mode ─────────────────────────────────────────────────────
  const handleDestinationMarkerPress = useCallback(() => {
    if (!destination) return;
    const initial = offsetNorth(
      destination.coords.latitude,
      destination.coords.longitude,
      INITIAL_RADIUS_M,
    );
    setRadiusMarker(initial);
    setRadius(INITIAL_RADIUS_M);
    setMode("radius_mode");
    mapRef.current?.animateToRegion(
      { ...destination.coords, latitudeDelta: 0.018, longitudeDelta: 0.018 },
      500,
    );
  }, [destination]);

  // ── Drag radius marker ────────────────────────────────────────────────────
  const handleRadiusMarkerDrag = useCallback(
    (e: MarkerDragStartEndEvent) => {
      if (!destination) return;
      const { latitude, longitude } = e.nativeEvent.coordinate;
      setRadiusMarker({ latitude, longitude });
      const dist = haversineDistance(
        destination.coords.latitude,
        destination.coords.longitude,
        latitude,
        longitude,
      );
      setRadius(Math.round(dist));
    },
    [destination],
  );

  // ── Save geofence and go to alarms tab ────────────────────────────────────
  const handleSaveGeofence = useCallback(() => {
    if (!destination || radius < MIN_RADIUS_M) return;

    setPendingGeofence({
      destination: {
        lat: destination.coords.latitude,
        lng: destination.coords.longitude,
        name: destination.name,
      },
      radius,
    });

    router.push("/(drawer)/(tabs)/alarms");
  }, [destination, radius, setPendingGeofence]);

  // ── Reset ─────────────────────────────────────────────────────────────────
  const handleReset = useCallback(() => {
    setMode("idle");
    setDestination(null);
    setRadiusMarker(null);
    setRadius(0);
  }, []);

  // ── Recenter ──────────────────────────────────────────────────────────────
  const handleRecenter = useCallback(() => {
    if (!userLocation) return;
    mapRef.current?.animateToRegion(
      { ...userLocation, latitudeDelta: 0.02, longitudeDelta: 0.02 },
      600,
    );
  }, [userLocation]);

  const inRadiusMode = mode === "radius_mode";
  const canSave = radius >= MIN_RADIUS_M;
  const s = makeStyles(theme);

  return (
    <View style={s.container}>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor="transparent"
        translucent
      />

      {/* ── Map ────────────────────────────────────────────────────────────── */}
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        provider={PROVIDER_GOOGLE}
        showsUserLocation
        showsMyLocationButton={false}
        showsCompass={false}
        scrollEnabled={!isDragging}
        zoomEnabled={!isDragging}
        rotateEnabled={false}
        pitchEnabled={false}
        initialRegion={DEFAULT_REGION}
      >
        {destination && (
          <Marker
            coordinate={destination.coords}
            onPress={handleDestinationMarkerPress}
            pinColor="#0055FF"
            title={destination.name}
            description={
              mode === "destination_set" ? "Tap to set radius" : undefined
            }
            zIndex={2}
          />
        )}

        {destination && inRadiusMode && radius > 0 && (
          <Circle
            center={destination.coords}
            radius={radius}
            strokeColor={theme.geofenceCircleStroke}
            strokeWidth={2.5}
            fillColor={theme.geofenceCircleFill}
            zIndex={1}
          />
        )}

        {inRadiusMode && radiusMarker && (
          <Marker
            coordinate={radiusMarker}
            draggable
            pinColor="#EF0000"
            title="Drag to resize"
            zIndex={3}
            onDragStart={() => setIsDragging(true)}
            onDrag={handleRadiusMarkerDrag}
            onDragEnd={(e) => {
              setIsDragging(false);
              handleRadiusMarkerDrag(e);
            }}
          />
        )}
      </MapView>

      {/* ── Search overlay ────────────────────────────────────────────────── */}
      <View style={s.topOverlay}>
        <SearchBar
          theme={theme}
          onSelect={handleSearchSelect}
          onClear={handleSearchClear}
        />
        {mode === "destination_set" && (
          <View style={s.hintBubble}>
            <Text style={s.hintText}>
              Tap the blue marker to set geofence radius
            </Text>
          </View>
        )}
      </View>

      {/* ── Bottom panel (radius mode) ─────────────────────────────────────── */}
      {inRadiusMode && destination && (
        <View style={s.bottomOverlay}>
          <RadiusInfo
            theme={theme}
            destinationName={destination.name}
            radius={radius}
            onConfirm={handleSaveGeofence}
            onReset={handleReset}
          />

          {canSave && (
            <TouchableOpacity
              style={s.saveBtn}
              onPress={handleSaveGeofence}
              activeOpacity={0.85}
            >
              <Text style={s.saveBtnText}>
                SAVE GEOFENCE ({formatDistance(radius)})
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* ── Recenter ──────────────────────────────────────────────────────── */}
      {userLocation && (
        <TouchableOpacity
          style={[s.recenterBtn, inRadiusMode && s.recenterBtnRaised]}
          onPress={handleRecenter}
          activeOpacity={0.85}
        >
          <Text style={s.recenterIcon}>+</Text>
        </TouchableOpacity>
      )}

      {inRadiusMode && (
        <View style={s.modePill}>
          <Text style={s.modePillText}>RADIUS MODE</Text>
        </View>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: "#000" },

    topOverlay: {
      position: "absolute",
      top: Platform.OS === "ios" ? 58 : 14,
      left: 14,
      right: 14,
      zIndex: 100,
    },
    hintBubble: {
      marginTop: 8,
      backgroundColor: t.mapOverlayBackground,
      borderWidth: t.borderWidth,
      borderColor: t.border,
      padding: 10,
    },
    hintText: {
      color: t.text,
      fontSize: 13,
      fontWeight: "600",
    },

    bottomOverlay: {
      position: "absolute",
      bottom: 24,
      left: 14,
      right: 14,
      zIndex: 100,
    },
    saveBtn: {
      marginTop: 8,
      backgroundColor: t.primary,
      borderWidth: t.borderWidth,
      borderColor: t.border,
      paddingVertical: 17,
      alignItems: "center",
      shadowColor: t.border,
      shadowOffset: { width: 4, height: 4 },
      shadowOpacity: 1,
      shadowRadius: 0,
      elevation: 6,
    },
    saveBtnText: {
      color: t.primaryText,
      fontWeight: "900",
      fontSize: 14,
      letterSpacing: 1,
    },

    recenterBtn: {
      position: "absolute",
      bottom: 24,
      right: 14,
      width: 50,
      height: 50,
      backgroundColor: t.surface,
      borderWidth: t.borderWidth,
      borderColor: t.border,
      alignItems: "center",
      justifyContent: "center",
      ...t.shadow,
      zIndex: 50,
    },
    recenterBtnRaised: { bottom: 270 },
    recenterIcon: {
      fontSize: 28,
      color: t.text,
      fontWeight: "900",
      lineHeight: 32,
    },

    modePill: {
      position: "absolute",
      top: Platform.OS === "ios" ? 128 : 80,
      alignSelf: "center",
      backgroundColor: t.primary,
      borderWidth: t.borderWidth,
      borderColor: t.border,
      paddingHorizontal: 14,
      paddingVertical: 5,
      zIndex: 80,
    },
    modePillText: {
      color: t.primaryText,
      fontWeight: "900",
      fontSize: 11,
      letterSpacing: 1.5,
    },
  });
