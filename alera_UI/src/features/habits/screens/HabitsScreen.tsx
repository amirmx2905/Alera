import React, { useMemo, useRef, useState } from "react";
import { View, Text, Pressable, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { NavigationProp } from "@react-navigation/native";
import { MainLayout } from "../../../layouts/MainLayout";
import { EmptyState } from "../../../components/shared/EmptyState";
import { HabitCard } from "../components/HabitCard";
import { getProgressData } from "../hooks/useHabitProgress";
import type { HabitsStackParamList } from "../../../navigation/HabitsStack";
import type { RootStackParamList } from "../../../navigation/RootNavigator";
import { useHabits } from "../../../state/HabitsContext";

type Props = NativeStackScreenProps<HabitsStackParamList, "HabitsHome">;

export function HabitsScreen({ navigation }: Props) {
  const { habits, isLoading } = useHabits();
  const [showArchived, setShowArchived] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const archiveButtonScale = useRef(new Animated.Value(1)).current;
  const addButtonScale = useRef(new Animated.Value(1)).current;

  const animateIconButton = (anim: Animated.Value, toValue: number) => {
    Animated.spring(anim, {
      toValue,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const displayHabits = useMemo(() => {
    const active = habits.filter((habit) => !habit.archived);
    const archived = habits.filter((habit) => habit.archived);
    return showArchived ? archived : active;
  }, [habits, showArchived]);

  const rootNavigation = navigation.getParent()?.getParent() as
    | NavigationProp<RootStackParamList>
    | undefined;

  return (
    <MainLayout
      title="Habits"
      subtitle="Track and manage your habits"
      headerVariant="icon"
      headerIconName="leaf-outline"
      isLoading={isLoading}
      headerRight={
        <View className="flex-row items-center gap-4">
          <Pressable
            onPress={() => setShowArchived((prev) => !prev)}
            onPressIn={() => animateIconButton(archiveButtonScale, 0.9)}
            onPressOut={() => animateIconButton(archiveButtonScale, 1)}
            className="h-10 w-10"
          >
            <Animated.View
              className={`h-10 w-10 rounded-full border items-center justify-center ${
                showArchived ? "border-purple-400/60" : "border-white/10"
              }`}
              style={{ transform: [{ scale: archiveButtonScale }] }}
            >
              <Ionicons
                name={showArchived ? "archive" : "archive-outline"}
                size={18}
                color="#e2e8f0"
              />
            </Animated.View>
          </Pressable>
          {!showArchived ? (
            <Pressable
              onPress={() => rootNavigation?.navigate("CreateHabit")}
              onPressIn={() => animateIconButton(addButtonScale, 0.9)}
              onPressOut={() => animateIconButton(addButtonScale, 1)}
              className="h-10 w-10"
            >
              <Animated.View
                className="h-10 w-10 rounded-full overflow-hidden"
                style={{ transform: [{ scale: addButtonScale }] }}
              >
                <LinearGradient
                  colors={["#7c3aed", "#4c1d95"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    flex: 1,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text className="text-white text-xl font-semibold">+</Text>
                </LinearGradient>
              </Animated.View>
            </Pressable>
          ) : null}
        </View>
      }
      scrollable
      showBackground={false}
      contentClassName="flex-1 px-6 pt-16"
      keyboardAvoiding
    >
      <View className="pb-20">
        {displayHabits.length === 0 ? (
          <EmptyState
            opacity={fadeAnim}
            title={showArchived ? "No archived habits" : "No habits yet"}
            message={
              showArchived
                ? "Archived habits will appear here."
                : "Create your first habit to start tracking progress."
            }
            iconName={showArchived ? "archive-outline" : "leaf-outline"}
          />
        ) : (
          <View className="gap-4">
            {displayHabits.map((habit) => {
              const { progress, currentAmount } = getProgressData({
                entries: habit.entries,
                goalAmount: habit.goalAmount,
                goalType: habit.goalType,
              });
              const progressValue = Math.round(progress);

              return (
                <HabitCard
                  key={habit.id}
                  habit={habit}
                  progress={progress}
                  progressValue={progressValue}
                  currentAmount={currentAmount}
                  onPress={() =>
                    navigation.navigate("HabitDetail", { habitId: habit.id })
                  }
                />
              );
            })}
          </View>
        )}
      </View>
    </MainLayout>
  );
}
