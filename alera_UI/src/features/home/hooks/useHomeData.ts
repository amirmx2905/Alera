/**
 * Custom hook for managing home screen data
 * Derives all data from the existing HabitsContext — no extra network calls
 */

import { useMemo } from "react";
import { useHabits } from "../../../state/HabitsContext";
import { TodaysHabitSummary, HomeGoalFilter, HomeScreenData } from "../types";
import { getCdmxDateKey } from "../../habits/utils/dates";
import { inferHabitCompletionFromEntries } from "../../habits/utils/goalProgress";
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

  const data: HomeScreenData | null = useMemo(() => {
    if (isLoading) return null;

    const today = getCdmxDateKey();
    const activeHabits = habits.filter((habit) => !habit.archived);

    const todaysHabits: TodaysHabitSummary[] = activeHabits.map((habit) => {
      const completed = inferHabitCompletionFromEntries(habit, today);

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
  }, [goalType, habits, isLoading, streaksByHabitId]);

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
