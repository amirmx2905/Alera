import React from "react";
import { View, Text, Pressable } from "react-native";

const SEX_OPTIONS = ["male", "female", "other"] as const;

const LABELS: Record<(typeof SEX_OPTIONS)[number], string> = {
  male: "Male",
  female: "Female",
  other: "Other",
};

type SexSelectorProps = {
  value: "male" | "female" | "other" | "";
  onChange: (sex: "male" | "female" | "other") => void;
};

export function SexSelector({ value, onChange }: SexSelectorProps) {
  return (
    <View className="gap-4 mb-5">
      <Text className="text-slate-400 text-xs">Sex (Optional)</Text>
      <View className="flex-row gap-5">
        {SEX_OPTIONS.map((option) => {
          const isActive = value === option;
          return (
            <Pressable
              key={option}
              onPress={() => onChange(option)}
              className={
                isActive
                  ? "flex-1 rounded-2xl border border-purple-500 bg-purple-500/20 py-3"
                  : "flex-1 rounded-2xl border border-white/10 bg-white/5 py-3"
              }
            >
              <Text
                className={
                  isActive
                    ? "text-center text-white text-xs font-semibold"
                    : "text-center text-slate-300 text-xs"
                }
              >
                {LABELS[option]}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
