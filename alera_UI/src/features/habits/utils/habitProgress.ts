import type { Entry } from "../types";
import {
  getCdmxDateKey,
  getMondayStartKey,
  getMonthStartKey,
  parseEntryDate,
  toLocalDateKey,
} from "./dates";

type GoalType = "daily" | "weekly" | "monthly";

type ProgressInput = {
  entries: Entry[];
  goalAmount: number;
  goalType: GoalType;
  todayKey?: string;
};

function getRelevantEntries(
  entries: Entry[],
  goalType: GoalType,
  todayKey: string,
) {
  if (goalType === "daily") {
    return entries.filter(
      (entry) => toLocalDateKey(parseEntryDate(entry.date)) === todayKey,
    );
  }

  if (goalType === "weekly") {
    const weekStartKey = getMondayStartKey(todayKey);
    return entries.filter(
      (entry) => toLocalDateKey(parseEntryDate(entry.date)) >= weekStartKey,
    );
  }

  const monthStartKey = getMonthStartKey(todayKey);
  return entries.filter(
    (entry) => toLocalDateKey(parseEntryDate(entry.date)) >= monthStartKey,
  );
}

export function getProgressData({
  entries,
  goalAmount,
  goalType,
  todayKey = getCdmxDateKey(),
}: ProgressInput) {
  const relevantEntries = getRelevantEntries(entries, goalType, todayKey);
  const total = relevantEntries.reduce((sum, entry) => sum + entry.amount, 0);
  const progress = goalAmount ? Math.min((total / goalAmount) * 100, 100) : 0;

  return {
    progress,
    currentAmount: total,
  };
}
