import React, { memo, useEffect, useRef } from "react";
import { Animated, View } from "react-native";

type DotLoaderProps = {
  dotClassName?: string;
  containerClassName?: string;
};

export const DotLoader = memo(function DotLoader({
  dotClassName = "h-2.5 w-2.5 bg-white",
  containerClassName = "",
}: DotLoaderProps) {
  const dots = [
    useRef(new Animated.Value(0.3)).current,
    useRef(new Animated.Value(0.3)).current,
    useRef(new Animated.Value(0.3)).current,
  ];

  useEffect(() => {
    const pulse = (dot: Animated.Value) =>
      Animated.sequence([
        Animated.timing(dot, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(dot, {
          toValue: 0.3,
          duration: 300,
          useNativeDriver: true,
        }),
      ]);

    const animation = Animated.loop(Animated.stagger(120, dots.map(pulse)));
    animation.start();
    return () => animation.stop();
  }, [dots]);

  return (
    <View
      className={`flex-row items-center justify-center gap-2 h-6 ${containerClassName}`}
    >
      {dots.map((dot, i) => (
        <Animated.View
          key={`dot-${i}`}
          style={{ opacity: dot, transform: [{ scale: dot }] }}
          className={`rounded-full ${dotClassName}`}
        />
      ))}
    </View>
  );
});
