import React, { useRef, useEffect, useState } from "react";
import { View, Text, Pressable, Animated } from "react-native";

type AnimatedPillSelectorProps<T extends string> = {
  options: T[];
  value: T;
  onChange: (value: T) => void;
};

const PADDING = 8; // p-2
const GAP = 8; // gap-2

export function AnimatedPillSelector<T extends string>({
  options,
  value,
  onChange,
}: AnimatedPillSelectorProps<T>) {
  const [containerWidth, setContainerWidth] = useState(0);
  const activeIndex = options.indexOf(value);
  const slideX = useRef(new Animated.Value(0)).current;

  const pillWidth =
    containerWidth > 0
      ? (containerWidth - PADDING * 2 - GAP * (options.length - 1)) /
        options.length
      : 0;

  useEffect(() => {
    if (pillWidth <= 0) return;
    Animated.spring(slideX, {
      toValue: activeIndex * (pillWidth + GAP),
      useNativeDriver: true,
      speed: 20,
      bounciness: 4,
    }).start();
  }, [activeIndex, pillWidth, slideX]);

  return (
    <View
      className="flex-row items-center gap-2 bg-white/5 rounded-2xl border border-white/10 p-2 self-center w-full max-w-[360px]"
      onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
    >
      {pillWidth > 0 && (
        <Animated.View
          className="absolute rounded-full bg-purple-500/20"
          style={{
            width: pillWidth,
            top: PADDING,
            bottom: PADDING,
            left: PADDING,
            transform: [{ translateX: slideX }],
          }}
        />
      )}
      {options.map((option) => (
        <Pressable
          key={option}
          onPress={() => onChange(option)}
          className="flex-1 items-center px-4 py-2 rounded-full"
        >
          <Text
            className={`text-xs font-semibold uppercase tracking-widest ${
              option === value ? "text-purple-200" : "text-slate-300"
            }`}
          >
            {option}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
