import React, { useMemo } from "react";
import { Text, View, useWindowDimensions } from "react-native";
import { BarChart, LineChart } from "react-native-gifted-charts";
import type { StatsTrendPoint } from "../types";

type ChartProps = {
  title: string;
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
      <Text className="mb-4 text-lg font-semibold text-white">{title}</Text>
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

type StatsActivityBarChartProps = {
  points: StatsTrendPoint[];
};

export function StatsActivityBarChart({ points }: StatsActivityBarChartProps) {
  const { width: viewportWidth } = useWindowDimensions();
  const data = useMemo(
    () =>
      points.map((point) => ({
        value: point.totalEntries,
        label: point.label,
        frontColor: "#7c3aed",
      })),
    [points],
  );

  const maxValue = Math.max(4, ...data.map((item) => item.value));
  const chartWidth = Math.max(220, viewportWidth - 104);
  const pointCount = Math.max(1, data.length);
  const barWidth = Math.max(12, Math.floor((chartWidth * 0.5) / pointCount));
  const spacing = Math.max(10, Math.floor((chartWidth * 0.5) / pointCount));

  return (
    <View className="mb-5 rounded-3xl border border-white/10 bg-white/5 p-5">
      <Text className="mb-4 text-lg font-semibold text-white">
        Total activity
      </Text>
      <BarChart
        data={data}
        isAnimated={false}
        barWidth={barWidth}
        spacing={spacing}
        roundedTop
        yAxisTextStyle={{ color: "#94a3b8", fontSize: 11 }}
        xAxisLabelTextStyle={{ color: "#94a3b8", fontSize: 11 }}
        xAxisColor="#475569"
        yAxisColor="#475569"
        noOfSections={4}
        maxValue={maxValue}
        rulesColor="#334155"
        rulesType="dashed"
        width={chartWidth}
      />
    </View>
  );
}
