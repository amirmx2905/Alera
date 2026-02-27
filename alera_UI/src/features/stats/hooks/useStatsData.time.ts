import type { StatsGranularity, StatsTrendPoint } from "../types";
import type { Habit } from "../../habits/types";
import {
  getMonthEndKey,
  getMondayStartKey,
  getSundayDateKey,
  parseEntryDate,
  toLocalDateKey,
} from "../../habits/utils/dates";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export type HabitMetricSnapshot = {
  daysCompleted30d?: number;
  avgValue30d?: number;
  totalEntriesAllTime?: number;
};

export type ProfileMetricSnapshot = {
  activeDays30?: number;
  bestStreakOverall?: number;
  bestStreakHabitId?: string | null;
};

function getLastNDates(days: number) {
  const now = new Date();
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(now);
    date.setDate(now.getDate() - (days - 1 - index));
    return date;
  });
}

export function getDateRangeForGranularity(granularity: StatsGranularity) {
  const now = new Date();

  if (granularity === "daily") {
    const from = new Date(now);
    from.setDate(now.getDate() - 6);
    return {
      from: toLocalDateKey(from),
      to: toLocalDateKey(now),
    };
  }

  if (granularity === "weekly") {
    const weekStart = getMondayStartKey(toLocalDateKey(now));
    const weekStartDate = new Date(`${weekStart}T12:00:00`);
    weekStartDate.setDate(weekStartDate.getDate() - 21);
    return {
      from: toLocalDateKey(weekStartDate),
      to: getSundayDateKey(toLocalDateKey(now)),
    };
  }

  const monthEnd = getMonthEndKey(toLocalDateKey(now));
  const monthStartDate = new Date(`${monthEnd}T12:00:00`);
  monthStartDate.setMonth(monthStartDate.getMonth() - 5);
  monthStartDate.setDate(1);
  return {
    from: toLocalDateKey(monthStartDate),
    to: monthEnd,
  };
}

export function buildBuckets(granularity: StatsGranularity): StatsTrendPoint[] {
  const now = new Date();

  if (granularity === "daily") {
    return getLastNDates(7).map((date) => {
      const dateKey = toLocalDateKey(date);
      return {
        dateKey,
        label: WEEKDAY_LABELS[date.getDay()],
        totalEntries: 0,
      };
    });
  }

  if (granularity === "weekly") {
    return Array.from({ length: 4 }, (_, index) => {
      const date = new Date(now);
      date.setDate(now.getDate() - (3 - index) * 7);
      const endDateKey = getSundayDateKey(toLocalDateKey(date));
      return {
        dateKey: endDateKey,
        label: `W${index + 1}`,
        totalEntries: 0,
      };
    });
  }

  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    const monthLabel = date.toLocaleString("en-US", { month: "short" });
    return {
      dateKey: getMonthEndKey(toLocalDateKey(date)),
      label: monthLabel,
      totalEntries: 0,
    };
  });
}

export function countEntriesForBucket(
  habits: Habit[],
  granularity: StatsGranularity,
  bucketDateKey: string,
) {
  if (granularity === "daily") {
    return habits.reduce((sum, habit) => {
      const count = habit.entries.filter(
        (entry) => toLocalDateKey(parseEntryDate(entry.date)) === bucketDateKey,
      ).length;
      return sum + count;
    }, 0);
  }

  if (granularity === "weekly") {
    const weekStart = getMondayStartKey(bucketDateKey);
    return habits.reduce((sum, habit) => {
      const count = habit.entries.filter((entry) => {
        const entryKey = toLocalDateKey(parseEntryDate(entry.date));
        return getMondayStartKey(entryKey) === weekStart;
      }).length;
      return sum + count;
    }, 0);
  }

  return habits.reduce((sum, habit) => {
    const count = habit.entries.filter((entry) => {
      const entryKey = toLocalDateKey(parseEntryDate(entry.date));
      return getMonthEndKey(entryKey) === bucketDateKey;
    }).length;
    return sum + count;
  }, 0);
}

export function getLatestValueByDate(rows: { date: string; value: number }[]) {
  if (!rows.length) return undefined;
  let latest = rows[0];

  for (let index = 1; index < rows.length; index += 1) {
    const current = rows[index];
    if (current.date > latest.date) latest = current;
  }

  return Number(latest.value);
}

export function buildLatestHabitMetricMap(
  rows: {
    habit_id: string | null;
    date: string;
    value: number;
  }[],
) {
  const latestByHabit: Record<string, { date: string; value: number }> = {};

  rows.forEach((row) => {
    if (!row.habit_id) return;
    const previous = latestByHabit[row.habit_id];
    if (!previous || row.date > previous.date) {
      latestByHabit[row.habit_id] = {
        date: row.date,
        value: Number(row.value),
      };
    }
  });

  return latestByHabit;
}
