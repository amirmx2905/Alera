import React from "react";
import { renderHook, waitFor } from "@testing-library/react-native";
import {
  HabitsProvider,
  useHabits,
} from "../../../state/HabitsStore";

jest.mock("../../../state/AuthStore", () => ({
  useAuth: () => ({ session: null }),
}));

jest.mock("../../../features/habits/habitsStoreData", () => ({
  loadHabitCategories: jest
    .fn()
    .mockResolvedValue({ nextCategories: [], nextMap: {} }),
  loadHabitsData: jest.fn().mockResolvedValue([]),
  readCachedHabits: jest.fn().mockResolvedValue(null),
  writeCachedHabits: jest.fn().mockResolvedValue(undefined),
  refreshHabitMetrics: jest.fn().mockResolvedValue(undefined),
  createHabitRecord: jest.fn(),
  removeHabitRecord: jest.fn(),
  toggleHabitArchiveStatus: jest.fn(),
}));

jest.mock("../../../features/habits/services/metrics", () => ({
  listStreakMetrics: jest.fn().mockResolvedValue([]),
}));

function Wrapper({ children }: { children: React.ReactNode }) {
  return <HabitsProvider>{children}</HabitsProvider>;
}

describe("useHabits outside provider", () => {
  it("throws when used outside HabitsProvider", () => {
    expect(() => renderHook(() => useHabits())).toThrow(
      "useHabits must be used within HabitsProvider",
    );
  });
});



describe("HabitsProvider default values", () => {
  it("provides default data values", async () => {
    const { result } = renderHook(() => useHabits(), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.isCategoriesLoading).toBe(false);
    });

    expect(result.current.habits).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.streaksByHabitId).toEqual({});
    expect(result.current.isStreaksLoading).toBe(false);
    expect(result.current.categories).toEqual([]);
  });

  it("provides action callbacks", async () => {
    const { result } = renderHook(() => useHabits(), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.refreshHabits).toBeDefined();
    });

    expect(typeof result.current.refreshHabits).toBe("function");
    expect(typeof result.current.refreshStreaks).toBe("function");
    expect(typeof result.current.createHabitWithGoal).toBe("function");
    expect(typeof result.current.addEntry).toBe("function");
    expect(typeof result.current.updateEntry).toBe("function");
    expect(typeof result.current.deleteEntry).toBe("function");
    expect(typeof result.current.toggleArchive).toBe("function");
    expect(typeof result.current.removeHabit).toBe("function");
  });
});
