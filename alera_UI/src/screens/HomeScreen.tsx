import React from "react";
import { View, Text } from "react-native";
import { MainLayout } from "../layouts/MainLayout";

export function HomeScreen() {
  return (
    <MainLayout
      title="Home"
      subtitle="Your weekly overview will appear here."
      headerVariant="icon"
      scrollable
      headerIconName="home-outline"
      contentClassName="flex-1 px-6 pt-16"
    >
      <View className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl">
        <Text className="text-white text-lg font-semibold">Coming soon</Text>
        <Text className="text-slate-400 mt-2">
          We are preparing your habits, streaks, and daily summary.
        </Text>
      </View>
    </MainLayout>
  );
}
