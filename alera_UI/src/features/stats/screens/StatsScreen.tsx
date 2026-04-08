import React, { useMemo, useRef, useState } from "react";
import { View, Animated, Text } from "react-native";
import { useIsFocused, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MainLayout } from "../../../layouts/MainLayout";
import { EmptyState } from "../../../components/shared/EmptyState";
import type { StatsStackParamList } from "../../../navigation/StatsStack";
import { StatsKpiGrid } from "../components/StatsKpiGrid";
import { StatsPeriodSelector } from "../components/StatsPeriodSelector";
import {
  StatsHabitShareDonutChart,
  StatsTrendChart,
} from "../components/StatsCharts";
import { StatsHabitsList } from "../components/StatsHabitsList";
import { useStatsData } from "../hooks/useStatsData";
import type { StatsGranularity } from "../types";

export function StatsScreen() {
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const [granularity, setGranularity] = useState<StatsGranularity>("daily");
  const isFocused = useIsFocused();
  const navigation =
    useNavigation<
      NativeStackNavigationProp<StatsStackParamList, "StatsHome">
    >();

  const { overview, isLoading, isSnapshotsLoading, warnings } = useStatsData(
    granularity,
    isFocused,
  );

  const hasHabits = overview.kpis.totalHabits > 0;
  const trendPeriodLabel = useMemo(() => {
    if (granularity === "daily") return "Last 7 days";
    if (granularity === "weekly") return "Last 4 weeks";
    return "Last 6 months";
  }, [granularity]);

  return (
    <MainLayout
      title="Stats"
      subtitle="Track your progress and insights"
      headerVariant="icon"
      scrollable
      headerIconName="stats-chart-outline"
      showBackground={false}
      contentClassName="flex-1 px-6 pt-16"
      isLoading={isLoading}
    >
      <View className="pb-20">
        {!hasHabits ? (
          <EmptyState
            opacity={fadeAnim}
            title="No habits yet"
            message="Create your first habit to unlock trend analytics."
            iconName="stats-chart-outline"
          />
        ) : (
          <>
            <StatsKpiGrid
              kpis={overview.kpis}
              isBestStreakLoading={isSnapshotsLoading}
            />
            <StatsPeriodSelector
              value={granularity}
              onChange={setGranularity}
            />
            <StatsTrendChart
              key={`trend-${granularity}`}
              title="Total Entries"
              headerRightLabel={trendPeriodLabel}
              points={overview.trend}
            />
            <StatsHabitShareDonutChart
              key={`period-share-${granularity}`}
              habits={overview.habits}
            />
            {warnings.snapshots ? (
              <Text className="mb-3 text-xs text-slate-400">
                KPI fallback: {warnings.snapshots}
              </Text>
            ) : null}
            <StatsHabitsList
              habits={overview.habits}
              onSelectHabit={(habitId) =>
                navigation.navigate("StatsDetail", { habitId })
              }
            />
          </>
        )}
      </View>
    </MainLayout>
  );
}
