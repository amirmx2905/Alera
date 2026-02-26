import type { Entry, Habit } from "../../features/habits/types";
import {
  getMondayStartKey,
  getMonthEndKey,
  getMonthStartKey,
  getSundayDateKey,
  toLocalDateKey,
} from "../../features/habits/utils/dates";
import type { HabitCategory } from "./habits.types";

export const HABITS_CACHE_KEY = "habits_cache_v1:";

const parseDateKey = (value: string) => new Date(`${value}T00:00:00`);

export const getExpectedMetricDate = (
  goalType: Habit["goalType"],
  todayKey: string,
) => {
  if (goalType === "daily") return todayKey;
  if (goalType === "weekly") return getSundayDateKey(todayKey);
  return getMonthEndKey(todayKey);
};

export const calculateLocalStreak = (
  entries: Entry[],
  goalType: Habit["goalType"],
  goalAmount: number,
) => {
  if (entries.length === 0) return 0;
  if (goalType !== "daily" && goalAmount <= 0) return 0;

  const totalsByDay = entries.reduce<Record<string, number>>((acc, entry) => {
    const amount = Number(entry.amount);
    if (amount <= 0) return acc;
    const dateKey = toLocalDateKey(new Date(entry.date));
    acc[dateKey] = (acc[dateKey] || 0) + amount;
    return acc;
  }, {});

  const isDayComplete = (dateKey: string) => {
    const total = totalsByDay[dateKey] ?? 0;
    return goalAmount > 0 ? total >= goalAmount : total > 0;
  };

  if (goalType === "daily") {
    const todayKey = toLocalDateKey(new Date());
    const cursor = new Date();
    if (!isDayComplete(todayKey)) {
      cursor.setDate(cursor.getDate() - 1);
    }

    let streak = 0;
    while (true) {
      const key = toLocalDateKey(cursor);
      if (!isDayComplete(key)) break;
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
  }

  const totalsByPeriod = entries.reduce<Record<string, number>>(
    (acc, entry) => {
      const amount = Number(entry.amount);
      if (amount <= 0) return acc;
      const dateKey = toLocalDateKey(new Date(entry.date));
      const periodKey =
        goalType === "weekly"
          ? getMondayStartKey(dateKey)
          : getMonthStartKey(dateKey);
      acc[periodKey] = (acc[periodKey] || 0) + amount;
      return acc;
    },
    {},
  );

  const todayKey = toLocalDateKey(new Date());
  const currentPeriodKey =
    goalType === "weekly"
      ? getMondayStartKey(todayKey)
      : getMonthStartKey(todayKey);

  if ((totalsByPeriod[currentPeriodKey] ?? 0) < goalAmount) return 0;

  let streak = 0;
  let cursorKey = currentPeriodKey;
  while (true) {
    const total = totalsByPeriod[cursorKey] ?? 0;
    if (total < goalAmount) break;
    streak += 1;

    const cursorDate = parseDateKey(cursorKey);
    if (goalType === "weekly") {
      cursorDate.setDate(cursorDate.getDate() - 7);
      cursorKey = getMondayStartKey(toLocalDateKey(cursorDate));
    } else {
      cursorDate.setMonth(cursorDate.getMonth() - 1);
      cursorKey = getMonthStartKey(toLocalDateKey(cursorDate));
    }
  }

  return streak;
};

export const buildCategoryState = (items: HabitCategory[]) => ({
  nextCategories: items.map((category) => ({
    id: category.id,
    name: category.name,
  })),
  nextMap: items.reduce<Record<string, string>>((acc, category) => {
    acc[category.name] = category.id;
    return acc;
  }, {}),
});
