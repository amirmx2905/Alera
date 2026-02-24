/**
 * Home Header Component
 * Displays greeting and quick stats
 */

import React from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { GreetingType, HomeGoalFilter } from "../types";

type HomeHeaderProps = {
  greeting: GreetingType;
  completedToday: number;
  totalHabits: number;
  selectedGoalType: HomeGoalFilter;
  onSelectGoalType: (value: HomeGoalFilter) => void;
};

export function HomeHeader({
  greeting,
  completedToday,
  totalHabits,
  selectedGoalType,
  onSelectGoalType,
}: HomeHeaderProps) {
  const goalOptions: HomeGoalFilter[] = ["daily", "weekly", "monthly"];

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

      <View className="flex-row items-center justify-center gap-2 bg-white/5 rounded-2xl border border-white/10 p-2 self-center w-full max-w-[360px]">
        {goalOptions.map((option) => {
          const isActive = selectedGoalType === option;
          return (
            <Pressable
              key={option}
              onPress={() => onSelectGoalType(option)}
              className={`flex-1 items-center px-4 py-2 rounded-full ${
                isActive ? "bg-purple-500/20" : "bg-transparent"
              }`}
            >
              <Text
                className={`text-xs font-semibold uppercase tracking-widest ${
                  isActive ? "text-purple-200" : "text-slate-300"
                }`}
              >
                {option}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
