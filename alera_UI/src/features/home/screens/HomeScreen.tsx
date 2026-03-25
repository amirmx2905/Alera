/**
 * Home Screen
 * Displays daily overview, progress, and today's habits
 */

import React, { useEffect, useRef, useState } from "react";
import { View, Animated } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { MainLayout } from "../../../layouts/MainLayout";
import { HomeHeader } from "../components/HomeHeader";
import { TodaysProgressCard } from "../components/TodaysProgressCard";
import { TodaysHabitsList } from "../components/TodaysHabitsList";
import { useHomeData } from "../hooks/useHomeData";
import type { AppTabParamList } from "../../../navigation/AppTabs";
import type { HomeGoalFilter } from "../types";
import { useHomeStartupGate } from "../../../navigation/HomeStartupGate";

type NavigationProp = BottomTabNavigationProp<AppTabParamList>;

export function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [goalType, setGoalType] = useState<HomeGoalFilter>("daily");
  const { data, isLoading } = useHomeData(goalType);
  const { isHomeReady, markHomeReady } = useHomeStartupGate();
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const filterAnim = useRef(new Animated.Value(0)).current;
  const hasSeenLoadingRef = useRef(false);
  const hasData = Boolean(data);
  const canRenderHome = !isLoading && data !== null;

  useEffect(() => {
    if (isHomeReady) {
      return;
    }

    if (isLoading) {
      hasSeenLoadingRef.current = true;
      return;
    }

    if (hasSeenLoadingRef.current || canRenderHome) {
      markHomeReady();
    }
  }, [canRenderHome, isLoading, isHomeReady, markHomeReady]);

  useEffect(() => {
    if (!hasData) return;
    filterAnim.setValue(0);
    Animated.timing(filterAnim, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [filterAnim, goalType, hasData]);

  /**
   * Navigates to HabitDetail by switching to the Habits tab
   */
  const handleHabitPress = (habitId: string) => {
    navigation.getParent()?.navigate("HabitDetail", { habitId });
  };

  return (
    <MainLayout
      title="Home"
      headerVariant="icon"
      headerIconName="home-outline"
      showHeader={isHomeReady}
      showBackground={false}
      isLoading={isHomeReady ? isLoading : false}
      scrollable
      contentClassName="flex-1 px-6 pt-16"
    >
      <View className="pb-24">
        {data && (
          <>
            <HomeHeader
              greeting={data.greeting}
              completedToday={data.progress.completedCount}
              totalHabits={data.progress.totalCount}
              selectedGoalType={goalType}
              onSelectGoalType={setGoalType}
            />

            <Animated.View
              style={{
                opacity: filterAnim,
                transform: [
                  {
                    translateY: filterAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [8, 0],
                    }),
                  },
                ],
              }}
            >
              <TodaysProgressCard
                progress={data.progress}
                goalType={goalType}
              />

              <TodaysHabitsList
                habits={data.todaysHabits}
                goalType={goalType}
                onHabitPress={handleHabitPress}
                fadeAnim={fadeAnim}
              />
            </Animated.View>
          </>
        )}
      </View>
    </MainLayout>
  );
}
