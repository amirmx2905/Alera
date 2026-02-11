import React from "react";
import { View, Pressable, Animated, Text } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { DotLoader } from "../shared/DotLoader";

type PrimaryButtonProps = {
  label: string;
  isLoading: boolean;
  onPress: () => void;
  onPressIn: () => void;
  onPressOut: () => void;
  scaleAnim: Animated.Value;
};

export function PrimaryButton({
  label,
  isLoading,
  onPress,
  onPressIn,
  onPressOut,
  scaleAnim,
}: PrimaryButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      disabled={isLoading}
    >
      <Animated.View
        className="rounded-2xl overflow-hidden self-center w-3/4"
        style={{ transform: [{ scale: scaleAnim }] }}
      >
        <LinearGradient
          colors={isLoading ? ["#6b7280", "#4b5563"] : ["#7c3aed", "#4c1d95"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ paddingVertical: 15, alignItems: "center" }}
        >
          <View className="h-6 justify-center">
            {isLoading ? (
              <DotLoader />
            ) : (
              <View>
                <Text className="text-white font-semibold text-base">
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
