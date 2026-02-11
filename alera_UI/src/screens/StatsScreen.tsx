import React from "react";
import { View, Text } from "react-native";
import { MainLayout } from "../layouts/MainLayout";

export function StatsScreen() {
  return (
    <MainLayout
      title="Stats"
      subtitle="Insights and trends will show here."
      headerVariant="icon"
      scrollable
      headerIconName="stats-chart-outline"
      contentClassName="flex-1 px-6 pt-16"
    >
      <View className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl">
        <Text className="text-white text-lg font-semibold">
          Analytics coming soon
        </Text>
        <Text className="text-slate-400 mt-2">
          Keep logging habits to unlock your stats.
        </Text>
      </View>
    </MainLayout>
  );
}
