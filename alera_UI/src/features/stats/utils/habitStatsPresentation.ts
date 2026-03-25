import type { Habit } from "../../habits/types";
import {
  getMonthEndKey,
  getMonthStartKey,
  getMondayStartKey,
  getSundayDateKey,
  parseEntryDate,
  toLocalDateKey,
} from "../../habits/utils/dates";
import type { StatsGranularity, StatsTrendPoint } from "../types";

export type HabitDetailBucket = {
  dateKey: string;
  label: string;
  entryCount: number;
  totalAmount: number;
  hasActivity: boolean;
  goalMet: boolean | null;
};

function getBucketBounds(granularity: StatsGranularity, dateKey: string) {
  if (granularity === "daily") {
    return { start: dateKey, end: dateKey };
  }

  if (granularity === "weekly") {
    return {
      start: getMondayStartKey(dateKey),
      end: getSundayDateKey(dateKey),
    };
  }

  return {
    start: getMonthStartKey(dateKey),
    end: getMonthEndKey(dateKey),
  };
}

export function buildHabitBucketSummaries(
  points: StatsTrendPoint[],
  habit: Habit,
  granularity: StatsGranularity,
): HabitDetailBucket[] {
  return points.map((point) => {
    const { start, end } = getBucketBounds(granularity, point.dateKey);
    const bucketEntries = habit.entries.filter((entry) => {
      const entryKey = toLocalDateKey(parseEntryDate(entry.date));
      return entryKey >= start && entryKey <= end;
    });

    const entryCount = bucketEntries.length;
    const totalAmount = bucketEntries.reduce(
      (sum, entry) => sum + entry.amount,
      0,
    );
    const goalMet =
      granularity === habit.goalType ? totalAmount >= habit.goalAmount : null;

    return {
      dateKey: point.dateKey,
      label: point.label,
      entryCount,
      totalAmount,
      hasActivity: entryCount > 0,
      goalMet,
    };
  });
}

export function buildHabitTrend(
  points: StatsTrendPoint[],
  habit: Habit,
  granularity: StatsGranularity,
): StatsTrendPoint[] {
  const buckets = buildHabitBucketSummaries(points, habit, granularity);

  return points.map((point, index) => ({
    ...point,
    totalEntries:
      habit.type === "binary"
        ? (buckets[index]?.entryCount ?? 0)
        : (buckets[index]?.totalAmount ?? 0),
  }));
}

export function buildNumericHabitTrend(
  points: StatsTrendPoint[],
  habit: Habit,
  granularity: StatsGranularity,
): StatsTrendPoint[] {
  const buckets = buildHabitBucketSummaries(points, habit, granularity);

  return points.map((point, index) => ({
    ...point,
    totalEntries: buckets[index]?.totalAmount ?? 0,
  }));
}

function pluralizeUnit(value: number, unit: string) {
  if (value === 1) return unit;
  return `${unit}s`;
}

function getGoalPeriodLabel(goalType: Habit["goalType"]) {
  if (goalType === "daily") return "day";
  if (goalType === "weekly") return "week";
  return "month";
}

function formatBinaryTargetLabel(
  goalAmount: number,
  goalType: Habit["goalType"],
) {
  const periodLabel = getGoalPeriodLabel(goalType);

  if (goalAmount === 1) {
    return `Once per ${periodLabel}`;
  }

  return `${goalAmount} times per ${periodLabel}`;
}

export function formatHabitGoalSummary(habit: Habit) {
  const habitTypeLabel = habit.type === "binary" ? "Binary" : "Numeric";
  const cadenceLabel =
    habit.goalType === "daily"
      ? "Daily"
      : habit.goalType === "weekly"
        ? "Weekly"
        : "Monthly";

  const targetLabel =
    habit.type === "binary"
      ? formatBinaryTargetLabel(habit.goalAmount, habit.goalType)
      : `${habit.goalAmount} ${pluralizeUnit(habit.goalAmount, habit.unit)} per ${getGoalPeriodLabel(habit.goalType)}`;

  return {
    habitTypeLabel,
    cadenceLabel,
    targetLabel,
  };
}

export function formatPeriodUnit(
  value: number,
  unit: "days" | "weeks" | "months",
) {
  if (value === 1) {
    if (unit === "days") return "day";
    if (unit === "weeks") return "week";
    return "month";
  }

  return unit;
}

export function formatCompletionWindow(
  completed: number,
  total: number,
  unit: "days" | "weeks" | "months",
) {
  return `${completed}/${total} ${formatPeriodUnit(total, unit)}`;
}
