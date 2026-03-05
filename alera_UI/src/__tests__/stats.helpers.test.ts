import type { Habit } from "../features/habits/types";
import { buildEntryCountMapByGranularity } from "../features/stats/hooks/useStatsData.time";
import { buildHabitsList } from "../features/stats/hooks/useStatsData.aggregates";
import {
  formatCompletionWindow,
  formatPeriodUnit,
} from "../features/stats/utils/formatters";

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
