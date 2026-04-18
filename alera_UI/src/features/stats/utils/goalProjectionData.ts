import type { Habit } from "../../habits/types";
import type {
  StatsCalendarDay,
  TrajectoryPrediction,
  GoalProjectionPoint,
} from "../types";
import { toLocalDateKey, getMondayStartKey } from "../../habits/utils/dates";

const MONTH_ABBR = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const DAY_ABBR = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export type HorizonOption = {
  label: string;
  points: number;
  aggregate?: "week" | "month";
};

/** Allowed horizons per goal type. First entry is the default. */
export const HORIZON_OPTIONS: Record<string, HorizonOption[]> = {
  daily: [
    { label: "7 days", points: 7 },
    { label: "4 weeks", points: 28, aggregate: "week" },
  ],
  weekly: [
    { label: "4 weeks", points: 4 },
    { label: "6 months", points: 26, aggregate: "month" },
  ],
  monthly: [{ label: "6 months", points: 6 }],
};

function periodLabel(goalType: string, date: Date, _index: number): string {
  if (goalType === "daily")
    return `${DAY_ABBR[date.getDay()]} ${date.getDate()}`;
  if (goalType === "weekly") return `${date.getDate()}/${date.getMonth() + 1}`;
  return MONTH_ABBR[date.getMonth()];
}

function futurePeriodKeys(
  goalType: string,
  afterDateKey: string,
  count: number,
): string[] {
  const keys: string[] = [];
  const cursor = new Date(`${afterDateKey}T00:00:00`);

  for (let i = 0; i < count; i++) {
    if (goalType === "daily") {
      cursor.setDate(cursor.getDate() + 1);
    } else if (goalType === "weekly") {
      cursor.setDate(cursor.getDate() + 7);
    } else {
      cursor.setMonth(cursor.getMonth() + 1);
    }
    keys.push(toLocalDateKey(cursor));
  }
  return keys;
}

function aggregateDailyToWeeks(
  points: GoalProjectionPoint[],
): GoalProjectionPoint[] {
  const weeks: GoalProjectionPoint[] = [];
  for (let i = 0; i < points.length; i += 7) {
    const chunk = points.slice(i, i + 7);
    if (chunk.length === 0) break;
    const avg =
      Math.round(
        (chunk.reduce((s, p) => s + p.value, 0) / chunk.length) * 100,
      ) / 100;
    const d = new Date(`${chunk[0].dateKey}T00:00:00`);
    weeks.push({
      label: `${d.getDate()}/${d.getMonth() + 1}`,
      dateKey: chunk[0].dateKey,
      value: avg,
      isActual: false,
      isCurrent: false,
    });
  }
  return weeks;
}

function aggregateWeeksToMonths(
  points: GoalProjectionPoint[],
): GoalProjectionPoint[] {
  const buckets = new Map<
    string,
    { sum: number; count: number; dateKey: string }
  >();
  for (const p of points) {
    const monthKey = p.dateKey.slice(0, 7);
    const existing = buckets.get(monthKey) ?? {
      sum: 0,
      count: 0,
      dateKey: p.dateKey,
    };
    existing.sum += p.value;
    existing.count += 1;
    buckets.set(monthKey, existing);
  }
  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(0, 6)
    .map(([_monthKey, b]) => {
      const d = new Date(`${b.dateKey}T00:00:00`);
      return {
        label: MONTH_ABBR[d.getMonth()],
        dateKey: b.dateKey,
        value: Math.round((b.sum / b.count) * 100) / 100,
        isActual: false,
        isCurrent: false,
      };
    });
}

export function buildProjectionData(
  calendar30Days: StatsCalendarDay[],
  habit: Habit,
  trajectory: TrajectoryPrediction,
  horizon: HorizonOption,
): GoalProjectionPoint[] {
  if (habit.goalType === "daily" && habit.type === "binary") return [];

  const isNumeric = habit.type === "numeric";
  const rawValues = isNumeric
    ? (trajectory.value_forecast ?? [])
    : (trajectory.forecast ?? []);

  if (rawValues.length === 0) return [];

  const neededPoints = Math.min(horizon.points, rawValues.length);

  const todayEntry = calendar30Days.find((d) => d.isToday);
  const todayKey = todayEntry?.dateKey ?? toLocalDateKey(new Date());
  const startKey =
    habit.goalType === "weekly"
      ? getMondayStartKey(todayKey)
      : habit.goalType === "monthly"
        ? todayKey.slice(0, 7) + "-01"
        : todayKey;

  const futureKeys = futurePeriodKeys(habit.goalType, startKey, neededPoints);

  const nativePoints: GoalProjectionPoint[] = futureKeys.map((key, i) => {
    let value: number;
    if (isNumeric) {
      value = rawValues[i] ?? 0;
    } else {
      const rate = rawValues[i] ?? 0;
      value = Math.round(rate * habit.goalAmount);
    }

    return {
      label: periodLabel(habit.goalType, new Date(`${key}T00:00:00`), i),
      dateKey: key,
      value,
      isActual: false,
      isCurrent: false,
    };
  });

  if (horizon.aggregate === "week") return aggregateDailyToWeeks(nativePoints);
  if (horizon.aggregate === "month")
    return aggregateWeeksToMonths(nativePoints);

  return nativePoints;
}
