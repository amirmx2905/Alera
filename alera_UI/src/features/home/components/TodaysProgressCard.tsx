/**
 * Today's Progress Card Component
 * Displays completion progress for today's habits
 */

import React, { useEffect, useRef } from "react";
import { View, Text, Animated } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { HomeGoalFilter, TodaysProgress } from "../types";

interface TodaysProgressCardProps {
  progress: TodaysProgress;
  goalType: HomeGoalFilter;
}

export function TodaysProgressCard({
  progress,
  goalType,
}: TodaysProgressCardProps) {
  const { completedCount, totalCount, completionPercentage } = progress;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
  });

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: completionPercentage,
      duration: 380,
      useNativeDriver: false,
    }).start();
  }, [completionPercentage, progressAnim]);

  return (
    <View className="bg-white/5 rounded-3xl border border-white/10 p-6 mb-6">
      {/* Header */}
      <View className="flex-row items-center justify-between mb-4">
        <View>
          <Text className="text-xl font-semibold text-white">
            {goalType.charAt(0).toUpperCase() + goalType.slice(1)} Progress
          </Text>
          <Text className="text-slate-400 text-sm mt-1">
            {completedCount} of {totalCount} completed
          </Text>
        </View>
        <View className="items-end">
          <Text className="text-3xl font-bold text-purple-400">
            {completionPercentage}%
          </Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
        <Animated.View style={{ width: progressWidth, height: "100%" }}>
          <LinearGradient
            colors={["#7c3aed", "#c084fc", "#e9d5ff"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{
              height: "100%",
              borderRadius: 999,
            }}
          />
        </Animated.View>
      </View>
    </View>
  );
}
