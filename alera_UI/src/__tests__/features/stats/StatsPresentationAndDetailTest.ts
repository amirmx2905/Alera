import type { Habit } from "../../../features/habits/types";
import { buildHabitDetailMap } from "../../../features/stats/hooks/statsOverviewBuilders";
import {
  buildHabitBucketSummaries,
  buildHabitTrend,
  buildNumericHabitTrend,
  formatCompletionWindow,
  formatHabitGoalSummary,
  formatPeriodUnit,
} from "../../../features/stats/utils/habitStatsPresentation";

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
