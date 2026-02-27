import React from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { StatsHabitListItem } from "../types";

type StatsHabitsListProps = {
  habits: StatsHabitListItem[];
  onSelectHabit: (habitId: string) => void;
};

export function StatsHabitsList({
  habits,
  onSelectHabit,
}: StatsHabitsListProps) {
  return (
    <View className="rounded-3xl border border-white/10 bg-white/5 p-5">
      <Text className="mb-1 text-lg font-semibold text-white">Your habits</Text>
      <Text className="mb-4 text-xs text-slate-400">
        Tap a habit to view detailed analytics
      </Text>
      <View className="gap-3">
        {habits.map((habit) => (
          <Pressable
            key={habit.habitId}
            onPress={() => onSelectHabit(habit.habitId)}
            className="flex-row items-center justify-between rounded-xl border border-white/10 bg-white/5 p-4"
          >
            <View className="flex-1 pr-3">
              <Text className="text-sm font-semibold text-white">
                {habit.name}
              </Text>
              <Text className="mt-0.5 text-xs text-slate-400">
                {habit.category} • {habit.completionCount}/
                {habit.completionWindowTotal} {habit.completionUnit}
              </Text>
            </View>

            <View className="items-end">
              <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
