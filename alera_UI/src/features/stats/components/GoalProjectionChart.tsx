import React, { useMemo } from "react";
import { Text, View, useWindowDimensions } from "react-native";
import { LineChart } from "react-native-gifted-charts";
import type { Habit } from "../../habits/types";
import type { StatsCalendarDay, TrajectoryPrediction } from "../types";
import {
  HORIZON_OPTIONS,
  buildProjectionData,
} from "../utils/goalProjectionData";

export { HORIZON_OPTIONS } from "../utils/goalProjectionData";

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
