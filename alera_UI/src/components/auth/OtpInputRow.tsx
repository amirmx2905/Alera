import React from "react";
import { View, Text, Pressable } from "react-native";

type OtpInputRowProps = {
  length: number;
  value: string;
  isFocused: boolean;
  onPress: () => void;
};

export function OtpInputRow({
  length,
  value,
  isFocused,
  onPress,
}: OtpInputRowProps) {
  return (
    <View className="mt-4 items-center">
      <Pressable className="flex-row justify-center gap-3" onPress={onPress}>
        {Array.from({ length }).map((_, index) => {
          const digit = value[index] ?? "";
          const isActive = isFocused && index === value.length;
          return (
            <View
              key={`otp-${index}`}
              className={
                isActive
                  ? "h-12 w-12 items-center justify-center rounded-xl border border-blue-400 bg-white/10"
                  : "h-12 w-12 items-center justify-center rounded-xl border border-white/20 bg-white/5"
              }
            >
              <Text className="text-white text-lg font-semibold">{digit}</Text>
            </View>
          );
        })}
      </Pressable>
    </View>
  );
}
