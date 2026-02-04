import React from "react";
import { View, Text } from "react-native";
import { MainLayout } from "../layouts/MainLayout";

export function HabitsScreen() {
  return (
    <MainLayout
      title="Habits"
      subtitle="Track and manage your habits."
      contentClassName="flex-1 px-6 justify-center"
    >
      <View className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl">
        <Text className="text-white text-lg font-semibold">No habits yet</Text>
        <Text className="text-slate-400 mt-2">
          Create your first habit to get started.
        </Text>
      </View>
    </MainLayout>
  );
}
