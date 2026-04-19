import type { HabitLogRecord } from "../shared/types.ts";
import { convertToLogicalDate } from "../shared/utils.ts";

export function countMaxStreak(dates: string[]): number {
  if (dates.length === 0) return 0;

  const sorted = dates
    .map((d) => new Date(d))
    .sort((a, b) => a.getTime() - b.getTime());

  let best = 1;
  let current = 1;

  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    prev.setDate(prev.getDate() + 1);

    if (
      sorted[i].toISOString().split("T")[0] === prev.toISOString().split("T")[0]
    ) {
      current += 1;
      best = Math.max(best, current);
    } else {
      current = 1;
    }
  }

  return best;
}

export function sumValues(records: HabitLogRecord[]): number {
  return records.reduce((sum, record) => sum + (record.value || 0), 0);
}

export function groupDailyTotals(
  records: HabitLogRecord[],
): Record<string, number> {
  const dailyTotals: Record<string, number> = {};
  for (const record of records) {
    const recordLogicalDate = convertToLogicalDate(record);
    dailyTotals[recordLogicalDate] = (dailyTotals[recordLogicalDate] || 0) +
      (record.value || 0);
  }
  return dailyTotals;
}

export function groupTotalsByHabit(
  records: HabitLogRecord[],
): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const record of records) {
    totals[record.habit_id] = (totals[record.habit_id] || 0) +
      (record.value || 0);
  }
  return totals;
}

export function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseDateKey(dateKey: string): Date {
  return new Date(`${dateKey}T00:00:00`);
}

export function getMondayStartKey(dateKey: string): string {
  const date = parseDateKey(dateKey);
  const day = date.getDay();
  const diff = (day + 6) % 7;
  date.setDate(date.getDate() - diff);
  return toDateKey(date);
}

export function getMonthStartKey(dateKey: string): string {
  const date = parseDateKey(dateKey);
  return toDateKey(new Date(date.getFullYear(), date.getMonth(), 1));
}

export function getSundayDateKey(dateKey: string): string {
  const date = parseDateKey(dateKey);
  const dayOfWeek = date.getDay();
  const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
  date.setDate(date.getDate() + daysUntilSunday);
  return toDateKey(date);
}

export function getMonthEndKey(dateKey: string): string {
  const date = parseDateKey(dateKey);
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return toDateKey(lastDay);
}

export function getDaysBetween(startKey: string, endKey: string): number {
  const start = parseDateKey(startKey);
  const end = parseDateKey(endKey);
  const diffMs = end.getTime() - start.getTime();
  return Math.max(0, Math.floor(diffMs / (24 * 60 * 60 * 1000)));
}
