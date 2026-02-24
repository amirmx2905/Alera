import React from "react";
import { View, Text, Pressable, Animated } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { PrimaryButton } from "../../../../components/shared/PrimaryButton";
import type { CreateHabitFormState } from "../../types";

type CreateHabitStepTypeProps = {
  formData: CreateHabitFormState;
  onFieldChange: (patch: Partial<CreateHabitFormState>) => void;
  onContinue: () => void;
  continueScaleAnim: Animated.Value;
  animateScale: (scale: Animated.Value, toValue: number) => void;
};

export function CreateHabitStepType({
  formData,
  onFieldChange,
  onContinue,
  continueScaleAnim,
  animateScale,
}: CreateHabitStepTypeProps) {
  return (
    <View className="gap-5">
      <View>
        <Text className="text-white font-semibold mb-2">Habit Type</Text>
        <Text className="text-slate-400 text-sm">
          Choose how this habit is tracked.
        </Text>
      </View>

      <View className="gap-3">
        {(
          [
            {
              type: "numeric",
              title: "Numeric",
              description: "Track an amount like minutes, pages, or steps.",
            },
            {
              type: "binary",
              title: "Binary",
              description: "Mark complete once per day (yes/no).",
            },
          ] as const
        ).map((option) => {
          const isActive = formData.type === option.type;
          return (
            <Pressable
              key={option.type}
              onPress={() => onFieldChange({ type: option.type })}
              className="rounded-2xl"
            >
              {isActive ? (
                <LinearGradient
                  colors={["#5b21b6", "#2e1065"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    borderRadius: 16,
                    padding: 16,
                  }}
                >
                  <Text className="text-white text-base font-semibold">
                    {option.title}
                  </Text>
                  <Text className="text-purple-100 text-sm mt-1">
                    {option.description}
                  </Text>
                </LinearGradient>
              ) : (
                <View className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <Text className="text-white text-base font-semibold">
                    {option.title}
                  </Text>
                  <Text className="text-slate-400 text-sm mt-1">
                    {option.description}
                  </Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      <PrimaryButton
        label="Continue"
        isLoading={false}
        disabled={!formData.type}
        onPress={onContinue}
        onPressIn={() => animateScale(continueScaleAnim, 0.96)}
        onPressOut={() => animateScale(continueScaleAnim, 1)}
        scaleAnim={continueScaleAnim}
        containerClassName="w-full"
      />
    </View>
  );
}
