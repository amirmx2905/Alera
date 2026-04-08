import { useMemo } from "react";
import { useHabits } from "../../../state/HabitsStore";
import {
  type TodaysHabitSummary,
  type HomeGoalFilter,
  type HomeScreenData,
  type TodaysProgress,
  type GreetingType,
} from "../types";
import { getCdmxDateKey } from "../../habits/utils/dates";
import { inferHabitCompletionFromEntries } from "../../habits/utils/goalProgress";

interface UseHomeDataReturn {
  data: HomeScreenData | null;
  isLoading: boolean;
}

function calculateTodaysProgress(habits: TodaysHabitSummary[]): TodaysProgress {
  const completedCount = habits.filter((habit) => habit.completed).length;
  const totalCount = habits.length;
  const completionPercentage =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return {
    completedCount,
    totalCount,
    completionPercentage,
  };
}

function getGreeting(): GreetingType {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
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

  return {
    data,
    isLoading,
  };
}
