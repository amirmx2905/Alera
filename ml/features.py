"""Feature engineering for habit prediction models."""

import warnings
from datetime import date, timedelta

import numpy as np
import pandas as pd

warnings.filterwarnings("ignore", category=FutureWarning, module="pandas")


def build_feature_matrix(
    logs_df: pd.DataFrame,
    goal_target: float | None,
    tier: str,
    habit_created_at: str,
) -> pd.DataFrame:
    """Transform raw habit logs into a daily feature matrix.

    Args:
        logs_df: DataFrame with columns [value, created_at].
        goal_target: The daily goal target value (None if no goal).
        tier: 'basic' or 'full' — controls which features are computed.
        habit_created_at: ISO timestamp of when the habit was created.

    Returns:
        DataFrame indexed by date with computed features.
    """
    # Build full date spine from habit creation to today
    start = pd.to_datetime(habit_created_at).date()
    end = date.today()
    spine = pd.DataFrame({"date": [start + timedelta(days=i) for i in range((end - start).days + 1)]})

    if logs_df.empty:
        daily = pd.DataFrame({"date": [], "daily_total": [], "log_count": []})
    else:
        logs = logs_df.copy()
        logs.loc[:, "date"] = pd.to_datetime(logs["created_at"]).dt.date
        logs.loc[:, "value"] = pd.to_numeric(logs["value"], errors="coerce").fillna(0)
        daily = logs.groupby("date", as_index=False).agg(
            daily_total=("value", "sum"),
            log_count=("value", "count"),
        )

    df = spine.merge(daily, on="date", how="left").fillna({"daily_total": 0, "log_count": 0})
    df = df.sort_values("date").reset_index(drop=True).copy()

    # Base features
    df.loc[:, "completed"] = (df["log_count"] > 0).astype(int)
    df.loc[:, "day_of_week"] = pd.to_datetime(df["date"]).dt.weekday
    df.loc[:, "completion_rate_7d"] = df["completed"].rolling(7, min_periods=1).mean()
    df.loc[:, "completion_rate_14d"] = df["completed"].rolling(14, min_periods=1).mean()
    df.loc[:, "avg_value_7d"] = df["daily_total"].rolling(7, min_periods=1).mean()

    # Current streak (consecutive completed days counting backwards from each row)
    streaks = []
    current = 0
    for c in df["completed"]:
        current = current + 1 if c == 1 else 0
        streaks.append(current)
    df.loc[:, "current_streak"] = streaks

    # Days since last completion
    last_completed = pd.NaT
    gaps = []
    for _, row in df.iterrows():
        if row["completed"] == 1:
            gaps.append(0)
            last_completed = row["date"]
        elif last_completed is pd.NaT:
            gaps.append(len(gaps))
        else:
            gaps.append((row["date"] - last_completed).days)
    df.loc[:, "days_since_last_completion"] = gaps

    # Full-tier features
    if tier == "full":
        df.loc[:, "trend_slope_7d"] = _rolling_slope(df["completion_rate_7d"], window=7)
        df.loc[:, "trend_slope_14d"] = _rolling_slope(df["completion_rate_7d"], window=14)
        df.loc[:, "value_variance"] = df["daily_total"].rolling(7, min_periods=1).var().fillna(0)

        if goal_target and goal_target > 0:
            df.loc[:, "goal_distance"] = goal_target - df["daily_total"]
        else:
            df.loc[:, "goal_distance"] = 0.0

    return df


def _rolling_slope(series: pd.Series, window: int) -> pd.Series:
    """Compute rolling linear regression slope over a window."""
    slopes = []
    for i in range(len(series)):
        if i < window - 1:
            slopes.append(0.0)
            continue
        y = series.iloc[i - window + 1: i + 1].values
        x = np.arange(window, dtype=float)
        if np.std(y) == 0:
            slopes.append(0.0)
        else:
            slopes.append(float(np.polyfit(x, y, 1)[0]))
    return pd.Series(slopes, index=series.index)


def get_logging_hours(logs_df: pd.DataFrame) -> list[int]:
    """Extract the hour-of-day from each log's created_at timestamp."""
    if logs_df.empty:
        return []
    hours = pd.to_datetime(logs_df["created_at"]).dt.hour.tolist()
    return [int(h) for h in hours]
