import type { Entry } from "../features/habits/types";
import { calculateLocalStreak } from "../state/habits/habits.helpers";

describe("calculateLocalStreak for weekly/monthly habits", () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it("keeps weekly streak from previous week while current week is still in progress", () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-03-03T12:00:00"));

    const entries: Entry[] = [
      { id: "1", date: "2026-02-24", amount: 1 },
      { id: "2", date: "2026-02-26", amount: 1 },
      { id: "3", date: "2026-03-03", amount: 1 },
    ];

    const streak = calculateLocalStreak(entries, "weekly", 2);

    expect(streak).toBe(1);
  });

  it("resets weekly streak after a full missed week", () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-03-09T12:00:00"));

    const entries: Entry[] = [
      { id: "1", date: "2026-02-24", amount: 1 },
      { id: "2", date: "2026-02-26", amount: 1 },
      { id: "3", date: "2026-03-03", amount: 1 },
    ];

    const streak = calculateLocalStreak(entries, "weekly", 2);

    expect(streak).toBe(0);
  });

  it("keeps monthly streak from previous month while current month is still in progress", () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-03-10T12:00:00"));

    const entries: Entry[] = [
      { id: "1", date: "2026-02-04", amount: 3 },
      { id: "2", date: "2026-02-18", amount: 2 },
      { id: "3", date: "2026-03-07", amount: 2 },
    ];

    const streak = calculateLocalStreak(entries, "monthly", 5);

    expect(streak).toBe(1);
  });

  it("resets monthly streak after a full missed month", () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-04-02T12:00:00"));

    const entries: Entry[] = [
      { id: "1", date: "2026-02-04", amount: 3 },
      { id: "2", date: "2026-02-18", amount: 2 },
      { id: "3", date: "2026-03-07", amount: 2 },
    ];

    const streak = calculateLocalStreak(entries, "monthly", 5);

    expect(streak).toBe(0);
  });
});
