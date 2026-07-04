import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Keyboard,
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    View,
} from 'react-native';
import Slider from '@react-native-community/slider';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ExpoLocation from 'expo-location';
import {
    Map as LibreMap,
    Camera,
    GeoJSONSource,
    Layer,
    Marker,
    type CameraRef,
} from '@maplibre/maplibre-react-native';
import { Button, Chip, Row, SectionLabel } from '../components/ui';
import { BottomSheet, CollapsiblePanel } from '../components/BottomSheet';
import { colors, radii, spacing, type } from '../theme';
import { useAlarms, useRecentPlaces, useSettings } from '../storage/stores';
import { searchPlaces, reverseGeocode } from '../services/geocoding';
import { circlePolygon, formatDistance, zoomForRadius } from '../lib/geo';
import { dateToMinutes, formatMinutes, minutesToDate } from '../lib/time';
import { newId } from '../lib/id';
import {
    MAX_RADIUS,
    MIN_RADIUS,
    RADIUS_PRESETS,
    type Alarm,
    type GeocodeResult,
    type Place,
} from '../types';
import { MAP_STYLE_URL, type ScreenProps } from '../navigation';

/**
 * Creating an alarm is three light steps, never all at once:
 *
 *   1. Pick the place — search or tap the map.
 *   2. Pick the wake distance — one slider, with the map circle as live
 *      feedback. The panel is a dockable sheet: swipe it down to a slim
 *      peek bar so the whole map is free for nudging the pin precisely.
 *      The place name and a Continue button stay visible in both states.
 *   3. Everything else — name, active hours, repeat, sound, vibrate —
 *      lives in a modal sheet with the exact same handle and motion, so
 *      backing out to tweak the radius or pin is one identical flick down.
 */
export function EditAlarmScreen({ navigation, route }: ScreenProps<'EditAlarm'>) {
    const alarmId = route.params?.alarmId;
    const { alarms, upsert, remove } = useAlarms();
    const { settings, update: updateSettings } = useSettings();
    const recents = useRecentPlaces();
    const existing = useMemo(() => alarms.find((a) => a.id === alarmId), [alarms, alarmId]);

    const [destination, setDestination] = useState<Place | null>(existing?.destination ?? null);
    const [label, setLabel] = useState(existing?.label ?? '');
    const [labelTouched, setLabelTouched] = useState(!!existing);
    const [radius, setRadius] = useState(existing?.radiusMeters ?? settings.defaultRadiusMeters);
    const [repeat, setRepeat] = useState(existing?.repeat ?? false);
    const [soundOn, setSoundOn] = useState(existing?.sound ?? settings.defaultSound);
    const [vibrateOn, setVibrateOn] = useState(existing?.vibrate ?? settings.defaultVibrate);
    // Active hours are mandatory: the alarm only rings inside this window, so
    // walking *to* the bus stop in the morning can't trip the evening alarm.
    const [windowStart, setWindowStart] = useState<number | null>(existing?.windowStart ?? null);
    const [windowEnd, setWindowEnd] = useState<number | null>(existing?.windowEnd ?? null);
    const [pickerFor, setPickerFor] = useState<'start' | 'end' | null>(null);
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [panelCollapsed, setPanelCollapsed] = useState(false);
    const [saving, setSaving] = useState(false);
    const insets = useSafeAreaInsets();

    const [query, setQuery] = useState('');
    const [results, setResults] = useState<GeocodeResult[]>([]);
    const [searching, setSearching] = useState(false);
    const [searchError, setSearchError] = useState<string | null>(null);
    const [searchFocused, setSearchFocused] = useState(false);
    const abortRef = useRef<AbortController | null>(null);

    const cameraRef = useRef<CameraRef>(null);

    // Initial camera: editing -> the alarm; otherwise last map position,
    // falling back to the device's last known fix.
    const initialCenter = useMemo<{ lng: number; lat: number; zoom: number }>(() => {
        if (existing) {
            return {
                lng: existing.destination.longitude,
                lat: existing.destination.latitude,
                zoom: zoomForRadius(existing.radiusMeters),
            };
        }
        if (settings.lastMapCenter) {
            const c = settings.lastMapCenter;
            return { lng: c.longitude, lat: c.latitude, zoom: c.zoom };
        }
        return { lng: 0, lat: 20, zoom: 1.5 };
    }, [existing, settings.lastMapCenter]);

    useEffect(() => {
        if (existing || settings.lastMapCenter) return;
        void (async () => {
            const fg = await ExpoLocation.getForegroundPermissionsAsync();
            if (!fg.granted) return;
            const last =
                (await ExpoLocation.getLastKnownPositionAsync().catch(() => null)) ??
                (await ExpoLocation.getCurrentPositionAsync({
                    accuracy: ExpoLocation.LocationAccuracy.Balanced,
                }).catch(() => null));
            if (last) {
                cameraRef.current?.jumpTo({
                    center: [last.coords.longitude, last.coords.latitude],
                    zoom: 11,
                });
            }
        })();
    }, [existing, settings.lastMapCenter]);

    // Debounced destination search.
    useEffect(() => {
        abortRef.current?.abort();
        setSearchError(null);
        if (query.trim().length < 3) {
            setResults([]);
            setSearching(false);
            return;
        }
        const controller = new AbortController();
        abortRef.current = controller;
        setSearching(true);
        const t = setTimeout(async () => {
            try {
                const found = await searchPlaces(query.trim(), { signal: controller.signal });
                if (!controller.signal.aborted) setResults(found);
            } catch (e) {
                if (!controller.signal.aborted) {
                    setResults([]);
                    setSearchError('Search is unreachable. Check your connection, or drop a pin on the map.');
                }
            } finally {
                if (!controller.signal.aborted) setSearching(false);
            }
        }, 450);
        return () => {
            clearTimeout(t);
            controller.abort();
        };
    }, [query]);

    const choosePlace = useCallback(
        (place: Place, zoomTo = true) => {
            setDestination(place);
            if (!labelTouched) setLabel(place.name ?? 'Wake me here');
            setQuery('');
            setResults([]);
            setSearchFocused(false);
            Keyboard.dismiss();
            if (zoomTo) {
                cameraRef.current?.easeTo({
                    center: [place.longitude, place.latitude],
                    zoom: zoomForRadius(radius),
                    duration: 600,
                });
            }
        },
        [labelTouched, radius],
    );

    const onMapPress = useCallback(
        (lngLat: [number, number]) => {
            const [longitude, latitude] = lngLat;
            const pending: Place = { latitude, longitude };
            // A map tap respects the panel state: if it's tucked away the user is
            // fine-tuning the pin and the panel should stay out of the way.
            choosePlace(pending, false);
            // Resolve a human-readable name in the background; keep the pin if offline.
            void reverseGeocode(latitude, longitude).then((r) => {
                if (!r) return;
                setDestination((cur) =>
                    cur && cur.latitude === latitude && cur.longitude === longitude
                        ? { ...cur, name: r.name, address: r.address }
                        : cur,
                );
                setLabel((cur) => (labelTouched || (cur && cur !== 'Wake me here') ? cur : r.name));
            });
        },
        [choosePlace, labelTouched],
    );

    const wakeCircle = useMemo(
        () => (destination ? circlePolygon(destination, radius) : null),
        [destination, radius],
    );

    const windowSet = windowStart != null && windowEnd != null;
    const windowInvalid = windowSet && windowStart === windowEnd;
    const crossesMidnight = windowSet && !windowInvalid && windowEnd! < windowStart!;
    const canSave = !!destination && windowSet && !windowInvalid;

    const onPickTime = useCallback(
        (event: DateTimePickerEvent, date?: Date) => {
            const target = pickerFor;
            setPickerFor(null);
            if (event.type !== 'set' || !date || !target) return;
            const minutes = dateToMinutes(date);
            if (target === 'start') setWindowStart(minutes);
            else setWindowEnd(minutes);
        },
        [pickerFor],
    );

    const openDetails = useCallback(() => {
        Keyboard.dismiss();
        setDetailsOpen(true);
    }, []);

    const save = useCallback(async () => {
        if (!destination || windowStart == null || windowEnd == null) return;
        setSaving(true);
        const now = Date.now();
        const alarm: Alarm = {
            id: existing?.id ?? newId(),
            label: label.trim() || destination.name || 'Wake me here',
            destination,
            radiusMeters: Math.round(radius),
            enabled: true,
            repeat,
            sound: soundOn,
            vibrate: vibrateOn,
            windowStart,
            windowEnd,
            createdAt: existing?.createdAt ?? now,
            updatedAt: now,
            lastTriggeredAt: existing?.lastTriggeredAt,
            // Editing re-arms: clear today's completion and the inside flag.
            lastCompletedDay: undefined,
            inside: false,
        };
        await upsert(alarm);
        void recents.remember(destination);
        void updateSettings({
            lastMapCenter: {
                latitude: destination.latitude,
                longitude: destination.longitude,
                zoom: zoomForRadius(radius),
            },
        });
        setSaving(false);
        navigation.goBack();
    }, [destination, existing, label, radius, repeat, soundOn, vibrateOn, windowStart, windowEnd, upsert, recents, updateSettings, navigation]);

    const confirmDelete = useCallback(() => {
        if (!existing) return;
        Alert.alert('Delete alarm?', `"${existing.label}" will be removed.`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    await remove(existing.id);
                    navigation.goBack();
                },
            },
        ]);
    }, [existing, remove, navigation]);

    const showRecents = searchFocused && query.trim().length < 3 && recents.places.length > 0;
    useEffect(() => {
        void recents.hydrate();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <View style={styles.root}>
            <LibreMap
                style={styles.map}
                mapStyle={MAP_STYLE_URL}
                attribution
                attributionPosition={{ top: insets.top + 68, right: 8 }}
                logo={false}
                onPress={(e) => {
                    const { lngLat } = e.nativeEvent;
                    if (lngLat) onMapPress(lngLat);
                }}
            >
                <Camera
                    ref={cameraRef}
                    initialViewState={{
                        center: [initialCenter.lng, initialCenter.lat],
                        zoom: initialCenter.zoom,
                    }}
                />
                {wakeCircle && (
                    <GeoJSONSource id="wake-zone" data={wakeCircle}>
                        <Layer
                            id="wake-zone-fill"
                            type="fill"
                            paint={{ 'fill-color': '#FFB547', 'fill-opacity': 0.16 }}
                        />
                        <Layer
                            id="wake-zone-line"
                            type="line"
                            paint={{ 'line-color': '#FFB547', 'line-width': 2, 'line-opacity': 0.85 }}
                        />
                    </GeoJSONSource>
                )}
                {destination && (
                    <Marker lngLat={[destination.longitude, destination.latitude]} anchor="bottom">
                        <View style={styles.pin}>
                            <View style={styles.pinHead} />
                            <View style={styles.pinTail} />
                        </View>
                    </Marker>
                )}
            </LibreMap>

            {/* Search overlay */}
            <View style={[styles.searchWrap, { top: insets.top + spacing.sm }]}>
                <Row style={styles.searchRow}>
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Back"
                        onPress={() => navigation.goBack()}
                        style={({ pressed }) => [styles.backButton, pressed && { opacity: 0.7 }]}
                    >
                        <Text style={styles.backText}>←</Text>
                    </Pressable>
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search a station, stop or address…"
                        placeholderTextColor={colors.textFaint}
                        value={query}
                        onChangeText={setQuery}
                        onFocus={() => setSearchFocused(true)}
                        onBlur={() => setSearchFocused(false)}
                        returnKeyType="search"
                        accessibilityLabel="Search destination"
                    />
                    {searching && <ActivityIndicator color={colors.amber} style={{ marginRight: spacing.md }} />}
                </Row>

                {(results.length > 0 || showRecents || searchError) && (
                    <View style={styles.resultsCard}>
                        {searchError && <Text style={styles.searchError}>{searchError}</Text>}
                        {showRecents && <SectionLabel style={styles.recentLabel}>Recent places</SectionLabel>}
                        <FlatList
                            keyboardShouldPersistTaps="handled"
                            data={showRecents ? recents.places : results}
                            keyExtractor={(item, i) => `${item.latitude},${item.longitude},${i}`}
                            style={{ maxHeight: 260 }}
                            renderItem={({ item }) => (
                                <Pressable
                                    accessibilityRole="button"
                                    android_ripple={{ color: 'rgba(255,255,255,0.06)' }}
                                    onPress={() => {
                                        // Picking a fresh place puts the distance step front and
                                        // centre again.
                                        setPanelCollapsed(false);
                                        choosePlace({
                                            latitude: item.latitude,
                                            longitude: item.longitude,
                                            name: item.name,
                                            address: 'address' in item ? item.address : undefined,
                                        });
                                    }}
                                    style={({ pressed }) => [styles.resultRow, pressed && { opacity: 0.7 }]}
                                >
                                    <Text style={styles.resultName} numberOfLines={1}>
                                        {item.name ?? 'Pinned place'}
                                    </Text>
                                    {'address' in item && item.address ? (
                                        <Text style={styles.resultAddress} numberOfLines={1}>
                                            {item.address}
                                        </Text>
                                    ) : null}
                                </Pressable>
                            )}
                        />
                    </View>
                )}
            </View>

            {/* Step panel: place hint, then the dockable wake-distance sheet */}
            <View style={styles.panelWrap} pointerEvents="box-none">
                {!destination ? (
                    <View style={[styles.hintPanel, { paddingBottom: insets.bottom + spacing.lg }]}>
                        <Text style={styles.hintTitle}>Where should we wake you?</Text>
                        <Text style={styles.hintBody}>
                            Search above, or tap the map to drop a pin on your stop.
                        </Text>
                    </View>
                ) : (
                    <CollapsiblePanel
                        collapsed={panelCollapsed}
                        onCollapsedChange={setPanelCollapsed}
                        bottomInset={insets.bottom}
                        peek={
                            <Row style={styles.peekRow}>
                                <Pressable
                                    accessibilityRole="button"
                                    accessibilityLabel={panelCollapsed ? 'Expand distance panel' : 'Collapse distance panel'}
                                    onPress={() => setPanelCollapsed((c) => !c)}
                                    style={({ pressed }) => [{ flex: 1 }, pressed && { opacity: 0.8 }]}
                                >
                                    <Text style={type.heading} numberOfLines={1}>
                                        {destination.name ?? (label || 'Pinned place')}
                                    </Text>
                                    <Text style={styles.peekMeta} numberOfLines={1}>
                                        {panelCollapsed
                                            ? `wake at ${formatDistance(radius)}  ·  tap the map to move the pin`
                                            : destination.address ??
                                            `${destination.latitude.toFixed(5)}, ${destination.longitude.toFixed(5)}`}
                                    </Text>
                                </Pressable>
                                <Button
                                    title="Continue"
                                    onPress={openDetails}
                                    style={styles.peekButton}
                                    accessibilityHint="Opens alarm details: active hours, repeat, sound and vibration"
                                />
                            </Row>
                        }
                    >
                        <Row style={styles.radiusHeader}>
                            <SectionLabel style={{ marginBottom: 0 }}>Wake distance</SectionLabel>
                            <Text style={styles.radiusValue}>{formatDistance(radius)}</Text>
                        </Row>
                        <Text style={styles.radiusHelp}>
                            How close should you be when it rings? The amber circle is your
                            wake zone — leave enough room to wake up and gather your things.
                        </Text>
                        <Slider
                            style={styles.slider}
                            minimumValue={MIN_RADIUS}
                            maximumValue={MAX_RADIUS}
                            step={100}
                            value={radius}
                            onValueChange={setRadius}
                            minimumTrackTintColor={colors.amber}
                            maximumTrackTintColor={colors.line}
                            thumbTintColor={colors.amber}
                            accessibilityLabel="Wake distance"
                        />
                        <Row style={styles.presets}>
                            {RADIUS_PRESETS.map((m) => (
                                <Chip
                                    key={m}
                                    label={formatDistance(m)}
                                    active={Math.abs(radius - m) < 50}
                                    onPress={() => setRadius(m)}
                                />
                            ))}
                        </Row>
                    </CollapsiblePanel>
                )}
            </View>

            {/* Step 3: details in a swipe-to-close modal sheet */}
            <BottomSheet visible={detailsOpen} onClose={() => setDetailsOpen(false)}>
                <ScrollView
                    bounces={false}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={[
                        styles.sheetContent,
                        { paddingBottom: insets.bottom + spacing.lg },
                    ]}
                >
                    <SectionLabel>Alarm details</SectionLabel>
                    <TextInput
                        style={styles.labelInput}
                        value={label}
                        onChangeText={(t) => {
                            setLabel(t);
                            setLabelTouched(true);
                        }}
                        placeholder="Alarm name"
                        placeholderTextColor={colors.textFaint}
                        accessibilityLabel="Alarm name"
                    />
                    {destination && (
                        <Text style={styles.sheetPlace} numberOfLines={1}>
                            {formatDistance(radius)} around{' '}
                            {destination.name ?? destination.address ?? 'your pin'}
                        </Text>
                    )}

                    <Row style={[styles.radiusHeader, { marginTop: spacing.xl }]}>
                        <SectionLabel style={{ marginBottom: 0 }}>Active hours</SectionLabel>
                        {crossesMidnight && <Text style={styles.windowHint}>crosses midnight</Text>}
                    </Row>
                    <Row style={styles.windowRow}>
                        <TimeField label="From" value={windowStart} onPress={() => setPickerFor('start')} />
                        <Text style={styles.windowDash}>–</Text>
                        <TimeField label="Until" value={windowEnd} onPress={() => setPickerFor('end')} />
                    </Row>
                    <Text style={windowInvalid ? styles.windowError : styles.windowHelp}>
                        {windowInvalid
                            ? 'Start and end can\u2019t be the same time.'
                            : 'Required — the alarm only rings inside these hours, so heading out earlier won\u2019t set it off.'}
                    </Text>

                    <Row style={styles.optionRow}>
                        <OptionSwitch label="Repeat" hint="re-arms every day" value={repeat} onChange={setRepeat} />
                        <OptionSwitch label="Sound" value={soundOn} onChange={setSoundOn} />
                        <OptionSwitch label="Vibrate" value={vibrateOn} onChange={setVibrateOn} />
                    </Row>

                    <Row style={{ gap: spacing.md, marginTop: spacing.xl }}>
                        {existing && (
                            <Button title="Delete" variant="danger" onPress={confirmDelete} style={{ flex: 1 }} />
                        )}
                        <Button
                            title={existing ? 'Save changes' : 'Add alarm'}
                            onPress={() => void save()}
                            loading={saving}
                            disabled={!canSave}
                            style={{ flex: 2 }}
                            accessibilityHint={
                                canSave ? 'Saves this location alarm' : 'Set the active hours first'
                            }
                        />
                    </Row>
                </ScrollView>
            </BottomSheet>

            {pickerFor && (
                <DateTimePicker
                    mode="time"
                    value={minutesToDate(
                        (pickerFor === 'start' ? windowStart : windowEnd) ??
                        (pickerFor === 'start' ? 17 * 60 : 18 * 60),
                    )}
                    onChange={onPickTime}
                />
            )}
        </View>
    );
}

function TimeField({
    label,
    value,
    onPress,
}: {
    label: string;
    value: number | null;
    onPress: () => void;
}) {
    return (
        <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${label} time${value != null ? `, ${formatMinutes(value)}` : ', not set'}`}
            onPress={onPress}
            android_ripple={{ color: 'rgba(255,255,255,0.08)' }}
            style={({ pressed }) => [
                styles.timeField,
                value == null && styles.timeFieldEmpty,
                pressed && { opacity: 0.85 },
            ]}
        >
            <Text style={styles.timeFieldLabel}>{label}</Text>
            <Text style={[styles.timeFieldValue, value == null && { color: colors.textDim }]}>
                {value != null ? formatMinutes(value) : 'Set time'}
            </Text>
        </Pressable>
    );
}

function OptionSwitch({
    label,
    hint,
    value,
    onChange,
}: {
    label: string;
    hint?: string;
    value: boolean;
    onChange: (v: boolean) => void;
}) {
    return (
        <View style={styles.option}>
            <Switch
                value={value}
                onValueChange={onChange}
                trackColor={{ false: colors.line, true: colors.amberLine }}
                thumbColor={value ? colors.amber : colors.textFaint}
                accessibilityLabel={label}
            />
            <Text style={styles.optionLabel}>{label}</Text>
            {hint ? <Text style={styles.optionHint}>{hint}</Text> : null}
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    map: { flex: 1 },
    pin: { alignItems: 'center' },
    pinHead: {
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: colors.amber,
        borderWidth: 3,
        borderColor: colors.text,
        elevation: 3,
    },
    pinTail: {
        width: 3,
        height: 10,
        backgroundColor: colors.amber,
        marginTop: -2,
        borderBottomLeftRadius: 2,
        borderBottomRightRadius: 2,
    },
    searchWrap: { position: 'absolute', left: spacing.lg, right: spacing.lg },
    searchRow: {
        backgroundColor: colors.surface,
        borderRadius: radii.lg,
        borderWidth: 1,
        borderColor: colors.line,
        overflow: 'hidden',
        elevation: 4,
    },
    backButton: { paddingHorizontal: spacing.lg, height: 52, justifyContent: 'center' },
    backText: { color: colors.text, fontSize: 20, fontWeight: '600' },
    searchInput: { flex: 1, height: 52, color: colors.text, fontSize: 15 },
    resultsCard: {
        marginTop: spacing.sm,
        backgroundColor: colors.surface,
        borderRadius: radii.md,
        borderWidth: 1,
        borderColor: colors.line,
        paddingVertical: spacing.xs,
        elevation: 4,
    },
    recentLabel: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
    searchError: { color: colors.danger, padding: spacing.lg, fontSize: 13, lineHeight: 18 },
    resultRow: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
    resultName: { color: colors.text, fontSize: 15, fontWeight: '600' },
    resultAddress: { color: colors.textFaint, fontSize: 12, marginTop: 1 },

    panelWrap: { position: 'absolute', left: 0, right: 0, bottom: 0 },
    hintPanel: {
        backgroundColor: colors.surface,
        borderTopLeftRadius: radii.xl,
        borderTopRightRadius: radii.xl,
        borderWidth: 1,
        borderColor: colors.line,
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.xl,
        paddingBottom: spacing.xl,
        gap: spacing.sm,
    },
    hintTitle: { ...type.heading },
    hintBody: { ...type.bodyDim, fontSize: 14 },

    peekRow: { gap: spacing.md, alignItems: 'center', paddingBottom: spacing.md },
    peekMeta: { color: colors.textFaint, fontSize: 12, marginTop: 2 },
    peekButton: { minHeight: 44, paddingHorizontal: spacing.lg },

    radiusHeader: { justifyContent: 'space-between', marginBottom: spacing.xs },
    radiusValue: { color: colors.amber, fontWeight: '800', fontSize: 16 },
    radiusHelp: { color: colors.textFaint, fontSize: 12, lineHeight: 17, marginBottom: spacing.xs },
    slider: { width: '100%', height: 36 },
    presets: { gap: spacing.sm, flexWrap: 'wrap', marginTop: spacing.xs },

    sheetContent: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm },
    labelInput: { ...type.title, paddingVertical: spacing.xs },
    sheetPlace: { color: colors.textFaint, fontSize: 13, marginTop: 2 },
    windowRow: { gap: spacing.sm, marginTop: spacing.sm, alignItems: 'center' },
    windowDash: { color: colors.textFaint, fontSize: 16 },
    timeField: {
        flex: 1,
        backgroundColor: colors.surfaceRaised,
        borderRadius: radii.md,
        borderWidth: 1,
        borderColor: colors.line,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        overflow: 'hidden',
    },
    timeFieldEmpty: { borderColor: colors.amberLine, backgroundColor: colors.amberSoft },
    timeFieldLabel: { color: colors.textFaint, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
    timeFieldValue: { color: colors.amber, fontSize: 17, fontWeight: '800', marginTop: 1 },
    windowHint: { color: colors.teal, fontSize: 12, fontWeight: '700' },
    windowHelp: { color: colors.textFaint, fontSize: 12, lineHeight: 17, marginTop: spacing.sm },
    windowError: { color: colors.danger, fontSize: 12, lineHeight: 17, marginTop: spacing.sm },
    optionRow: { gap: spacing.xl, marginTop: spacing.lg, alignItems: 'flex-start' },
    option: { alignItems: 'flex-start', gap: 2 },
    optionLabel: { color: colors.text, fontSize: 13, fontWeight: '600' },
    optionHint: { color: colors.textFaint, fontSize: 11, maxWidth: 110 },
});
