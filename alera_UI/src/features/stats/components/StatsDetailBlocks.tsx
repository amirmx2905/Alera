import React from "react";
import { ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { HabitPredictions, StatsCalendarDay } from "../types";
import type { PredictionUnlockStatus } from "../hooks/useHabitPredictions";

type StatsCalendarStripProps = {
  days: StatsCalendarDay[];
};

export function StatsCalendarStrip({ days }: StatsCalendarStripProps) {
  const completedCount = days.filter((day) => day.completed).length;

  return (
    <View className="mb-5 rounded-3xl border border-white/10 bg-white/5 p-5">
      <Text className="mb-4 text-lg font-semibold text-white">
        Last 30 days activity
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8 }}
      >
        {days.map((day) => (
          <View
            key={day.dateKey}
            className={`items-center rounded-xl p-2 ${day.isToday ? "border border-purple-400/60" : ""}`}
          >
            <Text className="text-[10px] text-slate-500">{day.dayLabel}</Text>
            <View
              className={`mt-1 h-9 w-9 items-center justify-center rounded-lg border ${day.completed ? "border-transparent bg-purple-500" : "border-white/10 bg-white/5"}`}
            >
              <Text
                className={`${day.completed ? "text-white" : "text-slate-400"}`}
              >
                {day.dayNumber}
              </Text>
            </View>
            {day.isToday ? (
              <Text className="mt-1 text-[10px] font-semibold text-purple-300">
                Today
              </Text>
            ) : null}
          </View>
        ))}
      </ScrollView>

      <View className="mt-4 flex-row items-center justify-between border-t border-white/10 pt-3">
        <View className="flex-row items-center gap-2">
          <View className="h-3 w-3 rounded bg-purple-500" />
          <Text className="text-xs text-slate-400">Completed</Text>
        </View>
        <Text className="text-xs text-slate-400">
          <Text className="font-semibold text-white">{completedCount}</Text>/30
          days
        </Text>
      </View>
    </View>
  );
}

type StatsInsightCardsProps = {
  predictions: HabitPredictions;
};

export function StatsInsightCards({ predictions }: StatsInsightCardsProps) {
  const { streakRisk, trajectory, goalEta } = predictions;

  return (
    <View className="rounded-3xl border border-white/10 bg-white/5 p-5">
      <View className="mb-4 flex-row items-center gap-2">
        <Ionicons name="sparkles-outline" size={18} color="#c4b5fd" />
        <Text className="text-lg font-semibold text-white">AI insights</Text>
      </View>

      <View className="gap-3">
        <View className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <Text className="text-xs uppercase tracking-wider text-slate-400">
            Streak risk
          </Text>
          <Text className="mt-1 text-sm font-semibold text-white">
            {streakRisk.risk.toUpperCase()}
          </Text>
          <Text className="mt-1 text-xs text-slate-300">
            {streakRisk.reason}
          </Text>
          <Text className="mt-2 text-[11px] text-slate-500">
            Confidence: {Math.round(streakRisk.confidence * 100)}%
          </Text>
        </View>

        <View className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <Text className="text-xs uppercase tracking-wider text-slate-400">
            Trajectory
          </Text>
          <Text className="mt-1 text-sm font-semibold text-white">
            {trajectory.trajectory.toUpperCase()}
          </Text>
          <Text className="mt-1 text-xs text-slate-300">
            {trajectory.prediction}
          </Text>
          <Text className="mt-2 text-[11px] text-slate-500">
            Confidence: {Math.round(trajectory.confidence * 100)}%
          </Text>
        </View>

        <View className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <Text className="text-xs uppercase tracking-wider text-slate-400">
            Goal ETA
          </Text>
          <Text className="mt-1 text-sm font-semibold text-white">
            {goalEta.eta}
          </Text>
          <Text className="mt-1 text-xs text-slate-300">
            {goalEta.onTrack
              ? "You are on track with current pace."
              : "Current pace is behind target."}
          </Text>
          <Text className="mt-2 text-[11px] text-slate-500">
            Confidence: {Math.round(goalEta.confidence * 100)}%
          </Text>
        </View>
      </View>
    </View>
  );
}

type StatsInsightsDisabledCardProps = {
  isLoading?: boolean;
  unlockStatus?: PredictionUnlockStatus;
  dataDays?: number;
  hasPredictionRows?: boolean;
  updatedAt?: string | null;
  reason?: string;
};

export function StatsInsightsDisabledCard({
  isLoading = false,
  unlockStatus = "locked",
  dataDays = 0,
  hasPredictionRows = false,
  updatedAt = null,
  reason,
}: StatsInsightsDisabledCardProps) {
  const title = unlockStatus === "full" ? "Insights pending" : "Coming soon";
  const stateLabel =
    unlockStatus === "full"
      ? "Eligible"
      : unlockStatus === "basic"
        ? "Basic"
        : "Locked";

  return (
    <View className="rounded-3xl border border-white/10 bg-white/5 p-5">
      <View className="mb-3 flex-row items-center gap-2">
        <Ionicons name="sparkles-outline" size={18} color="#c4b5fd" />
        <Text className="text-lg font-semibold text-white">AI insights</Text>
      </View>
      <View className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <Text className="text-sm font-semibold text-white">{title}</Text>
        <Text className="mt-1 text-xs text-slate-300">
          {isLoading
            ? "Checking prediction readiness..."
            : (reason ??
              "Insights are disabled until the predictions pipeline is active.")}
        </Text>
        <Text className="mt-2 text-xs text-slate-400">
          State: {stateLabel} • Data days: {dataDays} • Rows:{" "}
          {hasPredictionRows ? "available" : "pending"}
        </Text>
        {updatedAt ? (
          <Text className="mt-1 text-xs text-slate-500">
            Latest prediction date: {updatedAt}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
