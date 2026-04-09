import React from "react";
import { AnimatedPillSelector } from "../../../components/shared/AnimatedPillSelector";
import type { StatsGranularity } from "../types";
import { View } from "react-native";

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
    <View className="mb-5">
      <AnimatedPillSelector
        options={OPTIONS}
        value={value}
        onChange={onChange}
      />
    </View>
  );
}
