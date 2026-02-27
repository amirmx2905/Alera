import React from "react";
import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { StatsKpi } from "../types";

type KpiCardProps = {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
};

function KpiCard({ title, value, subtitle, icon }: KpiCardProps) {
  return (
    <View className="w-[48.5%] rounded-2xl border border-white/10 bg-white/5 p-4">
      <View className="mb-2 flex-row items-center gap-2">
        <Ionicons name={icon} size={15} color="#c4b5fd" />
        <Text className="text-xs text-slate-400">{title}</Text>
      </View>
      <Text className="text-2xl font-bold text-white">{value}</Text>
      <Text className="mt-1 text-xs text-slate-500">{subtitle}</Text>
    </View>
  );
}

type StatsKpiGridProps = {
  kpis: StatsKpi;
};

export function StatsKpiGrid({ kpis }: StatsKpiGridProps) {
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
        subtitle={`${kpis.completedCount}/${kpis.totalPossible} last 7d`}
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
        value={`${kpis.bestStreak}`}
        subtitle={kpis.bestStreakHabit}
        icon="flame-outline"
      />
    </View>
  );
}
