import {
  getLatestCompletePredictionSet,
  getPredictionUnlockStatus,
} from "../features/stats/hooks/useHabitPredictions.helpers";
import type { PredictionRow } from "../features/stats/services/predictions";

function buildRow(
  prediction_type: PredictionRow["prediction_type"],
  date: string,
  value: Record<string, unknown>,
): PredictionRow {
  return {
    habit_id: "habit-1",
    prediction_type,
    date,
    value,
    metadata: null,
    created_at: `${date}T04:00:00.000Z`,
  };
}

describe("useHabitPredictions helpers", () => {
  it("returns correct unlock status by data days", () => {
    expect(getPredictionUnlockStatus(0)).toBe("locked");
    expect(getPredictionUnlockStatus(13)).toBe("locked");
    expect(getPredictionUnlockStatus(14)).toBe("basic");
    expect(getPredictionUnlockStatus(20)).toBe("basic");
    expect(getPredictionUnlockStatus(21)).toBe("full");
  });

  it("picks latest complete prediction date", () => {
    const rows: PredictionRow[] = [
      buildRow("streak_risk", "2026-02-25", { risk: "high", confidence: 0.8 }),
      buildRow("trajectory", "2026-02-25", {
        trajectory: "declining",
        confidence: 0.7,
      }),
      buildRow("streak_risk", "2026-02-24", { risk: "low", confidence: 0.9 }),
      buildRow("trajectory", "2026-02-24", {
        trajectory: "good",
        confidence: 0.85,
      }),
      buildRow("goal_eta", "2026-02-24", {
        days: 3,
        confidence: 0.88,
        on_track: true,
      }),
    ];

    const result = getLatestCompletePredictionSet(rows);

    expect(result.latestDate).toBe("2026-02-24");
    expect(result.hasAnyRows).toBe(true);
    expect(result.predictions).not.toBeNull();
    expect(result.predictions?.streakRisk.risk).toBe("low");
    expect(result.predictions?.goalEta.eta).toBe("~3 days");
    expect(result.predictions?.goalEta.onTrack).toBe(true);
  });

  it("returns null predictions when rows are incomplete", () => {
    const rows: PredictionRow[] = [
      buildRow("streak_risk", "2026-02-25", { risk: "medium" }),
      buildRow("trajectory", "2026-02-25", { trajectory: "good" }),
    ];

    const result = getLatestCompletePredictionSet(rows);

    expect(result.hasAnyRows).toBe(true);
    expect(result.latestDate).toBe("2026-02-25");
    expect(result.predictions).toBeNull();
  });
});
