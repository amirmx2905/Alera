import { useEffect, useMemo, useRef, useState } from "react";
import { InteractionManager } from "react-native";
import { listMetrics } from "../../habits/services/metrics";
import { useHabits } from "../../../state/HabitsContext";
import { parseEntryDate, toLocalDateKey } from "../../habits/utils/dates";
import type {
  StatsGranularity,
  StatsHabitDetail,
  StatsOverviewData,
} from "../types";
import {
  buildEntryCountMapByGranularity,
  buildBuckets,
  buildLatestHabitMetricMap,
  getDateRangeForGranularity,
  getLatestValueByDate,
  type HabitMetricSnapshot,
  type ProfileMetricSnapshot,
} from "./useStatsData.time";
import {
  buildHabitDetailMap,
  buildHabitsList,
  buildKpis,
} from "./useStatsData.aggregates";

type UseStatsDataReturn = {
  overview: StatsOverviewData;
  isLoading: boolean;
  isSnapshotsLoading: boolean;
  warnings: {
    snapshots: string | null;
  };
  getHabitDetail: (habitId: string) => StatsHabitDetail | null;
};

export function useStatsData(
  granularity: StatsGranularity,
  isFocused = true,
): UseStatsDataReturn {
  const { habits, streaksByHabitId, isLoading } = useHabits();
  const [profileMetricSnapshot, setProfileMetricSnapshot] =
    useState<ProfileMetricSnapshot>({});
  const [habitMetricSnapshotById, setHabitMetricSnapshotById] = useState<
    Record<string, HabitMetricSnapshot>
  >({});
  const [isSnapshotsLoading, setIsSnapshotsLoading] = useState(true);
  const [snapshotMetricError, setSnapshotMetricError] = useState<string | null>(
    null,
  );
  const lastFetchedSnapshotKeyRef = useRef<string | null>(null);

  const activeHabits = useMemo(
    () => habits.filter((habit) => !habit.archived),
    [habits],
  );

  const firstEntryDateKey = useMemo(() => {
    let earliest: string | null = null;

    activeHabits.forEach((habit) => {
      habit.entries.forEach((entry) => {
        const key = toLocalDateKey(parseEntryDate(entry.date));
        if (!earliest || key < earliest) {
          earliest = key;
        }
      });
    });

    return earliest ?? undefined;
  }, [activeHabits]);

  const activeHabitsSnapshotKey = useMemo(
    () =>
      activeHabits
        .map((habit) => `${habit.id}:${habit.entries.length}`)
        .sort()
        .join("|"),
    [activeHabits],
  );

  useEffect(() => {
    if (!isFocused) return;
    if (lastFetchedSnapshotKeyRef.current === activeHabitsSnapshotKey) {
      return;
    }

    let isMounted = true;
    const hasLoadedBefore = lastFetchedSnapshotKeyRef.current !== null;
    if (!hasLoadedBefore) {
      setIsSnapshotsLoading(true);
    }

    const task = InteractionManager.runAfterInteractions(() => {
      Promise.all([
        listMetrics(null, {
          metricType: "active_days",
          granularity: "monthly",
        }),
        listMetrics(null, {
          metricType: "best_streak_overall",
          granularity: "all_time",
        }),
        listMetrics(undefined, {
          metricType: "days_completed_30d",
          granularity: "monthly",
        }),
        listMetrics(undefined, {
          metricType: "avg_value_30d",
          granularity: "monthly",
        }),
        listMetrics(undefined, {
          metricType: "total_entries_all_time",
          granularity: "all_time",
        }),
      ])
        .then(
          ([
            activeDaysRows,
            bestStreakRows,
            daysCompletedRows,
            averageRows,
            totalEntriesRows,
          ]) => {
            if (!isMounted) return;

            const activeDays30 = getLatestValueByDate(
              activeDaysRows.map((row) => ({
                date: row.date,
                value: row.value,
              })),
            );

            const bestStreakLatest = bestStreakRows.reduce<
              (typeof bestStreakRows)[number] | null
            >((latest, row) => {
              if (!latest || row.date > latest.date) return row;
              return latest;
            }, null);

            setProfileMetricSnapshot({
              activeDays30,
              bestStreakOverall:
                bestStreakLatest && Number.isFinite(bestStreakLatest.value)
                  ? Number(bestStreakLatest.value)
                  : undefined,
              bestStreakHabitId:
                typeof bestStreakLatest?.metadata?.best_habit_id === "string"
                  ? bestStreakLatest.metadata.best_habit_id
                  : null,
            });

            const latestDaysCompleted =
              buildLatestHabitMetricMap(daysCompletedRows);
            const latestAverage = buildLatestHabitMetricMap(averageRows);
            const latestTotalEntries =
              buildLatestHabitMetricMap(totalEntriesRows);

            const nextByHabitId: Record<string, HabitMetricSnapshot> = {};
            activeHabits.forEach((habit) => {
              nextByHabitId[habit.id] = {
                daysCompleted30d: latestDaysCompleted[habit.id]?.value,
                avgValue30d: latestAverage[habit.id]?.value,
                totalEntriesAllTime: latestTotalEntries[habit.id]?.value,
              };
            });

            setHabitMetricSnapshotById(nextByHabitId);
            lastFetchedSnapshotKeyRef.current = activeHabitsSnapshotKey;
            setSnapshotMetricError(null);
            setIsSnapshotsLoading(false);
          },
        )
        .catch(() => {
          if (!isMounted) return;
          setProfileMetricSnapshot({});
          setHabitMetricSnapshotById({});
          setSnapshotMetricError(
            "Using local KPI/detail estimates while metrics snapshots sync.",
          );
          setIsSnapshotsLoading(false);
        });
    });

    return () => {
      isMounted = false;
      task.cancel();
    };
  }, [activeHabits, activeHabitsSnapshotKey, isFocused]);

  const trend = useMemo(() => {
    const buckets = buildBuckets(granularity, firstEntryDateKey);
    const localCountsByBucket = buildEntryCountMapByGranularity(
      activeHabits,
      granularity,
    );

    return buckets.map((bucket) => {
      return {
        ...bucket,
        totalEntries: localCountsByBucket[bucket.dateKey] ?? 0,
      };
    });
  }, [activeHabits, firstEntryDateKey, granularity]);

  const periodEntriesByHabitId = useMemo(() => {
    const { from, to } = getDateRangeForGranularity(
      granularity,
      firstEntryDateKey,
    );

    const next: Record<string, number> = {};
    activeHabits.forEach((habit) => {
      next[habit.id] = habit.entries.reduce((sum, entry) => {
        const entryDate = entry.date.slice(0, 10);
        if (entryDate < from || entryDate > to) return sum;
        return sum + 1;
      }, 0);
    });

    return next;
  }, [activeHabits, firstEntryDateKey, granularity]);

  const kpis = useMemo(() => {
    return buildKpis(activeHabits, profileMetricSnapshot, streaksByHabitId);
  }, [activeHabits, profileMetricSnapshot, streaksByHabitId]);

  const habitsList = useMemo(() => {
    return buildHabitsList(
      activeHabits,
      streaksByHabitId,
      habitMetricSnapshotById,
      periodEntriesByHabitId,
    );
  }, [
    activeHabits,
    habitMetricSnapshotById,
    streaksByHabitId,
    periodEntriesByHabitId,
  ]);

  const detailByHabitId = useMemo(() => {
    return buildHabitDetailMap(
      activeHabits,
      streaksByHabitId,
      habitMetricSnapshotById,
    );
  }, [activeHabits, habitMetricSnapshotById, streaksByHabitId]);

  const overview = useMemo<StatsOverviewData>(
    () => ({
      kpis,
      trend,
      habits: habitsList,
    }),
    [habitsList, kpis, trend],
  );

  return {
    overview,
    isLoading,
    isSnapshotsLoading,
    warnings: {
      snapshots: snapshotMetricError,
    },
    getHabitDetail: (habitId: string) => detailByHabitId.get(habitId) ?? null,
  };
}
