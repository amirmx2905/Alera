"""ML model training and prediction for each prediction type."""

import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor, RandomForestClassifier
from sklearn.linear_model import LinearRegression, LogisticRegression
from sklearn.neighbors import KernelDensity

from features import get_logging_hours

# ---------------------------------------------------------------------------
# Streak Risk
# ---------------------------------------------------------------------------

_BASIC_FEATURES = [
    "day_of_week",
    "completion_rate_short",
    "completion_rate_long",
    "current_streak",
    "periods_since_last_completion",
]

_FULL_FEATURES = _BASIC_FEATURES + [
    "trend_slope_short",
    "trend_slope_long",
    "value_variance",
]


def predict_streak_risk(features_df: pd.DataFrame, tier: str) -> dict:
    """Predict the probability that the user will skip the next day.

    Returns a dict suitable for the predictions.value JSONB column.
    """
    df = features_df.copy()

    # Target: did the user NOT complete the *next* day?
    df.loc[:, "target"] = (df["completed"].shift(-1) == 0).astype(int)
    df = df.dropna(subset=["target"])

    if len(df) < 5:
        return {"risk_score": 0.5, "risk_label": "medium"}

    cols = _BASIC_FEATURES if tier == "basic" else _FULL_FEATURES
    cols = [c for c in cols if c in df.columns]

    X = df[cols].values
    y = df["target"].values.astype(int)

    if len(np.unique(y)) < 2:
        # Only one class present — cannot train a classifier
        risk = 0.8 if y[0] == 1 else 0.2
        return _format_risk(risk, tier, cols, None)

    if tier == "basic":
        model = LogisticRegression(max_iter=200, solver="lbfgs")
    else:
        model = RandomForestClassifier(n_estimators=50, max_depth=5, random_state=42)

    model.fit(X, y)

    # Predict risk for today (last row of features)
    last_row = features_df[cols].iloc[[-1]].values
    risk_score = float(model.predict_proba(last_row)[0][1])

    return _format_risk(risk_score, tier, cols, model)


def _format_risk(risk_score: float, tier: str, cols: list, model) -> dict:
    if risk_score < 0.3:
        label = "low"
    elif risk_score < 0.6:
        label = "medium"
    else:
        label = "high"

    result: dict = {"risk_score": round(risk_score, 3), "risk_label": label}

    if tier == "full" and model is not None and hasattr(model, "feature_importances_"):
        importances = model.feature_importances_
        top_idx = np.argsort(importances)[::-1][:3]
        result["top_factors"] = [cols[i] for i in top_idx]

    return result


# ---------------------------------------------------------------------------
# Trajectory
# ---------------------------------------------------------------------------

def _compute_period_value_stats(features_df: pd.DataFrame, goal_target: float | None) -> tuple[float | None, float | None]:
    """Compute average period_total for hit vs miss periods from the full history.

    Returns (avg_hit_value, avg_miss_value) — None when no periods qualify.
    """
    if "period_total" not in features_df.columns:
        return None, None

    # Exclude the current (incomplete) period if flagged
    df = features_df
    if "is_current_period" in df.columns:
        df = df[df["is_current_period"] == 0]

    # Exclude unlogged periods (period_count == 0) — a missing log
    # does NOT mean the user slept 0 hours; it just means no data.
    if "period_count" in df.columns:
        df = df[df["period_count"] > 0]

    totals = df["period_total"]
    if totals.empty:
        return None, None

    threshold = goal_target if goal_target and goal_target > 0 else 0
    hit = totals[totals >= threshold]
    miss = totals[totals < threshold]

    avg_hit = round(float(hit.mean()), 3) if len(hit) > 0 else None
    avg_miss = round(float(miss.mean()), 3) if len(miss) > 0 else None
    return avg_hit, avg_miss


# Max forecast horizons — UI slices from these as needed.
# daily: 28 so UI can show "7 days" or aggregate into "4 weeks"
# weekly: 26 so UI can show "4 weeks" or aggregate into "6 months"
# monthly: 6
_MAX_HORIZONS = {"daily": 28, "weekly": 26, "monthly": 6}


def _forecast_values(
    features_df: pd.DataFrame,
    tier: str,
    goal_type: str,
    goal_target: float | None,
) -> list[float]:
    """Forecast period_total values for numeric habits.

    Uses the same LR / GBR+LR approach as rate forecasting but on the
    actual period_total series, capped at [0, reasonable_max].
    """
    if "period_total" not in features_df.columns:
        return []

    horizon = _MAX_HORIZONS.get(goal_type, 7)

    # Only train on periods with actual logs — unlogged days have
    # period_total=0 which would poison the regression.
    logged_mask = features_df["period_count"] > 0 if "period_count" in features_df.columns else pd.Series(True, index=features_df.index)
    logged_df = features_df[logged_mask]
    values = logged_df["period_total"].values
    n = len(values)

    if n < 4:
        # Not enough history — return last known value repeated
        last = float(values[-1]) if n > 0 else 0.0
        return [round(max(last, 0.0), 2)] * horizon

    # Sensible upper cap: 2× historical max or 1.5× goal, whichever is larger
    hist_max = float(np.max(values))
    cap = max(hist_max * 2, (goal_target or 0) * 1.5, 1.0)

    X = np.arange(n).reshape(-1, 1)
    future_x = np.arange(n, n + horizon).reshape(-1, 1)

    if tier == "full" and n >= 8:
        # GBR single-step + LR multi-step with GBR offset (same pattern as rate)
        cols = ["completion_rate_short", "avg_value_short", "day_of_week"]
        cols = [c for c in cols if c in logged_df.columns]

        df = logged_df.copy()
        df.loc[:, "_val_target"] = df["period_total"].shift(-4)
        train = df.dropna(subset=["_val_target"])

        if len(train) >= 4:
            Xt = train[cols].values
            yt = train["_val_target"].values
            gbr = GradientBoostingRegressor(n_estimators=50, max_depth=3, random_state=42)
            gbr.fit(Xt, yt)
            gbr_pred = float(gbr.predict(logged_df[cols].iloc[[-1]].values)[0])

            lr = LinearRegression()
            lr.fit(X, values)
            lr_next = float(lr.predict([[n]])[0])
            offset = gbr_pred - lr_next

            forecast = np.clip(lr.predict(future_x) + offset, 0, cap).tolist()
            return [round(f, 2) for f in forecast]

    # Basic / fallback: plain LR on period_total
    lr = LinearRegression()
    lr.fit(X, values)
    forecast = np.clip(lr.predict(future_x), 0, cap).tolist()
    return [round(f, 2) for f in forecast]


def predict_trajectory(
    features_df: pd.DataFrame,
    tier: str,
    goal_type: str = "daily",
    goal_target: float | None = None,
    habit_type: str = "numeric",
) -> dict:
    """Predict whether the habit is improving, stable, or declining.

    Produces:
      - forecast:       completion-rate per period (0–1), used for binary habits
      - value_forecast:  predicted period_total per period, used for numeric habits

    Horizons are generous so the UI can slice/aggregate:
      - daily  → 28 points (UI shows "7 days" or aggregates to "4 weeks")
      - weekly → 26 points (UI shows "4 weeks" or aggregates to "6 months")
      - monthly→ 6 points
    """
    df = features_df.copy()
    horizon = _MAX_HORIZONS.get(goal_type, 7)

    avg_hit, avg_miss = _compute_period_value_stats(features_df, goal_target)

    # Value forecast for numeric habits
    vf = _forecast_values(features_df, tier, goal_type, goal_target) if habit_type == "numeric" else []

    # For numeric habits the direction should reflect the value trend,
    # not the completion-rate trend (those can contradict each other).
    def _direction_from_values(vals: list[float]) -> str | None:
        if len(vals) < 2:
            return None
        first_quarter = vals[: max(len(vals) // 4, 1)]
        last_quarter = vals[-max(len(vals) // 4, 1):]
        diff = np.mean(last_quarter) - np.mean(first_quarter)
        if diff > 0.05:
            return "improving"
        if diff < -0.05:
            return "declining"
        return "stable"

    if len(df) < 4:
        result: dict = {
            "direction": "stable",
            "rate_7d": 0.0,
            "predicted_rate_next_7d": 0.0,
            "forecast": [0.0] * horizon,
        }
        if vf:
            result["value_forecast"] = vf
        if avg_hit is not None:
            result["avg_hit_value"] = avg_hit
        if avg_miss is not None:
            result["avg_miss_value"] = avg_miss
        if habit_type == "numeric" and "avg_value_short" in features_df.columns:
            result["recent_avg_value"] = round(float(features_df["avg_value_short"].iloc[-1]), 2)
        return result

    rate_short = float(df["completion_rate_short"].iloc[-1])

    if tier == "basic":
        # Linear regression on the completion_rate_short time series
        y = df["completion_rate_short"].values
        X = np.arange(len(y)).reshape(-1, 1)
        model = LinearRegression()
        model.fit(X, y)
        slope = float(model.coef_[0])
        next_x = np.array([[len(y) + 3]])  # ~4 periods ahead
        predicted = float(np.clip(model.predict(next_x)[0], 0, 1))
        direction = _classify_direction(slope)

        # Forecast: extrapolate N future periods
        future_x = np.arange(len(y), len(y) + horizon).reshape(-1, 1)
        forecast = np.clip(model.predict(future_x), 0, 1).tolist()

        result = {
            "direction": _direction_from_values(vf or forecast) or direction,
            "rate_7d": round(rate_short, 3),
            "predicted_rate_next_7d": round(predicted, 3),
            "forecast": [round(f, 3) for f in forecast],
        }
        if vf:
            result["value_forecast"] = vf
        if avg_hit is not None:
            result["avg_hit_value"] = avg_hit
        if avg_miss is not None:
            result["avg_miss_value"] = avg_miss
        if habit_type == "numeric" and "avg_value_short" in df.columns:
            result["recent_avg_value"] = round(float(df["avg_value_short"].iloc[-1]), 2)
        return result
    else:
        # GradientBoosting on richer features
        cols = ["completion_rate_short", "completion_rate_long", "trend_slope_short", "day_of_week"]
        cols = [c for c in cols if c in df.columns]

        # Target: completion_rate_short shifted 4 periods forward
        df.loc[:, "target"] = df["completion_rate_short"].shift(-4)
        train = df.dropna(subset=["target"])

        if len(train) < 4:
            # Not enough data for GBR, fall back to linear
            return predict_trajectory(features_df, "basic", goal_type, goal_target, habit_type)

        X = train[cols].values
        y = train["target"].values

        model = GradientBoostingRegressor(n_estimators=50, max_depth=3, random_state=42)
        model.fit(X, y)

        last_row = df[cols].iloc[[-1]].values
        predicted = float(np.clip(model.predict(last_row)[0], 0, 1))

        slope = predicted - rate_short
        direction = _classify_direction(slope)

        # Forecast: LR extrapolation anchored to GBR's single-step prediction
        # so full-tier uses GBR insight instead of producing identical basic output
        y_rates = features_df["completion_rate_short"].values
        X_rates = np.arange(len(y_rates)).reshape(-1, 1)
        lr = LinearRegression()
        lr.fit(X_rates, y_rates)

        lr_next = float(np.clip(lr.predict([[len(y_rates)]]), 0, 1))
        gbr_offset = predicted - lr_next  # GBR correction over naive LR

        future_x = np.arange(len(y_rates), len(y_rates) + horizon).reshape(-1, 1)
        forecast = np.clip(lr.predict(future_x) + gbr_offset, 0, 1).tolist()

        result = {
            "direction": _direction_from_values(vf or forecast) or direction,
            "rate_7d": round(rate_short, 3),
            "predicted_rate_next_7d": round(predicted, 3),
            "confidence": round(float(model.score(X, y)), 3) if len(X) > 0 else 0.0,
            "forecast": [round(f, 3) for f in forecast],
        }
        if vf:
            result["value_forecast"] = vf
        if avg_hit is not None:
            result["avg_hit_value"] = avg_hit
        if avg_miss is not None:
            result["avg_miss_value"] = avg_miss
        if habit_type == "numeric" and "avg_value_short" in features_df.columns:
            result["recent_avg_value"] = round(float(features_df["avg_value_short"].iloc[-1]), 2)
        return result


def _classify_direction(slope: float) -> str:
    if slope > 0.02:
        return "improving"
    elif slope < -0.02:
        return "declining"
    return "stable"


# ---------------------------------------------------------------------------
# Goal ETA
# ---------------------------------------------------------------------------

def predict_goal_eta(
    features_df: pd.DataFrame,
    goal_target: float,
    goal_type: str,
    habit_type: str,
) -> dict:
    """Estimate how many days until the user consistently meets their goal."""
    df = features_df.copy()

    if len(df) < 8:
        return {"estimated_days": None, "on_track": False, "projected_completion_rate": 0.0}

    if habit_type == "binary":
        # For binary habits, "meeting the goal" means period completion rate >= threshold
        current_rate = float(df["completion_rate_short"].iloc[-1])
        threshold = _goal_threshold(goal_type)

        if current_rate >= threshold:
            return {
                "estimated_days": 0,
                "on_track": True,
                "projected_completion_rate": round(current_rate, 3),
            }

        # Calculate velocity of completion rate improvement over periods
        recent = df["completion_rate_short"].iloc[-4:].values
        older = df["completion_rate_short"].iloc[-8:-4].values
        velocity = (float(np.mean(recent)) - float(np.mean(older))) / 4
    else:
        # For numeric habits, compare average period value directly to the period target.
        # avg_value_short is already summed per period so no division by 7/30 needed.
        current_avg = float(df["avg_value_short"].iloc[-1])
        current_rate = min(current_avg / goal_target, 1.0) if goal_target > 0 else 0.0
        threshold = 0.8

        if current_rate >= threshold:
            return {
                "estimated_days": 0,
                "on_track": True,
                "projected_completion_rate": round(current_rate, 3),
            }

        recent_avg = float(df["avg_value_short"].iloc[-4:].mean())
        older_avg = float(df["avg_value_short"].iloc[-8:-4].mean())
        velocity = (recent_avg - older_avg) / 4

    if velocity <= 0:
        return {
            "estimated_days": None,
            "on_track": False,
            "projected_completion_rate": round(current_rate, 3),
        }

    gap = threshold - current_rate
    eta_days = max(1, int(gap / velocity))
    eta_days = min(eta_days, 365)  # Cap at 1 year

    return {
        "estimated_days": eta_days,
        "on_track": velocity > 0,
        "projected_completion_rate": round(current_rate, 3),
    }


def _goal_threshold(goal_type: str) -> float:
    """Minimum completion rate to consider the goal 'met' on a rolling basis."""
    return {"daily": 0.8, "weekly": 0.75, "monthly": 0.7}.get(goal_type, 0.8)


# ---------------------------------------------------------------------------
# Best Reminder
# ---------------------------------------------------------------------------

def predict_best_reminder(logs_df: pd.DataFrame) -> dict:
    """Find the best hour of day to remind the user based on logging patterns."""
    hours = get_logging_hours(logs_df)

    if not hours:
        return {"best_hour": 9, "best_period": "morning", "distribution": [0.0] * 24}

    # KDE for smooth hour distribution
    hour_array = np.array(hours, dtype=float).reshape(-1, 1)
    kde = KernelDensity(kernel="gaussian", bandwidth=1.5)
    kde.fit(hour_array)

    x_range = np.arange(24).reshape(-1, 1)
    log_density = kde.score_samples(x_range)
    density = np.exp(log_density)
    density = density / density.sum()  # Normalize to probabilities

    best_hour = int(np.argmax(density))
    distribution = [round(float(d), 4) for d in density]

    return {
        "best_hour": best_hour,
        "best_period": _hour_to_period(best_hour),
        "distribution": distribution,
    }


def _hour_to_period(hour: int) -> str:
    if 5 <= hour <= 11:
        return "morning"
    elif 12 <= hour <= 16:
        return "afternoon"
    elif 17 <= hour <= 20:
        return "evening"
    return "night"
