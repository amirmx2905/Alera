import type { Habit } from "../../habits/types";
import type { HabitPredictions } from "../types";
import type { PredictionRow } from "../services/predictions";
import { parseEntryDate, toLocalDateKey } from "../../habits/utils/dates";

export type PredictionUnlockStatus = "locked" | "basic" | "full";

const REQUIRED_TYPES = ["streak_risk", "trajectory", "goal_eta"] as const;

export type LatestPredictionSet = {
  predictions: HabitPredictions | null;
  latestDate: string | null;
  hasAnyRows: boolean;
};

function toNumber(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function toUnitConfidence(value: unknown, fallback = 0.7) {
  const numeric = toNumber(value, Number.NaN);
  if (Number.isFinite(numeric)) {
    if (numeric > 1) return Math.max(0, Math.min(1, numeric / 100));
    return Math.max(0, Math.min(1, numeric));
  }
  if (value === "high") return 0.88;
  if (value === "medium") return 0.72;
  if (value === "low") return 0.58;
  return fallback;
}

function normalizeRisk(value: unknown): HabitPredictions["streakRisk"]["risk"] {
  if (value === "low" || value === "medium" || value === "high") return value;
  return "medium";
}

function normalizeTrajectory(
  value: unknown,
): HabitPredictions["trajectory"]["trajectory"] {
  if (
    value === "excellent" ||
    value === "good" ||
    value === "declining" ||
    value === "poor"
  ) {
    return value;
  }
  if (value === "up") return "excellent";
  if (value === "stable") return "good";
  if (value === "down") return "declining";
  return "good";
}

function normalizeStreakRisk(
  row: PredictionRow,
): HabitPredictions["streakRisk"] {
  const confidence = toUnitConfidence(
    row.value.confidence ?? row.value.probability ?? row.metadata?.confidence,
    0.72,
  );

  const risk = normalizeRisk(row.value.risk);

  let reason = "Prediction generated from recent habit activity patterns.";
  if (typeof row.value.reason === "string" && row.value.reason.trim()) {
    reason = row.value.reason;
  } else if (risk === "high") {
    reason = "Recent pattern indicates elevated streak-break risk.";
  } else if (risk === "low") {
    reason = "Recent pattern indicates low streak-break risk.";
  }

  return { risk, confidence, reason };
}

function normalizeTrajectoryPrediction(
  row: PredictionRow,
): HabitPredictions["trajectory"] {
  const trajectory = normalizeTrajectory(
    row.value.trajectory ?? row.value.trend ?? row.value.direction,
  );
  const confidence = toUnitConfidence(
    row.value.confidence ?? row.metadata?.confidence,
    0.7,
  );

  let prediction = "Trend forecast generated from recent habit performance.";
  if (typeof row.value.prediction === "string" && row.value.prediction.trim()) {
    prediction = row.value.prediction;
  } else if (trajectory === "excellent") {
    prediction = "Momentum is strong and likely to stay high.";
  } else if (trajectory === "declining") {
    prediction = "Momentum is weakening and may require intervention.";
  } else if (trajectory === "poor") {
    prediction = "Current trajectory is below target pace.";
  }

  return { trajectory, confidence, prediction };
}

function normalizeGoalEta(row: PredictionRow): HabitPredictions["goalEta"] {
  const confidence = toUnitConfidence(
    row.value.confidence ?? row.metadata?.confidence,
    0.7,
  );
  const days = toNumber(row.value.days, Number.NaN);
  const etaFromValue = typeof row.value.eta === "string" ? row.value.eta : null;

  const eta =
    etaFromValue && etaFromValue.trim()
      ? etaFromValue
      : Number.isFinite(days)
        ? `~${Math.max(0, Math.round(days))} day${Math.round(days) === 1 ? "" : "s"}`
        : "ETA unavailable";

  const onTrackRaw = row.value.onTrack ?? row.value.on_track;
  const onTrack =
    typeof onTrackRaw === "boolean"
      ? onTrackRaw
      : Number.isFinite(days)
        ? days <= 7
        : false;

  return {
    eta,
    confidence,
    onTrack,
  };
}

export function getUniqueDataDays(habit: Habit) {
  return new Set(
    habit.entries.map((entry) => toLocalDateKey(parseEntryDate(entry.date))),
  ).size;
}

export function getPredictionUnlockStatus(
  dataDays: number,
): PredictionUnlockStatus {
  if (dataDays < 14) return "locked";
  if (dataDays < 21) return "basic";
  return "full";
}

export function getLatestCompletePredictionSet(
  rows: PredictionRow[],
): LatestPredictionSet {
  if (rows.length === 0) {
    return {
      predictions: null,
      latestDate: null,
      hasAnyRows: false,
    };
  }

  const byDate: Record<
    string,
    Partial<Record<(typeof REQUIRED_TYPES)[number], PredictionRow>>
  > = {};

  rows.forEach((row) => {
    if (
      !REQUIRED_TYPES.includes(
        row.prediction_type as (typeof REQUIRED_TYPES)[number],
      )
    ) {
      return;
    }
    const dateMap = byDate[row.date] ?? {};
    if (!dateMap[row.prediction_type as (typeof REQUIRED_TYPES)[number]]) {
      dateMap[row.prediction_type as (typeof REQUIRED_TYPES)[number]] = row;
    }
    byDate[row.date] = dateMap;
  });

  const dates = Object.keys(byDate).sort((left, right) =>
    left > right ? -1 : left < right ? 1 : 0,
  );

  for (const date of dates) {
    const dateSet = byDate[date];
    const streakRisk = dateSet.streak_risk;
    const trajectory = dateSet.trajectory;
    const goalEta = dateSet.goal_eta;

    if (!streakRisk || !trajectory || !goalEta) continue;

    return {
      predictions: {
        streakRisk: normalizeStreakRisk(streakRisk),
        trajectory: normalizeTrajectoryPrediction(trajectory),
        goalEta: normalizeGoalEta(goalEta),
      },
      latestDate: date,
      hasAnyRows: true,
    };
  }

  return {
    predictions: null,
    latestDate: dates[0] ?? null,
    hasAnyRows: true,
  };
}

export function getDisabledReason(
  status: PredictionUnlockStatus,
  dataDays: number,
) {
  if (status === "locked") {
    return `Predictions unlock at 14 days of data. Current: ${dataDays}.`;
  }

  if (status === "basic") {
    return `Full insights unlock at 21 days of data. Current: ${dataDays}.`;
  }

  return "Waiting for complete prediction rows from the ML pipeline.";
}
