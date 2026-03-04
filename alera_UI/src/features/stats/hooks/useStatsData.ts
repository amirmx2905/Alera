import { useEffect, useMemo, useState } from "react";
import { listMetrics } from "../../habits/services/metrics";
import { useHabits } from "../../../state/HabitsContext";
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
    trend: string | null;
    snapshots: string | null;
  };
  getHabitDetail: (habitId: string) => StatsHabitDetail | null;
};

export function useStatsData(
  granularity: StatsGranularity,
): UseStatsDataReturn {
  const { habits, streaksByHabitId, isLoading } = useHabits();
  const [metricPointsByGranularity, setMetricPointsByGranularity] = useState<
    Record<StatsGranularity, Record<string, number>>
  >({
    daily: {},
    weekly: {},
    monthly: {},
  });
  const [profileMetricSnapshot, setProfileMetricSnapshot] =
    useState<ProfileMetricSnapshot>({});
  const [habitMetricSnapshotById, setHabitMetricSnapshotById] = useState<
    Record<string, HabitMetricSnapshot>
  >({});
  const [isSnapshotsLoading, setIsSnapshotsLoading] = useState(true);
  const [snapshotMetricError, setSnapshotMetricError] = useState<string | null>(
    null,
  );
  const [metricError, setMetricError] = useState<string | null>(null);

  const activeHabits = useMemo(
    () => habits.filter((habit) => !habit.archived),
    [habits],
  );

  useEffect(() => {
    let isMounted = true;

    const granularities: StatsGranularity[] = ["daily", "weekly", "monthly"];

    Promise.all(
      granularities.map(async (targetGranularity) => {
        const { from, to } = getDateRangeForGranularity(targetGranularity);
        const rows = await listMetrics(undefined, {
          metricType: "total_entries",
          granularity: targetGranularity,
          from,
          to,
        });

        const points: Record<string, number> = {};
        rows.forEach((row) => {
          points[row.date] = Number(row.value);
        });

        return {
          granularity: targetGranularity,
          points,
        };
      }),
    )
      .then((results) => {
        if (!isMounted) return;

        setMetricPointsByGranularity((previous) => {
          const next = { ...previous };
          results.forEach(({ granularity: targetGranularity, points }) => {
            next[targetGranularity] = points;
          });
          return next;
        });

        setMetricError(null);
      })
      .catch(() => {
        if (!isMounted) return;
        setMetricError("Using local trend estimates while metrics sync.");
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    setIsSnapshotsLoading(true);

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
            activeDaysRows.map((row) => ({ date: row.date, value: row.value })),
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

    return () => {
      isMounted = false;
    };
  }, [activeHabits]);

  const trend = useMemo(() => {
    const buckets = buildBuckets(granularity);
    const metricPoints = metricPointsByGranularity[granularity] ?? {};
    const localCountsByBucket = buildEntryCountMapByGranularity(
      activeHabits,
      granularity,
    );

    return buckets.map((bucket) => {
      const metricValue = metricPoints[bucket.dateKey];
      const localValue = localCountsByBucket[bucket.dateKey] ?? 0;
      return {
        ...bucket,
        totalEntries:
          metricValue !== undefined && Number.isFinite(metricValue)
            ? metricValue
            : localValue,
      };
    });
  }, [activeHabits, granularity, metricPointsByGranularity]);

  const kpis = useMemo(() => {
    return buildKpis(activeHabits, profileMetricSnapshot);
  }, [activeHabits, profileMetricSnapshot]);

  const habitsList = useMemo(() => {
    return buildHabitsList(
      activeHabits,
      streaksByHabitId,
      habitMetricSnapshotById,
    );
  }, [activeHabits, habitMetricSnapshotById, streaksByHabitId]);

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
      trend: metricError,
      snapshots: snapshotMetricError,
    },
    getHabitDetail: (habitId: string) => detailByHabitId.get(habitId) ?? null,
  };
}
