import React, { useRef } from "react";
import { ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { StatsCalendarDay } from "../types";

type StatsCalendarStripProps = {
  days: StatsCalendarDay[];
  title?: string;
  legendLabel?: string;
};

export function StatsCalendarStrip({
  days,
  title = "Last 30 days activity",
  legendLabel = "Completed",
}: StatsCalendarStripProps) {
  const scrollViewRef = useRef<ScrollView>(null);
  const completedCount = days.filter((day) => day.completed).length;

  return (
    <View className="mb-5 rounded-3xl border border-white/10 bg-white/5 p-5">
      <Text className="mb-4 text-lg font-semibold text-white">{title}</Text>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8 }}
        onContentSizeChange={() =>
          scrollViewRef.current?.scrollToEnd({ animated: false })
        }
      >
        {days.map((day) => (
          <View
            key={day.dateKey}
            className={`items-center rounded-xl p-2 ${day.isToday ? "border border-purple-400/60" : ""}`}
          >
            <Text className="text-[10px] text-slate-500">{day.dayLabel}</Text>
            <View
              className={`mt-1 h-9 w-9 items-center justify-center rounded-lg border ${day.completed ? "border-transparent bg-purple-700" : "border-white/10 bg-white/5"}`}
            >
              <Text
                className={`${day.completed ? "text-white" : "text-slate-400"}`}
              >
                {day.dayNumber}
              </Text>
            </View>
            {day.isToday ? (
              <Text className="mt-1 text-[10px] font-semibold text-purple-300">
                Today
              </Text>
            ) : null}
          </View>
        ))}
      </ScrollView>

      <View className="mt-4 flex-row items-center justify-between border-t border-white/10 pt-3">
        <View className="flex-row items-center gap-2">
          <View className="h-3 w-3 rounded bg-purple-500" />
          <Text className="text-xs text-slate-400">{legendLabel}</Text>
        </View>
        <Text className="text-xs text-slate-400">
          <Text className="font-semibold text-white">{completedCount}</Text>/30
          days
        </Text>
      </View>
    </View>
  );
}

export function StatsInsightsPlaceholder() {
  return (
    <View className="rounded-3xl border border-white/10 bg-white/5 p-5">
      <View className="mb-3 flex-row items-center gap-2">
        <Ionicons name="sparkles-outline" size={18} color="#c4b5fd" />
        <Text className="text-lg font-semibold text-white">AI insights</Text>
      </View>
      <View className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <Text className="text-sm font-semibold text-white">Coming soon</Text>
        <Text className="mt-1 text-xs text-slate-300">
          AI-based predictions are not implemented yet. This area is reserved
          for future insights.
        </Text>
      </View>
    </View>
  );
}
