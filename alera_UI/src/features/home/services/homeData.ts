/**
 * Home Screen Utility Functions
 * Pure helpers for the home screen — data comes from HabitsContext
 */

import { TodaysHabitSummary, TodaysProgress } from "../types";

/**
 * Calculates today's progress statistics
 */
export function calculateTodaysProgress(
  habits: TodaysHabitSummary[],
): TodaysProgress {
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

/**
 * Gets greeting based on current time of day
 */
export function getGreeting():
  | "Good morning"
  | "Good afternoon"
  | "Good evening" {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}
