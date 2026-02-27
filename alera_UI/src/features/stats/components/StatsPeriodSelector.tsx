import React from "react";
import { Pressable, Text, View } from "react-native";
import type { StatsGranularity } from "../types";

type StatsPeriodSelectorProps = {
  value: StatsGranularity;
  onChange: (next: StatsGranularity) => void;
};

const OPTIONS: StatsGranularity[] = ["daily", "weekly", "monthly"];

export function StatsPeriodSelector({
  value,
  onChange,
}: StatsPeriodSelectorProps) {
  return (
    <View className="mb-5 self-center rounded-xl border border-white/10 bg-white/5 p-1">
      <View className="flex-row items-center gap-2">
        {OPTIONS.map((option) => {
          const active = option === value;
          return (
            <Pressable
              key={option}
              onPress={() => onChange(option)}
              className={`rounded-lg px-3 py-1.5 ${active ? "bg-purple-500/25" : "bg-transparent"}`}
            >
              <Text
                className={`text-xs font-semibold uppercase tracking-wider ${active ? "text-purple-200" : "text-slate-300"}`}
              >
                {option}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
