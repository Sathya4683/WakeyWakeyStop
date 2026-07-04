import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Animated,
    BackHandler,
    Easing,
    PanResponder,
    Pressable,
    StyleSheet,
    View,
    useWindowDimensions,
    type GestureResponderHandlers,
} from 'react-native';
import { colors, radii, spacing } from '../theme';

/**
 * The app's single sheet language. Two components share one motion spec
 * (240 ms ease-out translate), one grab handle, and one surface style, so
 * every bottom panel in WakeyStop looks and drags the same way:
 *
 *  - <BottomSheet>        modal: slides over a dimmed scrim, swipe/tap/back
 *                         to close. Used for the alarm-details step.
 *  - <CollapsiblePanel>   non-modal: docks at the bottom and drags between
 *                         expanded and a slim peek state, never fully
 *                         leaves. Used for the wake-distance step, so the
 *                         whole map is available for precise pin placement.
 */

const TIMING = {
    duration: 240,
    easing: Easing.out(Easing.cubic),
    useNativeDriver: true,
} as const;

function Handle({
    panHandlers,
    hint,
}: {
    panHandlers: GestureResponderHandlers;
    hint: string;
}) {
    return (
        <View
            {...panHandlers}
            style={styles.handleZone}
            accessibilityRole="adjustable"
            accessibilityLabel="Drag handle"
            accessibilityHint={hint}
        >
            <View style={styles.handle} />
        </View>
    );
}

// ---------------------------------------------------------------- modal

export function BottomSheet({
    visible,
    onClose,
    children,
    maxHeightRatio = 0.82,
}: {
    visible: boolean;
    onClose: () => void;
    children: React.ReactNode;
    /** Sheet height cap as a fraction of the window height. */
    maxHeightRatio?: number;
}) {
    const { height: screenH } = useWindowDimensions();
    const [mounted, setMounted] = useState(visible);
    const translateY = useRef(new Animated.Value(screenH)).current;
    const onCloseRef = useRef(onClose);
    onCloseRef.current = onClose;

    const animateTo = useCallback(
        (to: number, done?: () => void) => {
            Animated.timing(translateY, { toValue: to, ...TIMING }).start(({ finished }) => {
                if (finished) done?.();
            });
        },
        [translateY],
    );

    // Mount + slide in / slide out + unmount.
    useEffect(() => {
        if (visible) {
            setMounted(true);
            translateY.setValue(screenH);
            requestAnimationFrame(() => animateTo(0));
        } else if (mounted) {
            animateTo(screenH, () => setMounted(false));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visible]);

    // Android back closes the sheet instead of leaving the screen.
    useEffect(() => {
        if (!visible) return;
        const sub = BackHandler.addEventListener('hardwareBackPress', () => {
            onCloseRef.current();
            return true;
        });
        return () => sub.remove();
    }, [visible]);

    // Drag-to-dismiss, attached to the handle zone only so inner scrolling
    // keeps working.
    const pan = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dy) > 4,
            onPanResponderMove: (_e, g) => {
                if (g.dy > 0) translateY.setValue(g.dy);
            },
            onPanResponderRelease: (_e, g) => {
                if (g.dy > 110 || g.vy > 0.9) onCloseRef.current();
                else Animated.timing(translateY, { toValue: 0, ...TIMING }).start();
            },
        }),
    ).current;

    if (!mounted) return null;

    const scrimOpacity = translateY.interpolate({
        inputRange: [0, screenH],
        outputRange: [1, 0],
        extrapolate: 'clamp',
    });

    return (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
            <Animated.View
                style={[styles.scrim, { opacity: scrimOpacity }]}
                pointerEvents={visible ? 'auto' : 'none'}
            >
                <Pressable
                    style={StyleSheet.absoluteFill}
                    onPress={() => onCloseRef.current()}
                    accessibilityRole="button"
                    accessibilityLabel="Close"
                    accessibilityHint="Closes the panel and returns to the map"
                />
            </Animated.View>

            <Animated.View
                style={[
                    styles.surface,
                    styles.modalSheet,
                    { maxHeight: screenH * maxHeightRatio, transform: [{ translateY }] },
                ]}
            >
                <Handle panHandlers={pan.panHandlers} hint="Swipe down to close" />
                {children}
            </Animated.View>
        </View>
    );
}

// ------------------------------------------------------------ dockable

export function CollapsiblePanel({
    collapsed,
    onCollapsedChange,
    peek,
    children,
    bottomInset,
}: {
    collapsed: boolean;
    onCollapsedChange: (collapsed: boolean) => void;
    /** Always-visible header row (shown in both states). */
    peek: React.ReactNode;
    /** Content that slides away when collapsed. */
    children: React.ReactNode;
    /** Safe-area bottom inset (so the peek clears the system bars). */
    bottomInset: number;
}) {
    const translateY = useRef(new Animated.Value(0)).current;
    const [fullH, setFullH] = useState(0);
    const [peekH, setPeekH] = useState(0);

    // How far down the panel slides when collapsed: everything except the
    // handle + peek row (plus a buffer that keeps the peek above the system
    // navigation area).
    const offset = Math.max(0, fullH - peekH - bottomInset - spacing.md);

    const offsetRef = useRef(offset);
    offsetRef.current = offset;
    const collapsedRef = useRef(collapsed);
    collapsedRef.current = collapsed;
    const onChangeRef = useRef(onCollapsedChange);
    onChangeRef.current = onCollapsedChange;

    // Follow the controlled prop (and re-settle after first measurement).
    useEffect(() => {
        Animated.timing(translateY, { toValue: collapsed ? offset : 0, ...TIMING }).start();
    }, [collapsed, offset, translateY]);

    const dragBase = useRef(0);
    const pan = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dy) > 4,
            onPanResponderGrant: () => {
                dragBase.current = collapsedRef.current ? offsetRef.current : 0;
            },
            onPanResponderMove: (_e, g) => {
                const next = Math.min(Math.max(dragBase.current + g.dy, 0), offsetRef.current);
                translateY.setValue(next);
            },
            onPanResponderRelease: (_e, g) => {
                const moved = Math.abs(g.dy) > 12 || Math.abs(g.vy) > 0.3;
                let target: boolean;
                if (!moved) {
                    target = !collapsedRef.current; // a plain tap toggles
                } else if (Math.abs(g.vy) > 0.4) {
                    target = g.vy > 0; // fling decides
                } else {
                    target = dragBase.current + g.dy > offsetRef.current / 2;
                }
                if (target === collapsedRef.current) {
                    // Same state: just settle back into place.
                    Animated.timing(translateY, {
                        toValue: target ? offsetRef.current : 0,
                        ...TIMING,
                    }).start();
                } else {
                    onChangeRef.current(target); // the effect above animates
                }
            },
        }),
    ).current;

    // Fade the expandable content out as it slides under the screen edge, so
    // no half-clipped sliver shows above the system bars.
    const contentOpacity =
        offset > 0
            ? translateY.interpolate({
                inputRange: [0, offset],
                outputRange: [1, 0],
                extrapolate: 'clamp',
            })
            : 1;

    return (
        <Animated.View
            style={[styles.surface, { transform: [{ translateY }] }]}
            onLayout={(e) => setFullH(Math.round(e.nativeEvent.layout.height))}
        >
            <View onLayout={(e) => setPeekH(Math.round(e.nativeEvent.layout.height))}>
                <Handle
                    panHandlers={pan.panHandlers}
                    hint="Swipe down to tuck the panel away and adjust the pin, swipe up to bring it back"
                />
                {peek}
            </View>
            <Animated.View
                style={{ opacity: contentOpacity }}
                pointerEvents={collapsed ? 'none' : 'auto'}
            >
                {children}
            </Animated.View>
            <View style={{ height: bottomInset + spacing.lg }} />
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    scrim: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: colors.overlay,
    },
    /** Shared sheet surface: every bottom panel in the app looks like this. */
    surface: {
        backgroundColor: colors.bg,
        borderTopLeftRadius: radii.xl,
        borderTopRightRadius: radii.xl,
        borderWidth: 1,
        borderColor: colors.line,
        paddingHorizontal: spacing.xl,
        elevation: 12,
    },
    modalSheet: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        paddingHorizontal: 0, // modal content manages its own padding (scrolls)
        elevation: 16,
    },
    handleZone: {
        alignItems: 'center',
        paddingTop: spacing.md,
        paddingBottom: spacing.sm,
        alignSelf: 'stretch',
    },
    handle: {
        width: 40,
        height: 4,
        borderRadius: radii.pill,
        backgroundColor: colors.line,
    },
});
