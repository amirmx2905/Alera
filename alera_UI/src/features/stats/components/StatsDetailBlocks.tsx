import React, { useState } from "react";
import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Habit } from "../../habits/types";
import type { StatsCalendarDay, HabitPredictions } from "../types";
import { DotLoader } from "../../../components/shared/DotLoader";
import { GoalProjectionChart, HORIZON_OPTIONS } from "./GoalProjectionChart";
import { AnimatedPillSelector } from "../../../components/shared/AnimatedPillSelector";
import {
  StreakRiskCard,
  TrajectoryCard,
  GoalEtaCard,
  BestReminderCard,
} from "./InsightCards";

// ---------------------------------------------------------------------------
// Root export
// ---------------------------------------------------------------------------

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
    return (
      <BasicInsights
        predictions={predictions}
        calendar30Days={calendar30Days}
        habit={habit}
      />
    );
  return (
    <FullInsights
      predictions={predictions}
      calendar30Days={calendar30Days}
      habit={habit}
    />
  );
}

// ---------------------------------------------------------------------------
// Shared header
// ---------------------------------------------------------------------------

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
      <Text className="text-[10px] text-slate-500">Updates daily · 6:30 AM UTC</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Tier views
// ---------------------------------------------------------------------------

function LockedInsights({ predictions }: { predictions: HabitPredictions }) {
  const progress = Math.min(predictions.uniqueDays / 14, 1);
  const needsMoreLogs = predictions.daysToNextTier === 0;

  return (
    <View className="rounded-3xl border border-white/10 bg-white/5 p-5">
      <InsightsHeader />
      <View className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <Text className="text-sm font-semibold text-white">
          Predictions locked
        </Text>
        <Text className="mt-1 text-xs text-slate-300">
          {needsMoreLogs
            ? "Keep logging regularly to unlock basic insights"
            : `Log ${predictions.daysToNextTier} more day${predictions.daysToNextTier !== 1 ? "s" : ""} to unlock basic insights`}
        </Text>
        <View className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
          <View
            className="h-full rounded-full bg-purple-500"
            style={{ width: `${progress * 100}%` }}
          />
        </View>
        <Text className="mt-1.5 text-[10px] text-slate-500">
          {predictions.uniqueDays}/14 days since start
          {predictions.loggedPeriods !== undefined
            ? ` · ${predictions.loggedPeriods} logged`
            : ""}
        </Text>
      </View>
    </View>
  );
}

type TierInsightsProps = {
  predictions: HabitPredictions;
  calendar30Days?: StatsCalendarDay[];
  habit?: Habit;
};

function useHorizonState(habit?: Habit) {
  const horizonOptions = habit
    ? (HORIZON_OPTIONS[habit.goalType] ?? HORIZON_OPTIONS.daily)
    : [];
  const horizonLabels = horizonOptions.map((o) => o.label);
  const [horizonLabel, setHorizonLabel] = useState(horizonLabels[0] ?? "");
  return { horizonLabels, horizonLabel, setHorizonLabel };
}

function BasicInsights({ predictions, calendar30Days, habit }: TierInsightsProps) {
  const { horizonLabels, horizonLabel, setHorizonLabel } = useHorizonState(habit);
  const showChart =
    habit &&
    calendar30Days &&
    !(habit.goalType === "daily" && habit.type === "binary") &&
    predictions.trajectory;

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
      {showChart && horizonLabels.length > 1 ? (
        <View className="mt-3">
          <AnimatedPillSelector
            options={horizonLabels}
            value={horizonLabel}
            onChange={setHorizonLabel}
          />
        </View>
      ) : null}
      {showChart ? (
        <View className="mt-3">
          <GoalProjectionChart
            calendar30Days={calendar30Days}
            habit={habit}
            trajectory={predictions.trajectory!}
            horizonLabel={horizonLabel}
          />
        </View>
      ) : null}
      {predictions.daysToNextTier > 0 ? (
        <Text className="mt-3 text-center text-[11px] text-slate-500">
          {predictions.daysToNextTier} more day
          {predictions.daysToNextTier !== 1 ? "s" : ""} to unlock full predictions
        </Text>
      ) : null}
    </View>
  );
}

function FullInsights({ predictions, calendar30Days, habit }: TierInsightsProps) {
  const { horizonLabels, horizonLabel, setHorizonLabel } = useHorizonState(habit);
  const showChart =
    habit &&
    calendar30Days &&
    !(habit.goalType === "daily" && habit.type === "binary") &&
    predictions.trajectory;

  const isNumeric = habit?.type === "numeric";
  const habitUnit = isNumeric ? habit?.unit : undefined;
  const hasGoalEta = !!predictions.goalEta;
  const hasReminder = !!predictions.bestReminder;

  return (
    <View className="rounded-3xl border border-white/10 bg-white/5 p-5">
      <InsightsHeader badge="Full" />

      <View className="flex-row items-stretch justify-between">
        {predictions.streakRisk ? (
          <View className="w-[48.5%]">
            <StreakRiskCard risk={predictions.streakRisk} showFactors className="flex-1" />
          </View>
        ) : null}
        {predictions.trajectory ? (
          <View className="w-[48.5%]">
            <TrajectoryCard
              trajectory={predictions.trajectory}
              showConfidence
              habitUnit={habitUnit}
              className="flex-1"
            />
          </View>
        ) : null}
      </View>

      {(hasGoalEta || hasReminder) ? (
        <View className="mt-3 flex-row items-stretch gap-3">
          {hasGoalEta ? (
            <View className="flex-1">
              <GoalEtaCard eta={predictions.goalEta!} className="flex-1" />
            </View>
          ) : null}
          {hasReminder ? (
            <View className="flex-1">
              <BestReminderCard reminder={predictions.bestReminder!} className="flex-1" />
            </View>
          ) : null}
        </View>
      ) : null}

      {showChart && horizonLabels.length > 1 ? (
        <View className="mt-3">
          <AnimatedPillSelector
            options={horizonLabels}
            value={horizonLabel}
            onChange={setHorizonLabel}
          />
        </View>
      ) : null}
      {showChart ? (
        <View className="mt-3">
          <GoalProjectionChart
            calendar30Days={calendar30Days}
            habit={habit}
            trajectory={predictions.trajectory!}
            horizonLabel={horizonLabel}
          />
        </View>
      ) : null}
    </View>
  );
}
