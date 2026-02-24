/**
 * Custom hook for managing home screen data
 * Derives all data from the existing HabitsContext — no extra network calls
 */

import { useEffect, useMemo, useState } from "react";
import { useHabits } from "../../../state/HabitsContext";
import { TodaysHabitSummary, HomeGoalFilter, HomeScreenData } from "../types";
import { getCdmxDateKey } from "../../habits/utils/dates";
import {
  inferHabitCompletionFromEntries,
  type GoalProgressSnapshot,
} from "../../habits/utils/goalProgress";
import { loadGoalProgressMapForHabits } from "../../habits/utils/goalProgressApi";
import { calculateTodaysProgress, getGreeting } from "../services/homeData";

interface UseHomeDataReturn {
  data: HomeScreenData | null;
  isLoading: boolean;
  error: string | null;
  toggleHabitComplete: (habitId: string) => void;
}

/**
 * Derives home screen data from the already-loaded HabitsContext.
 * No extra fetches needed — habits, entries, and goals are already available.
 */
export function useHomeData(goalType: HomeGoalFilter): UseHomeDataReturn {
  const { habits, isLoading, streaksByHabitId } = useHabits();
  const [goalProgressByHabitId, setGoalProgressByHabitId] = useState<
    Record<string, GoalProgressSnapshot>
  >({});

  useEffect(() => {
    if (isLoading) return;

    const activeHabits = habits.filter(
      (habit) => !habit.archived && habit.goalType === goalType,
    );

    if (activeHabits.length === 0) {
      setGoalProgressByHabitId({});
      return;
    }

    loadGoalProgressMapForHabits(
      activeHabits.map((habit) => ({ id: habit.id, goalType: habit.goalType })),
    )
      .then((metrics) => {
        setGoalProgressByHabitId(metrics);
      })
      .catch(() => {
        setGoalProgressByHabitId({});
      });
  }, [goalType, habits, isLoading]);

  const data: HomeScreenData | null = useMemo(() => {
    if (isLoading) return null;

    const today = getCdmxDateKey();
    const activeHabits = habits.filter((habit) => !habit.archived);

    const todaysHabits: TodaysHabitSummary[] = activeHabits.map((habit) => {
      let completed: boolean;
      const goalProgress = goalProgressByHabitId[habit.id];
      if (goalProgress && goalProgress.targetValue > 0) {
        completed = goalProgress.totalValue >= goalProgress.targetValue;
      } else {
        completed = inferHabitCompletionFromEntries(habit, today);
      }

      return {
        id: habit.id,
        name: habit.name,
        completed,
        goalType: habit.goalType,
        streak: streaksByHabitId[habit.id] ?? 0,
      };
    });

    const filteredHabits = todaysHabits.filter(
      (habit) => habit.goalType === goalType,
    );

    return {
      todaysHabits: filteredHabits,
      progress: calculateTodaysProgress(filteredHabits),
      greeting: getGreeting(),
    };
  }, [goalProgressByHabitId, goalType, habits, isLoading, streaksByHabitId]);

  /**
   * No-op — completion on the home screen is read-only.
   * Actual entry logging happens in the HabitDetail screen.
   */
  const toggleHabitComplete = (_habitId: string) => {};

  return {
    data,
    isLoading,
    error: null,
    toggleHabitComplete,
  };
}
