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
    "completion_rate_7d",
    "completion_rate_14d",
    "current_streak",
    "days_since_last_completion",
]

_FULL_FEATURES = _BASIC_FEATURES + [
    "trend_slope_7d",
    "trend_slope_14d",
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

def predict_trajectory(features_df: pd.DataFrame, tier: str) -> dict:
    """Predict whether the habit is improving, stable, or declining."""
    df = features_df.copy()

    if len(df) < 7:
        return {"direction": "stable", "rate_7d": 0.0, "predicted_rate_next_7d": 0.0}

    rate_7d = float(df["completion_rate_7d"].iloc[-1])

    if tier == "basic":
        # Linear regression on the completion_rate_7d time series
        y = df["completion_rate_7d"].values
        X = np.arange(len(y)).reshape(-1, 1)
        model = LinearRegression()
        model.fit(X, y)
        slope = float(model.coef_[0])
        next_x = np.array([[len(y) + 6]])  # 7 days ahead
        predicted = float(np.clip(model.predict(next_x)[0], 0, 1))
        direction = _classify_direction(slope)

        return {
            "direction": direction,
            "rate_7d": round(rate_7d, 3),
            "predicted_rate_next_7d": round(predicted, 3),
        }
    else:
        # GradientBoosting on richer features
        cols = ["completion_rate_7d", "completion_rate_14d", "trend_slope_7d", "day_of_week"]
        cols = [c for c in cols if c in df.columns]

        # Target: completion_rate_7d shifted 7 days forward
        df.loc[:, "target"] = df["completion_rate_7d"].shift(-7)
        train = df.dropna(subset=["target"])

        if len(train) < 7:
            # Not enough data for GBR, fall back to linear
            return predict_trajectory(features_df, "basic")

        X = train[cols].values
        y = train["target"].values

        model = GradientBoostingRegressor(n_estimators=50, max_depth=3, random_state=42)
        model.fit(X, y)

        last_row = df[cols].iloc[[-1]].values
        predicted = float(np.clip(model.predict(last_row)[0], 0, 1))

        slope = predicted - rate_7d
        direction = _classify_direction(slope)

        return {
            "direction": direction,
            "rate_7d": round(rate_7d, 3),
            "predicted_rate_next_7d": round(predicted, 3),
            "confidence": round(float(model.score(X, y)), 3) if len(X) > 0 else 0.0,
        }


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

    if len(df) < 14:
        return {"estimated_days": None, "on_track": False, "projected_completion_rate": 0.0}

    if habit_type == "binary":
        # For binary habits, "meeting the goal" means completion rate >= threshold
        current_rate = float(df["completion_rate_7d"].iloc[-1])
        threshold = _goal_threshold(goal_type)

        if current_rate >= threshold:
            return {
                "estimated_days": 0,
                "on_track": True,
                "projected_completion_rate": round(current_rate, 3),
            }

        # Calculate velocity of completion rate improvement
        recent = df["completion_rate_7d"].iloc[-7:].values
        older = df["completion_rate_7d"].iloc[-14:-7].values
        velocity = (float(np.mean(recent)) - float(np.mean(older))) / 7
    else:
        # For numeric habits, compare average daily value to target
        current_avg = float(df["avg_value_7d"].iloc[-1])

        if goal_type == "daily":
            effective_target = goal_target
        elif goal_type == "weekly":
            effective_target = goal_target / 7
        else:  # monthly
            effective_target = goal_target / 30

        current_rate = min(current_avg / effective_target, 1.0) if effective_target > 0 else 0.0
        threshold = 0.8

        if current_rate >= threshold:
            return {
                "estimated_days": 0,
                "on_track": True,
                "projected_completion_rate": round(current_rate, 3),
            }

        recent_avg = float(df["avg_value_7d"].iloc[-7:].mean())
        older_avg = float(df["avg_value_7d"].iloc[-14:-7].mean())
        velocity = (recent_avg - older_avg) / 7

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
