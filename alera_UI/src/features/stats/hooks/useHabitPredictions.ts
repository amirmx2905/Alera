import { useEffect, useMemo, useState } from "react";
import type { Habit } from "../../habits/types";
import type { HabitPredictions } from "../types";
import { listHabitPredictions } from "../services/predictions";
import {
  getDisabledReason,
  getLatestCompletePredictionSet,
  getPredictionUnlockStatus,
  getUniqueDataDays,
  type PredictionUnlockStatus,
} from "./useHabitPredictions.helpers";

export { getLatestCompletePredictionSet, getPredictionUnlockStatus };
export type { PredictionUnlockStatus };

export type HabitPredictionsState = {
  predictions: HabitPredictions | null;
  isEligible: boolean;
  isLoading: boolean;
  unlockStatus: PredictionUnlockStatus;
  dataDays: number;
  hasPredictionRows: boolean;
  updatedAt: string | null;
  reason: string;
};

export function useHabitPredictions(
  habit: Habit | null,
): HabitPredictionsState {
  const baseState = useMemo<HabitPredictionsState>(() => {
    if (!habit) {
      return {
        predictions: null,
        isEligible: false,
        isLoading: false,
        unlockStatus: "locked",
        dataDays: 0,
        hasPredictionRows: false,
        updatedAt: null,
        reason: "Habit not found.",
      };
    }

    const dataDays = getUniqueDataDays(habit);
    const unlockStatus = getPredictionUnlockStatus(dataDays);

    return {
      predictions: null,
      isEligible: false,
      isLoading: unlockStatus === "full",
      unlockStatus,
      dataDays,
      hasPredictionRows: false,
      updatedAt: null,
      reason: getDisabledReason(unlockStatus, dataDays),
    };
  }, [habit]);

  const [state, setState] = useState<HabitPredictionsState>(baseState);

  useEffect(() => {
    setState(baseState);
  }, [baseState]);

  useEffect(() => {
    if (!habit) return;
    if (baseState.unlockStatus !== "full") return;

    let isMounted = true;

    listHabitPredictions(habit.id)
      .then((rows) => {
        if (!isMounted) return;

        const resolved = getLatestCompletePredictionSet(rows);

        if (!resolved.predictions) {
          setState((previous) => ({
            ...previous,
            isLoading: false,
            hasPredictionRows: resolved.hasAnyRows,
            updatedAt: resolved.latestDate,
            reason: resolved.hasAnyRows
              ? "Prediction rows are present but incomplete for required insight types."
              : "Waiting for complete prediction rows from the ML pipeline.",
          }));
          return;
        }

        setState((previous) => ({
          ...previous,
          predictions: resolved.predictions,
          isEligible: true,
          isLoading: false,
          hasPredictionRows: true,
          updatedAt: resolved.latestDate,
          reason: "",
        }));
      })
      .catch(() => {
        if (!isMounted) return;
        setState((previous) => ({
          ...previous,
          isLoading: false,
          reason: "Could not load predictions right now.",
        }));
      });

    return () => {
      isMounted = false;
    };
  }, [baseState.unlockStatus, habit]);

  return state;
}
