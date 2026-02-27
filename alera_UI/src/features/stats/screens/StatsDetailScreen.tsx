import React, { useMemo, useRef, useState } from "react";
import { Animated, Pressable, Text, View } from "react-native";
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { MainLayout } from "../../../layouts/MainLayout";
import { EmptyState } from "../../../components/shared/EmptyState";
import type { StatsStackParamList } from "../../../navigation/StatsStack";
import type { StatsGranularity, StatsTrendPoint } from "../types";
import { StatsPeriodSelector } from "../components/StatsPeriodSelector";
import { StatsTrendChart } from "../components/StatsCharts";
import {
  StatsCalendarStrip,
  StatsInsightCards,
  StatsInsightsDisabledCard,
} from "../components/StatsDetailBlocks";
import { useStatsData } from "../hooks/useStatsData";
import { useHabitPredictions } from "../hooks/useHabitPredictions";
import {
  getMonthEndKey,
  getMondayStartKey,
  parseEntryDate,
  toLocalDateKey,
} from "../../habits/utils/dates";

type DetailRoute = RouteProp<StatsStackParamList, "StatsDetail">;

function buildHabitTrend(
  dateLabels: StatsTrendPoint[],
  habitEntries: { date: string }[],
  granularity: StatsGranularity,
) {
  return dateLabels.map((point) => {
    const count = habitEntries.filter((entry) => {
      const key = toLocalDateKey(parseEntryDate(entry.date));
      if (granularity === "daily") return key === point.dateKey;
      if (granularity === "weekly") {
        return getMondayStartKey(key) === getMondayStartKey(point.dateKey);
      }
      return getMonthEndKey(key) === point.dateKey;
    }).length;

    return {
      ...point,
      totalEntries: count,
    };
  });
}

export function StatsDetailScreen() {
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const navigation =
    useNavigation<
      NativeStackNavigationProp<StatsStackParamList, "StatsDetail">
    >();
  const route = useRoute<DetailRoute>();
  const [granularity, setGranularity] = useState<StatsGranularity>("daily");

  const { getHabitDetail, overview } = useStatsData(granularity);
  const detail = getHabitDetail(route.params.habitId);
  const predictionsState = useHabitPredictions(detail?.habit ?? null);

  const habitTrend = useMemo(() => {
    if (!detail) return [] as StatsTrendPoint[];
    return buildHabitTrend(overview.trend, detail.habit.entries, granularity);
  }, [detail, granularity, overview.trend]);

  if (!detail) {
    return (
      <MainLayout
        title="Stats detail"
        subtitle="Habit not found"
        headerVariant="icon"
        headerIconName="stats-chart-outline"
        showBackground={false}
        contentClassName="flex-1 px-6 pt-16"
      >
        <EmptyState
          opacity={fadeAnim}
          title="Habit not found"
          message="This habit is no longer available."
          iconName="alert-circle-outline"
        />
      </MainLayout>
    );
  }

  return (
    <MainLayout
      title={detail.habit.name}
      subtitle="Detailed analytics"
      headerVariant="icon"
      headerIconName="stats-chart-outline"
      showBackground={false}
      scrollable
      contentClassName="flex-1 px-6 pt-16"
      headerRight={
        <Pressable
          onPress={() => navigation.goBack()}
          className="h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5"
        >
          <Ionicons name="chevron-back" size={18} color="#e2e8f0" />
        </Pressable>
      }
    >
      <View className="pb-20">
        <View className="mb-5 flex-row flex-wrap justify-between gap-y-3">
          <View className="w-[48.5%] rounded-2xl border border-white/10 bg-white/5 p-4">
            <Text className="text-xs text-slate-400">Current streak</Text>
            <Text className="mt-1 text-2xl font-bold text-white">
              {detail.streak}
            </Text>
            <Text className="text-xs text-slate-500">Days in a row</Text>
          </View>
          <View className="w-[48.5%] rounded-2xl border border-white/10 bg-white/5 p-4">
            <Text className="text-xs text-slate-400">Periods completed</Text>
            <Text className="mt-1 text-2xl font-bold text-white">
              {detail.completionCountWindow}
            </Text>
            <Text className="text-xs text-slate-500">
              Out of {detail.completionWindowTotal} {detail.completionUnit}
            </Text>
          </View>
          <View className="w-[48.5%] rounded-2xl border border-white/10 bg-white/5 p-4">
            <Text className="text-xs text-slate-400">Average value (30d)</Text>
            <Text className="mt-1 text-2xl font-bold text-white">
              {detail.averageValue30 === null ? "--" : detail.averageValue30}
            </Text>
            <Text className="text-xs text-slate-500">
              {detail.averageValue30 === null
                ? "Not applicable for binary habits"
                : `${detail.habit.unit} per entry`}
            </Text>
          </View>
          <View className="w-[48.5%] rounded-2xl border border-white/10 bg-white/5 p-4">
            <Text className="text-xs text-slate-400">Total entries</Text>
            <Text className="mt-1 text-2xl font-bold text-white">
              {detail.totalEntries}
            </Text>
            <Text className="text-xs text-slate-500">All time</Text>
          </View>
        </View>

        <StatsPeriodSelector value={granularity} onChange={setGranularity} />
        <StatsTrendChart
          title="Activity over time"
          points={habitTrend}
          showArea
        />
        <StatsCalendarStrip days={detail.calendar30Days} />
        {predictionsState.isEligible && predictionsState.predictions ? (
          <StatsInsightCards predictions={predictionsState.predictions} />
        ) : (
          <StatsInsightsDisabledCard
            isLoading={predictionsState.isLoading}
            unlockStatus={predictionsState.unlockStatus}
            dataDays={predictionsState.dataDays}
            hasPredictionRows={predictionsState.hasPredictionRows}
            updatedAt={predictionsState.updatedAt}
            reason={predictionsState.reason}
          />
        )}
      </View>
    </MainLayout>
  );
}
