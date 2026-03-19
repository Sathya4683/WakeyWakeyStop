import { Theme } from "@/theme/theme";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PhotonFeature {
  type: "Feature";
  properties: {
    name: string;
    city?: string;
    state?: string;
    country?: string;
    osm_type?: string;
    type?: string;
  };
  geometry: {
    type: "Point";
    coordinates: [number, number]; // [longitude, latitude]
  };
}

interface Props {
  theme: Theme;
  onSelect: (feature: PhotonFeature) => void;
  onClear?: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PHOTON_URL = "https://photon.komoot.io/api/";
const DEBOUNCE_MS = 400;
const MIN_QUERY_LEN = 2;
const MAX_RESULTS = 3;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function featureLabel(f: PhotonFeature): string {
  const { name, city, state, country } = f.properties;
  return [name, city ?? state, country].filter(Boolean).join(", ");
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SearchBar({ theme, onSelect, onClear }: Props) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<PhotonFeature[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // ── Fetch suggestions ─────────────────────────────────────────────────────

  const fetchSuggestions = useCallback(async (q: string) => {
    // Cancel any in-flight request
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setLoading(true);
    try {
      const url = `${PHOTON_URL}?q=${encodeURIComponent(q)}&limit=${MAX_RESULTS}`;
      const res = await fetch(url, { signal: abortRef.current.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const features: PhotonFeature[] = data.features ?? [];
      setSuggestions(features);
      setOpen(features.length > 0);
    } catch (err: unknown) {
      if ((err as Error).name !== "AbortError") {
        setSuggestions([]);
        setOpen(false);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Debounced query watcher ───────────────────────────────────────────────

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.trim().length < MIN_QUERY_LEN) {
      setSuggestions([]);
      setOpen(false);
      setLoading(false);
      return;
    }

    debounceRef.current = setTimeout(
      () => fetchSuggestions(query.trim()),
      DEBOUNCE_MS,
    );

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, fetchSuggestions]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleSelect = (feature: PhotonFeature) => {
    setQuery(featureLabel(feature));
    setSuggestions([]);
    setOpen(false);
    Keyboard.dismiss();
    onSelect(feature);
  };

  const handleClear = () => {
    setQuery("");
    setSuggestions([]);
    setOpen(false);
    onClear?.();
  };

  // ── Styles ────────────────────────────────────────────────────────────────

  const s = makeStyles(theme);

  return (
    <View style={s.wrapper}>
      {/* ── Input row ── */}
      <View style={s.inputRow}>
        <Text style={s.searchIcon}>🔍</Text>
        <TextInput
          style={s.input}
          placeholder="Search bus stop or place…"
          placeholderTextColor={theme.textMuted}
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
          clearButtonMode="never" // we handle clear ourselves
        />
        {loading ? (
          <ActivityIndicator
            size="small"
            color={theme.text}
            style={s.adornment}
          />
        ) : query.length > 0 ? (
          <TouchableOpacity
            onPress={handleClear}
            style={s.adornment}
            hitSlop={8}
          >
            <Text style={[s.clearIcon, { color: theme.text }]}>✕</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* ── Suggestions dropdown ── */}
      {open && suggestions.length > 0 && (
        <View style={s.dropdown}>
          {suggestions.map((feat, idx) => (
            <TouchableOpacity
              key={`${feat.geometry.coordinates.join()}-${idx}`}
              style={[
                s.suggestion,
                idx < suggestions.length - 1 && s.suggestionBorder,
              ]}
              onPress={() => handleSelect(feat)}
              activeOpacity={0.75}
            >
              <Text style={s.suggestionText} numberOfLines={1}>
                📍 {featureLabel(feat)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    wrapper: {
      zIndex: 200,
    },
    inputRow: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: t.inputBackground,
      borderWidth: t.borderWidth,
      borderColor: t.border,
      ...t.shadow,
    },
    searchIcon: {
      paddingLeft: 12,
      fontSize: 16,
    },
    input: {
      flex: 1,
      paddingHorizontal: 10,
      paddingVertical: 13,
      color: t.text,
      fontSize: 15,
      fontWeight: "500",
    },
    adornment: {
      paddingHorizontal: 12,
      paddingVertical: 4,
    },
    clearIcon: {
      fontSize: 15,
      fontWeight: "700",
    },
    dropdown: {
      backgroundColor: t.surface,
      borderWidth: t.borderWidth,
      borderTopWidth: 0,
      borderColor: t.border,
      shadowColor: t.shadow.shadowColor,
      shadowOffset: { width: 4, height: 6 },
      shadowOpacity: t.shadow.shadowOpacity,
      shadowRadius: 0,
      elevation: 12,
    },
    suggestion: {
      paddingHorizontal: 14,
      paddingVertical: 13,
      backgroundColor: t.surface,
    },
    suggestionBorder: {
      borderBottomWidth: 1.5,
      borderBottomColor: t.border,
    },
    suggestionText: {
      color: t.text,
      fontSize: 14,
      fontWeight: "500",
    },
  });
