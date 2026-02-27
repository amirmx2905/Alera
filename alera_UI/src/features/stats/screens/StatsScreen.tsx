import React, { useMemo, useRef, useState } from "react";
import { View, Animated, Text } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MainLayout } from "../../../layouts/MainLayout";
import { EmptyState } from "../../../components/shared/EmptyState";
import type { StatsStackParamList } from "../../../navigation/StatsStack";
import { StatsKpiGrid } from "../components/StatsKpiGrid";
import { StatsPeriodSelector } from "../components/StatsPeriodSelector";
import {
  StatsActivityBarChart,
  StatsTrendChart,
} from "../components/StatsCharts";
import { StatsHabitsList } from "../components/StatsHabitsList";
import { useStatsData } from "../hooks/useStatsData";
import type { StatsGranularity } from "../types";

export function StatsScreen() {
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const [granularity, setGranularity] = useState<StatsGranularity>("daily");
  const navigation =
    useNavigation<
      NativeStackNavigationProp<StatsStackParamList, "StatsHome">
    >();

  const { overview, isLoading, error } = useStatsData(granularity);

  const hasHabits = overview.kpis.totalHabits > 0;
  const trendTitle = useMemo(() => {
    if (granularity === "daily") return "Activity trend (last 7 days)";
    if (granularity === "weekly") return "Activity trend (last 4 weeks)";
    return "Activity trend (last 6 months)";
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
            <StatsKpiGrid kpis={overview.kpis} />
            <StatsPeriodSelector
              value={granularity}
              onChange={setGranularity}
            />
            <StatsTrendChart title={trendTitle} points={overview.trend} />
            <StatsActivityBarChart points={overview.trend} />
            {error ? (
              <Text className="mb-3 text-xs text-slate-400">{error}</Text>
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
