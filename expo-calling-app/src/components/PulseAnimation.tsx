/**
 * PulseAnimation — Pulsing ring effect for ringing state
 */
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { theme } from '../theme';

interface PulseAnimationProps {
  color?: string;
  size?: number;
  active?: boolean;
}

export function PulseAnimation({
  color = theme.colors.primaryGlow,
  size = theme.layout.avatarSizeHero,
  active = true,
}: PulseAnimationProps) {
  const pulse1 = useRef(new Animated.Value(0)).current;
  const pulse2 = useRef(new Animated.Value(0)).current;
  const pulse3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) return;

    const createPulse = (value: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.parallel([
            Animated.timing(value, {
              toValue: 1,
              duration: theme.animation.ring,
              useNativeDriver: true,
            }),
          ]),
          Animated.timing(value, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      );

    const anim1 = createPulse(pulse1, 0);
    const anim2 = createPulse(pulse2, 500);
    const anim3 = createPulse(pulse3, 1000);

    anim1.start();
    anim2.start();
    anim3.start();

    return () => {
      anim1.stop();
      anim2.stop();
      anim3.stop();
    };
  }, [active]);

  const renderRing = (anim: Animated.Value) => {
    const scale = anim.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 2.2],
    });
    const opacity = anim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.6, 0],
    });

    return (
      <Animated.View
        style={[
          styles.ring,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderColor: color,
            transform: [{ scale }],
            opacity,
          },
        ]}
      />
    );
  };

  if (!active) return null;

  return (
    <View style={[styles.container, { width: size * 2.5, height: size * 2.5 }]}>
      {renderRing(pulse1)}
      {renderRing(pulse2)}
      {renderRing(pulse3)}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ring: {
    position: 'absolute',
    borderWidth: 2,
  },
});
