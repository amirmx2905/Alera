import React, { useMemo } from "react";
import { Text, View, useWindowDimensions } from "react-native";
import { LineChart, PieChart } from "react-native-gifted-charts";
import type { StatsHabitListItem, StatsTrendPoint } from "../types";

type ChartProps = {
  title: string;
  headerRightLabel?: string;
  points: StatsTrendPoint[];
  showArea?: boolean;
};

function buildChartData(points: StatsTrendPoint[]) {
  return points.map((point) => ({
    value: point.totalEntries,
    label: point.label,
  }));
}

export function StatsTrendChart({
  title,
  headerRightLabel,
  points,
  showArea = false,
}: ChartProps) {
  const { width: viewportWidth } = useWindowDimensions();
  const data = useMemo(() => buildChartData(points), [points]);
  const maxValue = Math.max(4, ...data.map((item) => item.value));
  const chartWidth = Math.max(220, viewportWidth - 104);
  const pointCount = Math.max(1, data.length);
  const spacing = Math.max(20, Math.floor(chartWidth / (pointCount + 1)));

  return (
    <View className="mb-5 rounded-3xl border border-white/10 bg-white/5 p-5">
      <View className="mb-4 flex-row items-center justify-between">
        <Text className="text-lg font-semibold text-white">{title}</Text>
        {headerRightLabel ? (
          <Text className="text-xs font-medium text-slate-400">
            {headerRightLabel}
          </Text>
        ) : null}
      </View>
      <LineChart
        data={data}
        isAnimated={false}
        thickness={2}
        spacing={spacing}
        hideDataPoints={false}
        color="#a78bfa"
        dataPointsColor="#c4b5fd"
        startFillColor="#7c3aed"
        endFillColor="#7c3aed00"
        areaChart={showArea}
        curved
        curveType={1}
        maxValue={maxValue}
        yAxisTextStyle={{ color: "#94a3b8", fontSize: 11 }}
        xAxisLabelTextStyle={{ color: "#94a3b8", fontSize: 11 }}
        xAxisColor="#475569"
        yAxisColor="#475569"
        noOfSections={4}
        rulesColor="#334155"
        rulesType="dashed"
        width={chartWidth}
      />
    </View>
  );
}

type StatsHabitShareDonutChartProps = {
  habits: StatsHabitListItem[];
};

export function StatsHabitShareDonutChart({
  habits,
}: StatsHabitShareDonutChartProps) {
  const segments = useMemo(() => {
    const palette = ["#7c3aed", "#8b5cf6", "#a78bfa", "#c4b5fd", "#64748b"];
    const sorted = [...habits]
      .filter((habit) => habit.entriesInSelectedPeriod > 0)
      .sort(
        (left, right) =>
          right.entriesInSelectedPeriod - left.entriesInSelectedPeriod,
      );

    const top = sorted.slice(0, 4);
    const otherEntries = sorted
      .slice(4)
      .reduce((sum, habit) => sum + habit.entriesInSelectedPeriod, 0);

    const base = top.map((habit, index) => ({
      label: habit.name,
      value: habit.entriesInSelectedPeriod,
      color: palette[index % palette.length],
    }));

    if (otherEntries > 0) {
      base.push({
        label: "Other",
        value: otherEntries,
        color: palette[4],
      });
    }

    return base;
  }, [habits]);

  const totalEntries = useMemo(
    () => segments.reduce((sum, segment) => sum + segment.value, 0),
    [segments],
  );

  const topLabel = segments[0]?.label ?? "No entries";
  const topShare =
    totalEntries > 0 && segments[0]
      ? Math.round((segments[0].value / totalEntries) * 100)
      : 0;

  return (
    <View className="mb-5 rounded-3xl border border-white/10 bg-white/5 p-5">
      <Text className="mb-4 text-lg font-semibold text-white">Habit share</Text>
      <View className="flex-row items-center justify-between">
        <View className="items-center justify-center">
          <PieChart
            data={
              segments.length > 0
                ? segments
                : [{ value: 1, color: "#334155", label: "No data" }]
            }
            donut
            isAnimated={false}
            radius={64}
            innerRadius={42}
            innerCircleColor="#111827"
            centerLabelComponent={() => (
              <View className="items-center">
                <Text className="text-xl font-bold text-white">
                  {topShare}%
                </Text>
                <Text className="text-[10px] text-slate-400">Top habit</Text>
              </View>
            )}
          />
        </View>

        <View className="ml-4 flex-1">
          <Text className="text-xs text-slate-400">Most active</Text>
          <Text className="mt-1 text-lg font-semibold text-white">
            {topLabel}
          </Text>
          <Text className="mt-2 text-xs text-slate-500">
            {totalEntries} entries in selected period
          </Text>

          <View className="mt-3 gap-1">
            {segments.slice(0, 3).map((segment) => (
              <View
                key={segment.label}
                className="flex-row items-center justify-between"
              >
                <View className="flex-row items-center gap-2">
                  <View
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: segment.color }}
                  />
                  <Text className="text-xs text-slate-300" numberOfLines={1}>
                    {segment.label}
                  </Text>
                </View>
                <Text className="text-xs text-slate-400">{segment.value}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}
