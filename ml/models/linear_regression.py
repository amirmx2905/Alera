"""Trajectory prediction.

Basic tier: Linear Regression on completion_rate_short time series.
Full tier:  Gradient Boosting Regressor for next-period prediction,
            anchored with a Linear Regression multi-step forecast.
"""

import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.linear_model import LinearRegression

# Max forecast horizons — UI slices from these as needed.
# daily:   28 → UI can show "7 days" or aggregate into "4 weeks"
# weekly:  26 → UI can show "4 weeks" or aggregate into "6 months"
# monthly:  6
_MAX_HORIZONS = {"daily": 28, "weekly": 26, "monthly": 6}

# Gradient Boosting hyperparameters — kept small for fast inference on sparse habit data.
_GBR_N_ESTIMATORS = 50
_GBR_MAX_DEPTH = 3
_GBR_RANDOM_STATE = 42


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def predict_trajectory(
    features_df: pd.DataFrame,
    tier: str,
    goal_type: str = "daily",
    goal_target: float | None = None,
    habit_type: str = "numeric",
) -> dict:
    """Predict whether the habit is improving, stable, or declining.

    Produces:
      - forecast:       completion-rate per period (0–1)
      - value_forecast: predicted period_total per period (numeric habits)

    Horizons are generous so the UI can slice/aggregate:
      - daily   → 28 points
      - weekly  → 26 points
      - monthly →  6 points
    """
    df = features_df.copy()
    horizon = _MAX_HORIZONS.get(goal_type, 7)

    avg_hit, avg_miss = _compute_period_value_stats(features_df, goal_target)
    vf = _forecast_values(features_df, tier, goal_type, goal_target) if habit_type == "numeric" else []

    if len(df) < 4:
        result: dict = {
            "direction": "stable",
            "rate_7d": 0.0,
            "predicted_rate_next_7d": 0.0,
            "forecast": [0.0] * horizon,
        }
        return _attach_value_fields(result, vf, avg_hit, avg_miss, features_df, habit_type)

    rate_short = float(df["completion_rate_short"].iloc[-1])

    if tier == "basic":
        result = _predict_basic(df, rate_short, horizon, vf, avg_hit, avg_miss, features_df, habit_type)
    else:
        result = _predict_full(df, features_df, rate_short, horizon, goal_type, goal_target, habit_type, vf, avg_hit, avg_miss)

    return result


# ---------------------------------------------------------------------------
# Tier implementations
# ---------------------------------------------------------------------------

def _predict_basic(
    df: pd.DataFrame,
    rate_short: float,
    horizon: int,
    vf: list,
    avg_hit,
    avg_miss,
    features_df: pd.DataFrame,
    habit_type: str,
) -> dict:
    y = df["completion_rate_short"].values
    X = np.arange(len(y)).reshape(-1, 1)
    model = LinearRegression()
    model.fit(X, y)

    slope = float(model.coef_[0])
    next_x = np.array([[len(y) + 3]])  # ~4 periods ahead
    predicted = float(np.clip(model.predict(next_x)[0], 0, 1))
    direction = _classify_direction(slope)

    future_x = np.arange(len(y), len(y) + horizon).reshape(-1, 1)
    forecast = np.clip(model.predict(future_x), 0, 1).tolist()

    result = {
        "direction": _direction_from_values(vf or forecast) or direction,
        "rate_7d": round(rate_short, 3),
        "predicted_rate_next_7d": round(predicted, 3),
        "forecast": [round(f, 3) for f in forecast],
    }
    return _attach_value_fields(result, vf, avg_hit, avg_miss, df, habit_type)


def _predict_full(
    df: pd.DataFrame,
    features_df: pd.DataFrame,
    rate_short: float,
    horizon: int,
    goal_type: str,
    goal_target: float | None,
    habit_type: str,
    vf: list,
    avg_hit,
    avg_miss,
) -> dict:
    cols = ["completion_rate_short", "completion_rate_long", "trend_slope_short", "day_of_week"]
    cols = [c for c in cols if c in df.columns]

    # Target: completion_rate_short shifted 4 periods forward
    df.loc[:, "target"] = df["completion_rate_short"].shift(-4)
    train = df.dropna(subset=["target"])

    if len(train) < 4:
        # Not enough data for GBR — fall back to basic
        return _predict_basic(df, rate_short, horizon, vf, avg_hit, avg_miss, features_df, habit_type)

    X = train[cols].values
    y = train["target"].values

    model = GradientBoostingRegressor(n_estimators=_GBR_N_ESTIMATORS, max_depth=_GBR_MAX_DEPTH, random_state=_GBR_RANDOM_STATE)
    model.fit(X, y)

    last_row = df[cols].iloc[[-1]].values
    predicted = float(np.clip(model.predict(last_row)[0], 0, 1))
    slope = predicted - rate_short
    direction = _classify_direction(slope)

    # Forecast: LR extrapolation anchored to GBR's single-step prediction
    y_rates = features_df["completion_rate_short"].values
    X_rates = np.arange(len(y_rates)).reshape(-1, 1)
    lr = LinearRegression()
    lr.fit(X_rates, y_rates)

    lr_next = float(np.clip(lr.predict([[len(y_rates)]]), 0, 1))
    gbr_offset = predicted - lr_next

    future_x = np.arange(len(y_rates), len(y_rates) + horizon).reshape(-1, 1)
    forecast = np.clip(lr.predict(future_x) + gbr_offset, 0, 1).tolist()

    result = {
        "direction": _direction_from_values(vf or forecast) or direction,
        "rate_7d": round(rate_short, 3),
        "predicted_rate_next_7d": round(predicted, 3),
        "confidence": round(float(model.score(X, y)), 3) if len(X) > 0 else 0.0,
        "forecast": [round(f, 3) for f in forecast],
    }
    return _attach_value_fields(result, vf, avg_hit, avg_miss, features_df, habit_type)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _forecast_values(
    features_df: pd.DataFrame,
    tier: str,
    goal_type: str,
    goal_target: float | None,
) -> list[float]:
    """Forecast period_total values for numeric habits.

    Uses LR (basic) or GBR+LR (full), capped at a sensible upper bound.
    """
    if "period_total" not in features_df.columns:
        return []

    horizon = _MAX_HORIZONS.get(goal_type, 7)

    # Only train on periods with actual logs — unlogged periods would poison the regression
    logged_mask = (
        features_df["period_count"] > 0
        if "period_count" in features_df.columns
        else pd.Series(True, index=features_df.index)
    )
    logged_df = features_df[logged_mask]
    values = logged_df["period_total"].values
    n = len(values)

    if n < 4:
        last = float(values[-1]) if n > 0 else 0.0
        return [round(max(last, 0.0), 2)] * horizon

    hist_max = float(np.max(values))
    cap = max(hist_max * 2, (goal_target or 0) * 1.5, 1.0)

    X = np.arange(n).reshape(-1, 1)
    future_x = np.arange(n, n + horizon).reshape(-1, 1)

    if tier == "full" and n >= 8:
        cols = ["completion_rate_short", "avg_value_short", "day_of_week"]
        cols = [c for c in cols if c in logged_df.columns]

        df = logged_df.copy()
        df.loc[:, "_val_target"] = df["period_total"].shift(-4)
        train = df.dropna(subset=["_val_target"])

        if len(train) >= 4:
            Xt = train[cols].values
            yt = train["_val_target"].values
            gbr = GradientBoostingRegressor(n_estimators=_GBR_N_ESTIMATORS, max_depth=_GBR_MAX_DEPTH, random_state=_GBR_RANDOM_STATE)
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


def _compute_period_value_stats(
    features_df: pd.DataFrame,
    goal_target: float | None,
) -> tuple[float | None, float | None]:
    """Compute average period_total for hit vs miss periods.

    Returns (avg_hit_value, avg_miss_value) — None when no periods qualify.
    """
    if "period_total" not in features_df.columns:
        return None, None

    df = features_df
    if "is_current_period" in df.columns:
        df = df[df["is_current_period"] == 0]
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


def _attach_value_fields(
    result: dict,
    vf: list,
    avg_hit,
    avg_miss,
    df: pd.DataFrame,
    habit_type: str,
) -> dict:
    """Attach optional numeric-habit fields to a trajectory result dict."""
    if vf:
        result["value_forecast"] = vf
    if avg_hit is not None:
        result["avg_hit_value"] = avg_hit
    if avg_miss is not None:
        result["avg_miss_value"] = avg_miss
    if habit_type == "numeric" and "avg_value_short" in df.columns:
        result["recent_avg_value"] = round(float(df["avg_value_short"].iloc[-1]), 2)
    return result


def _classify_direction(slope: float) -> str:
    if slope > 0.02:
        return "improving"
    elif slope < -0.02:
        return "declining"
    return "stable"


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
