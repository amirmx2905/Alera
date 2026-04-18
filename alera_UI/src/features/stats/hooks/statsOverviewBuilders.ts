import type { StatsHabitDetail, StatsHabitListItem, StatsKpi } from "../types";
import type { Habit } from "../../habits/types";
import {
  getCdmxDateKey,
  parseEntryDate,
  toLocalDateKey,
} from "../../habits/utils/dates";
import type {
  HabitMetricSnapshot,
  ProfileMetricSnapshot,
} from "./statsDateBuckets";
import {
  getCurrentStreak,
  getAverageValue30,
  getActiveDaysInLastDays,
  getTotalAmountInLastDays,
  getCompletionSummaryForLookback,
} from "./statsHelpers";

export { getCurrentStreak } from "./statsHelpers";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function buildKpis(
  activeHabits: Habit[],
  profileMetricSnapshot: ProfileMetricSnapshot,
  streaksByHabitId: Record<string, number>,
): StatsKpi {
  let completedCount = 0;
  let totalPossible = 0;
  activeHabits.forEach((habit) => {
    const summary = getCompletionSummaryForLookback(habit, 7);
    completedCount += summary.completionCount;
    totalPossible += summary.completionWindowTotal;
  });

  const uniqueActiveDays = new Set<string>();
  const todayKey = getCdmxDateKey();
  const today = new Date(`${todayKey}T12:00:00`);
  const threshold = new Date(today);
  threshold.setDate(today.getDate() - 29);
  activeHabits.forEach((habit) => {
    habit.entries.forEach((entry) => {
      const date = parseEntryDate(entry.date);
      if (date.getTime() >= threshold.getTime()) {
        uniqueActiveDays.add(toLocalDateKey(date));
      }
    });
  });

  const bestStreakFromMetrics = profileMetricSnapshot.bestStreakOverall;
  const bestStreakHabitIdFromMetrics = profileMetricSnapshot.bestStreakHabitId;
  const bestStreakHabitFromMetrics = bestStreakHabitIdFromMetrics
    ? activeHabits.find((habit) => habit.id === bestStreakHabitIdFromMetrics)
    : undefined;

  const bestLocal = activeHabits.reduce<{
    streak: number;
    habitName: string;
    goalType: "daily" | "weekly" | "monthly";
  }>(
    (currentBest, habit) => {
      const streak = streaksByHabitId[habit.id] ?? getCurrentStreak(habit);
      if (streak > currentBest.streak) {
        return { streak, habitName: habit.name, goalType: habit.goalType };
      }
      return currentBest;
    },
    { streak: 0, habitName: "N/A", goalType: "daily" },
  );

  const hasUsableMetricBest =
    bestStreakFromMetrics !== undefined &&
    Number.isFinite(bestStreakFromMetrics) &&
    Boolean(bestStreakHabitFromMetrics);

  return {
    totalHabits: activeHabits.length,
    completionRate:
      totalPossible > 0
        ? Math.round((completedCount / totalPossible) * 100)
        : 0,
    completedCount,
    totalPossible,
    activeDays30: uniqueActiveDays.size,
    bestStreak: hasUsableMetricBest
      ? Number(bestStreakFromMetrics)
      : bestLocal.streak,
    bestStreakHabit: hasUsableMetricBest
      ? (bestStreakHabitFromMetrics?.name ?? "N/A")
      : bestLocal.habitName,
    bestStreakUnit: ((): "days" | "weeks" | "months" => {
      const gt = hasUsableMetricBest
        ? bestStreakHabitFromMetrics?.goalType
        : bestLocal.goalType;
      if (gt === "weekly") return "weeks";
      if (gt === "monthly") return "months";
      return "days";
    })(),
  };
}

export function buildHabitsList(
  activeHabits: Habit[],
  streaksByHabitId: Record<string, number>,
  habitMetricSnapshotById: Record<string, HabitMetricSnapshot>,
  periodEntriesByHabitId: Record<string, number>,
): StatsHabitListItem[] {
  return activeHabits
    .map((habit) => {
      const streak = streaksByHabitId[habit.id] ?? getCurrentStreak(habit);
      const summary = getCompletionSummaryForLookback(habit, 30);
      return {
        habitId: habit.id,
        name: habit.name,
        category: habit.category,
        completionCount: summary.completionCount,
        completionWindowTotal: summary.completionWindowTotal,
        completionUnit: summary.completionUnit,
        streak,
        totalEntries:
          habitMetricSnapshotById[habit.id]?.totalEntriesAllTime ??
          habit.entries.length,
        entriesInSelectedPeriod: periodEntriesByHabitId[habit.id] ?? 0,
      };
    })
    .sort((a, b) => b.completionCount - a.completionCount);
}

export function buildHabitDetailMap(
  activeHabits: Habit[],
  streaksByHabitId: Record<string, number>,
  habitMetricSnapshotById: Record<string, HabitMetricSnapshot>,
) {
  const todayKey = getCdmxDateKey();
  const now = new Date(`${todayKey}T12:00:00`);

  const entries = new Map<string, StatsHabitDetail>();
  activeHabits.forEach((habit) => {
    const completionSummary = getCompletionSummaryForLookback(habit, 30);
    const metricsSnapshot = habitMetricSnapshotById[habit.id];
    const metricsCompletionCount = metricsSnapshot?.daysCompleted30d;
    const completionCountWindow =
      habit.goalType === "daily" && metricsCompletionCount !== undefined
        ? Math.max(0, Math.round(metricsCompletionCount))
        : completionSummary.completionCount;

    const datesSet = new Set(
      habit.entries.map((entry) => toLocalDateKey(parseEntryDate(entry.date))),
    );

    const calendar30Days = Array.from({ length: 30 }, (_, index) => {
      const date = new Date(now);
      date.setDate(now.getDate() - (29 - index));
      const dateKey = toLocalDateKey(date);
      const dayLabel = WEEKDAY_LABELS[date.getDay()];
      const amount = habit.entries
        .filter(
          (entry) => toLocalDateKey(parseEntryDate(entry.date)) === dateKey,
        )
        .reduce((sum, entry) => sum + entry.amount, 0);

      return {
        dateKey,
        dayLabel,
        dayNumber: `${date.getDate()}`,
        completed: datesSet.has(dateKey),
        amount,
        isToday: dateKey === todayKey,
      };
    });

    entries.set(habit.id, {
      habit,
      streak: streaksByHabitId[habit.id] ?? getCurrentStreak(habit),
      completionCountWindow,
      completionWindowTotal: completionSummary.completionWindowTotal,
      completionUnit: completionSummary.completionUnit,
      activeDays30: getActiveDaysInLastDays(habit, 30),
      averageValue30:
        habit.type === "binary"
          ? null
          : (metricsSnapshot?.avgValue30d ?? getAverageValue30(habit)),
      totalAmount30: getTotalAmountInLastDays(habit, 30),
      totalAmountAllTime: habit.entries.reduce(
        (sum, entry) => sum + entry.amount,
        0,
      ),
      totalEntries:
        metricsSnapshot?.totalEntriesAllTime ?? habit.entries.length,
      calendar30Days,
    });
  });

  return entries;
}
