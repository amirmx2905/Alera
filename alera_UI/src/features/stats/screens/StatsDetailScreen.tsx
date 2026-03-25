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
  buildHabitTrend,
  formatHabitGoalSummary,
} from "../utils/detailPresentation";
import { formatPeriodUnit } from "../utils/formatters";

type DetailRoute = RouteProp<StatsStackParamList, "StatsDetail">;

function MetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint: string;
}) {
  return (
    <View className="w-[48.5%] rounded-2xl border border-white/10 bg-white/5 p-4">
      <Text className="text-xs text-slate-400">{label}</Text>
      <Text className="mt-1 text-2xl font-bold text-white">{value}</Text>
      <Text className="text-xs text-slate-500">{hint}</Text>
    </View>
  );
}

function GoalTargetTile({
  value,
  habitTypeLabel,
  cadenceLabel,
}: {
  value: string;
  habitTypeLabel: string;
  cadenceLabel: string;
}) {
  return (
    <View className="mb-5 rounded-2xl border border-white/10 bg-white/5 p-4">
      <View className="flex-row items-start justify-between gap-4">
        <View className="min-w-0 flex-1 pr-3">
          <View className="flex-row items-center gap-2">
            <Ionicons name="flag-outline" size={15} color="#c4b5fd" />
            <Text className="text-xs text-slate-400">Goal target</Text>
          </View>
          <Text
            className="mt-1 text-2xl font-bold text-white"
            numberOfLines={1}
          >
            {value}
          </Text>
        </View>

        <View className="max-w-[58%] flex-row flex-wrap justify-end gap-2">
          <View className="rounded-full border border-purple-400/40 bg-purple-500/10 px-3 py-1">
            <Text className="text-xs font-medium text-purple-200">
              {habitTypeLabel}
            </Text>
          </View>
          <View className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
            <Text className="text-xs font-medium text-slate-300">
              {cadenceLabel}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

function formatStatNumber(value: number) {
  return Number.isInteger(value) ? `${value}` : value.toFixed(1);
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
    return buildHabitTrend(overview.trend, detail.habit, granularity);
  }, [detail, granularity, overview.trend]);

  const goalSummary = useMemo(() => {
    if (!detail) return null;
    return formatHabitGoalSummary(detail.habit);
  }, [detail]);

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

  const isBinaryHabit = detail.habit.type === "binary";
  const selectedPeriodLabel =
    granularity === "daily"
      ? "Last 7 days"
      : granularity === "weekly"
        ? "Last 4 weeks"
        : "Last 6 months";
  const goalProgressHint = `Out of ${detail.completionWindowTotal} ${formatPeriodUnit(
    detail.completionWindowTotal,
    detail.completionUnit,
  )}`;

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
        {goalSummary ? (
          <GoalTargetTile
            value={goalSummary.targetLabel}
            habitTypeLabel={goalSummary.habitTypeLabel}
            cadenceLabel={goalSummary.cadenceLabel}
          />
        ) : null}

        <View className="mb-5 flex-row flex-wrap justify-between gap-y-3">
          <MetricCard
            label="Current streak"
            value={detail.streak}
            hint="Active days in a row"
          />
          <MetricCard
            label={isBinaryHabit ? "Goal periods hit" : "Goal periods hit"}
            value={detail.completionCountWindow}
            hint={goalProgressHint}
          />
          {isBinaryHabit ? (
            <>
              <MetricCard
                label="Active days (30d)"
                value={detail.activeDays30}
                hint="Logged at least once"
              />
              <MetricCard
                label="Total check-ins"
                value={detail.totalEntries}
                hint="All time"
              />
            </>
          ) : (
            <>
              <MetricCard
                label="Average value (30d)"
                value={
                  detail.averageValue30 === null
                    ? "--"
                    : formatStatNumber(detail.averageValue30)
                }
                hint={`${detail.habit.unit} per day (30d window)`}
              />
              <MetricCard
                label="Total logged"
                value={`${formatStatNumber(detail.totalAmountAllTime)} ${detail.habit.unit}`}
                hint={`${detail.totalEntries} entries recorded`}
              />
            </>
          )}
        </View>

        {isBinaryHabit ? null : (
          <StatsPeriodSelector value={granularity} onChange={setGranularity} />
        )}
        {isBinaryHabit ? null : (
          <StatsTrendChart
            title="Logged amount"
            headerRightLabel={selectedPeriodLabel}
            points={habitTrend}
          />
        )}
        <StatsCalendarStrip
          days={detail.calendar30Days}
          title={
            isBinaryHabit ? "Last 30 days check-ins" : "Last 30 days logging"
          }
          legendLabel={isBinaryHabit ? "Completed" : "Logged"}
        />
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
