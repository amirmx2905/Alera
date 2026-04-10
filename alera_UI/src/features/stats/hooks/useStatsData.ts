import { useEffect, useMemo, useRef, useState } from "react";
import { InteractionManager } from "react-native";
import { listMetrics, type Metric } from "../../habits/services/metrics";
import { useHabits } from "../../../state/HabitsStore";
import {
  usePreload,
  type PreloadedStatsMetrics,
} from "../../../state/PreloadStore";
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
} from "./statsDateBuckets";
import {
  buildHabitDetailMap,
  buildHabitsList,
  buildKpis,
} from "./statsOverviewBuilders";
import type { Habit } from "../../habits/types";

function processMetricRows(
  raw: PreloadedStatsMetrics,
  activeHabits: Habit[],
) {
  const activeDays30 = getLatestValueByDate(
    raw.activeDaysRows.map((row) => ({ date: row.date, value: row.value })),
  );

  const bestStreakLatest = raw.bestStreakRows.reduce<Metric | null>(
    (latest, row) => (!latest || row.date > latest.date ? row : latest),
    null,
  );

  const profileSnapshot: ProfileMetricSnapshot = {
    activeDays30,
    bestStreakOverall:
      bestStreakLatest && Number.isFinite(bestStreakLatest.value)
        ? Number(bestStreakLatest.value)
        : undefined,
    bestStreakHabitId:
      typeof bestStreakLatest?.metadata?.best_habit_id === "string"
        ? bestStreakLatest.metadata.best_habit_id
        : null,
  };

  const latestDaysCompleted = buildLatestHabitMetricMap(
    raw.daysCompletedRows,
  );
  const acceptedAverageRows = raw.averageRows.filter((row) => {
    if (!row.metadata || typeof row.metadata !== "object") return false;
    return (row.metadata as Record<string, unknown>).denominator_type ===
      "calendar_days";
  });
  const latestAverage = buildLatestHabitMetricMap(acceptedAverageRows);
  const latestTotalEntries = buildLatestHabitMetricMap(raw.totalEntriesRows);

  const habitSnapshots: Record<string, HabitMetricSnapshot> = {};
  activeHabits.forEach((habit) => {
    habitSnapshots[habit.id] = {
      daysCompleted30d: latestDaysCompleted[habit.id]?.value,
      avgValue30d: latestAverage[habit.id]?.value,
      totalEntriesAllTime: latestTotalEntries[habit.id]?.value,
    };
  });

  return { profileSnapshot, habitSnapshots };
}

async function fetchMetricRows(profileId?: string) {
  const [
    activeDaysRows,
    bestStreakRows,
    daysCompletedRows,
    averageRows,
    totalEntriesRows,
  ] = await Promise.all([
    listMetrics(null, { metricType: "active_days", granularity: "monthly" }, profileId),
    listMetrics(null, { metricType: "best_streak_overall", granularity: "all_time" }, profileId),
    listMetrics(undefined, { metricType: "days_completed_30d", granularity: "monthly" }, profileId),
    listMetrics(undefined, { metricType: "avg_value_30d", granularity: "monthly" }, profileId),
    listMetrics(undefined, { metricType: "total_entries_all_time", granularity: "all_time" }, profileId),
  ]);
  return { activeDaysRows, bestStreakRows, daysCompletedRows, averageRows, totalEntriesRows };
}

type UseStatsDataReturn = {
  overview: StatsOverviewData;
  isLoading: boolean;
  isSnapshotsLoading: boolean;
  warnings: { snapshots: string | null };
  getHabitDetail: (habitId: string) => StatsHabitDetail | null;
};

export function useStatsData(
  granularity: StatsGranularity,
  isFocused = true,
  profileId?: string,
): UseStatsDataReturn {
  const { habits, streaksByHabitId, isLoading } = useHabits();
  const { statsMetrics: preloaded } = usePreload();
  const [profileMetricSnapshot, setProfileMetricSnapshot] = useState<ProfileMetricSnapshot>({});
  const [habitMetricSnapshotById, setHabitMetricSnapshotById] = useState<Record<string, HabitMetricSnapshot>>({});
  const [isSnapshotsLoading, setIsSnapshotsLoading] = useState(true);
  const [snapshotMetricError, setSnapshotMetricError] = useState<string | null>(null);
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
        if (!earliest || key < earliest) earliest = key;
      });
    });
    return earliest ?? undefined;
  }, [activeHabits]);

  const activeHabitsSnapshotKey = useMemo(
    () =>
      activeHabits
        .map((h) => {
          const sig = h.entries
            .map((e) => `${e.id}:${e.date}:${e.amount}`)
            .sort()
            .join(";");
          return `${h.id}|${sig}`;
        })
        .sort()
        .join("||"),
    [activeHabits],
  );

  // Use preloaded data for initial load; fetch fresh on re-focus when data changes
  useEffect(() => {
    const hasLoadedBefore = lastFetchedSnapshotKeyRef.current !== null;
    if (lastFetchedSnapshotKeyRef.current === activeHabitsSnapshotKey) return;

    // First load: use preloaded data if available (no profileId override)
    if (!hasLoadedBefore && preloaded && !profileId) {
      const { profileSnapshot, habitSnapshots } = processMetricRows(
        preloaded,
        activeHabits,
      );
      setProfileMetricSnapshot(profileSnapshot);
      setHabitMetricSnapshotById(habitSnapshots);
      setSnapshotMetricError(null);
      setIsSnapshotsLoading(false);
      lastFetchedSnapshotKeyRef.current = activeHabitsSnapshotKey;
      return;
    }

    // Re-fetches: only when focused
    if (hasLoadedBefore && !isFocused) return;
    if (!hasLoadedBefore) setIsSnapshotsLoading(true);

    let isMounted = true;
    const task = InteractionManager.runAfterInteractions(() => {
      fetchMetricRows(profileId)
        .then((raw) => {
          if (!isMounted) return;
          const { profileSnapshot, habitSnapshots } = processMetricRows(
            raw,
            activeHabits,
          );
          setProfileMetricSnapshot(profileSnapshot);
          setHabitMetricSnapshotById(habitSnapshots);
          lastFetchedSnapshotKeyRef.current = activeHabitsSnapshotKey;
          setSnapshotMetricError(null);
          setIsSnapshotsLoading(false);
        })
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
  }, [activeHabits, activeHabitsSnapshotKey, isFocused, preloaded, profileId]);

  const trend = useMemo(() => {
    const buckets = buildBuckets(granularity, firstEntryDateKey);
    const localCounts = buildEntryCountMapByGranularity(activeHabits, granularity);
    return buckets.map((b) => ({ ...b, totalEntries: localCounts[b.dateKey] ?? 0 }));
  }, [activeHabits, firstEntryDateKey, granularity]);

  const periodEntriesByHabitId = useMemo(() => {
    const { from, to } = getDateRangeForGranularity(granularity, firstEntryDateKey);
    const next: Record<string, number> = {};
    activeHabits.forEach((h) => {
      next[h.id] = h.entries.reduce((sum, e) => {
        const d = e.date.slice(0, 10);
        return d < from || d > to ? sum : sum + 1;
      }, 0);
    });
    return next;
  }, [activeHabits, firstEntryDateKey, granularity]);

  const kpis = useMemo(
    () => buildKpis(activeHabits, profileMetricSnapshot, streaksByHabitId),
    [activeHabits, profileMetricSnapshot, streaksByHabitId],
  );

  const habitsList = useMemo(
    () => buildHabitsList(activeHabits, streaksByHabitId, habitMetricSnapshotById, periodEntriesByHabitId),
    [activeHabits, habitMetricSnapshotById, streaksByHabitId, periodEntriesByHabitId],
  );

  const detailByHabitId = useMemo(
    () => buildHabitDetailMap(activeHabits, streaksByHabitId, habitMetricSnapshotById),
    [activeHabits, habitMetricSnapshotById, streaksByHabitId],
  );

  const overview = useMemo<StatsOverviewData>(
    () => ({ kpis, trend, habits: habitsList }),
    [habitsList, kpis, trend],
  );

  return {
    overview,
    isLoading,
    isSnapshotsLoading,
    warnings: { snapshots: snapshotMetricError },
    getHabitDetail: (habitId: string) => detailByHabitId.get(habitId) ?? null,
  };
}
