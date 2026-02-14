import React, { useRef } from "react";
import { View, Animated } from "react-native";
import { MainLayout } from "../layouts/MainLayout";
import { EmptyState } from "../components/shared/EmptyState";

export function StatsScreen() {
  const fadeAnim = useRef(new Animated.Value(1)).current;

  return (
    <MainLayout
      title="Stats"
      subtitle="Insights and trends will show here."
      headerVariant="icon"
      scrollable
      headerIconName="stats-chart-outline"
      contentClassName="flex-1 px-6 pt-16"
    >
      <View className="pb-20">
        <EmptyState
          opacity={fadeAnim}
          title="Analytics coming soon"
          message="Keep logging habits to unlock your stats."
          iconName="stats-chart-outline"
        />
      </View>
    </MainLayout>
  );
}
