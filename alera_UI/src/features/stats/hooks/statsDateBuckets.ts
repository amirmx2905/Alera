import type { StatsGranularity, StatsTrendPoint } from "../types";
import type { Habit } from "../../habits/types";
import {
  getMonthEndKey,
  getMondayStartKey,
  getSundayDateKey,
  toLocalDateKey,
  parseEntryDate,
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

function maxDateKey(left: string, right: string) {
  return left > right ? left : right;
}

function addDays(dateKey: string, days: number) {
  const date = new Date(`${dateKey}T12:00:00`);
  date.setDate(date.getDate() + days);
  return toLocalDateKey(date);
}

function getMonthStartKey(dateKey: string) {
  const date = new Date(`${dateKey}T12:00:00`);
  return toLocalDateKey(new Date(date.getFullYear(), date.getMonth(), 1));
}

function addMonths(monthStartKey: string, months: number) {
  const date = new Date(`${monthStartKey}T12:00:00`);
  date.setMonth(date.getMonth() + months);
  date.setDate(1);
  return toLocalDateKey(date);
}

export function getDateRangeForGranularity(
  granularity: StatsGranularity,
  firstEntryDateKey?: string,
) {
  const todayKey = toLocalDateKey(new Date());

  if (granularity === "daily") {
    const trailingFrom = addDays(todayKey, -6);
    const from = firstEntryDateKey
      ? maxDateKey(trailingFrom, firstEntryDateKey)
      : trailingFrom;
    return {
      from,
      to: todayKey,
    };
  }

  if (granularity === "weekly") {
    const currentWeekStart = getMondayStartKey(todayKey);
    const trailingFrom = addDays(currentWeekStart, -21);
    const firstWeekStart = firstEntryDateKey
      ? getMondayStartKey(firstEntryDateKey)
      : undefined;
    const from = firstWeekStart
      ? maxDateKey(trailingFrom, firstWeekStart)
      : trailingFrom;

    return {
      from,
      to: getSundayDateKey(todayKey),
    };
  }

  const currentMonthStart = getMonthStartKey(todayKey);
  const trailingFrom = addMonths(currentMonthStart, -5);
  const firstMonthStart = firstEntryDateKey
    ? getMonthStartKey(firstEntryDateKey)
    : undefined;
  const from = firstMonthStart
    ? maxDateKey(trailingFrom, firstMonthStart)
    : trailingFrom;

  return {
    from,
    to: getMonthEndKey(todayKey),
  };
}

export function buildBuckets(
  granularity: StatsGranularity,
  firstEntryDateKey?: string,
): StatsTrendPoint[] {
  if (granularity === "daily") {
    const { from, to } = getDateRangeForGranularity("daily", firstEntryDateKey);
    const buckets: StatsTrendPoint[] = [];
    let dateKey = from;

    while (dateKey <= to) {
      const date = new Date(`${dateKey}T12:00:00`);
      buckets.push({
        dateKey,
        label: WEEKDAY_LABELS[date.getDay()],
        totalEntries: 0,
      });
      dateKey = addDays(dateKey, 1);
    }

    return buckets;
  }

  if (granularity === "weekly") {
    const { from, to } = getDateRangeForGranularity(
      "weekly",
      firstEntryDateKey,
    );
    const buckets: StatsTrendPoint[] = [];
    let weekStartKey = from;
    let weekIndex = 1;

    while (weekStartKey <= to) {
      const endDateKey = getSundayDateKey(weekStartKey);
      buckets.push({
        dateKey: endDateKey,
        label: `W${weekIndex}`,
        totalEntries: 0,
      });
      weekStartKey = addDays(weekStartKey, 7);
      weekIndex += 1;
    }

    return buckets;
  }

  const { from, to } = getDateRangeForGranularity("monthly", firstEntryDateKey);
  const buckets: StatsTrendPoint[] = [];
  let monthStartKey = from;

  while (monthStartKey <= to) {
    const date = new Date(`${monthStartKey}T12:00:00`);
    const monthLabel = date.toLocaleString("en-US", { month: "short" });
    buckets.push({
      dateKey: getMonthEndKey(monthStartKey),
      label: monthLabel,
      totalEntries: 0,
    });
    monthStartKey = addMonths(monthStartKey, 1);
  }

  return buckets;
}

export function buildEntryCountMapByGranularity(
  habits: Habit[],
  granularity: StatsGranularity,
) {
  const countsByBucket: Record<string, number> = {};

  habits.forEach((habit) => {
    habit.entries.forEach((entry) => {
      const entryKey = toLocalDateKey(parseEntryDate(entry.date));
      const bucketKey =
        granularity === "daily"
          ? entryKey
          : granularity === "weekly"
            ? getSundayDateKey(entryKey)
            : getMonthEndKey(entryKey);

      countsByBucket[bucketKey] = (countsByBucket[bucketKey] || 0) + 1;
    });
  });

  return countsByBucket;
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
