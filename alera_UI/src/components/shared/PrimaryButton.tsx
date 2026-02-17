import React from "react";
import { View, Pressable, Animated, Text, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { DotLoader } from "../shared/DotLoader";

type PrimaryButtonProps = {
  label: string;
  isLoading: boolean;
  onPress: () => void;
  onPressIn: () => void;
  onPressOut: () => void;
  scaleAnim: Animated.Value;
  disabled?: boolean;
  containerClassName?: string;
  labelClassName?: string;
  pressableClassName?: string;
  fixedHeight?: boolean;
};

export function PrimaryButton({
  label,
  isLoading,
  onPress,
  onPressIn,
  onPressOut,
  scaleAnim,
  disabled = false,
  containerClassName,
  labelClassName,
  pressableClassName,
  fixedHeight = false,
}: PrimaryButtonProps) {
  const isDisabled = isLoading || disabled;
  const enabledColors: [string, string] = ["#5b21b6", "#2e1065"];
  const disabledColors: [string, string] = ["#6b7280", "#4b5563"];
  const gradientColors = isDisabled ? disabledColors : enabledColors;
  const gradientStyle: ViewStyle = fixedHeight
    ? {
        height: "100%",
        alignItems: "center",
        justifyContent: "center",
      }
    : {
        paddingVertical: 15,
        alignItems: "center",
        justifyContent: "center",
      };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      disabled={isDisabled}
      className={pressableClassName}
    >
      <Animated.View
        className={`rounded-2xl overflow-hidden ${
          containerClassName ?? "self-center w-3/4"
        }`}
        style={{ transform: [{ scale: scaleAnim }] }}
      >
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={gradientStyle}
        >
          <View className="h-6 justify-center">
            {isLoading ? (
              <DotLoader />
            ) : (
              <View>
                <Text
                  className={`text-white font-semibold text-base${
                    labelClassName ? ` ${labelClassName}` : ""
                  }`}
                >
                  {label}
                </Text>
              </View>
            )}
          </View>
        </LinearGradient>
      </Animated.View>
    </Pressable>
  );
}
