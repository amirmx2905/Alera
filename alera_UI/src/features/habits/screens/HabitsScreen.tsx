import React, { useCallback, useMemo, useRef, useState } from "react";
import { View, Text, Pressable, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { NavigationProp } from "@react-navigation/native";
import { MainLayout } from "../../../layouts/MainLayout";
import { EmptyState } from "../../../components/shared/EmptyState";
import { HabitCard } from "../components/HabitCard";
import { getProgressData } from "../utils/habitProgress";
import { COLORS } from "../../../constants/theme";
import type { HabitsStackParamList } from "../../../navigation/HabitsStack";
import type { RootStackParamList } from "../../../navigation/RootNavigator";
import { useHabits } from "../../../state/HabitsStore";
import { useSupervisedProfile } from "../../supervision/context/SupervisedProfileContext";
import { useIsSupervised } from "../../supervision/hooks/useIsSupervised";

type Props = NativeStackScreenProps<HabitsStackParamList, "HabitsHome">;

export function HabitsScreen({ navigation }: Props) {
  const { habits, isLoading, refreshHabits } = useHabits();
  const { isSupervised } = useIsSupervised();
  const supervisedProfile = useSupervisedProfile();
  const [showArchived, setShowArchived] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const archiveButtonScale = useRef(new Animated.Value(1)).current;
  const addButtonScale = useRef(new Animated.Value(1)).current;

  const handleRefresh = useCallback(async () => {
    await refreshHabits({ silent: true });
  }, [refreshHabits]);

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
      subtitle={supervisedProfile ? `Managing ${supervisedProfile.fullName}` : "Track and manage your habits"}
      headerVariant="icon"
      headerIconName="leaf-outline"
      isLoading={isLoading}
      headerRight={
        <View className="flex-row items-center gap-4">
          {!showArchived && (!isSupervised || supervisedProfile) ? (
            <Pressable
              onPress={() => {
                if (supervisedProfile) {
                  rootNavigation?.navigate("SupervisedCreateHabit", {
                    profileId: supervisedProfile.profileId,
                  });
                } else {
                  rootNavigation?.navigate("CreateHabit");
                }
              }}
              onPressIn={() => animateIconButton(addButtonScale, 0.9)}
              onPressOut={() => animateIconButton(addButtonScale, 1)}
              className="h-10 w-10"
            >
              <Animated.View
                className="h-10 w-10 rounded-xl overflow-hidden"
                style={{ transform: [{ scale: addButtonScale }] }}
              >
                <LinearGradient
                  colors={COLORS.gradientHeader}
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
          <Pressable
            onPress={() => setShowArchived((prev) => !prev)}
            onPressIn={() => animateIconButton(archiveButtonScale, 0.9)}
            onPressOut={() => animateIconButton(archiveButtonScale, 1)}
            className="h-10 w-10"
          >
            <Animated.View
              className={`h-10 w-10 rounded-xl border items-center justify-center ${
                showArchived ? "border-purple-400/60" : "border-white/10"
              }`}
              style={{ transform: [{ scale: archiveButtonScale }] }}
            >
              <Ionicons
                name={showArchived ? "archive" : "archive-outline"}
                size={18}
                color={COLORS.slate200}
              />
            </Animated.View>
          </Pressable>
        </View>
      }
      scrollable
      showBackground={false}
      contentClassName="flex-1 px-6 pt-16"
      keyboardAvoiding
      onRefresh={handleRefresh}
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
                  onPress={() => navigation.navigate("HabitDetail", { habitId: habit.id })}
                />
              );
            })}
          </View>
        )}
      </View>
    </MainLayout>
  );
}
