import type { Habit } from "../features/habits/types";
import {
  buildBuckets,
  buildEntryCountMapByGranularity,
} from "../features/stats/hooks/statsDateBuckets";
import {
  buildHabitDetailMap,
  buildHabitsList,
  buildKpis,
} from "../features/stats/hooks/statsOverviewBuilders";
import {
  buildHabitBucketSummaries,
  buildHabitTrend,
  buildNumericHabitTrend,
  formatCompletionWindow,
  formatHabitGoalSummary,
  formatPeriodUnit,
} from "../features/stats/utils/habitStatsPresentation";

describe("buildBuckets rolling window", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-03-04T12:00:00"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("returns progressive daily buckets when history is shorter than 7 days", () => {
    const buckets = buildBuckets("daily", "2026-03-03");

    expect(buckets).toHaveLength(2);
    expect(buckets[0].dateKey).toBe("2026-03-03");
    expect(buckets[1].dateKey).toBe("2026-03-04");
  });

  it("keeps full daily window when history is older than 7 days", () => {
    const buckets = buildBuckets("daily", "2026-02-20");

    expect(buckets).toHaveLength(7);
    expect(buckets[0].dateKey).toBe("2026-02-26");
    expect(buckets[6].dateKey).toBe("2026-03-04");
  });
});

describe("stats formatters", () => {
  it("formats singular period units", () => {
    expect(formatPeriodUnit(1, "days")).toBe("day");
    expect(formatPeriodUnit(1, "weeks")).toBe("week");
    expect(formatPeriodUnit(1, "months")).toBe("month");
  });

  it("formats completion windows", () => {
    expect(formatCompletionWindow(3, 7, "days")).toBe("3/7 days");
    expect(formatCompletionWindow(1, 1, "weeks")).toBe("1/1 week");
  });
});

describe("buildEntryCountMapByGranularity", () => {
  const habits: Habit[] = [
    {
      id: "habit-1",
      name: "Read",
      category: "Learning",
      unit: "pages",
      goalAmount: 10,
      goalType: "daily",
      type: "numeric",
      entries: [
        { id: "e1", date: "2026-03-03", amount: 10 },
        { id: "e2", date: "2026-03-03", amount: 5 },
        { id: "e3", date: "2026-03-05", amount: 8 },
      ],
    },
    {
      id: "habit-2",
      name: "Meditate",
      category: "Mind",
      unit: "sessions",
      goalAmount: 1,
      goalType: "weekly",
      type: "binary",
      entries: [{ id: "e4", date: "2026-03-08", amount: 1 }],
    },
  ];

  it("groups entries by exact date for daily granularity", () => {
    const map = buildEntryCountMapByGranularity(habits, "daily");

    expect(map["2026-03-03"]).toBe(2);
    expect(map["2026-03-05"]).toBe(1);
    expect(map["2026-03-08"]).toBe(1);
  });

  it("groups entries by sunday end-of-week key for weekly granularity", () => {
    const map = buildEntryCountMapByGranularity(habits, "weekly");

    expect(map["2026-03-08"]).toBe(4);
  });

  it("groups entries by month-end key for monthly granularity", () => {
    const map = buildEntryCountMapByGranularity(habits, "monthly");

    expect(map["2026-03-31"]).toBe(4);
  });
});

describe("buildHabitsList", () => {
  const habits: Habit[] = [
    {
      id: "habit-1",
      name: "Read",
      category: "Learning",
      unit: "pages",
      goalAmount: 10,
      goalType: "daily",
      type: "numeric",
      entries: [
        { id: "e1", date: "2026-03-03", amount: 10 },
        { id: "e2", date: "2026-03-04", amount: 5 },
      ],
    },
  ];

  it("includes entriesInSelectedPeriod from provided period map", () => {
    const result = buildHabitsList(
      habits,
      { "habit-1": 2 },
      {},
      { "habit-1": 1 },
    );

    expect(result).toHaveLength(1);
    expect(result[0].entriesInSelectedPeriod).toBe(1);
    expect(result[0].totalEntries).toBe(2);
  });
});

describe("buildKpis best streak", () => {
  const activeHabits: Habit[] = [
    {
      id: "habit-a",
      name: "Read",
      category: "Learning",
      unit: "pages",
      goalAmount: 10,
      goalType: "daily",
      type: "numeric",
      entries: [{ id: "a1", date: "2026-03-04", amount: 10 }],
    },
  ];

  it("falls back to active local best streak when metric best habit is not active", () => {
    const kpis = buildKpis(
      activeHabits,
      {
        bestStreakOverall: 12,
        bestStreakHabitId: "archived-habit-id",
      },
      {
        "habit-a": 3,
      },
    );

    expect(kpis.bestStreak).toBe(3);
    expect(kpis.bestStreakHabit).toBe("Read");
  });

  it("uses metric best streak when metric best habit is active", () => {
    const kpis = buildKpis(
      activeHabits,
      {
        bestStreakOverall: 7,
        bestStreakHabitId: "habit-a",
      },
      {
        "habit-a": 3,
      },
    );

    expect(kpis.bestStreak).toBe(7);
    expect(kpis.bestStreakHabit).toBe("Read");
  });

  it("computes activeDays30 from active habits even when snapshot has stale value", () => {
    const kpis = buildKpis(
      activeHabits,
      {
        activeDays30: 8,
        bestStreakOverall: 7,
        bestStreakHabitId: "habit-a",
      },
      {
        "habit-a": 3,
      },
    );

    expect(kpis.activeDays30).toBe(1);
  });
});

describe("detail presentation helpers", () => {
  const binaryHabit: Habit = {
    id: "habit-binary",
    name: "Meditate",
    category: "Mind",
    unit: "session",
    goalAmount: 1,
    goalType: "daily",
    type: "binary",
    entries: [{ id: "b1", date: "2026-03-03", amount: 1 }],
  };

  const numericHabit: Habit = {
    id: "habit-numeric",
    name: "Read",
    category: "Learning",
    unit: "page",
    goalAmount: 20,
    goalType: "weekly",
    type: "numeric",
    entries: [
      { id: "n1", date: "2026-03-03", amount: 5 },
      { id: "n2", date: "2026-03-05", amount: 7 },
    ],
  };

  it("marks binary daily buckets as goal-met only when the bucket matches the goal cadence", () => {
    const buckets = buildHabitBucketSummaries(
      [
        { dateKey: "2026-03-03", label: "Tue", totalEntries: 0 },
        { dateKey: "2026-03-04", label: "Wed", totalEntries: 0 },
      ],
      binaryHabit,
      "daily",
    );

    expect(buckets[0].goalMet).toBe(true);
    expect(buckets[1].goalMet).toBe(false);
  });

  it("uses total logged amount instead of entry count for numeric trends", () => {
    const trend = buildNumericHabitTrend(
      [{ dateKey: "2026-03-08", label: "W1", totalEntries: 0 }],
      numericHabit,
      "weekly",
    );

    expect(trend[0].totalEntries).toBe(12);
  });

  it("uses entry counts for binary habit trends", () => {
    const trend = buildHabitTrend(
      [
        { dateKey: "2026-03-03", label: "Tue", totalEntries: 0 },
        { dateKey: "2026-03-04", label: "Wed", totalEntries: 0 },
      ],
      binaryHabit,
      "daily",
    );

    expect(trend[0].totalEntries).toBe(1);
    expect(trend[1].totalEntries).toBe(0);
  });

  it("formats the goal summary copy for habit cards", () => {
    expect(formatHabitGoalSummary(binaryHabit)).toEqual({
      habitTypeLabel: "Binary",
      cadenceLabel: "Daily",
      targetLabel: "Once per day",
    });
  });
});

describe("buildHabitDetailMap average value semantics", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-03-30T12:00:00"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  function buildNumericHabit(entries: Habit["entries"]): Habit {
    return {
      id: "habit-numeric-avg",
      name: "Reading",
      category: "Learning",
      unit: "pages",
      goalAmount: 10,
      goalType: "daily",
      type: "numeric",
      entries,
    };
  }

  it("averages over full 30-day window including days with no logs", () => {
    const habit = buildNumericHabit([
      { id: "e1", date: "2026-03-30", amount: 30 },
    ]);
    const details = buildHabitDetailMap([habit], {}, {});

    expect(details.get(habit.id)?.averageValue30).toBe(1);
  });

  it("returns zero average when no entries exist in the last 30 days", () => {
    const habit = buildNumericHabit([]);
    const details = buildHabitDetailMap([habit], {}, {});

    expect(details.get(habit.id)?.averageValue30).toBe(0);
  });

  it("prefers snapshot average when available", () => {
    const habit = buildNumericHabit([
      { id: "e1", date: "2026-03-30", amount: 30 },
    ]);
    const details = buildHabitDetailMap(
      [habit],
      {},
      {
        [habit.id]: {
          avgValue30d: 2.3,
        },
      },
    );

    expect(details.get(habit.id)?.averageValue30).toBe(2.3);
  });
});
