import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Alert, Animated } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { MainLayout } from "../../../layouts/MainLayout";
import { CreateHabitStepType } from "../../habits/components/creation/CreateHabitStepType";
import { CreateHabitStepOne } from "../../habits/components/creation/CreateHabitStepOne";
import { CreateHabitStepTwo } from "../../habits/components/creation/CreateHabitStepTwo";
import {
  CATEGORY_UNITS,
  CURRENCIES,
  UNITS,
} from "../../../constants/habitsConstants";
import { useSupervisedHabits } from "../hooks/useSupervisedHabits";
import { useSupervisedActions } from "../hooks/useSupervisedActions";
import type { CreateHabitFormState } from "../../habits/types";
import type { RootStackParamList } from "../../../navigation/RootNavigator";

type Props = NativeStackScreenProps<
  RootStackParamList,
  "SupervisedCreateHabit"
>;

const initialFormState: CreateHabitFormState = {
  name: "",
  description: "",
  category: "",
  unit: "",
  goalAmount: "",
  goalType: "daily",
  type: "numeric",
};

export function SupervisedCreateHabitScreen({ navigation, route }: Props) {
  const { profileId } = route.params;
  const { categories, isCategoriesLoading, refreshHabits, categoryMap } =
    useSupervisedHabits(profileId);
  const { createHabitWithGoal } = useSupervisedActions({
    profileId,
    refreshHabits,
    categoryMap,
  });

  const [formData, setFormData] =
    useState<CreateHabitFormState>(initialFormState);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const continueScale = useRef(new Animated.Value(1)).current;
  const createScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (formData.type !== "binary") return;
    setFormData((p) => ({ ...p, unit: "Times", goalAmount: p.goalAmount || "1" }));
  }, [formData.type]);

  const animateScale = useCallback(
    (s: Animated.Value, to: number) => {
      Animated.spring(s, {
        toValue: to,
        useNativeDriver: true,
        speed: 50,
        bounciness: 4,
      }).start();
    },
    [],
  );

  const handleContinue = () => {
    if (step === 1) { setStep(2); return; }
    if (step === 2 && formData.name && formData.category) setStep(3);
  };
  const handleBack = () => setStep((p) => Math.max(1, p - 1));
  const handleFieldChange = useCallback(
    (patch: Partial<CreateHabitFormState>) =>
      setFormData((p) => ({ ...p, ...patch })),
    [],
  );

  const handleCreate = async () => {
    const goalNum = Number(formData.goalAmount);
    if (!goalNum) return;
    if (formData.type === "numeric" && !formData.unit) return;
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      await createHabitWithGoal({
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        category: formData.category,
        unit: formData.unit,
        goalAmount: goalNum,
        goalType: formData.goalType,
        type: formData.type,
      });
      navigation.goBack();
    } catch (err) {
      Alert.alert(
        "Error",
        err instanceof Error ? err.message : "Unable to create habit.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <MainLayout
      title="Create Habit"
      subtitle="For supervised user"
      headerVariant="icon"
      headerIconName="leaf-outline"
      keyboardAvoiding
      showBackground={false}
      contentClassName="flex-1 px-6 pt-16"
    >
      <View className="pb-20">
        <View className="mb-6 flex-row items-center gap-2">
          <View className={`h-1 flex-1 rounded-full ${step >= 1 ? "bg-purple-500" : "bg-white/10"}`} />
          <View className={`h-1 flex-1 rounded-full ${step >= 2 ? "bg-purple-500" : "bg-white/10"}`} />
          <View className={`h-1 flex-1 rounded-full ${step >= 3 ? "bg-purple-500" : "bg-white/10"}`} />
        </View>

        {step === 1 ? (
          <CreateHabitStepType
            formData={formData}
            onFieldChange={handleFieldChange}
            onContinue={handleContinue}
            continueScaleAnim={continueScale}
            animateScale={animateScale}
          />
        ) : step === 2 ? (
          <CreateHabitStepOne
            formData={formData}
            categories={categories.map((c) => ({ id: c.id, name: c.name }))}
            isCategoriesLoading={isCategoriesLoading}
            onFieldChange={handleFieldChange}
            onContinue={handleContinue}
            continueScaleAnim={continueScale}
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
            createScaleAnim={createScale}
            animateScale={animateScale}
            categoryUnits={CATEGORY_UNITS[formData.category] || UNITS}
            currencies={CURRENCIES}
          />
        )}
      </View>
    </MainLayout>
  );
}
