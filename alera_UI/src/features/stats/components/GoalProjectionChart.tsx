import React, { useMemo } from "react";
import { Text, View, useWindowDimensions } from "react-native";
import { LineChart } from "react-native-gifted-charts";
import type { Habit } from "../../habits/types";
import type {
  StatsCalendarDay,
  TrajectoryPrediction,
  GoalProjectionPoint,
} from "../types";
import {
  toLocalDateKey,
  getMondayStartKey,
  getSundayDateKey,
  getMonthStartKey,
  getMonthEndKey,
} from "../../habits/utils/dates";

// ---------------------------------------------------------------------------
// Data builder
// ---------------------------------------------------------------------------

function buildDateSpine(startKey: string, endKey: string): string[] {
  const keys: string[] = [];
  const current = new Date(`${startKey}T00:00:00`);
  const end = new Date(`${endKey}T00:00:00`);
  while (current <= end) {
    keys.push(toLocalDateKey(current));
    current.setDate(current.getDate() + 1);
  }
  return keys;
}

function dayLabel(dateKey: string, goalType: string, index: number): string {
  const date = new Date(`${dateKey}T00:00:00`);
  if (goalType === "weekly") {
    return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][
      (date.getDay() + 6) % 7
    ];
  }
  // Monthly: show day number, sparse labels
  const dayNum = date.getDate();
  if (index === 0 || dayNum % 5 === 0) return `${dayNum}`;
  return "";
}

export function buildProjectionData(
  calendar30Days: StatsCalendarDay[],
  habit: Habit,
  predictedRate: number,
): GoalProjectionPoint[] {
  const todayEntry = calendar30Days.find((d) => d.isToday);
  if (!todayEntry || habit.goalType === "daily") return [];

  const todayKey = todayEntry.dateKey;
  const start =
    habit.goalType === "weekly"
      ? getMondayStartKey(todayKey)
      : getMonthStartKey(todayKey);
  const end =
    habit.goalType === "weekly"
      ? getSundayDateKey(todayKey)
      : getMonthEndKey(todayKey);

  const spine = buildDateSpine(start, end);
  const calMap = new Map(calendar30Days.map((d) => [d.dateKey, d]));

  // Build actual cumulative up to today
  let cumulative = 0;
  let activeDays = 0;
  let totalAmount = 0;
  const todayIdx = spine.indexOf(todayKey);

  const points: GoalProjectionPoint[] = spine.map((key, i) => {
    const isActual = i <= todayIdx;
    const calDay = calMap.get(key);
    const isToday = key === todayKey;

    if (isActual && calDay) {
      if (habit.type === "binary") {
        cumulative += calDay.completed ? 1 : 0;
      } else {
        cumulative += calDay.amount;
      }
      if (calDay.completed || calDay.amount > 0) {
        activeDays++;
        totalAmount += calDay.amount;
      }
    }

    return {
      dayLabel: dayLabel(key, habit.goalType, i),
      dateKey: key,
      cumulative,
      isActual,
      isToday,
    };
  });

  // Compute projected values for future days
  const cumulativeAtToday = points[todayIdx]?.cumulative ?? 0;
  let dailyProjected: number;

  if (habit.type === "binary") {
    dailyProjected = predictedRate;
  } else {
    const avgPerDay =
      activeDays > 0 ? totalAmount / activeDays : habit.goalAmount / 7;
    dailyProjected = avgPerDay * predictedRate;
  }

  for (let i = todayIdx + 1; i < points.length; i++) {
    const daysAhead = i - todayIdx;
    points[i].cumulative =
      Math.round((cumulativeAtToday + daysAhead * dailyProjected) * 100) / 100;
  }

  return points;
}

// ---------------------------------------------------------------------------
// Chart component
// ---------------------------------------------------------------------------

type GoalProjectionChartProps = {
  calendar30Days: StatsCalendarDay[];
  habit: Habit;
  trajectory: TrajectoryPrediction;
};

export function GoalProjectionChart({
  calendar30Days,
  habit,
  trajectory,
}: GoalProjectionChartProps) {
  const { width: viewportWidth } = useWindowDimensions();

  const points = useMemo(
    () =>
      buildProjectionData(
        calendar30Days,
        habit,
        trajectory.predicted_rate_next_7d,
      ),
    [calendar30Days, habit, trajectory.predicted_rate_next_7d],
  );

  if (points.length === 0) return null;

  const todayIdx = points.findIndex((p) => p.isToday);
  const projectedFinal = points[points.length - 1].cumulative;
  const willHitGoal = projectedFinal >= habit.goalAmount;
  const closeToGoal = projectedFinal >= habit.goalAmount * 0.8;

  const chartData = points.map((pt) => ({
    value: pt.cumulative,
    label: pt.dayLabel,
    dataPointColor: pt.isActual ? "#c4b5fd" : "#c4b5fd60",
    dataPointRadius: pt.isToday ? 5 : 3,
  }));

  const maxVal = Math.max(
    habit.goalAmount * 1.2,
    ...points.map((p) => p.cumulative),
  );

  const chartWidth = Math.max(viewportWidth - 140);
  const pointCount = Math.max(1, chartData.length);
  const edgeSpacing = 9;
  const spacing =
    pointCount > 1
      ? Math.floor((chartWidth - edgeSpacing * 2) / (pointCount - 1))
      : chartWidth - edgeSpacing * 2;

  const lineSegments =
    todayIdx >= 0
      ? [
          { startIndex: 0, endIndex: todayIdx, color: "#a78bfa" },
          {
            startIndex: todayIdx,
            endIndex: points.length - 1,
            color: "#a78bfa",
            strokeDashArray: [5, 5],
          },
        ]
      : undefined;

  const verdictColor = willHitGoal
    ? "#4ade80"
    : closeToGoal
      ? "#fbbf24"
      : "#f87171";
  const verdictText = willHitGoal ? "On track" : "May fall short";
  const periodLabel = habit.goalType === "weekly" ? "This week" : "This month";
  const unitLabel = habit.type === "binary" ? "days" : habit.unit;

  return (
    <View className="mt-1 rounded-2xl border border-white/10 bg-white/5 p-3">
      <Text className="mb-2 text-xs text-slate-400">
        Goal projection — {periodLabel}
      </Text>
      <LineChart
        data={chartData}
        lineSegments={lineSegments}
        isAnimated
        disableScroll
        initialSpacing={edgeSpacing}
        endSpacing={edgeSpacing}
        thickness={2}
        spacing={spacing}
        hideDataPoints={false}
        color="#a78bfa"
        dataPointsColor="#c4b5fd"
        curved
        curveType={1}
        maxValue={maxVal}
        noOfSections={3}
        yAxisTextStyle={{ color: "#94a3b8", fontSize: 9 }}
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
          Projected:{" "}
          <Text className="font-semibold text-white">
            {habit.type === "binary"
              ? Math.round(projectedFinal)
              : projectedFinal.toFixed(1)}
          </Text>{" "}
          / {habit.goalAmount} {unitLabel}
        </Text>
        <Text className="text-[11px] font-semibold" style={{ color: verdictColor }}>
          {verdictText}
        </Text>
      </View>
    </View>
  );
}
