import type { StatsHabitDetail, StatsHabitListItem, StatsKpi } from "../types";
import type { Habit } from "../../habits/types";
import {
  getCdmxDateKey,
  getMonthEndKey,
  getMondayStartKey,
  getSundayDateKey,
  parseEntryDate,
  toLocalDateKey,
} from "../../habits/utils/dates";
import type {
  HabitMetricSnapshot,
  ProfileMetricSnapshot,
} from "./useStatsData.time";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type CompletionUnit = "days" | "weeks" | "months";

export function getCurrentStreak(habit: Habit) {
  const dates = new Set(
    habit.entries.map((entry) => toLocalDateKey(parseEntryDate(entry.date))),
  );
  const todayKey = getCdmxDateKey();
  const now = new Date(`${todayKey}T12:00:00`);

  let streak = 0;
  for (let index = 0; index <= 45; index++) {
    const check = new Date(now);
    check.setDate(now.getDate() - index);
    const key = toLocalDateKey(check);
    if (dates.has(key)) {
      streak += 1;
      continue;
    }
    if (key !== todayKey) break;
  }
  return streak;
}

function getAverageValue30(habit: Habit) {
  if (habit.type === "binary") return null;
  const now = new Date();
  const threshold = new Date(now);
  threshold.setDate(now.getDate() - 29);
  const recent = habit.entries.filter(
    (entry) => parseEntryDate(entry.date).getTime() >= threshold.getTime(),
  );
  if (!recent.length) return 0;
  const total = recent.reduce((sum, entry) => sum + entry.amount, 0);
  return Number((total / recent.length).toFixed(1));
}

function toDateAtNoon(dateKey: string) {
  return new Date(`${dateKey}T12:00:00`);
}

function getMonthStartKey(dateKey: string) {
  const date = toDateAtNoon(dateKey);
  return toLocalDateKey(new Date(date.getFullYear(), date.getMonth(), 1));
}

function getPeriodBounds(
  goalType: Habit["goalType"],
  dateKey: string,
): { start: string; end: string } {
  if (goalType === "daily") {
    return { start: dateKey, end: dateKey };
  }

  if (goalType === "weekly") {
    return {
      start: getMondayStartKey(dateKey),
      end: getSundayDateKey(dateKey),
    };
  }

  const monthStart = getMonthStartKey(dateKey);
  return {
    start: monthStart,
    end: getMonthEndKey(dateKey),
  };
}

function getTotalInBounds(habit: Habit, start: string, end: string) {
  return habit.entries.reduce((sum, entry) => {
    const key = toLocalDateKey(parseEntryDate(entry.date));
    if (key < start || key > end) return sum;
    return sum + entry.amount;
  }, 0);
}

function isHabitCompletedForDateKey(habit: Habit, dateKey: string) {
  if (habit.goalAmount <= 0) return false;

  const bounds = getPeriodBounds(habit.goalType, dateKey);
  const total = getTotalInBounds(habit, bounds.start, bounds.end);
  return total >= habit.goalAmount;
}

function getLastNDates(days: number) {
  const now = new Date();
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(now);
    date.setDate(now.getDate() - (days - 1 - index));
    return date;
  });
}

function getCompletionSummaryForLookback(habit: Habit, lookbackDays: number) {
  const dateKeys = getLastNDates(lookbackDays).map((date) =>
    toLocalDateKey(date),
  );

  if (habit.goalType === "daily") {
    const completed = dateKeys.filter((key) =>
      isHabitCompletedForDateKey(habit, key),
    ).length;
    return {
      completionCount: completed,
      completionWindowTotal: dateKeys.length,
      completionUnit: "days" as CompletionUnit,
    };
  }

  if (habit.goalType === "weekly") {
    const weeks = Array.from(
      new Set(dateKeys.map((key) => getMondayStartKey(key))),
    );
    const completed = weeks.filter((weekStart) =>
      isHabitCompletedForDateKey(habit, weekStart),
    ).length;
    return {
      completionCount: completed,
      completionWindowTotal: weeks.length,
      completionUnit: "weeks" as CompletionUnit,
    };
  }

  const months = Array.from(
    new Set(dateKeys.map((key) => getMonthStartKey(key))),
  );
  const completed = months.filter((monthStart) =>
    isHabitCompletedForDateKey(habit, monthStart),
  ).length;
  return {
    completionCount: completed,
    completionWindowTotal: months.length,
    completionUnit: "months" as CompletionUnit,
  };
}

export function buildKpis(
  activeHabits: Habit[],
  streaksByHabitId: Record<string, number>,
  profileMetricSnapshot: ProfileMetricSnapshot,
): StatsKpi {
  let completedCount = 0;
  let totalPossible = 0;
  activeHabits.forEach((habit) => {
    const summary = getCompletionSummaryForLookback(habit, 7);
    completedCount += summary.completionCount;
    totalPossible += summary.completionWindowTotal;
  });

  const uniqueActiveDays = new Set<string>();
  const threshold = new Date();
  threshold.setDate(threshold.getDate() - 29);
  activeHabits.forEach((habit) => {
    habit.entries.forEach((entry) => {
      const date = parseEntryDate(entry.date);
      if (date.getTime() >= threshold.getTime()) {
        uniqueActiveDays.add(toLocalDateKey(date));
      }
    });
  });

  let bestStreak = 0;
  let bestStreakHabit = "N/A";
  activeHabits.forEach((habit) => {
    const streak = streaksByHabitId[habit.id] ?? getCurrentStreak(habit);
    if (streak > bestStreak) {
      bestStreak = streak;
      bestStreakHabit = habit.name;
    }
  });

  const bestStreakFromMetrics = profileMetricSnapshot.bestStreakOverall;
  const bestStreakHabitIdFromMetrics = profileMetricSnapshot.bestStreakHabitId;
  const bestStreakHabitNameFromMetrics = bestStreakHabitIdFromMetrics
    ? activeHabits.find((habit) => habit.id === bestStreakHabitIdFromMetrics)
        ?.name
    : undefined;

  return {
    totalHabits: activeHabits.length,
    completionRate:
      totalPossible > 0
        ? Math.round((completedCount / totalPossible) * 100)
        : 0,
    completedCount,
    totalPossible,
    activeDays30:
      profileMetricSnapshot.activeDays30 !== undefined
        ? profileMetricSnapshot.activeDays30
        : uniqueActiveDays.size,
    bestStreak:
      bestStreakFromMetrics !== undefined ? bestStreakFromMetrics : bestStreak,
    bestStreakHabit:
      bestStreakFromMetrics !== undefined
        ? (bestStreakHabitNameFromMetrics ?? "N/A")
        : bestStreakHabit,
  };
}

export function buildHabitsList(
  activeHabits: Habit[],
  streaksByHabitId: Record<string, number>,
  habitMetricSnapshotById: Record<string, HabitMetricSnapshot>,
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
      averageValue30:
        habit.type === "binary"
          ? null
          : (metricsSnapshot?.avgValue30d ?? getAverageValue30(habit)),
      totalEntries:
        metricsSnapshot?.totalEntriesAllTime ?? habit.entries.length,
      calendar30Days,
    });
  });

  return entries;
}
