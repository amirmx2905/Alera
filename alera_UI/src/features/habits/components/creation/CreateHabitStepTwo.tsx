import React from "react";
import { View, Text, Pressable, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { PrimaryButton } from "../../../../components/shared/PrimaryButton";
import { InputField } from "../../../../components/shared/InputField";
import { ScrollableSelection } from "./ScrollableSelection";
import type { CreateHabitFormState } from "../../types";

type CreateHabitStepTwoProps = {
  formData: CreateHabitFormState;
  showCurrencyPicker: boolean;
  onFieldChange: (patch: Partial<CreateHabitFormState>) => void;
  onToggleCurrencyPicker: (value: boolean) => void;
  onBack: () => void;
  onCreate: () => void;
  isSubmitting: boolean;
  createScaleAnim: Animated.Value;
  animateScale: (scale: Animated.Value, toValue: number) => void;
  categoryUnits: string[];
  currencies: string[];
};

const GOAL_TYPE_OPTIONS = [
  {
    type: "daily",
    title: "Daily",
    description: "Build a day-by-day streak.",
  },
  {
    type: "weekly",
    title: "Weekly",
    description: "Hit your goal across the week.",
  },
  {
    type: "monthly",
    title: "Monthly",
    description: "Complete it throughout the month.",
  },
] as const;

export function CreateHabitStepTwo({
  formData,
  showCurrencyPicker,
  onFieldChange,
  onToggleCurrencyPicker,
  onBack,
  onCreate,
  isSubmitting,
  createScaleAnim,
  animateScale,
  categoryUnits,
  currencies,
}: CreateHabitStepTwoProps) {
  return (
    <View className="gap-5">
      {formData.type === "binary" ? null : (
        <View>
          <Text className="text-white font-semibold mb-2">Goal Amount</Text>
          <InputField
            value={formData.goalAmount}
            onChangeText={(value) => onFieldChange({ goalAmount: value })}
            placeholder="Enter amount"
            keyboardType="numeric"
            containerClassName="border border-white/10 py-5"
          />
        </View>
      )}

      {formData.type === "binary" ? null : (
        <View>
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-white font-semibold">Unit</Text>
            {showCurrencyPicker ? (
              <Pressable
                onPress={() => onToggleCurrencyPicker(false)}
                className="flex-row items-center gap-1"
              >
                <Ionicons name="arrow-back" size={16} color="#94a3b8" />
                <Text className="text-slate-400 text-xs">Return</Text>
              </Pressable>
            ) : null}
          </View>

          {!showCurrencyPicker ? (
            <ScrollableSelection
              items={categoryUnits.map((unit) => ({
                key: unit,
                label: unit,
                value: unit,
              }))}
              selectedValue={formData.unit}
              onSelect={(value) => {
                if (value === "currency") {
                  onToggleCurrencyPicker(true);
                  return;
                }
                onFieldChange({ unit: value });
              }}
            />
          ) : (
            <ScrollableSelection
              items={currencies.map((currency) => ({
                key: currency,
                label: currency,
                value: currency,
              }))}
              selectedValue={formData.unit}
              onSelect={(value) => onFieldChange({ unit: value })}
            />
          )}
        </View>
      )}

      {formData.type === "binary" ? (
        <View className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <Text className="text-white text-sm font-semibold">Binary habit</Text>
          <Text className="text-slate-400 text-sm mt-1">
            Completed once per day. Choose how often you want to complete it.
          </Text>
        </View>
      ) : null}

      <View>
        <Text className="text-white font-semibold mb-2">Goal Type</Text>
        <View className="gap-3 mb-4">
          {GOAL_TYPE_OPTIONS.map((option) => {
            const isActive = formData.goalType === option.type;
            return (
              <Pressable
                key={option.type}
                onPress={() => onFieldChange({ goalType: option.type })}
              >
                {isActive ? (
                  <LinearGradient
                    colors={["#5b21b6", "#2e1065"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: "transparent",
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
      </View>

      <View className="flex-row gap-3">
        <Pressable
          onPress={onBack}
          className="flex-1 rounded-2xl border border-white/10 bg-white/5 py-4"
        >
          <Text className="text-white text-center font-semibold">Go back</Text>
        </Pressable>
        <PrimaryButton
          label="Create Habit"
          isLoading={isSubmitting}
          disabled={
            !formData.goalAmount ||
            (formData.type === "numeric" && !formData.unit)
          }
          onPress={onCreate}
          onPressIn={() => animateScale(createScaleAnim, 0.96)}
          onPressOut={() => animateScale(createScaleAnim, 1)}
          scaleAnim={createScaleAnim}
          pressableClassName="flex-1"
          containerClassName="w-full"
        />
      </View>
    </View>
  );
}
