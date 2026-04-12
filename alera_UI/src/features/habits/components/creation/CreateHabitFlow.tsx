import React, { useCallback, useRef, useState } from "react";
import { View, Alert, Animated } from "react-native";
import { MainLayout } from "../../../../layouts/MainLayout";
import { CreateHabitStepType } from "./CreateHabitStepType";
import { CreateHabitStepOne } from "./CreateHabitStepOne";
import { CreateHabitStepTwo } from "./CreateHabitStepTwo";
import {
  CATEGORY_UNITS,
  CURRENCIES,
  UNITS,
} from "../../../../constants/habitsConstants";
import type { CreateHabitFormState } from "../../types";

type CreateHabitFlowProps = {
  subtitle: string;
  categories: Array<{ id: string; name: string }>;
  isCategoriesLoading: boolean;
  createHabitWithGoal: (data: {
    name: string;
    description?: string;
    category: string;
    unit: string;
    goalAmount: number;
    goalType: "daily" | "weekly" | "monthly";
    type: "numeric" | "binary";
  }) => Promise<void>;
  onSuccess: () => void;
};

const initialFormState: CreateHabitFormState = {
  name: "",
  description: "",
  category: "",
  unit: "",
  goalAmount: "",
  goalType: "daily",
  type: "numeric",
};

export function CreateHabitFlow({
  subtitle,
  categories,
  isCategoriesLoading,
  createHabitWithGoal,
  onSuccess,
}: CreateHabitFlowProps) {
  const [formData, setFormData] =
    useState<CreateHabitFormState>(initialFormState);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const continueScaleAnim = useRef(new Animated.Value(1)).current;
  const createScaleAnim = useRef(new Animated.Value(1)).current;
  const bar1 = useRef(new Animated.Value(1)).current;
  const bar2 = useRef(new Animated.Value(0)).current;
  const bar3 = useRef(new Animated.Value(0)).current;
  const stepOpacity = useRef(new Animated.Value(1)).current;
  const stepTranslateX = useRef(new Animated.Value(0)).current;
  const isAnimatingRef = useRef(false);

  const animateBars = useCallback(
    (newStep: number) => {
      [bar1, bar2, bar3].forEach((bar, i) => {
        Animated.timing(bar, {
          toValue: newStep >= i + 1 ? 1 : 0,
          duration: 300,
          useNativeDriver: false,
        }).start();
      });
    },
    [bar1, bar2, bar3],
  );

  const animateScale = useCallback((scale: Animated.Value, toValue: number) => {
    Animated.spring(scale, {
      toValue,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  }, []);

  const animateStep = useCallback(
    (newStep: number, direction: "forward" | "back") => {
      if (isAnimatingRef.current) return;
      isAnimatingRef.current = true;
      const offset = direction === "forward" ? 30 : -30;
      setStep(newStep);
      stepOpacity.setValue(0);
      stepTranslateX.setValue(offset);
      Animated.parallel([
        Animated.timing(stepOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(stepTranslateX, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        isAnimatingRef.current = false;
      });
      animateBars(newStep);
    },
    [stepOpacity, stepTranslateX, animateBars],
  );

  const handleContinue = () => {
    if (step === 1) {
      animateStep(2, "forward");
      return;
    }
    if (step === 2 && formData.name && formData.category) {
      animateStep(3, "forward");
    }
  };

  const handleBack = () => {
    if (step > 1) animateStep(step - 1, "back");
  };

  const handleFieldChange = useCallback(
    (patch: Partial<CreateHabitFormState>) => {
      setFormData((prev) => {
        const next = { ...prev, ...patch };
        if (patch.type === "binary") {
          next.unit = "Times";
          next.goalAmount = next.goalAmount || "1";
        } else if (patch.type === "numeric") {
          next.unit = "";
          next.goalAmount = "";
        }
        return next;
      });
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
      onSuccess();
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
      subtitle={subtitle}
      headerVariant="icon"
      headerIconName="leaf-outline"
      keyboardAvoiding
      scrollable
      showBackground={false}
      contentClassName="flex-1 px-6 pt-16"
    >
      <View className="pb-20">
        <View className="mb-6">
          <View className="flex-row items-center gap-2">
            {[bar1, bar2, bar3].map((bar, i) => (
              <View
                key={i}
                className="h-1 flex-1 rounded-full bg-white/10 overflow-hidden"
              >
                <Animated.View
                  className="h-full rounded-full bg-purple-500"
                  style={{
                    width: bar.interpolate({
                      inputRange: [0, 1],
                      outputRange: ["0%", "100%"],
                    }),
                  }}
                />
              </View>
            ))}
          </View>
        </View>

        <Animated.View
          style={{
            opacity: stepOpacity,
            transform: [{ translateX: stepTranslateX }],
          }}
        >
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
              onBack={handleBack}
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
        </Animated.View>
      </View>
    </MainLayout>
  );
}
