import { useEffect, useState } from "react";
import { getLatestPredictions } from "../services/predictions";
import type {
  HabitPredictions,
  PredictionTier,
  StreakRiskPrediction,
  TrajectoryPrediction,
  GoalEtaPrediction,
  BestReminderPrediction,
} from "../types";
import type { Prediction } from "../services/predictions";

function parsePredictions(rows: Prediction[]): HabitPredictions | null {
  if (rows.length === 0) return null;

  // Infer tier from the metadata of any prediction row
  const anyRow = rows[0];
  const meta = (anyRow.metadata ?? {}) as {
    tier?: PredictionTier;
    unique_days?: number;
    days_to_full?: number;
  };

  const tier: PredictionTier = meta.tier ?? "basic";
  const uniqueDays = meta.unique_days ?? 14;
  const daysToNextTier =
    tier === "basic" ? (meta.days_to_full ?? Math.max(0, 30 - uniqueDays)) : 0;

  const riskRow = rows.find((r) => r.prediction_type === "streak_risk");
  const trajRow = rows.find((r) => r.prediction_type === "trajectory");
  const etaRow = rows.find((r) => r.prediction_type === "goal_eta");
  const reminderRow = rows.find((r) => r.prediction_type === "best_reminder");

  return {
    tier,
    uniqueDays,
    daysToNextTier,
    streakRisk: riskRow
      ? (riskRow.value as unknown as StreakRiskPrediction)
      : null,
    trajectory: trajRow
      ? (trajRow.value as unknown as TrajectoryPrediction)
      : null,
    goalEta: etaRow ? (etaRow.value as unknown as GoalEtaPrediction) : null,
    bestReminder: reminderRow
      ? (reminderRow.value as unknown as BestReminderPrediction)
      : null,
  };
}

export function usePredictions(
  habitId: string | undefined,
  profileId?: string,
): { predictions: HabitPredictions | null; isLoading: boolean } {
  const [predictions, setPredictions] = useState<HabitPredictions | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!habitId) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    getLatestPredictions(habitId, profileId)
      .then((rows) => {
        if (!cancelled) {
          setPredictions(rows.length > 0 ? parsePredictions(rows) : null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.warn("Failed to fetch predictions:", err);
          setPredictions(null);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [habitId, profileId]);

  return { predictions, isLoading };
}
