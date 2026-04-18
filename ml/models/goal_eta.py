"""Goal ETA prediction.

Estimates how many days until the user consistently meets their goal,
based on recent velocity (rate of improvement over rolling periods).
No sklearn model — pure arithmetic on rolling averages.
"""

import numpy as np
import pandas as pd


# ---------------------------------------------------------------------------
# Public API
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
        current_rate = float(df["completion_rate_short"].iloc[-1])
        threshold = _goal_threshold(goal_type)

        if current_rate >= threshold:
            return {
                "estimated_days": 0,
                "on_track": True,
                "projected_completion_rate": round(current_rate, 3),
            }

        recent = df["completion_rate_short"].iloc[-4:].values
        older = df["completion_rate_short"].iloc[-8:-4].values
        velocity = (float(np.mean(recent)) - float(np.mean(older))) / 4
    else:
        # Compare average period value directly to the period target.
        # avg_value_short is already summed per period — no daily division needed.
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


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _goal_threshold(goal_type: str) -> float:
    """Minimum completion rate to consider the goal 'met' on a rolling basis."""
    return {"daily": 0.8, "weekly": 0.75, "monthly": 0.7}.get(goal_type, 0.8)
