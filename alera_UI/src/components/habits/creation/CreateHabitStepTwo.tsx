import React from "react";
import { View, Text, Pressable, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { PrimaryButton } from "../../shared/PrimaryButton";
import { InputField } from "../../shared/InputField";
import { ScrollableSelection } from "./ScrollableSelection";
import type { CreateHabitFormState } from "../../types/createHabitTypes";

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
  formatGoalType: (value: CreateHabitFormState["goalType"]) => string;
  categoryUnits: string[];
  currencies: string[];
};

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
  formatGoalType,
  categoryUnits,
  currencies,
}: CreateHabitStepTwoProps) {
  return (
    <View className="gap-5">
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

      <View>
        <Text className="text-white font-semibold mb-2">Goal Type</Text>
        <View className="flex-row gap-2">
          {(["daily", "weekly", "monthly"] as const).map((type) => {
            const isActive = formData.goalType === type;
            return (
              <Pressable
                key={type}
                onPress={() => onFieldChange({ goalType: type })}
                className="flex-1"
              >
                {isActive ? (
                  <LinearGradient
                    colors={["#5b21b6", "#2e1065"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{
                      width: "100%",
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: "transparent",
                      paddingVertical: 17,
                    }}
                  >
                    <Text className="text-white text-center text-sm font-semibold">
                      {formatGoalType(type)}
                    </Text>
                  </LinearGradient>
                ) : (
                  <View className="rounded-2xl border border-white/10 bg-white/5 py-5">
                    <Text className="text-slate-300 text-center text-sm font-semibold">
                      {formatGoalType(type)}
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
          disabled={!formData.goalAmount || !formData.unit}
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
