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
    <View className="mb-5 flex-row items-center justify-center gap-2 self-center w-full max-w-[360px] rounded-2xl border border-white/10 bg-white/5 p-2">
      <View className="flex-1 flex-row items-center gap-2">
        {OPTIONS.map((option) => {
          const active = option === value;
          return (
            <Pressable
              key={option}
              onPress={() => onChange(option)}
              className={`flex-1 items-center px-4 py-2 rounded-full ${
                active ? "bg-purple-500/20" : "bg-transparent"
              }`}
            >
              <Text
                className={`text-xs font-semibold uppercase tracking-widest ${
                  active ? "text-purple-200" : "text-slate-300"
                }`}
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
