import { listGoalProgressMetrics } from "../services/metrics";
import {
  buildGoalProgressMap,
  getMetricDateKeyForGoalType,
  type GoalProgressSnapshot,
} from "./goalProgress";

type HabitGoalRef = {
  id: string;
  goalType: "daily" | "weekly" | "monthly";
};

export async function loadGoalProgressMapForHabits(
  habits: HabitGoalRef[],
): Promise<Record<string, GoalProgressSnapshot>> {
  if (habits.length === 0) return {};

  const habitIdsByType = {
    daily: habits
      .filter((habit) => habit.goalType === "daily")
      .map((habit) => habit.id),
    weekly: habits
      .filter((habit) => habit.goalType === "weekly")
      .map((habit) => habit.id),
    monthly: habits
      .filter((habit) => habit.goalType === "monthly")
      .map((habit) => habit.id),
  };

  const [dailyMetrics, weeklyMetrics, monthlyMetrics] = await Promise.all([
    habitIdsByType.daily.length
      ? listGoalProgressMetrics(
          habitIdsByType.daily,
          "daily",
          getMetricDateKeyForGoalType("daily"),
        )
      : Promise.resolve([]),
    habitIdsByType.weekly.length
      ? listGoalProgressMetrics(
          habitIdsByType.weekly,
          "weekly",
          getMetricDateKeyForGoalType("weekly"),
        )
      : Promise.resolve([]),
    habitIdsByType.monthly.length
      ? listGoalProgressMetrics(
          habitIdsByType.monthly,
          "monthly",
          getMetricDateKeyForGoalType("monthly"),
        )
      : Promise.resolve([]),
  ]);

  return buildGoalProgressMap([
    ...dailyMetrics,
    ...weeklyMetrics,
    ...monthlyMetrics,
  ]);
}
