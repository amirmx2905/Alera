/**
 * Home Feature Type Definitions
 */

/**
 * Represents a habit's summary for the home screen
 */
export interface TodaysHabitSummary {
  id: string;
  name: string;
  completed: boolean;
  goalType: "daily" | "weekly" | "monthly";
  streak: number;
}

export type HomeGoalFilter = "daily" | "weekly" | "monthly";

/**
 * Today's progress statistics
 */
export interface TodaysProgress {
  completedCount: number;
  totalCount: number;
  completionPercentage: number;
}

/**
 * Greeting type based on time of day
 */
export type GreetingType = "Good morning" | "Good afternoon" | "Good evening";

/**
 * Home screen data aggregated
 */
export interface HomeScreenData {
  todaysHabits: TodaysHabitSummary[];
  progress: TodaysProgress;
  greeting: GreetingType;
}
