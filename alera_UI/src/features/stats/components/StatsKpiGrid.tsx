import React from "react";
import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { StatsKpi } from "../types";
import { DotLoader } from "../../../components/shared/DotLoader";

type KpiCardProps = {
  title: string;
  value: React.ReactNode;
  subtitle: React.ReactNode;
  icon: React.ComponentProps<typeof Ionicons>["name"];
};

function KpiCard({ title, value, subtitle, icon }: KpiCardProps) {
  const isPlainValue = typeof value === "string" || typeof value === "number";

  return (
    <View className="w-[48.5%] rounded-2xl border border-white/10 bg-white/5 p-4">
      <View className="mb-2 flex-row items-center gap-2">
        <Ionicons name={icon} size={15} color="#c4b5fd" />
        <Text className="text-xs text-slate-400">{title}</Text>
      </View>
      {isPlainValue ? (
        <Text className="text-2xl font-bold text-white">{value}</Text>
      ) : (
        <View className="min-h-8 items-center justify-center pt-4">{value}</View>
      )}
      {subtitle ? (
        <Text className="mt-1 text-xs text-slate-500">{subtitle}</Text>
      ) : null}
    </View>
  );
}

type StatsKpiGridProps = {
  kpis: StatsKpi;
  isBestStreakLoading?: boolean;
};

export function StatsKpiGrid({
  kpis,
  isBestStreakLoading = false,
}: StatsKpiGridProps) {
  return (
    <View className="mb-6 flex-row flex-wrap justify-between gap-y-3">
      <KpiCard
        title="Total habits"
        value={`${kpis.totalHabits}`}
        subtitle="Currently tracked"
        icon="albums-outline"
      />
      <KpiCard
        title="Completion rate"
        value={`${kpis.completionRate}%`}
        subtitle={`${kpis.completedCount}/${kpis.totalPossible} goal periods`}
        icon="trending-up-outline"
      />
      <KpiCard
        title="Active days"
        value={`${kpis.activeDays30}`}
        subtitle="With entries in 30d"
        icon="calendar-outline"
      />
      <KpiCard
        title="Best streak"
        value={
          isBestStreakLoading ? (
            <DotLoader
              dotClassName="h-2.5 w-2.5 bg-purple-300"
              containerClassName="w-full"
            />
          ) : (
            `${kpis.bestStreak}`
          )
        }
        subtitle={isBestStreakLoading ? "" : kpis.bestStreakHabit}
        icon="flame-outline"
      />
    </View>
  );
}
