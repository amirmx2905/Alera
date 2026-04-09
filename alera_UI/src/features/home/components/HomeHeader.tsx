/**
 * Home Header Component
 * Displays greeting and quick stats
 */

import React from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AnimatedPillSelector } from "../../../components/shared/AnimatedPillSelector";
import { GreetingType, HomeGoalFilter } from "../types";

type HomeHeaderProps = {
  greeting: GreetingType;
  completedToday: number;
  totalHabits: number;
  selectedGoalType: HomeGoalFilter;
  onSelectGoalType: (value: HomeGoalFilter) => void;
};

const GOAL_OPTIONS: HomeGoalFilter[] = ["daily", "weekly", "monthly"];

export function HomeHeader({
  greeting,
  completedToday,
  totalHabits,
  selectedGoalType,
  onSelectGoalType,
}: HomeHeaderProps) {
  return (
    <View className="mb-6">
      <Text className="text-4xl font-semibold text-white mb-4 text-center">
        {greeting}
      </Text>

      <View className="flex-row items-center justify-center gap-4 mb-6">
        <View className="flex-row items-center gap-2 bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
          <Ionicons name="checkmark-circle-outline" size={18} color="#a855f7" />
          <Text className="text-slate-200 text-sm font-medium">
            {completedToday} done today
          </Text>
        </View>

        <View className="w-1 h-1 bg-purple-400/50 rounded-full" />

        <Text className="text-slate-200 text-sm">
          {totalHabits} active habit{totalHabits !== 1 ? "s" : ""}
        </Text>
      </View>

      <AnimatedPillSelector
        options={GOAL_OPTIONS}
        value={selectedGoalType}
        onChange={onSelectGoalType}
      />
    </View>
  );
}
