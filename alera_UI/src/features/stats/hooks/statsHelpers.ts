import type { Habit } from "../../habits/types";
import {
  getCdmxDateKey,
  getMonthEndKey,
  getMondayStartKey,
  getSundayDateKey,
  parseEntryDate,
  toLocalDateKey,
} from "../../habits/utils/dates";

export type CompletionUnit = "days" | "weeks" | "months";

export type CompletionSummary = {
  completionCount: number;
  completionWindowTotal: number;
  completionUnit: CompletionUnit;
};

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

export function getAverageValue30(habit: Habit) {
  if (habit.type === "binary") return null;
  const windowDays = 30;
  const todayKey = getCdmxDateKey();
  const today = new Date(`${todayKey}T12:00:00`);
  const threshold = new Date(today);
  threshold.setDate(today.getDate() - (windowDays - 1));

  const total = habit.entries.reduce((sum, entry) => {
    if (parseEntryDate(entry.date).getTime() < threshold.getTime()) return sum;
    return sum + entry.amount;
  }, 0);

  return Number((total / windowDays).toFixed(1));
}

export function getTotalAmountInLastDays(habit: Habit, days: number) {
  const todayKey = getCdmxDateKey();
  const today = new Date(`${todayKey}T12:00:00`);
  const threshold = new Date(today);
  threshold.setDate(today.getDate() - (days - 1));

  return habit.entries.reduce((sum, entry) => {
    const entryDate = parseEntryDate(entry.date);
    if (entryDate.getTime() < threshold.getTime()) return sum;
    return sum + entry.amount;
  }, 0);
}

export function getActiveDaysInLastDays(habit: Habit, days: number) {
  const todayKey = getCdmxDateKey();
  const today = new Date(`${todayKey}T12:00:00`);
  const threshold = new Date(today);
  threshold.setDate(today.getDate() - (days - 1));
  const activeDays = new Set<string>();

  habit.entries.forEach((entry) => {
    const entryDate = parseEntryDate(entry.date);
    if (entryDate.getTime() < threshold.getTime()) return;
    activeDays.add(toLocalDateKey(entryDate));
  });

  return activeDays.size;
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
  const todayKey = getCdmxDateKey();
  const today = new Date(`${todayKey}T12:00:00`);
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (days - 1 - index));
    return date;
  });
}

export function getCompletionSummaryForLookback(
  habit: Habit,
  lookbackDays: number,
): CompletionSummary {
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
      completionUnit: "days",
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
      completionUnit: "weeks",
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
    completionUnit: "months",
  };
}
