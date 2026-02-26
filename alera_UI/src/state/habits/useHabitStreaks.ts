import { useCallback, useState } from "react";
import type { Habit } from "../../features/habits/types";
import { listStreakMetrics } from "../../features/habits/services/metrics";
import {
  getCdmxDateKey,
  toLocalDateKey,
} from "../../features/habits/utils/dates";
import { calculateLocalStreak, getExpectedMetricDate } from "./habits.helpers";

type UseHabitStreaksParams = {
  sessionUserId?: string;
  habitsRef: React.MutableRefObject<Habit[]>;
};

export function useHabitStreaks({
  sessionUserId,
  habitsRef,
}: UseHabitStreaksParams) {
  const [streaksByHabitId, setStreaksByHabitId] = useState<
    Record<string, number>
  >({});
  const [isStreaksLoading, setIsStreaksLoading] = useState(false);

  const clearStreaks = useCallback(() => {
    setStreaksByHabitId({});
    setIsStreaksLoading(false);
  }, []);

  const setStreakForHabit = useCallback((habitId: string, streak: number) => {
    setStreaksByHabitId((current) => ({
      ...current,
      [habitId]: streak,
    }));
  }, []);

  const refreshStreaks = useCallback(async () => {
    if (!sessionUserId) {
      clearStreaks();
      return;
    }

    setIsStreaksLoading(true);
    try {
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - 120);
      const from = toLocalDateKey(fromDate);
      const metrics = await listStreakMetrics(from);

      const latestByHabit: Record<string, { date: string; value: number }> = {};
      const todayKey = getCdmxDateKey();

      for (const metric of metrics) {
        if (!metric.habit_id) continue;
        const current = latestByHabit[metric.habit_id];
        if (!current || metric.date > current.date) {
          latestByHabit[metric.habit_id] = {
            date: metric.date,
            value: Number(metric.value ?? 0),
          };
        }
      }

      const nextMap: Record<string, number> = {};
      for (const habit of habitsRef.current) {
        const payload = latestByHabit[habit.id];
        const expectedDate = getExpectedMetricDate(habit.goalType, todayKey);
        const localFallback = calculateLocalStreak(
          habit.entries,
          habit.goalType,
          habit.goalAmount,
        );

        if (!payload || payload.date < expectedDate) {
          nextMap[habit.id] = localFallback;
          continue;
        }

        nextMap[habit.id] = payload.value;
      }

      setStreaksByHabitId(nextMap);
    } finally {
      setIsStreaksLoading(false);
    }
  }, [clearStreaks, sessionUserId, habitsRef]);

  return {
    streaksByHabitId,
    isStreaksLoading,
    refreshStreaks,
    setStreakForHabit,
    clearStreaks,
  };
}
