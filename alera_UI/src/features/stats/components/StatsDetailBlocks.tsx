import React from "react";
import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Habit } from "../../habits/types";
import type { StatsCalendarDay, HabitPredictions } from "../types";
import { DotLoader } from "../../../components/shared/DotLoader";
import { GoalProjectionChart } from "./GoalProjectionChart";

const RISK_COLORS = {
  low: { bg: "bg-green-500/15", border: "border-green-400/30", text: "text-green-300" },
  medium: { bg: "bg-yellow-500/15", border: "border-yellow-400/30", text: "text-yellow-300" },
  high: { bg: "bg-red-500/15", border: "border-red-400/30", text: "text-red-300" },
};

const DIRECTION_CONFIG = {
  improving: { icon: "trending-up" as const, color: "#4ade80", label: "Improving" },
  declining: { icon: "trending-down" as const, color: "#f87171", label: "Declining" },
  stable: { icon: "remove-outline" as const, color: "#94a3b8", label: "Stable" },
};

type StatsInsightsCardProps = {
  predictions: HabitPredictions | null;
  isLoading: boolean;
  habitCreatedAt?: string;
  calendar30Days?: StatsCalendarDay[];
  habit?: Habit;
};

export function StatsInsightsCard({
  predictions,
  isLoading,
  habitCreatedAt,
  calendar30Days,
  habit,
}: StatsInsightsCardProps) {
  if (isLoading) {
    return (
      <View className="rounded-3xl border border-white/10 bg-white/5 p-5">
        <View className="mb-3 flex-row items-center gap-2">
          <Ionicons name="sparkles-outline" size={18} color="#c4b5fd" />
          <Text className="text-lg font-semibold text-white">AI insights</Text>
        </View>
        <View className="items-center py-4">
          <DotLoader />
        </View>
      </View>
    );
  }

  // No predictions yet (pipeline hasn't run) — show locked state from habit age
  if (!predictions) {
    const days = habitCreatedAt
      ? Math.floor(
          (Date.now() - new Date(habitCreatedAt).getTime()) / 86_400_000,
        ) + 1
      : 0;
    const daysToBasic = Math.max(0, 14 - days);
    return (
      <LockedInsights
        predictions={{
          tier: "locked",
          uniqueDays: days,
          daysToNextTier: daysToBasic,
          streakRisk: null,
          trajectory: null,
          goalEta: null,
          bestReminder: null,
        }}
      />
    );
  }

  if (predictions.tier === "locked")
    return <LockedInsights predictions={predictions} />;
  if (predictions.tier === "basic")
    return <BasicInsights predictions={predictions} />;
  return (
    <FullInsights
      predictions={predictions}
      calendar30Days={calendar30Days}
      habit={habit}
    />
  );
}

function InsightsHeader({ badge }: { badge?: string }) {
  return (
    <View className="mb-3 flex-row items-center justify-between">
      <View className="flex-row items-center gap-2">
        <Ionicons name="sparkles-outline" size={18} color="#c4b5fd" />
        <Text className="text-lg font-semibold text-white">AI insights</Text>
        {badge ? (
          <View className="rounded-full border border-purple-400/40 bg-purple-500/10 px-2 py-0.5">
            <Text className="text-[10px] font-semibold text-purple-200">
              {badge}
            </Text>
          </View>
        ) : null}
      </View>
      <Text className="text-[10px] text-slate-500">Updates daily at 12:30 AM</Text>
    </View>
  );
}

function LockedInsights({ predictions }: { predictions: HabitPredictions }) {
  const progress = Math.min(predictions.uniqueDays / 14, 1);

  return (
    <View className="rounded-3xl border border-white/10 bg-white/5 p-5">
      <InsightsHeader />
      <View className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <Text className="text-sm font-semibold text-white">
          Predictions locked
        </Text>
        <Text className="mt-1 text-xs text-slate-300">
          Log {predictions.daysToNextTier} more day
          {predictions.daysToNextTier !== 1 ? "s" : ""} to unlock basic insights
        </Text>
        <View className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
          <View
            className="h-full rounded-full bg-purple-500"
            style={{ width: `${progress * 100}%` }}
          />
        </View>
        <Text className="mt-1.5 text-[10px] text-slate-500">
          {predictions.uniqueDays}/14 days logged
        </Text>
      </View>
    </View>
  );
}

function BasicInsights({ predictions }: { predictions: HabitPredictions }) {
  return (
    <View className="rounded-3xl border border-white/10 bg-white/5 p-5">
      <InsightsHeader badge="Basic" />

      <View className="gap-3">
        {predictions.streakRisk ? (
          <StreakRiskCard risk={predictions.streakRisk} />
        ) : null}
        {predictions.trajectory ? (
          <TrajectoryCard trajectory={predictions.trajectory} />
        ) : null}
      </View>

      {predictions.daysToNextTier > 0 ? (
        <Text className="mt-3 text-center text-[11px] text-slate-500">
          {predictions.daysToNextTier} more day
          {predictions.daysToNextTier !== 1 ? "s" : ""} to unlock full
          predictions
        </Text>
      ) : null}
    </View>
  );
}

function FullInsights({
  predictions,
  calendar30Days,
  habit,
}: {
  predictions: HabitPredictions;
  calendar30Days?: StatsCalendarDay[];
  habit?: Habit;
}) {
  const showChart =
    habit &&
    calendar30Days &&
    habit.goalType !== "daily" &&
    predictions.trajectory &&
    predictions.goalEta;

  return (
    <View className="rounded-3xl border border-white/10 bg-white/5 p-5">
      <InsightsHeader badge="Full" />

      <View className="flex-row flex-wrap justify-between gap-y-3">
        {predictions.streakRisk ? (
          <View className="w-[48.5%]">
            <StreakRiskCard risk={predictions.streakRisk} />
          </View>
        ) : null}
        {predictions.trajectory ? (
          <View className="w-[48.5%]">
            <TrajectoryCard trajectory={predictions.trajectory} />
          </View>
        ) : null}
      </View>

      {showChart ? (
        <View className="mt-3">
          <GoalProjectionChart
            calendar30Days={calendar30Days}
            habit={habit}
            trajectory={predictions.trajectory!}
          />
        </View>
      ) : null}
    </View>
  );
}

function StreakRiskCard({ risk }: { risk: HabitPredictions["streakRisk"] & {} }) {
  const style = RISK_COLORS[risk.risk_label];
  return (
    <View className={`rounded-2xl border ${style.border} ${style.bg} p-4`}>
      <Text className="text-xs text-slate-400">Streak risk</Text>
      <Text className={`mt-1 text-xl font-bold capitalize ${style.text}`}>
        {risk.risk_label}
      </Text>
      <Text className="text-xs text-slate-500">
        {Math.round(risk.risk_score * 100)}% skip probability
      </Text>
    </View>
  );
}

function TrajectoryCard({ trajectory }: { trajectory: HabitPredictions["trajectory"] & {} }) {
  const config = DIRECTION_CONFIG[trajectory.direction];
  return (
    <View className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <Text className="text-xs text-slate-400">Trajectory</Text>
      <View className="mt-1 flex-row items-center gap-1.5">
        <Ionicons name={config.icon} size={20} color={config.color} />
        <Text className="text-xl font-bold text-white">{config.label}</Text>
      </View>
      <Text className="text-xs text-slate-500">
        7d rate: {Math.round(trajectory.rate_7d * 100)}%
      </Text>
    </View>
  );
}
