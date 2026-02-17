import React, { useCallback, useRef, useState } from "react";
import { View, Alert, Animated } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { MainLayout } from "../../../layouts/MainLayout";
import { CreateHabitStepOne } from "../components/creation/CreateHabitStepOne";
import { CreateHabitStepTwo } from "../components/creation/CreateHabitStepTwo";
import {
  CATEGORY_UNITS,
  CURRENCIES,
  UNITS,
} from "../../../constants/habitsConstants";
import type { RootStackParamList } from "../../../navigation/RootNavigator";
import { useHabits } from "../../../state/HabitsContext";
import type { CreateHabitFormState } from "../types";

type Props = NativeStackScreenProps<RootStackParamList, "CreateHabit">;

const initialFormState: CreateHabitFormState = {
  name: "",
  description: "",
  category: "",
  unit: "",
  goalAmount: "",
  goalType: "daily",
};

export function CreateHabitScreen({ navigation }: Props) {
  const { createHabitWithGoal, categories, isCategoriesLoading } = useHabits();
  const [formData, setFormData] =
    useState<CreateHabitFormState>(initialFormState);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const continueScaleAnim = useRef(new Animated.Value(1)).current;
  const createScaleAnim = useRef(new Animated.Value(1)).current;

  const animateScale = useCallback((scale: Animated.Value, toValue: number) => {
    Animated.spring(scale, {
      toValue,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  }, []);

  const handleContinue = () => {
    if (formData.name && formData.category) {
      setStep(2);
    }
  };

  const handleBack = () => {
    setStep(1);
  };

  const handleFieldChange = useCallback(
    (patch: Partial<CreateHabitFormState>) => {
      setFormData((prev) => ({ ...prev, ...patch }));
    },
    [],
  );

  const formatGoalType = (value: CreateHabitFormState["goalType"]) =>
    `${value.charAt(0).toUpperCase()}${value.slice(1)}`;

  const handleCreate = async () => {
    const goalAmountNumber = Number(formData.goalAmount);
    if (!goalAmountNumber || !formData.unit) return;
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      await createHabitWithGoal({
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        category: formData.category,
        unit: formData.unit,
        goalAmount: goalAmountNumber,
        goalType: formData.goalType,
      });
      navigation.goBack();
    } catch (error) {
      Alert.alert(
        "Error",
        error instanceof Error
          ? error.message
          : "Unable to create habit. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <MainLayout
      title="Create Habit"
      subtitle="Set up a new habit"
      headerVariant="icon"
      headerIconName="leaf-outline"
      keyboardAvoiding
      showBackground={false}
      contentClassName="flex-1 px-6 pt-16"
    >
      <View className="pb-20">
        <View className="mb-6">
          <View className="flex-row items-center gap-2">
            <View
              className={`h-1 flex-1 rounded-full ${
                step >= 1 ? "bg-purple-500" : "bg-white/10"
              }`}
            />
            <View
              className={`h-1 flex-1 rounded-full ${
                step >= 2 ? "bg-purple-500" : "bg-white/10"
              }`}
            />
          </View>
        </View>

        {step === 1 ? (
          <CreateHabitStepOne
            formData={formData}
            categories={categories}
            isCategoriesLoading={isCategoriesLoading}
            onFieldChange={handleFieldChange}
            onContinue={handleContinue}
            continueScaleAnim={continueScaleAnim}
            animateScale={animateScale}
          />
        ) : (
          <CreateHabitStepTwo
            formData={formData}
            showCurrencyPicker={showCurrencyPicker}
            onFieldChange={handleFieldChange}
            onToggleCurrencyPicker={setShowCurrencyPicker}
            onBack={handleBack}
            onCreate={handleCreate}
            isSubmitting={isSubmitting}
            createScaleAnim={createScaleAnim}
            animateScale={animateScale}
            formatGoalType={formatGoalType}
            categoryUnits={CATEGORY_UNITS[formData.category] || UNITS}
            currencies={CURRENCIES}
          />
        )}
      </View>
    </MainLayout>
  );
}
