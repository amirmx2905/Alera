import React from "react";
import { View, Text, Animated } from "react-native";
import { DotLoader } from "../shared/DotLoader";
import { PrimaryButton } from "../shared/PrimaryButton";
import { InputField } from "../shared/InputField";
import { ScrollableSelection } from "./ScrollableSelection";
import type { CreateHabitFormState } from "../../types/createHabitTypes";

type CreateHabitStepOneProps = {
  formData: CreateHabitFormState;
  isCategoriesLoading: boolean;
  categories: Array<{ id: string; name: string }>;
  onFieldChange: (patch: Partial<CreateHabitFormState>) => void;
  onContinue: () => void;
  continueScaleAnim: Animated.Value;
  animateScale: (scale: Animated.Value, toValue: number) => void;
};

export function CreateHabitStepOne({
  formData,
  isCategoriesLoading,
  categories,
  onFieldChange,
  onContinue,
  continueScaleAnim,
  animateScale,
}: CreateHabitStepOneProps) {
  return (
    <View className="gap-5">
      <View>
        <Text className="text-white font-semibold mb-2">Habit Name</Text>
        <InputField
          value={formData.name}
          onChangeText={(value) => onFieldChange({ name: value })}
          placeholder="e.g., Read books, Exercise, Meditate"
          autoFocus
          containerClassName="border border-white/10 py-5"
        />
      </View>

      <View>
        <Text className="text-white font-semibold mb-2">
          Description
          <Text className="text-slate-400 text-xs"> (Optional)</Text>
        </Text>
        <InputField
          value={formData.description}
          onChangeText={(value) => onFieldChange({ description: value })}
          placeholder="Any notes regarding this habit?"
          multiline
          numberOfLines={3}
          textAlignVertical="top"
          containerClassName="border border-white/10 py-5"
        />
      </View>

      <View>
        <Text className="text-white font-semibold mb-2">Category</Text>
        {isCategoriesLoading ? (
          <View className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <View className="items-center justify-center py-6">
              <DotLoader dotClassName="h-2 w-2 bg-purple-300" />
            </View>
          </View>
        ) : categories.length === 0 ? (
          <View className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <Text className="text-slate-400 text-sm text-center">
              No categories available
            </Text>
          </View>
        ) : (
          <ScrollableSelection
            items={categories.map((category) => ({
              key: category.id,
              label: category.name,
              value: category.name,
            }))}
            selectedValue={formData.category}
            onSelect={(value) => onFieldChange({ category: value })}
          />
        )}
      </View>

      <PrimaryButton
        label="Continue"
        isLoading={false}
        disabled={!formData.name || !formData.category}
        onPress={onContinue}
        onPressIn={() => animateScale(continueScaleAnim, 0.96)}
        onPressOut={() => animateScale(continueScaleAnim, 1)}
        scaleAnim={continueScaleAnim}
        containerClassName="w-full"
      />
    </View>
  );
}
