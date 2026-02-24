/**
 * Today's Habits List Component
 * Displays the list of today's habits
 */

import React from "react";
import { View, Text, Animated, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { HomeGoalFilter, TodaysHabitSummary } from "../types";
import { Ionicons } from "@expo/vector-icons";
import { EmptyState } from "../../../components/shared/EmptyState";

interface TodaysHabitsListProps {
  habits: TodaysHabitSummary[];
  goalType: HomeGoalFilter;
  onToggleComplete: (habitId: string) => void;
  onHabitPress: (habitId: string) => void;
  fadeAnim: Animated.Value;
}

const CHECK_GRADIENT_COLORS: [string, string] = ["#5b21b6", "#2e1065"];

export function TodaysHabitsList({
  habits,
  goalType,
  onToggleComplete,
  onHabitPress,
  fadeAnim,
}: TodaysHabitsListProps) {
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
        <Pressable
          key={habit.id}
          onPress={() => onHabitPress(habit.id)}
          className="bg-white/5 rounded-2xl border border-white/10 p-4 mb-3"
        >
          <View className="flex-row items-center gap-4">
            <Pressable
              onPress={() => {
                onToggleComplete(habit.id);
                onHabitPress(habit.id);
              }}
              className="flex-shrink-0"
            >
              {habit.completed ? (
                <LinearGradient
                  colors={CHECK_GRADIENT_COLORS}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 13,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="checkmark" size={16} color="#ffffff" />
                </LinearGradient>
              ) : (
                <Ionicons
                  name="ellipse-outline"
                  size={24}
                  color="#a855f7"
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
                <Ionicons name="flame" size={16} color="#a855f7" />
                <Text className="text-sm text-slate-200">{habit.streak}</Text>
              </View>
            </View>
          </View>
        </Pressable>
      ))}
    </View>
  );
}
