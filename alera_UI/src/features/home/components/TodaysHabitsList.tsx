/**
 * Today's Habits List Component
 * Displays the list of today's habits
 */

import React, { memo, useCallback } from "react";
import { View, Text, Animated, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { type HomeGoalFilter, type TodaysHabitSummary } from "../types";
import { Ionicons } from "@expo/vector-icons";
import { EmptyState } from "../../../components/shared/EmptyState";
import { COLORS, LAYOUT } from "../../../constants/theme";

interface TodaysHabitsListProps {
  habits: TodaysHabitSummary[];
  goalType: HomeGoalFilter;
  onHabitPress: (habitId: string) => void;
  fadeAnim: Animated.Value;
}

type HabitRowProps = {
  habit: TodaysHabitSummary;
  onPress: () => void;
};

const HabitRow = memo(function HabitRow({ habit, onPress }: HabitRowProps) {
  return (
    <Pressable
      onPress={onPress}
      className="bg-white/5 rounded-2xl border border-white/10 p-4 mb-3"
    >
      <View className="flex-row items-center gap-4">
        <Pressable onPress={onPress} className="flex-shrink-0">
          {habit.completed ? (
            <LinearGradient
              colors={COLORS.gradientPrimary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                width: LAYOUT.checkIconSize,
                height: LAYOUT.checkIconSize,
                borderRadius: LAYOUT.checkIconRadius,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="checkmark" size={16} color={COLORS.white} />
            </LinearGradient>
          ) : (
            <Ionicons
              name="ellipse-outline"
              size={24}
              color={COLORS.primaryLight}
              style={{ opacity: 0.5 }}
            />
          )}
        </Pressable>

        <View className="flex-1">
          <Text
            className={`font-medium mb-1 ${
              habit.completed ? "text-slate-400 line-through" : "text-white"
            }`}
          >
            {habit.name}
          </Text>

          <View className="flex-row items-center gap-3" />
        </View>

        <View className="items-end justify-center">
          <View className="flex-row items-center gap-1.5">
            <Ionicons name="flame" size={16} color={COLORS.primaryLight} />
            <Text className="text-sm text-slate-200">{habit.streak}</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
});

export function TodaysHabitsList({
  habits,
  goalType,
  onHabitPress,
  fadeAnim,
}: TodaysHabitsListProps) {
  const handlePress = useCallback(
    (habitId: string) => () => onHabitPress(habitId),
    [onHabitPress],
  );

  if (habits.length === 0) {
    return (
      <EmptyState
        opacity={fadeAnim}
        title={`No ${goalType} habits yet`}
        message="Create a habit to start tracking progress."
        iconName="leaf-outline"
      />
    );
  }

  return (
    <View>
      <Text className="text-sm font-semibold uppercase tracking-widest text-slate-400 mb-3">
        {goalType} habits
      </Text>
      {habits.map((habit) => (
        <HabitRow key={habit.id} habit={habit} onPress={handlePress(habit.id)} />
      ))}
    </View>
  );
}
