import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { colors } from '../theme';

/**
 * The app's signature mark: a destination dot inside its wake-distance
 * rings. `pulse` animates an expanding ring — used while an alarm rings
 * and on the onboarding hero.
 */
export function RingMark({
  size = 160,
  pulse = false,
}: {
  size?: number;
  pulse?: boolean;
}) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!pulse) return;
    const loop = Animated.loop(
      Animated.timing(anim, {
        toValue: 1,
        duration: 2200,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse, anim]);

  const dot = size * 0.16;
  const ring = (scale: number, opacity: number, width: number) => (
    <View
      key={scale}
      style={[
        styles.ring,
        {
          width: size * scale,
          height: size * scale,
          borderRadius: (size * scale) / 2,
          borderWidth: width,
          borderColor: colors.amber,
          opacity,
        },
      ]}
    />
  );

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      {ring(1, 0.18, 2)}
      {ring(0.66, 0.4, 2)}
      {pulse && (
        <Animated.View
          style={[
            styles.ring,
            {
              width: size * 0.4,
              height: size * 0.4,
              borderRadius: (size * 0.4) / 2,
              borderWidth: 3,
              borderColor: colors.amber,
              opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 0] }),
              transform: [
                { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [1, 2.6] }) },
              ],
            },
          ]}
        />
      )}
      <View
        style={{
          width: dot,
          height: dot,
          borderRadius: dot / 2,
          backgroundColor: colors.amber,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute' },
});
