import { useCallback, useRef } from "react";
import { Animated } from "react-native";

type UsePressScaleOptions = {
  pressedScale?: number;
  speed?: number;
  bounciness?: number;
};

export function usePressScale(options: UsePressScaleOptions = {}) {
  const { pressedScale = 0.96, speed = 50, bounciness = 4 } = options;
  const scale = useRef(new Animated.Value(1)).current;

  const animateTo = useCallback(
    (toValue: number) => {
      Animated.spring(scale, {
        toValue,
        useNativeDriver: true,
        speed,
        bounciness,
      }).start();
    },
    [bounciness, scale, speed],
  );

  return {
    scale,
    onPressIn: () => animateTo(pressedScale),
    onPressOut: () => animateTo(1),
  };
}
