import React from "react";
import { Pressable, Text, View } from "react-native";
import type { Habit } from "../types";

type HabitCardProps = {
  habit: Habit;
  progress: number;
  progressValue: number;
  currentAmount: number;
  onPress?: () => void;
};

type BinaryHabitCardProps = {
  habit: Habit;
  isCompleted: boolean;
  onPress?: () => void;
};

export function BinaryHabitCard({
  habit,
  isCompleted,
  onPress,
}: BinaryHabitCardProps) {
  return (
    <Pressable
      onPress={onPress}
      className="rounded-2xl border border-white/10 bg-white/5 p-4"
    >
      <View className="flex-row items-start justify-between mb-3">
        <View className="flex-1">
          <Text className="text-white text-base font-semibold mb-1">
            {habit.name}
          </Text>
          <View className="flex-row flex-wrap gap-2">
            <View className="rounded-full bg-purple-500/20 px-3 py-1">
              <Text className="text-purple-300 text-xs font-semibold">
                {habit.category}
              </Text>
            </View>
            <View className="rounded-full bg-white/10 px-3 py-1">
              <Text className="text-slate-200 text-[10px] uppercase tracking-[2px]">
                {habit.goalType}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View className="flex-row items-center justify-between">
        <Text className="text-slate-400 text-[11px]">
          {isCompleted ? "Completed" : "Not done yet"}
        </Text>
        <View
          className={`h-5 w-5 rounded-full items-center justify-center border-2 ${
            isCompleted
              ? "border-purple-500 bg-purple-500"
              : "border-white/20 bg-transparent"
          }`}
        >
          {isCompleted ? (
            <Text className="text-white text-[10px] font-bold">✓</Text>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

export function HabitCard({
  habit,
  progress,
  progressValue,
  currentAmount,
  onPress,
}: HabitCardProps) {
  const isBinary = habit.type === "binary";
  const isCompleted = currentAmount >= habit.goalAmount;

  if (isBinary) {
    return (
      <BinaryHabitCard
        habit={habit}
        isCompleted={isCompleted}
        onPress={onPress}
      />
    );
  }

  return (
    <Pressable
      onPress={onPress}
      className="rounded-3xl border border-white/10 bg-white/5 p-6"
    >
      <View className="flex-row items-start justify-between mb-4">
        <View className="flex-1">
          <Text className="text-white text-lg font-semibold mb-2">
            {habit.name}
          </Text>
          <View className="flex-row flex-wrap gap-2">
            <View className="rounded-full bg-purple-500/20 px-3 py-1">
              <Text className="text-purple-300 text-xs font-semibold">
                {habit.category}
              </Text>
            </View>
            <View className="rounded-full bg-white/10 px-3 py-1">
              <Text className="text-slate-200 text-xs">
                Goal: {habit.goalAmount} {habit.unit} {habit.goalType}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View className="gap-2">
        <View className="flex-row items-center justify-between">
          <Text className="text-slate-400 text-xs">
            {currentAmount} / {habit.goalAmount} {habit.unit}
          </Text>
          <Text className="text-purple-300 text-xs font-semibold">
            {progressValue}%
          </Text>
        </View>
        <View className="h-2.5 rounded-full bg-white/10 overflow-hidden">
          <View
            className="h-full rounded-full bg-purple-500"
            style={{ width: `${progress}%` }}
          />
        </View>
      </View>
    </Pressable>
  );
}
