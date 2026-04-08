import type { Metric } from "../services/metrics";
import type { Habit } from "../types";
import {
  getCdmxDateKey,
  getMondayStartKey,
  getMonthEndKey,
  getMonthStartKey,
  getSundayDateKey,
  parseEntryDate,
  toLocalDateKey,
} from "./dates";

export type GoalProgressSnapshot = {
  totalValue: number;
  targetValue: number;
  progressPercent: number;
};

export function getMetricDateKeyForGoalType(
  goalType: "daily" | "weekly" | "monthly",
  dateKey = getCdmxDateKey(),
) {
  if (goalType === "daily") return dateKey;
  if (goalType === "weekly") return getSundayDateKey(dateKey);
  return getMonthEndKey(dateKey);
}

export function buildGoalProgressMap(metrics: Metric[]) {
  const nextMap: Record<string, GoalProgressSnapshot> = {};

  for (const metric of metrics) {
    if (!metric.habit_id) continue;
    const metadata = metric.metadata ?? {};
    const targetValue = Number(
      (metadata as Record<string, unknown>).target_value ?? 0,
    );
    const totalValue = Number(
      (metadata as Record<string, unknown>).total_value ?? 0,
    );
    const progressPercent = Number(
      (metadata as Record<string, unknown>).progress_percent ??
        metric.value ??
        0,
    );

    nextMap[metric.habit_id] = {
      totalValue,
      targetValue,
      progressPercent,
    };
  }

  return nextMap;
}

export function inferHabitCompletionFromEntries(
  habit: Habit,
  todayKey = getCdmxDateKey(),
) {
  if (habit.goalAmount <= 0) return false;

  if (habit.goalType === "daily") {
    const total = habit.entries
      .filter(
        (entry) => toLocalDateKey(parseEntryDate(entry.date)) === todayKey,
      )
      .reduce((sum, entry) => sum + entry.amount, 0);
    return total >= habit.goalAmount;
  }

  const periodTotals = habit.entries.reduce<Record<string, number>>(
    (acc, entry) => {
      const amount = Number(entry.amount);
      if (amount <= 0) return acc;

      const entryKey = toLocalDateKey(parseEntryDate(entry.date));
      const periodKey =
        habit.goalType === "weekly"
          ? getMondayStartKey(entryKey)
          : getMonthStartKey(entryKey);

      acc[periodKey] = (acc[periodKey] || 0) + amount;
      return acc;
    },
    {},
  );

  const currentPeriodKey =
    habit.goalType === "weekly"
      ? getMondayStartKey(todayKey)
      : getMonthStartKey(todayKey);

  return (periodTotals[currentPeriodKey] ?? 0) >= habit.goalAmount;
}
