import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Alert, Animated } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { MainLayout } from "../../../layouts/MainLayout";
import { CreateHabitStepType } from "../components/creation/CreateHabitStepType";
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
  type: "numeric",
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

  useEffect(() => {
    if (formData.type !== "binary") return;
    setFormData((prev) => ({
      ...prev,
      unit: "Times",
      goalAmount: prev.goalAmount || "1",
    }));
  }, [formData.type]);

  const animateScale = useCallback((scale: Animated.Value, toValue: number) => {
    Animated.spring(scale, {
      toValue,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  }, []);

  const handleContinue = () => {
    if (step === 1) {
      setStep(2);
      return;
    }
    if (step === 2 && formData.name && formData.category) {
      setStep(3);
    }
  };

  const handleBack = () => {
    setStep((prev) => Math.max(1, prev - 1));
  };

  const handleFieldChange = useCallback(
    (patch: Partial<CreateHabitFormState>) => {
      setFormData((prev) => ({ ...prev, ...patch }));
    },
    [],
  );

  const handleCreate = async () => {
    const goalAmountNumber = Number(formData.goalAmount);
    if (!goalAmountNumber) return;
    if (formData.type === "numeric" && !formData.unit) return;
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
        type: formData.type,
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
            <View
              className={`h-1 flex-1 rounded-full ${
                step >= 3 ? "bg-purple-500" : "bg-white/10"
              }`}
            />
          </View>
        </View>

        {step === 1 ? (
          <CreateHabitStepType
            formData={formData}
            onFieldChange={handleFieldChange}
            onContinue={handleContinue}
            continueScaleAnim={continueScaleAnim}
            animateScale={animateScale}
          />
        ) : step === 2 ? (
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
            categoryUnits={CATEGORY_UNITS[formData.category] || UNITS}
            currencies={CURRENCIES}
          />
        )}
      </View>
    </MainLayout>
  );
}
