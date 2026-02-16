import React, { useEffect, useRef } from "react";
import { View, Text, Animated } from "react-native";

type Props = {
  progress: number;
  currentAmount: number;
  goalAmount: number;
  unit: string;
  goalType: "daily" | "weekly" | "monthly";
};

export function HabitProgressCard({
  progress,
  currentAmount,
  goalAmount,
  unit,
  goalType,
}: Props) {
  const progressAnim = useRef(new Animated.Value(0)).current;
  const progressValue = Math.round(progress);
  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
  });

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 380,
      useNativeDriver: false,
    }).start();
  }, [progress, progressAnim]);

  return (
    <View className="rounded-3xl border border-white/10 bg-white/5 p-6">
      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-slate-400 text-sm">Current Progress</Text>
        <Text className="text-purple-300 text-xl font-semibold">
          {progressValue}%
        </Text>
      </View>
      <View className="h-3 rounded-full bg-white/10 overflow-hidden">
        <Animated.View
          className="h-full rounded-full bg-purple-500"
          style={{ width: progressWidth }}
        />
      </View>
      <View className="flex-row items-center justify-between mt-4">
        <Text className="text-white text-base font-semibold">
          {currentAmount} / {goalAmount} {unit}
        </Text>
        <View className="rounded-full border border-purple-400/40 bg-purple-500/20 px-3 py-1">
          <Text className="text-purple-300 text-xs font-semibold capitalize">
            {goalType}
          </Text>
        </View>
      </View>
    </View>
  );
}
