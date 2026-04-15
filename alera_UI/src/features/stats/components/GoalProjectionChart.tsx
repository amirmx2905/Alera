import React, { useMemo } from "react";
import { Text, View, useWindowDimensions } from "react-native";
import { LineChart } from "react-native-gifted-charts";
import type { Habit } from "../../habits/types";
import type {
  StatsCalendarDay,
  TrajectoryPrediction,
  GoalProjectionPoint,
} from "../types";
import { toLocalDateKey, getMondayStartKey } from "../../habits/utils/dates";

// ---------------------------------------------------------------------------
// Period helpers
// ---------------------------------------------------------------------------

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

type HorizonOption = {
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

/** Generate future period date-keys starting after a reference date. */
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

/** Aggregate N daily points into weekly averages. */
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

/** Aggregate N weekly points into monthly averages. */
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

// ---------------------------------------------------------------------------
// Data builder
// ---------------------------------------------------------------------------

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

  // Determine how many native-period points we need
  const neededPoints = Math.min(horizon.points, rawValues.length);

  // Starting date key
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
      // Binary: rate → expected completions in the period
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

  // Aggregate if the selected horizon requires it
  if (horizon.aggregate === "week") return aggregateDailyToWeeks(nativePoints);
  if (horizon.aggregate === "month")
    return aggregateWeeksToMonths(nativePoints);

  return nativePoints;
}

// ---------------------------------------------------------------------------
// Chart component
// ---------------------------------------------------------------------------

type GoalProjectionChartProps = {
  calendar30Days: StatsCalendarDay[];
  habit: Habit;
  trajectory: TrajectoryPrediction;
  horizonLabel?: string;
};

export function GoalProjectionChart({
  calendar30Days,
  habit,
  trajectory,
  horizonLabel,
}: GoalProjectionChartProps) {
  const { width: viewportWidth } = useWindowDimensions();
  const options = HORIZON_OPTIONS[habit.goalType] ?? HORIZON_OPTIONS.daily;
  const horizon =
    (horizonLabel && options.find((o) => o.label === horizonLabel)) ||
    options[0];

  const points = useMemo(
    () => buildProjectionData(calendar30Days, habit, trajectory, horizon),
    [calendar30Days, habit, trajectory, horizon],
  );

  if (points.length === 0) return null;

  const avgProjected = points.reduce((s, p) => s + p.value, 0) / points.length;

  const willHitGoal = avgProjected >= habit.goalAmount;
  const closeToGoal = avgProjected >= habit.goalAmount * 0.8;

  const chartData = points.map((pt) => ({
    value: pt.value,
    label: pt.label,
    dataPointColor: "#c4b5fd60",
    dataPointRadius: 3,
    dataPointLabelComponent: () => (
      <Text style={{ color: "#e2e8f0", fontSize: 8, textAlign: "center" }}>
        {Number.isInteger(pt.value) ? pt.value : pt.value.toFixed(1)}
      </Text>
    ),
    dataPointLabelShiftY: -10,
  }));

  const maxVal = Math.max(
    habit.goalAmount * 1.2,
    ...points.map((p) => p.value),
  );

  const chartWidth = Math.max(viewportWidth - 140);
  const pointCount = Math.max(1, chartData.length);
  const edgeSpacing = 9;
  const spacing =
    pointCount > 1
      ? Math.floor((chartWidth - edgeSpacing * 2) / (pointCount - 1))
      : chartWidth - edgeSpacing * 2;

  const verdictColor = willHitGoal
    ? "#4ade80"
    : closeToGoal
      ? "#fbbf24"
      : "#f87171";
  const verdictText = willHitGoal ? "On track" : "May fall short";

  const unitLabel = habit.type === "binary" ? "days" : habit.unit;

  return (
    <View className="mt-1 rounded-2xl border border-white/10 bg-white/5 p-3">
      <Text className="mb-2 text-xs text-slate-400">
        Goal projection — {horizon.label}
      </Text>
      <LineChart
        data={chartData}
        isAnimated
        disableScroll
        initialSpacing={edgeSpacing}
        endSpacing={edgeSpacing}
        thickness={2}
        spacing={spacing}
        hideDataPoints={false}
        color="#a78bfa"
        dataPointsColor="#c4b5fd60"
        curved
        curveType={1}
        maxValue={maxVal}
        noOfSections={3}
        dashWidth={5}
        dashGap={5}
        yAxisTextStyle={{ color: "#94a3b8", fontSize: 9 }}
        formatYLabel={(val: string) => {
          const n = parseFloat(val);
          return Number.isInteger(n) ? String(n) : n.toFixed(1);
        }}
        xAxisLabelTextStyle={{ color: "#94a3b8", fontSize: 9 }}
        xAxisColor="#475569"
        yAxisColor="#475569"
        rulesColor="#334155"
        width={chartWidth}
        showReferenceLine1
        referenceLine1Position={habit.goalAmount}
        referenceLine1Config={{
          color: "#4ade80",
          dashWidth: 4,
          dashGap: 4,
          thickness: 1,
        }}
      />
      <View className="mt-2 flex-row items-center justify-between">
        <Text className="text-[11px] text-slate-400">
          Avg. projected:{" "}
          <Text className="font-semibold text-white">
            {habit.type === "binary"
              ? Math.round(avgProjected)
              : avgProjected.toFixed(1)}
          </Text>{" "}
          / {habit.goalAmount} {unitLabel}
        </Text>
        <Text
          className="text-[11px] font-semibold"
          style={{ color: verdictColor }}
        >
          {verdictText}
        </Text>
      </View>
    </View>
  );
}
