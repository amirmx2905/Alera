import type { Entry } from "../types";
import { parseEntryDate, toLocalDateKey } from "../utils/dates";

type GoalType = "daily" | "weekly" | "monthly";

type ProgressInput = {
  entries: Entry[];
  goalAmount: number;
  goalType: GoalType;
  now?: Date;
};

const getRelevantEntries = (
  entries: Entry[],
  goalType: GoalType,
  now: Date,
) => {
  if (goalType === "daily") {
    const today = toLocalDateKey(now);
    return entries.filter(
      (entry) => toLocalDateKey(parseEntryDate(entry.date)) === today,
    );
  }

  if (goalType === "weekly") {
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);
    return entries.filter((entry) => parseEntryDate(entry.date) >= weekStart);
  }

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  return entries.filter((entry) => parseEntryDate(entry.date) >= monthStart);
};

export const getProgressData = ({
  entries,
  goalAmount,
  goalType,
  now = new Date(),
}: ProgressInput) => {
  const relevantEntries = getRelevantEntries(entries, goalType, now);
  const total = relevantEntries.reduce((sum, entry) => sum + entry.amount, 0);
  const progress = goalAmount ? Math.min((total / goalAmount) * 100, 100) : 0;

  return {
    progress,
    currentAmount: total,
  };
};
